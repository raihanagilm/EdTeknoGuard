"""
scheduler_service.py - Layanan Penjadwalan Pemantauan Berkala ONT
Menjalankan APScheduler (BackgroundScheduler) untuk pemantauan redaman optik berkala,
sinkronisasi interval, kontrol pause/resume/stop, serta pemulihan otomatis reboot.

Arsitektur Modular:
- app.services.scheduler.state_manager: Manajemen state pemindaian & file checkpoint
- app.services.scheduler.recovery_manager: Crash recovery, reboot catch-up, konfigurasi DB
- app.services.scheduler.scan_runner: Eksekutor batch scanning multi-threading & single probe
"""

import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import dateutil.parser
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import Kantor
from app.core.tenant_database import TenantDatabaseManager
from app.services.scheduler.state_manager import SchedulerStateManager, OfficeScanState
from app.services.scheduler.recovery_manager import SchedulerRecoveryManager
from app.services.scheduler.scan_runner import ScanRunner

logger = logging.getLogger("scheduler_service")

class ONTSchedulerService:
    _instance = None

    # Forwarding helper methods untuk backward compatibility
    get_office_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.get_office_state(kantor))
    get_state_file_path = classmethod(lambda cls, kantor=None: SchedulerStateManager.get_state_file_path(kantor))
    save_scan_state = classmethod(lambda cls, curr, tot, kantor=None: SchedulerStateManager.save_scan_state(curr, tot, kantor))
    load_scan_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.load_scan_state(kantor))
    delete_scan_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.delete_scan_state(kantor))
    cleanup_old_logs = classmethod(lambda cls, db, days=30: SchedulerStateManager.cleanup_old_logs(db, days))
    cleanup_alert_logs = classmethod(lambda cls, days=7: SchedulerStateManager.cleanup_alert_logs(days))
    cleanup_activity_logs = classmethod(lambda cls, days=60: SchedulerStateManager.cleanup_activity_logs(days))
    cleanup_old_tickets = classmethod(lambda cls, days=90: SchedulerStateManager.cleanup_old_tickets(days))
    get_setting_from_db = classmethod(lambda cls, db, key, default=None, kantor=None: SchedulerRecoveryManager.get_setting_from_db(db, key, default, kantor))
    set_setting_in_db = classmethod(lambda cls, db, key, val, kantor=None: SchedulerRecoveryManager.set_setting_in_db(db, key, val, kantor))
    check_office_configuration = classmethod(lambda cls, db, kantor=None: SchedulerRecoveryManager.check_office_configuration(db, kantor))
    check_office_connectivity = classmethod(lambda cls, db, kantor=None: ScanRunner.check_office_connectivity(db, kantor))
    scan_single = classmethod(lambda cls, id_pelanggan, db=None: ScanRunner.scan_single(id_pelanggan, db))
    execute_scan_sync = classmethod(lambda cls, kantor=None: ScanRunner.execute_scan_sync(kantor))

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ONTSchedulerService, cls).__new__(cls)
            cls._instance.scheduler = BackgroundScheduler(timezone="Asia/Jakarta", daemon=True)
            cls._instance.is_running = False
        return cls._instance

    def start(self):
        """Memulai background scheduler dan menjadwalkan interval scan reguler"""
        if self.is_running:
            return

        interval_mins = settings.POLLING_INTERVAL_MINUTES or 5

        # Job Pemantauan Berkala Seluruh Kantor
        self.scheduler.add_job(
            self.scheduled_job_wrapper,
            "interval",
            minutes=interval_mins,
            id="ont_monitoring_scan",
            replace_existing=True
        )

        # Job Sinkronisasi MikroTik
        self.scheduler.add_job(
            self.mikrotik_sync_job_wrapper,
            "interval",
            minutes=3,
            id="mikrotik_auto_sync",
            replace_existing=True
        )

        # Job Pengingat Tagihan Harian Tiap Jam 10:00 WIB
        self.scheduler.add_job(
            self.daily_billing_reminder_job_wrapper,
            "cron",
            hour=10,
            minute=0,
            id="daily_billing_reminder",
            replace_existing=True
        )

        # Job Pembersihan Tiket SELESAI (> 90 hari / 3 bulan) & Log Lama Harian Tiap Jam 01:00 WIB
        self.scheduler.add_job(
            self.daily_maintenance_cleanup_job_wrapper,
            "cron",
            hour=1,
            minute=0,
            id="daily_maintenance_cleanup",
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True
        logger.info(f"[SCHEDULER] Engine APScheduler berhasil diaktifkan (Interval: {interval_mins} menit).")

        # Startup recovery & catch-up scan
        SchedulerRecoveryManager.handle_startup_recovery(self)

    def scheduled_job_wrapper(self):
        """Wrapper job yang memindai seluruh kantor aktif secara berurutan"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            codes = [k.kode for k in kantors]
        finally:
            m_db.close()

        for k in codes:
            try:
                # Periksa apakah kantor di-pause di DB
                t_db = TenantDatabaseManager.get_tenant_session(k)
                try:
                    status = SchedulerRecoveryManager.get_setting_from_db(t_db, "scheduler_status", default="RUNNING", kantor=k)
                    if status != "RUNNING":
                        logger.info(f"[SCHEDULER] Pemantauan berkala kantor '{k}' dilewati (Status di DB: {status}).")
                        continue
                finally:
                    t_db.close()

                ScanRunner.execute_scan_sync(kantor=k)
            except Exception as e:
                logger.error(f"[SCHEDULER] Gagal menjalankan scan otomatis kantor '{k}': {e}")

    def mikrotik_sync_job_wrapper(self):
        """Wrapper sinkronisasi berkala MikroTik per kantor"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                if k.mikrotik_host and k.mikrotik_user:
                    try:
                        from app.services.mikrotik_service import MikroTikSyncService
                        params = {
                            "host": k.mikrotik_host,
                            "port": k.mikrotik_port or 8728,
                            "username": k.mikrotik_user,
                            "password": k.mikrotik_pass or "",
                            "kantor": k.kode
                        }
                        t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                        try:
                            MikroTikSyncService.sync_customers_from_mikrotik(t_db, params)
                        finally:
                            t_db.close()
                    except Exception as e:
                        logger.debug(f"[MIKROTIK_SYNC] Gagal auto-sync kantor {k.nama}: {e}")
        finally:
            m_db.close()

    def daily_billing_reminder_job_wrapper(self):
        """Menjalankan pemeriksaan pengingat harian tagihan yang belum lunas (jam 10:00 WIB)"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                try:
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        from app.db.models import Pelanggan
                        unpaid_customers = t_db.query(Pelanggan).filter(
                            (Pelanggan.status_pembayaran == 'BELUM_BAYAR')
                        ).all()
                        logger.info(f"[BILLING_REMINDER] Kantor {k.nama}: {len(unpaid_customers)} pelanggan belum lunas tercatat pada audit harian.")
                    finally:
                        t_db.close()
                except Exception as e:
                    logger.debug(f"[BILLING_REMINDER] Error periksa tagihan kantor {k.nama}: {e}")
        finally:
            m_db.close()

    def daily_maintenance_cleanup_job_wrapper(self):
        """Menjalankan pembersihan otomatis berkala: tiket selesai > 90 hari, alert logs > 7 hari, logs ont > 30 hari"""
        logger.info("[MAINTENANCE_CLEANUP] Memulai pembersihan berkala sistem...")
        try:
            # 1. Hapus tiket kendala SELESAI yang berusia lebih dari 90 hari (3 bulan)
            del_tickets = SchedulerStateManager.cleanup_old_tickets(days=90)
            # 2. Hapus alert logs yang berusia lebih dari 7 hari
            del_alerts = SchedulerStateManager.cleanup_alert_logs(days=7)
            # 3. Hapus user activity logs yang berusia lebih dari 60 hari
            del_activities = SchedulerStateManager.cleanup_activity_logs(days=60)
            logger.info(
                f"[MAINTENANCE_CLEANUP] Pembersihan selesai: "
                f"{del_tickets} tiket SELESAI (> 90 hari), "
                f"{del_alerts} alert logs (> 7 hari), "
                f"{del_activities} audit logs (> 60 hari)."
            )
        except Exception as e:
            logger.error(f"[MAINTENANCE_CLEANUP] Terjadi kendala saat pembersihan berkala: {e}")

    def update_interval(self, minutes: int, kantor: Optional[str] = None):
        """Mengubah interval menit scanning"""
        if minutes < 1:
            minutes = 1

        if self.scheduler.get_job("ont_monitoring_scan"):
            self.scheduler.reschedule_job("ont_monitoring_scan", trigger="interval", minutes=minutes)
            logger.info(f"[SCHEDULER] Interval pemantauan diubah menjadi {minutes} menit.")

        k_code = (kantor or "cabang").lower().strip()
        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "polling_interval_minutes", str(minutes), kantor=k_code)
        finally:
            db.close()

    def stop(self, kantor: Optional[str] = None):
        """Menghentikan / menjeda pemantauan otomatis"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = True

        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_status", "STOPPED", kantor=k_code)
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_paused_at", get_now_wib().isoformat(), kantor=k_code)
        finally:
            db.close()

    def resume(self, kantor: Optional[str] = None):
        """Melanjutkan pemantauan otomatis"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = False

        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_status", "RUNNING", kantor=k_code)
        finally:
            db.close()

    def pause_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = True
        return {"success": True, "message": f"Pemindaian kantor {k_code} dijeda sementara."}

    def resume_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = False
        return {"success": True, "message": f"Pemindaian kantor {k_code} dilanjutkan."}

    def stop_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_stopped = True
        state.is_paused = False
        return {"success": True, "message": f"Pemindaian kantor {k_code} dihentikan."}

    def check_paused_reminder(self, db: Session) -> Optional[Dict[str, Any]]:
        return None

    def snooze_paused_reminder(self, db: Session):
        pass

    def get_status(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Mengambil ringkasan status scheduler dan checkpoint pemantauan kantor"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)

        db = TenantDatabaseManager.get_tenant_session(k_code)
        is_office_active = True
        last_scan_dt: Optional[datetime] = None
        try:
            cfg = SchedulerRecoveryManager.check_office_configuration(db, kantor=k_code)

            # 1. Tentukan waktu selesai pemantauan terakhir:
            # Prioritas 1: State in-memory (jika pemindaian baru saja berjalan di sesi server ini)
            if state.last_scan_time:
                last_scan_dt = state.last_scan_time
            else:
                # Prioritas 2: Baca setting 'last_scan_time' dari tabel system_settings
                db_last_scan = SchedulerRecoveryManager.get_setting_from_db(db, "last_scan_time", kantor=k_code)
                if db_last_scan and db_last_scan != "-":
                    try:
                        last_scan_dt = dateutil.parser.parse(db_last_scan)
                    except Exception:
                        pass
                # Prioritas 3: Fallback ke timestamp waktu_cek log_performa_ont terakhir di DB
                if not last_scan_dt:
                    from app.db.models import LogPerformaONT
                    latest_log = db.query(LogPerformaONT.waktu_cek).order_by(LogPerformaONT.waktu_cek.desc()).first()
                    if latest_log and latest_log[0]:
                        last_scan_dt = latest_log[0]

            # 2. Cek status aktif kantor di master DB
            from app.db.models import Kantor
            m_db = TenantDatabaseManager.get_tenant_session(None)
            try:
                k_obj = m_db.query(Kantor).filter(Kantor.kode == k_code).first()
                if k_obj is not None:
                    is_office_active = bool(k_obj.is_active)
            finally:
                m_db.close()
        finally:
            db.close()

        status_str = cfg.get("scheduler_status", "RUNNING")
        if state.is_paused:
            status_str = "PAUSED"

        interval_mins = cfg.get("polling_interval_minutes", settings.POLLING_INTERVAL_MINUTES)
        try:
            interval_mins = int(interval_mins)
        except Exception:
            interval_mins = settings.POLLING_INTERVAL_MINUTES

        # Format tanggal tampilan
        last_scan_formatted = last_scan_dt.strftime("%d/%m/%Y %H:%M:%S") if last_scan_dt else "-"

        # 3. Hitung Jadwal Berikutnya = waktu selesai pemantauan terakhir + interval pemantauan (menit)
        if status_str == "RUNNING" and is_office_active and not state.is_paused:
            if last_scan_dt:
                from datetime import timedelta
                next_dt = last_scan_dt + timedelta(minutes=interval_mins)
                now_curr = get_now_wib()
                # Jika sudah melewati next_dt tetapi belum giliran dieksekusi atau baru dimulai
                if state.is_scanning:
                    next_run_formatted = "Sedang Memindai..."
                else:
                    next_run_formatted = next_dt.strftime("%d/%m/%Y %H:%M:%S")
            else:
                next_run_formatted = "Segera"
        elif status_str == "STOPPED":
            next_run_formatted = "Jadwal Dijeda"
        elif not is_office_active:
            next_run_formatted = "Kantor Nonaktif"
        else:
            next_run_formatted = "-"

        # Hitung durasi berjalan & estimasi sisa waktu
        elapsed = round(time.time() - state.scan_start_time, 1) if (state.is_scanning and state.scan_start_time > 0) else 0.0
        if state.is_scanning and state.current_scan_index > 0 and state.total_customers_in_scan > 0:
            avg_per_ont = elapsed / state.current_scan_index
            est_total = round(avg_per_ont * state.total_customers_in_scan, 1)
        else:
            est_total = state.last_scan_duration if state.last_scan_duration > 0 else 0.0

        percent = int((state.current_scan_index / state.total_customers_in_scan) * 100) if state.total_customers_in_scan > 0 else 0

        scan_progress = {
            "current": state.current_scan_index,
            "total": state.total_customers_in_scan,
            "percent": percent,
            "is_scanning": state.is_scanning,
            "is_paused": state.is_paused,
            "elapsed_seconds": int(elapsed),
            "estimated_total_seconds": int(est_total),
            "last_scan_duration": int(state.last_scan_duration),
            "target_kantor": k_code
        }

        return {
            "status": status_str,
            "scheduler_status": status_str,
            "interval_minutes": interval_mins,
            "is_office_active": is_office_active,
            "is_configured": cfg.get("is_configured", True),
            "missing_fields": cfg.get("missing_fields", []),
            "config_error": cfg.get("error_message"),
            "is_running": self.is_running,
            "is_scanning": state.is_scanning,
            "is_paused": state.is_paused,
            "current_index": state.current_scan_index,
            "total_customers": state.total_customers_in_scan,
            "last_scan_time": last_scan_formatted,
            "next_run_time": next_run_formatted,
            "last_sync_stats": state.last_sync_stats,
            "scan_progress": scan_progress,
            "unread_tickets_count": 0,
            "kantor": k_code
        }


# Singleton instances
scheduler = ONTSchedulerService()
ont_scheduler = scheduler
