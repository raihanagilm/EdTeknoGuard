"""
scan_runner.py - Eksekutor Pemindaian Berkala ONT (Multi-Threading & Multi-Tenant)
Menjalankan batch scanning paralel (ThreadPoolExecutor), menangani probe on-demand,
pencatatan log performa ONT, sinkronisasi kredensial modem, dan retry queue.
"""

import json
import time
import socket
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, PerangkatONT, LogPerformaONT, SystemSetting, AlertLog, Kantor, ModemCredential
from app.core.tenant_database import TenantDatabaseManager
from app.services.ont_scraper_service import ONTScraperService
from app.services.scheduler.state_manager import SchedulerStateManager, OfficeScanState
from app.services.scheduler.recovery_manager import SchedulerRecoveryManager

logger = logging.getLogger("scheduler_scanner")

class ScanRunner:

    @classmethod
    def check_office_connectivity(cls, db: Session, kantor: Optional[str] = None) -> bool:
        """Memeriksa apakah server memiliki rute ke subnet gateway kantor"""
        sample = db.query(Pelanggan).join(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)\
            .filter(Pelanggan.is_active == True, PerangkatONT.ip_ont != None).first()
        if not sample or not sample.perangkat.ip_ont:
            return True

        target_ip = sample.perangkat.ip_ont.strip()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)
            res = sock.connect_ex((target_ip, 80))
            sock.close()
            return res == 0
        except Exception:
            return False

    @classmethod
    def scan_single(cls, id_pelanggan: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Mengecek redaman optik modem 1 pelanggan secara on-demand (Single Probe)"""
        should_close = False
        if db is None:
            db = TenantDatabaseManager.get_tenant_session(None)
            should_close = True

        try:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if not cust:
                return None

            ip_target = cust.ip_ont or cust.ip_router
            if not ip_target:
                return {
                    "success": False,
                    "message": "IP ONT / Router pelanggan belum terdaftar.",
                    "status_koneksi": "LOS"
                }

            k_code = cust.kantor.lower().strip() if cust.kantor else "cabang"
            cfg = SchedulerRecoveryManager.check_office_configuration(db, kantor=k_code)

            default_creds = []
            creds_json = SchedulerRecoveryManager.get_setting_from_db(db, "default_modem_credentials", kantor=k_code)
            if creds_json:
                try:
                    parsed = json.loads(creds_json)
                    default_creds = [(c.get("username"), c.get("password")) for c in parsed if c.get("username")]
                except Exception:
                    pass

            if not default_creds:
                db_creds = db.query(ModemCredential).filter(ModemCredential.kantor_kode == k_code).order_by(ModemCredential.urutan.asc()).all()
                default_creds = [(c.username, c.password) for c in db_creds]

            scrape_res = ONTScraperService.scrape_ont(
                ip=ip_target,
                customer_user=cust.user_admin,
                customer_pass=cust.pass_admin,
                customer_name=cust.nama,
                default_credentials=default_creds,
                warn_threshold=cfg.get("warning_threshold_dbm"),
                crit_threshold=cfg.get("critical_threshold_dbm"),
                exhaustive_first_scan=True
            )

            # Catat log hasil scan
            now = get_now_wib()
            rx = scrape_res.get("rx_power")
            status_koneksi = scrape_res.get("status_koneksi", "LOS")

            log_entry = LogPerformaONT(
                id_pelanggan=cust.id_pelanggan,
                waktu_cek=now,
                rx_power=rx,
                suhu_ont=scrape_res.get("suhu_ont"),
                uptime=scrape_res.get("uptime"),
                status_koneksi=status_koneksi,
                latency_ms=scrape_res.get("latency_ms"),
                keterangan=scrape_res.get("message")
            )
            db.add(log_entry)

            # Update perangkat jika kredensial terverifikasi
            if scrape_res.get("status_kredensial") == "VALID":
                cust.status_kredensial = "VALID"
                if scrape_res.get("updated_user"):
                    cust.user_admin = scrape_res.get("updated_user")
                if scrape_res.get("updated_pass"):
                    cust.pass_admin = scrape_res.get("updated_pass")
                if scrape_res.get("mac_address"):
                    cust.mac_address = scrape_res.get("mac_address")
                if scrape_res.get("nama_wifi"):
                    cust.nama_wifi = scrape_res.get("nama_wifi")
                if scrape_res.get("password_wifi"):
                    cust.password_wifi = scrape_res.get("password_wifi")
                if scrape_res.get("jenis_modem"):
                    cust.jenis_modem = scrape_res.get("jenis_modem")

            db.commit()
            return scrape_res
        finally:
            if should_close:
                db.close()

    @classmethod
    def execute_scan_sync(cls, kantor: Optional[str] = None) -> Dict[str, Any]:
        """
        Menjalankan satu siklus pemindaian berkala penuh untuk pelanggan aktif di kantor tertentu.
        Menerapkan multithreading (ThreadPoolExecutor) untuk efisiensi tinggi.
        """
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)

        if not state.lock.acquire(blocking=False):
            return {
                "success": False,
                "message": f"Pemindaian untuk kantor '{k_code}' sedang berlangsung.",
                "is_running": True
            }

        try:
            state.is_scanning = True
            state.is_paused = False
            state.is_stopped = False

            db = TenantDatabaseManager.get_tenant_session(k_code)
            try:
                cfg = SchedulerRecoveryManager.check_office_configuration(db, kantor=k_code)
                is_connected = cls.check_office_connectivity(db, kantor=k_code)

                # Ambil daftar pelanggan yang terpantau
                customers = db.query(Pelanggan).join(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)\
                    .filter(Pelanggan.is_active == True, Pelanggan.is_monitored == True).all()

                total_cust = len(customers)
                state.total_customers_in_scan = total_cust
                state.current_scan_index = 0

                default_creds = []
                creds_json = SchedulerRecoveryManager.get_setting_from_db(db, "default_modem_credentials", kantor=k_code)
                if creds_json:
                    try:
                        parsed = json.loads(creds_json)
                        default_creds = [(c.get("username"), c.get("password")) for c in parsed if c.get("username")]
                    except Exception:
                        pass
                if not default_creds:
                    db_creds = db.query(ModemCredential).filter(ModemCredential.kantor_kode == k_code).order_by(ModemCredential.urutan.asc()).all()
                    default_creds = [(c.username, c.password) for c in db_creds]

                stats = {
                    "total_checked": 0,
                    "success": 0,
                    "failed": 0,
                    "warning": 0,
                    "critical": 0,
                    "los": 0,
                    "unreachable": 0,
                    "retried": 0,
                    "recovered": 0,
                    "batch_alerts_sent": 0
                }

                cust_ids = [c.id_pelanggan for c in customers]
            finally:
                db.close()

            # Jalankan worker pool secara terisolasi per sesi
            max_workers = min(15, max(4, len(cust_ids) // 2)) if cust_ids else 4

            def _scan_worker(c_id: str) -> Optional[Dict[str, Any]]:
                if state.is_stopped:
                    return None
                while state.is_paused:
                    time.sleep(1.0)
                    if state.is_stopped:
                        return None

                t_db = TenantDatabaseManager.get_tenant_session(k_code)
                try:
                    p = t_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == c_id).first()
                    if not p:
                        return None

                    ip_target = p.ip_ont or p.ip_router
                    if not ip_target:
                        return None

                    # Saring riwayat gagal
                    failed_history = []
                    if p.perangkat and p.perangkat.failed_credentials:
                        try:
                            failed_history = json.loads(p.perangkat.failed_credentials)
                        except Exception:
                            pass

                    scrape_res = ONTScraperService.scrape_ont(
                        ip=ip_target,
                        customer_user=p.user_admin,
                        customer_pass=p.pass_admin,
                        customer_name=p.nama,
                        default_credentials=default_creds,
                        warn_threshold=cfg.get("warning_threshold_dbm"),
                        crit_threshold=cfg.get("critical_threshold_dbm"),
                        is_mass_scan=True,
                        failed_credentials_history=failed_history
                    )

                    now = get_now_wib()
                    rx = scrape_res.get("rx_power")
                    status_koneksi = scrape_res.get("status_koneksi", "LOS")

                    log_entry = LogPerformaONT(
                        id_pelanggan=p.id_pelanggan,
                        waktu_cek=now,
                        rx_power=rx,
                        suhu_ont=scrape_res.get("suhu_ont"),
                        uptime=scrape_res.get("uptime"),
                        status_koneksi=status_koneksi,
                        latency_ms=scrape_res.get("latency_ms"),
                        keterangan=scrape_res.get("message")
                    )
                    t_db.add(log_entry)

                    if scrape_res.get("status_kredensial") == "VALID":
                        p.status_kredensial = "VALID"
                        if scrape_res.get("updated_user"):
                            p.user_admin = scrape_res.get("updated_user")
                        if scrape_res.get("updated_pass"):
                            p.pass_admin = scrape_res.get("updated_pass")
                        if scrape_res.get("mac_address"):
                            p.mac_address = scrape_res.get("mac_address")
                        if scrape_res.get("nama_wifi"):
                            p.nama_wifi = scrape_res.get("nama_wifi")
                        if scrape_res.get("password_wifi"):
                            p.password_wifi = scrape_res.get("password_wifi")
                        if scrape_res.get("jenis_modem"):
                            p.jenis_modem = scrape_res.get("jenis_modem")
                        if p.perangkat:
                            p.perangkat.failed_credentials = None

                    elif scrape_res.get("failed_credentials"):
                        # Simpan tambahan kredensial yang gagal
                        new_fails = scrape_res.get("failed_credentials", [])
                        current_fails = list(failed_history)
                        for nf in new_fails:
                            if nf not in current_fails:
                                current_fails.append(nf)
                        if p.perangkat:
                            p.perangkat.failed_credentials = json.dumps(current_fails)

                    t_db.commit()
                    return {
                        "id": c_id,
                        "status_koneksi": status_koneksi,
                        "success": scrape_res.get("success", False),
                        "error_type": scrape_res.get("error_type")
                    }
                except Exception as e:
                    t_db.rollback()
                    logger.error(f"[WORKER_SCAN] Gagal scan pelanggan {c_id}: {e}")
                    return None
                finally:
                    t_db.close()

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(_scan_worker, cid): cid for cid in cust_ids}
                for f in as_completed(futures):
                    res = f.result()
                    state.current_scan_index += 1
                    if res:
                        stats["total_checked"] += 1
                        st = res.get("status_koneksi")
                        if st == "NORMAL":
                            stats["success"] += 1
                        elif st == "WARNING":
                            stats["warning"] += 1
                        elif st == "CRITICAL":
                            stats["critical"] += 1
                        elif st == "LOS":
                            stats["los"] += 1

                        if res.get("error_type") == "UNREACHABLE":
                            stats["unreachable"] += 1

                    SchedulerStateManager.save_scan_state(state.current_scan_index, total_cust, kantor=k_code)

            state.last_scan_time = get_now_wib()
            state.last_sync_stats = stats
            SchedulerStateManager.delete_scan_state(k_code)

            # Pembersihan log lama otomatis
            SchedulerStateManager.cleanup_alert_logs(days=7)
            SchedulerStateManager.cleanup_activity_logs(days=60)

            return {
                "success": True,
                "kantor": k_code,
                "stats": stats,
                "finished_at": state.last_scan_time.isoformat()
            }
        finally:
            state.is_scanning = False
            state.lock.release()

