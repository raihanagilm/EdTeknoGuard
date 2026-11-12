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

            is_valid_modem = (cust.status_kredensial == "VALID")
            scrape_res = ONTScraperService.scrape_ont(
                ip=ip_target,
                customer_user=cust.user_admin,
                customer_pass=cust.pass_admin,
                customer_name=cust.nama,
                default_credentials=default_creds,
                warn_threshold=cfg.get("warning_threshold_dbm"),
                crit_threshold=cfg.get("critical_threshold_dbm"),
                exhaustive_first_scan=True,
                is_valid_modem=is_valid_modem
            )

            # Catat log hasil scan on-demand mandiri (dikecualikan dari grafik monitoring massal)
            now = get_now_wib()
            rx = scrape_res.get("rx_power")
            status_koneksi = scrape_res.get("status_koneksi", "LOS")

            raw_msg = scrape_res.get("message") or status_koneksi
            keterangan_single = f"Single Check: {raw_msg}"

            log_entry = LogPerformaONT(
                id_pelanggan=cust.id_pelanggan,
                waktu_cek=now,
                rx_power=rx,
                suhu_ont=scrape_res.get("suhu_ont"),
                uptime=scrape_res.get("uptime"),
                status_koneksi=status_koneksi,
                latency_ms=scrape_res.get("latency_ms"),
                keterangan=keterangan_single
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
                if cust.perangkat:
                    cust.perangkat.failed_credentials = None
            elif scrape_res.get("status_kredensial") == "INVALID":
                cust.status_kredensial = "INVALID"

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
            state.scan_start_time = time.time()
            # Catat waktu awal pemindaian batch agar seluruh pelanggan dalam 1 siklus memiliki timestamp identik
            scan_batch_time = get_now_wib()

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

                    is_valid_modem = (p.status_kredensial == "VALID")
                    scrape_res = ONTScraperService.scrape_ont(
                        ip=ip_target,
                        customer_user=p.user_admin,
                        customer_pass=p.pass_admin,
                        customer_name=p.nama,
                        default_credentials=default_creds,
                        warn_threshold=cfg.get("warning_threshold_dbm"),
                        crit_threshold=cfg.get("critical_threshold_dbm"),
                        is_mass_scan=True,
                        failed_credentials_history=failed_history,
                        is_valid_modem=is_valid_modem
                    )

                    rx = scrape_res.get("rx_power")
                    status_koneksi = scrape_res.get("status_koneksi", "LOS")

                    # Gunakan scan_batch_time seragam untuk seluruh pelanggan dalam 1 siklus pemindaian
                    log_entry = LogPerformaONT(
                        id_pelanggan=p.id_pelanggan,
                        waktu_cek=scan_batch_time,
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

                    elif scrape_res.get("status_kredensial") == "INVALID":
                        p.status_kredensial = "INVALID"
                        if scrape_res.get("failed_credentials"):
                            new_fails = scrape_res.get("failed_credentials", [])
                            current_fails = list(failed_history)
                            for nf in new_fails:
                                if nf not in current_fails:
                                    current_fails.append(nf)
                            if p.perangkat:
                                p.perangkat.failed_credentials = json.dumps(current_fails)

                    elif scrape_res.get("failed_credentials"):
                        # Simpan tambahan kredensial yang gagal
                        new_fails = scrape_res.get("failed_credentials", [])
                        current_fails = list(failed_history)
                        for nf in new_fails:
                            if nf not in current_fails:
                                current_fails.append(nf)
                        if p.perangkat:
                            p.perangkat.failed_credentials = json.dumps(current_fails)

                    # Push notifikasi transisi status koneksi khusus pelanggan yang memiliki FCM token
                    if p.fcm_token and p.fcm_token.strip():
                        prev_log = t_db.query(LogPerformaONT).filter(
                            LogPerformaONT.id_pelanggan == p.id_pelanggan
                        ).order_by(LogPerformaONT.id.desc()).offset(1).first()
                        prev_status = prev_log.status_koneksi if prev_log else "NORMAL"

                        if status_koneksi == "LOS" and prev_status != "LOS":
                            try:
                                from app.services.fcm_service import send_push_notification
                                send_push_notification(
                                    tokens=[p.fcm_token.strip()],
                                    title="Pemberitahuan Gangguan Jaringan",
                                    body="Mohon maaf, koneksi internet Anda saat ini terdeteksi mengalami gangguan (LOS). Tim teknisi kami sedang segera menangani kendala ini.",
                                    data={
                                        "target_tab": "beranda",
                                        "level": "los",
                                        "type": "cust_los"
                                    },
                                    channel_id="tekno_customer_channel"
                                )
                            except Exception as fcm_err:
                                logger.warning(f"[FCM_CUST_LOS] Gagal push notif LOS ke pelanggan {p.id_pelanggan}: {fcm_err}")
                        elif status_koneksi == "NORMAL" and prev_status == "LOS":
                            try:
                                from app.services.fcm_service import send_push_notification
                                send_push_notification(
                                    tokens=[p.fcm_token.strip()],
                                    title="Koneksi Internet Telah Pulih",
                                    body="Koneksi internet Anda telah kembali normal dan aktif. Terima kasih atas kesabaran Anda telah menggunakan layanan kami!",
                                    data={
                                        "target_tab": "beranda",
                                        "level": "info",
                                        "type": "cust_recovery"
                                    },
                                    channel_id="tekno_customer_channel"
                                )
                            except Exception as fcm_err:
                                logger.warning(f"[FCM_CUST_REC] Gagal push notif pulih ke pelanggan {p.id_pelanggan}: {fcm_err}")

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

            if state.scan_start_time > 0:
                state.last_scan_duration = round(time.time() - state.scan_start_time, 1)

            finished_time = get_now_wib()
            state.last_scan_time = finished_time
            state.last_sync_stats = stats
            SchedulerStateManager.delete_scan_state(k_code)

            # Persist last_scan_time dan last_scan_duration ke database
            t_db_finish = TenantDatabaseManager.get_tenant_session(k_code)
            try:
                SchedulerRecoveryManager.set_setting_in_db(t_db_finish, "last_scan_time", finished_time.strftime("%Y-%m-%d %H:%M:%S"), kantor=k_code)
                SchedulerRecoveryManager.set_setting_in_db(t_db_finish, "last_scan_duration", str(state.last_scan_duration), kantor=k_code)
            except Exception as e:
                logger.error(f"[SCAN] Gagal menyimpan last_scan_time ke database: {e}")
            finally:
                t_db_finish.close()

            # Pembersihan log lama otomatis
            SchedulerStateManager.cleanup_alert_logs(days=7)
            SchedulerStateManager.cleanup_activity_logs(days=60)

            # Resolusi pengaturan audio & jam tenang (night mode & getar)
            from app.services.fcm_service import resolve_notification_audio_settings, send_push_notification
            audio_settings = resolve_notification_audio_settings(kantor=k_code, is_emergency=True)

            # 1. Trigger Push Notifikasi FCM Khusus Sinyal Terputus (LOS)
            los_count = stats.get("los", 0)
            if los_count > 0:
                try:
                    from app.core.database import SessionLocal as MasterSessionLocal
                    from app.db.models import User as MasterUser
                    m_db_los = MasterSessionLocal()
                    try:
                        users_to_alert = m_db_los.query(MasterUser).filter(
                            MasterUser.is_active == True,
                            MasterUser.fcm_token != None,
                            MasterUser.fcm_token != ""
                        ).all()
                        los_tokens = []
                        for u in users_to_alert:
                            if u.role == "super admin":
                                los_tokens.append(u.fcm_token)
                            elif k_code.lower() in [k.lower() for k in u.allowed_kantor_list]:
                                los_tokens.append(u.fcm_token)
                        los_tokens = list(set(los_tokens))
                        if los_tokens:
                            title = f"[SINYAL TERPUTUS] Kantor: {k_code.upper()}"
                            body = f"{los_count} modem LOS (terputus). Segera cek kabel fisik."
                            send_push_notification(
                                tokens=los_tokens,
                                title=title,
                                body=body,
                                data={
                                    "target_tab": "pelanggan",
                                    "target_kantor": k_code,
                                    "target_status": "LOS",
                                    "level": "los",
                                    "type": "monitoring_los",
                                    "vibration": audio_settings["vibration"]
                                },
                                channel_id=audio_settings["channel_id"],
                                sound=audio_settings["sound"]
                            )
                    finally:
                        m_db_los.close()
                except Exception as fcm_err:
                    logger.warning(f"[FCM_ALERT_LOS] Gagal mengirim push notifikasi LOS: {fcm_err}")

            # 2. Trigger Push Notifikasi FCM Khusus Redaman Kritis
            crit_count = stats.get("critical", 0)
            if crit_count > 0:
                try:
                    from app.core.database import SessionLocal as MasterSessionLocal
                    from app.db.models import User as MasterUser
                    m_db_crit = MasterSessionLocal()
                    try:
                        users_to_alert = m_db_crit.query(MasterUser).filter(
                            MasterUser.is_active == True,
                            MasterUser.fcm_token != None,
                            MasterUser.fcm_token != ""
                        ).all()
                        crit_tokens = []
                        for u in users_to_alert:
                            if u.role == "super admin":
                                crit_tokens.append(u.fcm_token)
                            elif k_code.lower() in [k.lower() for k in u.allowed_kantor_list]:
                                crit_tokens.append(u.fcm_token)
                        crit_tokens = list(set(crit_tokens))
                        if crit_tokens:
                            title = f"[REDAMAN KRITIS] Kantor: {k_code.upper()}"
                            body = f"{crit_count} modem Kritis (<= -27.0 dBm). Segera cek redaman."
                            send_push_notification(
                                tokens=crit_tokens,
                                title=title,
                                body=body,
                                data={
                                    "target_tab": "pelanggan",
                                    "target_kantor": k_code,
                                    "target_status": "CRITICAL",
                                    "level": "critical",
                                    "type": "monitoring_critical",
                                    "vibration": audio_settings["vibration"]
                                },
                                channel_id=audio_settings["channel_id"],
                                sound=audio_settings["sound"]
                            )
                    finally:
                        m_db_crit.close()
                except Exception as fcm_err:
                    logger.warning(f"[FCM_ALERT_CRIT] Gagal mengirim push notifikasi Kritis: {fcm_err}")

            # 3. Trigger Push Notifikasi FCM berkala jika terdapat tiket kendala MENUNGGU (Format Ringkas)
            try:
                from app.db.models import TiketKendala
                t_db_ticket = TenantDatabaseManager.get_tenant_session(k_code)
                try:
                    pending_count = t_db_ticket.query(TiketKendala).filter(
                        TiketKendala.status == "MENUNGGU"
                    ).count()
                    if pending_count > 0:
                        from app.core.database import SessionLocal as MasterSessionLocal
                        from app.db.models import User as MasterUser
                        m_db_tkt = MasterSessionLocal()
                        try:
                            users_to_alert = m_db_tkt.query(MasterUser).filter(
                                MasterUser.is_active == True,
                                MasterUser.fcm_token != None,
                                MasterUser.fcm_token != ""
                            ).all()
                            tkt_tokens = []
                            for u in users_to_alert:
                                if u.role == "super admin":
                                    tkt_tokens.append(u.fcm_token)
                                elif k_code.lower() in [k.lower() for k in u.allowed_kantor_list]:
                                    tkt_tokens.append(u.fcm_token)
                            tkt_tokens = list(set(tkt_tokens))
                            if tkt_tokens:
                                send_push_notification(
                                    tokens=tkt_tokens,
                                    title=f"[TIKET] Kantor: {k_code.upper()}",
                                    body=f"{pending_count} tiket MENUNGGU belum diproses.",
                                    data={
                                        "target_tab": "tiket",
                                        "target_kantor": k_code,
                                        "target_status": "MENUNGGU",
                                        "level": "warning",
                                        "type": "ticket_pending_reminder",
                                        "vibration": audio_settings["vibration"]
                                    },
                                    channel_id=audio_settings["channel_id"],
                                    sound=audio_settings["sound"]
                                )
                        finally:
                            m_db_tkt.close()
                finally:
                    t_db_ticket.close()
            except Exception as ticket_err:
                logger.warning(f"[FCM_TICKET_REMINDER] Gagal cek tiket menunggu: {ticket_err}")

            return {
                "success": True,
                "kantor": k_code,
                "stats": stats,
                "finished_at": state.last_scan_time.isoformat()
            }
        finally:
            state.is_scanning = False
            state.lock.release()

