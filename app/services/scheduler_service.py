"""
scheduler_service.py - Layanan Penjadwalan Pemantauan Berkala ONT
Menjalankan APScheduler (BackgroundScheduler) untuk pemantauan redaman optik berkala,
sinkronisasi interval, kontrol pause/resume/stop, serta pemulihan otomatis reboot.

Arsitektur Modular:
- app.services.scheduler.state_manager: Manajemen state pemindaian & file checkpoint
- app.services.scheduler.recovery_manager: Crash recovery, reboot catch-up, konfigurasi DB
- app.services.scheduler.scan_runner: Eksekutor batch scanning multi-threading & single probe
"""

import logging
from typing import Dict, Any, Optional
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
        try:
            cfg = SchedulerRecoveryManager.check_office_configuration(db, kantor=k_code)
            job = self.scheduler.get_job("ont_monitoring_scan")
            next_run = job.next_run_time.isoformat() if (job and job.next_run_time) else None
        finally:
            db.close()

        status_str = cfg.get("scheduler_status", "RUNNING")
        if state.is_paused:
            status_str = "PAUSED"

        return {
            "status": status_str,
            "is_running": self.is_running,
            "is_scanning": state.is_scanning,
            "is_paused": state.is_paused,
            "current_index": state.current_scan_index,
            "total_customers": state.total_customers_in_scan,
            "last_scan_time": state.last_scan_time.isoformat() if state.last_scan_time else None,
            "next_run_time": next_run,
            "last_sync_stats": state.last_sync_stats,
            "kantor": k_code
        }


# Singleton instances
scheduler = ONTSchedulerService()
ont_scheduler = scheduler
