import asyncio
import os
import json
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib, get_today_wib

from app.core.database import SessionLocal
from app.core.config import settings
from app.db.models import Pelanggan, PerangkatONT, LogPerformaONT, SystemSetting, AlertLog, UserActivityLog, Kantor
from app.services.snmp_service import SNMPService
from app.services.ont_scraper_service import ONTScraperService

logger = logging.getLogger("scheduler_service")

class OfficeScanState:
    def __init__(self, kantor: str):
        self.kantor: str = kantor
        self.is_scanning: bool = False
        self.is_paused: bool = False
        self.stop_requested: bool = False
        self.is_network_error: bool = False
        self.scan_current: int = 0
        self.scan_total: int = 0
        self.scan_start_time: float = 0.0
        self.last_scan_duration: float = 0.0
        self.resume_index: int = 0
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

class MonitoringScheduler:
    _instance = None
    _scheduler: Optional[BackgroundScheduler] = None
    _office_states: Dict[str, OfficeScanState] = {}
    _state_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MonitoringScheduler, cls).__new__(cls)
            cls._instance._scheduler = BackgroundScheduler(daemon=True)
            cls._instance._office_states = {}
            cls._instance._state_lock = threading.Lock()
        return cls._instance

    @classmethod
    def get_office_state(cls, kantor: Optional[str] = None) -> OfficeScanState:
        k = (kantor or "all").lower().strip()
        with cls._state_lock:
            if k not in cls._office_states:
                cls._office_states[k] = OfficeScanState(k)
            return cls._office_states[k]

    @classmethod
    def get_state_file_path(cls, kantor: Optional[str] = None) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        k = (kantor or "all").lower().strip()
        return os.path.join(data_dir, f"scan_state_{k}.json")

    @classmethod
    def save_scan_state(cls, current_index: int, total: int, kantor: Optional[str] = None):
        try:
            k = (kantor or "all").lower().strip()
            filepath = cls.get_state_file_path(k)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump({
                    "status": "PAUSED",
                    "current_index": current_index,
                    "total": total,
                    "kantor": k,
                    "timestamp": get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
                }, f, indent=2)
            logger.info(f"[STATE] State pemindaian disimpan ke JSON: {current_index}/{total} (Kantor: {k})")
        except Exception as e:
            logger.error(f"[STATE] Gagal menyimpan scan_state_{kantor}.json: {e}")

    @classmethod
    def load_scan_state(cls, kantor: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            k = (kantor or "all").lower().strip()
            filepath = cls.get_state_file_path(k)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"[STATE] Gagal membaca scan_state_{kantor}.json: {e}")
        return None

    @classmethod
    def delete_scan_state(cls, kantor: Optional[str] = None):
        try:
            k = (kantor or "all").lower().strip()
            filepath = cls.get_state_file_path(k)
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"[STATE] State file scan_state_{k}.json berhasil dihapus.")
        except Exception as e:
            logger.error(f"[STATE] Gagal menghapus scan_state_{kantor}.json: {e}")

    @classmethod
    def cleanup_old_logs(cls, db: Session, days: int = 30) -> int:
        """Menghapus riwayat log performa ONT yang berusia lebih dari 30 hari."""
        try:
            cutoff = get_now_wib() - timedelta(days=days)
            deleted_logs = db.query(LogPerformaONT).filter(LogPerformaONT.waktu_cek < cutoff).delete(synchronize_session=False)
            db.commit()
            if deleted_logs > 0:
                logger.info(f"[CLEANUP] Berhasil membersihkan {deleted_logs} log performa ONT lama (> {days} hari).")
            return deleted_logs
        except Exception as e:
            logger.error(f"[CLEANUP] Gagal membersihkan log performa ONT lama: {e}")
            db.rollback()
            return 0

    @classmethod
    def cleanup_alert_logs(cls, days: int = 7) -> int:
        """Menghapus alert_logs yang berusia lebih dari 7 hari di seluruh database tenant kantor."""
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        total_deleted = 0
        cutoff = get_now_wib() - timedelta(days=days)
        all_k = get_all_kantor_codes()
        for k in all_k:
            t_db = TenantDatabaseManager.get_tenant_session(k)
            try:
                deleted = t_db.query(AlertLog).filter(AlertLog.waktu_kirim < cutoff).delete(synchronize_session=False)
                t_db.commit()
                total_deleted += deleted
            except Exception as e:
                t_db.rollback()
                logger.error(f"[CLEANUP] Gagal membersihkan alert log kantor '{k}': {e}")
            finally:
                t_db.close()
        if total_deleted > 0:
            logger.info(f"[CLEANUP] Berhasil membersihkan {total_deleted} alert log lama (> {days} hari) di seluruh kantor.")
        return total_deleted

    @classmethod
    def cleanup_activity_logs(cls, days: int = 60) -> int:
        """Menghapus user_activity_logs yang berusia lebih dari 60 hari di seluruh database tenant kantor."""
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        total_deleted = 0
        cutoff = get_now_wib() - timedelta(days=days)
        all_k = get_all_kantor_codes()
        for k in all_k:
            t_db = TenantDatabaseManager.get_tenant_session(k)
            try:
                deleted = t_db.query(UserActivityLog).filter(UserActivityLog.created_at < cutoff).delete(synchronize_session=False)
                t_db.commit()
                total_deleted += deleted
            except Exception as e:
                t_db.rollback()
                logger.error(f"[CLEANUP] Gagal membersihkan log aktivitas kantor '{k}': {e}")
            finally:
                t_db.close()
        if total_deleted > 0:
            logger.info(f"[CLEANUP] Berhasil membersihkan {total_deleted} log aktivitas lama (> {days} hari) di seluruh kantor.")
        return total_deleted


    @classmethod
    def get_setting_from_db(cls, db: Session, key: str, default: str, kantor: Optional[str] = None) -> str:
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        if k:
            # Cari Kantor untuk dapatkan id_kantor jika ada
            from app.db.models import Kantor
            k_obj = db.query(Kantor).filter((Kantor.nama.ilike(k)) | (Kantor.id_kantor == (int(k) if k.isdigit() else -1))).first()
            if k_obj:
                item = db.query(SystemSetting).filter(
                    SystemSetting.key_name == key,
                    (SystemSetting.id_kantor == k_obj.id_kantor) | (SystemSetting.kantor_kode == k)
                ).first()
            else:
                item = db.query(SystemSetting).filter(SystemSetting.key_name == key, SystemSetting.kantor_kode == k).first()
            if item and item.value_text is not None:
                return item.value_text
        # Fallback ke setting global (kantor_kode IS NULL dan id_kantor IS NULL)
        item_global = db.query(SystemSetting).filter(SystemSetting.key_name == key, SystemSetting.id_kantor.is_(None), SystemSetting.kantor_kode.is_(None)).first()
        return item_global.value_text if (item_global and item_global.value_text is not None) else default

    @classmethod
    def set_setting_in_db(cls, db: Session, key: str, value: str, kantor: Optional[str] = None):
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        target_id_kantor = None
        if k:
            from app.db.models import Kantor
            k_obj = db.query(Kantor).filter((Kantor.nama.ilike(k)) | (Kantor.id_kantor == (int(k) if k.isdigit() else -1))).first()
            if k_obj:
                target_id_kantor = k_obj.id_kantor

        q = db.query(SystemSetting).filter(SystemSetting.key_name == key)
        if target_id_kantor:
            q = q.filter((SystemSetting.id_kantor == target_id_kantor) | (SystemSetting.kantor_kode == k))
        elif k:
            q = q.filter(SystemSetting.kantor_kode == k)
        else:
            q = q.filter(SystemSetting.id_kantor.is_(None), SystemSetting.kantor_kode.is_(None))
        item = q.first()
        if item:
            item.value_text = value
            if target_id_kantor and not item.id_kantor:
                item.id_kantor = target_id_kantor
            item.updated_at = get_now_wib()
        else:
            db.add(SystemSetting(id_kantor=target_id_kantor, kantor_kode=k, key_name=key, value_text=value))
        db.commit()

    def start(self):
        if self._scheduler and not self._scheduler.running:
            from app.core.security import get_all_kantor_codes
            from app.core.tenant_database import TenantDatabaseManager
            all_k = get_all_kantor_codes()
            primary_k = all_k[0] if all_k else None
            db = TenantDatabaseManager.get_tenant_session(primary_k) if primary_k else SessionLocal()
            last_scan_time_str = "-"
            try:
                interval_str = self.get_setting_from_db(db, "polling_interval_minutes", str(settings.POLLING_INTERVAL_MINUTES))
                interval = int(interval_str)
                current_status = self.get_setting_from_db(db, "scheduler_status", "RUNNING")
                last_scan_time_str = self.get_setting_from_db(db, "last_scan_time", "-")
            except Exception as e:
                logger.error(f"Gagal membaca pengaturan scheduler dari DB: {e}")
                interval = settings.POLLING_INTERVAL_MINUTES
                current_status = "RUNNING"
                
            try:
                # Pembersihan log lama > 30 hari otomatis saat startup di seluruh kantor
                for k in all_k:
                    t_db = TenantDatabaseManager.get_tenant_session(k)
                    try:
                        self.cleanup_old_logs(t_db, days=30)
                    finally:
                        t_db.close()
            except Exception as e:
                logger.error(f"Gagal membersihkan log lama: {e}")

            # Catat aktivitas boot recovery sistem ke UserActivityLog
            try:
                from app.modules.activity_logs.service import ActivityLogService
                ActivityLogService.log_activity(
                    db=db,
                    username="SYSTEM_DAEMON",
                    action="STARTUP_RECOVERY",
                    status="SUCCESS",
                    keterangan=f"Aplikasi EdTeknoGuard aktif kembali. Status Scheduler: {current_status} (Interval: {interval} menit). Pemantauan otomatis dipulihkan."
                )
            except Exception as e:
                logger.error(f"Gagal mencatat log startup recovery: {e}")
            finally:
                db.close()

            settings.POLLING_INTERVAL_MINUTES = interval
            
            # Deteksi cerdas waktu server mati saat reboot / startup
            need_immediate_scan = False
            first_run_time = None
            if current_status == "RUNNING":
                if not last_scan_time_str or last_scan_time_str == "-":
                    need_immediate_scan = True
                    first_run_time = datetime.now() + timedelta(seconds=5)
                else:
                    try:
                        last_dt = datetime.strptime(last_scan_time_str, "%Y-%m-%d %H:%M:%S")
                        now_dt = get_now_wib()
                        elapsed_seconds = (now_dt - last_dt).total_seconds()
                        interval_seconds = interval * 60
                        if elapsed_seconds >= interval_seconds:
                            # Server mati lama (melebihi interval): langsung mulai dalam 5 detik
                            need_immediate_scan = True
                            first_run_time = datetime.now() + timedelta(seconds=5)
                            logger.info(f"[SMART-RECOVERY] Server mati lama (terlewat {int(elapsed_seconds)}s >= {interval_seconds}s). Jadwal langsung dimulai dalam 5 detik.")
                        else:
                            # Server mati sebentar: lanjutkan sisa waktu jadwal otomatis
                            remaining_seconds = max(5, int(interval_seconds - elapsed_seconds))
                            first_run_time = datetime.now() + timedelta(seconds=remaining_seconds)
                            logger.info(f"[SMART-RECOVERY] Server mati sebentar ({int(elapsed_seconds)}s). Jadwal dilanjutkan mengikuti sisa waktu ({remaining_seconds}s lagi).")
                    except Exception as e:
                        logger.warning(f"[SMART-RECOVERY] Gagal parsing last_scan_time '{last_scan_time_str}': {e}. Memulai dalam 5 detik.")
                        need_immediate_scan = True
                        first_run_time = datetime.now() + timedelta(seconds=5)

            # Daftarkan job interval pemantauan utama (evaluasi loop tiap 1 menit per kantor sesuai setting DB masing-masing)
            job_kwargs = {
                "func": self.scheduled_job_wrapper,
                "trigger": "interval",
                "minutes": 1,
                "id": "ont_monitoring_job",
                "replace_existing": True
            }
            if current_status == "RUNNING" and first_run_time:
                job_kwargs["next_run_time"] = first_run_time

            self._scheduler.add_job(**job_kwargs)

            # Job background mandiri: Evaluasi sinkronisasi MikroTik RouterOS per kantor (evaluasi tiap 1 menit sesuai setting interval kantor)
            self._scheduler.add_job(
                self.mikrotik_sync_job_wrapper,
                "interval",
                minutes=1,
                id="mikrotik_auto_sync_job",
                replace_existing=True,
                next_run_time=datetime.now() + timedelta(seconds=5)
            )

            # Job cleanup alert_logs: hapus otomatis tiap 7 hari (jalan setiap hari pukul 02:00)
            self._scheduler.add_job(
                self.cleanup_alert_logs,
                "cron",
                hour=2,
                minute=0,
                id="cleanup_alert_logs_job",
                replace_existing=True
            )
            # Job cleanup activity_logs: hapus otomatis tiap 2 bulan (jalan setiap hari pukul 02:30)
            self._scheduler.add_job(
                self.cleanup_activity_logs,
                "cron",
                hour=2,
                minute=30,
                id="cleanup_activity_logs_job",
                replace_existing=True
            )
            self._scheduler.start()
            
            if current_status == "STOPPED":
                logger.info(f"Aplikasi aktif. Status Scheduler dipulihkan ke: STOPPED (Jeda Pemantauan) sesuai status terakhir.")
            else:
                logger.info(f"Aplikasi aktif. Status Scheduler dipulihkan ke: RUNNING (Interval: {interval} menit).")

            logger.info("[CLEANUP] Job cleanup alert_logs (setiap hari, >7 hari) & activity_logs (setiap hari, >60 hari) aktif.")

    def update_interval(self, minutes: int, kantor: Optional[str] = None):
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        all_k = get_all_kantor_codes()
        targets = [kantor.lower().strip()] if (kantor and kantor != "all") else all_k
        for k in targets:
            t_db = TenantDatabaseManager.get_tenant_session(k)
            try:
                self.set_setting_in_db(t_db, "polling_interval_minutes", str(minutes), kantor=k)
            finally:
                t_db.close()

        if not kantor or kantor == "all":
            settings.POLLING_INTERVAL_MINUTES = minutes
        logger.info(f"Interval pemantauan kantor '{kantor or 'global'}' diperbarui menjadi {minutes} menit di DB.")

    def stop(self, kantor: Optional[str] = None):
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        all_k = get_all_kantor_codes()
        targets = [kantor.lower().strip()] if (kantor and kantor != "all") else all_k
        now_str = get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
        for k in targets:
            t_db = TenantDatabaseManager.get_tenant_session(k)
            try:
                self.set_setting_in_db(t_db, "scheduler_status", "STOPPED", kantor=k)
                self.set_setting_in_db(t_db, "scheduler_paused_at", now_str, kantor=k)
                if not kantor or kantor == "all":
                    self.set_setting_in_db(t_db, "last_paused_reminder_at", now_str, kantor=k)
            finally:
                t_db.close()
        logger.info(f"Pemantauan otomatis ONT kantor {kantor or 'SELURUH KANTOR'} dijeda (STOPPED) dan disimpan permanen.")

    def resume(self, kantor: Optional[str] = None):
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        all_k = get_all_kantor_codes()
        targets = [kantor.lower().strip()] if (kantor and kantor != "all") else all_k
        for k in targets:
            t_db = TenantDatabaseManager.get_tenant_session(k)
            try:
                self.set_setting_in_db(t_db, "scheduler_status", "RUNNING", kantor=k)
                self.set_setting_in_db(t_db, "scheduler_paused_at", "", kantor=k)
            finally:
                t_db.close()
        logger.info(f"Pemantauan otomatis ONT kantor {kantor or 'SELURUH KANTOR'} dilanjutkan (RUNNING) dan disimpan permanen.")

    @classmethod
    def check_paused_reminder(cls, db: Session) -> Optional[Dict[str, Any]]:
        """Mengecek apakah scheduler sedang dijeda dan sudah waktunya memberi notifikasi pengingat 1 jam ke Super Admin."""
        try:
            status = cls.get_setting_from_db(db, "scheduler_status", "RUNNING")
            if status != "STOPPED":
                return None

            paused_at_str = cls.get_setting_from_db(db, "scheduler_paused_at", "")
            if not paused_at_str:
                return None

            last_reminder_str = cls.get_setting_from_db(db, "last_paused_reminder_at", paused_at_str)
            now_dt = get_now_wib()
            
            try:
                paused_dt = datetime.strptime(paused_at_str, "%Y-%m-%d %H:%M:%S")
                last_reminder_dt = datetime.strptime(last_reminder_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                return None

            # Ambil interval pengingat dari DB (default 5 menit jika tidak diatur)
            alert_interval_minutes = int(cls.get_setting_from_db(db, "alert_waiting_interval_minutes", "5"))
            required_seconds = max(60, alert_interval_minutes * 60)

            seconds_since_last_reminder = (now_dt - last_reminder_dt).total_seconds()
            if seconds_since_last_reminder >= required_seconds:
                total_paused_minutes = max(1, int(round((now_dt - paused_dt).total_seconds() / 60)))
                return {
                    "show": True,
                    "paused_minutes": total_paused_minutes,
                    "paused_at": paused_at_str,
                    "title": "PENGINGAT: Pemantauan Otomatis Sedang Dijeda!",
                    "message": f"Pemantauan otomatis ONT telah dijeda selama {total_paused_minutes} menit. Segera aktifkan kembali pemantauan untuk menjaga kestabilan jaringan."
                }
        except Exception as e:
            logger.error(f"Error check_paused_reminder: {e}")
        return None

    @classmethod
    def snooze_paused_reminder(cls, db: Session):
        """Menunda notifikasi pengingat jeda selama 1 jam ke depan."""
        now_str = get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
        cls.set_setting_in_db(db, "last_paused_reminder_at", now_str)
        logger.info("[REMINDER] Pengingat pemantauan terjeda ditunda (snooze) selama 1 jam.")

    def pause_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Menjeda pemindaian manual/berkala yang sedang aktif berjalan pada kantor target."""
        k = (kantor or "all").lower().strip()
        state = self.get_office_state(k)
        with state.lock:
            if not state.is_scanning:
                return {"status": "error", "message": f"Tidak ada pemindaian aktif di kantor '{k.upper()}' untuk dijeda."}
            state.is_paused = True
        logger.info(f"[SCAN] Sinyal jeda pemindaian diterima untuk kantor: {k.upper()}.")
        return {"status": "success", "message": f"Sinyal jeda dikirim, pemindaian kantor {k.upper()} akan dijeda setelah modem saat ini."}

    def stop_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Menghentikan paksa pemindaian yang sedang berjalan atau membatalkan yang dijeda pada kantor target."""
        k = (kantor or "all").lower().strip()
        state = self.get_office_state(k)
        with state.lock:
            state.stop_requested = True
            state.is_paused = False
            self.delete_scan_state(k)
            if not state.is_scanning:
                state.resume_index = 0
                state.scan_current = 0
                state.stop_requested = False
        logger.info(f"[SCAN] Sinyal berhenti paksa pemindaian diterima untuk kantor: {k.upper()}.")
        return {"status": "success", "message": f"Pemindaian kantor {k.upper()} dihentikan paksa dan progres dibersihkan."}

    def resume_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Melanjutkan pemindaian yang dijeda dari checkpoint JSON untuk kantor target."""
        k = (kantor or "all").lower().strip()
        state = self.get_office_state(k)
        if state.is_scanning:
            return {"status": "busy", "message": f"Proses pemindaian kantor {k.upper()} sedang berjalan."}
        saved = self.load_scan_state(k)
        if saved and saved.get("current_index") is not None:
            state.resume_index = saved.get("current_index", 0)
        state.is_paused = False
        state.stop_requested = False
        logger.info(f"[SCAN] Melanjutkan pemindaian kantor {k.upper()} dari indeks ke-{state.resume_index}...")
        
        # Eksekusi secara asynchronous di background thread agar tidak memblokir request
        th = threading.Thread(target=self.execute_scan_sync, kwargs={"kantor": k}, daemon=True)
        th.start()
        return {"status": "started", "kantor": k, "message": f"Pemindaian kantor {k.upper()} dilanjutkan dari indeks {state.resume_index}."}

    @classmethod
    def check_office_connectivity(cls, db: Session, kantor: Optional[str] = None) -> bool:
        """
        Melakukan pre-flight connectivity check cepat (socket/ping) ke sampel IP ONT kantor.
        Jika minimal satu perangkat ONT/gateway kantor merespons, berarti jaringan terhubung prima.
        Otomatis memulihkan (auto-heal) flag 'is_network_error' menjadi False di database dan memory.
        """
        import socket
        import subprocess
        import platform

        k = (kantor or "all").lower().strip()
        q = db.query(Pelanggan).filter(Pelanggan.is_active == True, Pelanggan.is_monitored == True)
        if k != "all":
            q = q.filter(Pelanggan.kantor == k)
        
        # Ambil maksimal 4 sampel pelanggan untuk diuji
        samples = q.limit(4).all()
        if not samples:
            return True

        for cust in samples:
            target_ip = (cust.ip_ont or cust.ip_router or "").strip()
            if not target_ip:
                continue

            # 1. Coba probe port 80 / 443 / 23 via socket cepat (< 800ms)
            is_alive = False
            for port in (80, 443, 8080):
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.7)
                    if s.connect_ex((target_ip, port)) == 0:
                        is_alive = True
                        s.close()
                        break
                    s.close()
                except Exception:
                    pass

            # 2. Fallback ICMP Ping 1 paket cepat (< 700ms) jika socket tertutup
            if not is_alive:
                try:
                    param = "-n" if platform.system().lower() == "windows" else "-c"
                    timeout_param = "-w" if platform.system().lower() == "windows" else "-W"
                    cmd = ["ping", param, "1", timeout_param, "700", target_ip]
                    if subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                        is_alive = True
                except Exception:
                    pass

            if is_alive:
                # Terbukti terhubung ke jaringan lokal! Auto-heal jika sebelumnya tercatat error
                office_state = cls.get_office_state(k)
                with office_state.lock:
                    office_state.is_network_error = False
                cls.set_setting_in_db(db, "is_network_error", "false", kantor=k if k != "all" else None)
                db.commit()
                return True

        return False

    def get_status(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k = (kantor or "all").lower().strip()
        is_office_active = True
        
        # 1. Master db untuk cek status aktif kantor
        master_db = SessionLocal()
        try:
            if k != "all":
                from sqlalchemy import func
                from app.db.models import Kantor
                k_obj = master_db.query(Kantor).filter(func.lower(Kantor.nama) == k).first()
                if k_obj is not None:
                    is_office_active = bool(k_obj.is_active)
        finally:
            master_db.close()

        # 2. Ambil session tenant database jika k != 'all'
        from app.core.tenant_database import TenantDatabaseManager
        if k != "all":
            db = TenantDatabaseManager.get_tenant_session(k)
        else:
            from app.core.security import get_all_kantor_codes
            all_k = get_all_kantor_codes()
            fallback_k = all_k[0] if all_k else None
            db = TenantDatabaseManager.get_tenant_session(fallback_k) if fallback_k else SessionLocal()

        try:
            # Baca status per kantor jika ada, jika tidak ada fallback ke global
            status = self.get_setting_from_db(db, "scheduler_status", "RUNNING", kantor=k if k != "all" else None)
            interval_str = self.get_setting_from_db(db, "polling_interval_minutes", str(settings.POLLING_INTERVAL_MINUTES), kantor=k if k != "all" else None)
            last_scan = self.get_setting_from_db(db, "last_scan_time", "-", kantor=k if k != "all" else None)
            net_err_str = self.get_setting_from_db(db, "is_network_error", "false", kantor=k if k != "all" else None)
            
            cust_q = db.query(Pelanggan).filter(Pelanggan.is_active == True)
            if k != "all":
                cust_q = cust_q.filter(Pelanggan.kantor == k)
            total_customers = cust_q.count()
            
            interval = int(interval_str) if interval_str.isdigit() else settings.POLLING_INTERVAL_MINUTES
            
            office_state = self.get_office_state(k)
            is_net_err = (net_err_str.lower() == "true") or office_state.is_network_error

            if is_net_err and not office_state.is_scanning:
                if self.check_office_connectivity(db, kantor=k):
                    is_net_err = False
            
            last_duration_str = self.get_setting_from_db(db, "last_scan_duration", str(office_state.last_scan_duration or 0.0), kantor=k if k != "all" else None)
            last_duration = float(last_duration_str) if last_duration_str.replace('.', '', 1).isdigit() else (office_state.last_scan_duration or 0.0)
        finally:
            db.close()

        saved_state = self.load_scan_state(k)
        has_saved_state = saved_state is not None and saved_state.get("status") == "PAUSED"
        is_paused = office_state.is_paused or (has_saved_state and not office_state.is_scanning)

        # Hitung estimasi waktu pemindaian real-time untuk kantor ini
        elapsed = round(time.time() - office_state.scan_start_time, 1) if (office_state.is_scanning and office_state.scan_start_time > 0) else 0.0
        if office_state.is_scanning and office_state.scan_current > 0 and office_state.scan_total > 0:
            avg_per_ont = (time.time() - office_state.scan_start_time) / office_state.scan_current
            est_total = round(avg_per_ont * office_state.scan_total, 1)
        else:
            est_total = last_duration if last_duration > 0 else 0.0

        scan_current_val = office_state.scan_current
        if not office_state.is_scanning and has_saved_state:
            scan_current_val = saved_state.get("current_index", office_state.scan_current)
            if office_state.scan_total == 0:
                office_state.scan_total = saved_state.get("total", total_customers)

        scan_progress = {
            "current": scan_current_val,
            "total": office_state.scan_total,
            "target_kantor": k,
            "percent": int((scan_current_val / office_state.scan_total) * 100) if office_state.scan_total > 0 else 0,
            "is_scanning": office_state.is_scanning,
            "is_paused": is_paused,
            "can_resume": is_paused and not office_state.is_scanning,
            "can_stop": office_state.is_scanning or is_paused,
            "elapsed_seconds": elapsed,
            "estimated_total_seconds": est_total,
            "last_scan_duration": last_duration
        }

        next_run_time_str = "-"
        if status == "RUNNING" and is_office_active:
            if last_scan and last_scan != "-":
                try:
                    last_dt = datetime.strptime(last_scan, "%Y-%m-%d %H:%M:%S")
                    next_dt = last_dt + timedelta(minutes=interval)
                    next_run_time_str = next_dt.strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    next_run_time_str = "-"
            else:
                next_run_time_str = "Segera"

        # Cek apakah ada kantor lain yang saat ini sedang memindai
        other_active_scans = []
        with self._state_lock:
            for other_k, ost in self._office_states.items():
                if other_k != k and ost.is_scanning:
                    other_active_scans.append(other_k)

        return {
            "status": status,
            "is_office_active": is_office_active,
            "interval_minutes": interval,
            "last_scan_time": last_scan,
            "next_run_time": next_run_time_str,
            "is_scanning": office_state.is_scanning,
            "is_paused": is_paused,
            "can_resume": is_paused and not office_state.is_scanning,
            "can_stop": office_state.is_scanning or is_paused,
            "is_network_error": is_net_err,
            "total_customers": total_customers,
            "scan_progress": scan_progress,
            "other_active_scans": other_active_scans
        }

    def mikrotik_sync_job_wrapper(self):
        """Dijalankan tiap 3 menit secara mandiri oleh APScheduler untuk menyinkronkan data router & kuota MikroTik."""
        try:
            from app.services.mikrotik_service import MikroTikSyncService
            db_sync = SessionLocal()
            try:
                # 1. Sinkronisasi lease & pelanggan baru/bound
                MikroTikSyncService.sync_all_configured_kantors(db_sync)
                # 2. Sinkronisasi counter bytes Simple Queues ke tabel kuota_pelanggan
                MikroTikSyncService.sync_traffic_quota_to_db(db_sync)
            finally:
                db_sync.close()
        except Exception as e:
            logger.warning(f"[SCHEDULER] Gagal auto-sync MikroTik: {e}")

    def scheduled_job_wrapper(self):
        """Dijalankan tiap interval pemantauan oleh APScheduler untuk memindai redaman optik ONT per kantor secara paralel."""
        db = SessionLocal()
        try:
            kantors = db.query(Kantor).filter(Kantor.is_active == True).all()
            kantor_kodes = [k.kode.lower() for k in kantors]
        except Exception as e:
            logger.error(f"[SCHEDULER] Gagal mengambil daftar kantor: {e}")
            kantor_kodes = ["cabang", "pusat", "banyumas"]
        finally:
            db.close()

        # Eksekusi pemindaian mandiri untuk setiap kantor yang status scheduler-nya RUNNING dan intervalnya sudah tercapai
        now_dt = get_now_wib()
        for k_kode in kantor_kodes:
            db_k = SessionLocal()
            try:
                k_status = self.get_setting_from_db(db_k, "scheduler_status", "RUNNING", kantor=k_kode)
                
                if k_status != "RUNNING":
                    continue

                interval_str = self.get_setting_from_db(db_k, "polling_interval_minutes", str(settings.POLLING_INTERVAL_MINUTES), kantor=k_kode)
                interval_minutes = int(interval_str) if interval_str.isdigit() else settings.POLLING_INTERVAL_MINUTES
                last_scan_str = self.get_setting_from_db(db_k, "last_scan_time", "-", kantor=k_kode)
                
                # Cek apakah sudah waktunya scan berdasarkan interval kantor di DB
                is_due = False
                if not last_scan_str or last_scan_str == "-":
                    is_due = True
                else:
                    try:
                        last_scan_dt = datetime.strptime(last_scan_str, "%Y-%m-%d %H:%M:%S")
                        elapsed_seconds = (now_dt - last_scan_dt).total_seconds()
                        if elapsed_seconds >= (interval_minutes * 60):
                            is_due = True
                    except Exception as e:
                        logger.warning(f"[SCHEDULER] Gagal parse last_scan_time '{last_scan_str}' kantor {k_kode}: {e}")
                        is_due = True

                if not is_due:
                    continue
            finally:
                db_k.close()

            # Jalankan di background thread per kantor jika belum sedang memindai
            state = self.get_office_state(k_kode)
            if not state.is_scanning:
                logger.info(f"[SCHEDULER] Memulai siklus pemindaian otomatis terjadwal (interval: {interval_minutes}m) untuk kantor: {k_kode.upper()}")
                th = threading.Thread(target=self.execute_scan_sync, kwargs={"kantor": k_kode}, daemon=True)
                th.start()
            else:
                logger.info(f"[SCHEDULER] Kantor {k_kode.upper()} masih sedang memindai siklus sebelumnya, dilewati.")

    def execute_scan_sync(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k = (kantor or "all").lower().strip()
        state = self.get_office_state(k)
        
        with state.lock:
            if state.is_scanning:
                return {"status": "busy", "message": f"Proses pemindaian kantor '{k.upper()}' sedang berjalan."}

            saved_checkpoint = self.load_scan_state(k)
            if saved_checkpoint and saved_checkpoint.get("current_index") is not None and state.resume_index == 0:
                state.resume_index = saved_checkpoint.get("current_index", 0)

            state.is_scanning = True
            state.is_paused = False
            state.stop_requested = False
            state.scan_start_time = time.time()
        
        from app.core.tenant_database import TenantDatabaseManager
        if k != "all":
            db = TenantDatabaseManager.get_tenant_session(k)
        else:
            db = SessionLocal()
        try:
            # Cegah pemindaian jika kantor dalam status nonaktif
            if k != "all":
                from sqlalchemy import func
                from app.db.models import Kantor
                k_obj = db.query(Kantor).filter(func.lower(Kantor.kode) == k).first()
                if k_obj is not None and not k_obj.is_active:
                    logger.warning(f"[SCAN] Pemindaian dibatalkan: Kantor '{k.upper()}' dalam status NONAKTIF.")
                    return {
                        "status": "error",
                        "message": f"Pemindaian dibatalkan: Kantor '{k_obj.nama}' dalam status Nonaktif.",
                        "is_office_active": False
                    }

            from sqlalchemy import case
            from app.db.models import PerangkatONT

            query = db.query(Pelanggan).outerjoin(
                PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan
            ).filter(
                Pelanggan.is_active == True,
                Pelanggan.is_monitored == True
            )
            if k != "all":
                query = query.filter(Pelanggan.kantor == k)
            
            # Prioritaskan modem dengan kredensial VALID terlebih dahulu agar monitoring reguler cepat selesai
            query = query.order_by(
                case((PerangkatONT.status_kredensial == 'VALID', 0), else_=1),
                Pelanggan.id.asc()
            )
            pelanggan_list = query.all()
            
            # Pre-flight check koneksi: pastikan server terhubung ke segmen jaringan kantor ini
            is_connected = self.check_office_connectivity(db, kantor=k)
            if not is_connected and len(pelanggan_list) > 0:
                with state.lock:
                    state.is_scanning = False
                    state.is_network_error = True
                    state.scan_current = 0
                self.set_setting_in_db(db, "is_network_error", "true", kantor=None)
                if k != "all":
                    self.set_setting_in_db(db, "is_network_error", "true", kantor=k)
                db.commit()
                logger.warning(f"[SCAN] Pre-flight check gagal: Server tidak terhubung ke jaringan kantor '{k.upper()}'.")
                return {
                    "status": "error",
                    "error_type": "NETWORK_UNREACHABLE",
                    "is_network_error": True,
                    "message": f"Koneksi Gagal: Server tidak terhubung ke jaringan kantor {k.upper()}. Pastikan server berada di segmen/VLAN yang sama.",
                    "target_kantor": k
                }

            with state.lock:
                state.is_network_error = False
                state.scan_total = len(pelanggan_list)
                if state.resume_index >= state.scan_total:
                    state.resume_index = 0
                    self.delete_scan_state(k)
                state.scan_current = state.resume_index
                
            pelanggan_to_scan = pelanggan_list[state.resume_index:]

            now = get_now_wib()
            results = []
            warning_count = 0
            critical_count = 0
            los_count = 0
            los_by_pop = {}
            los_pending_alerts = []

            # Ambil threshold dan kredensial modem ONT dengan prioritas spesifik kantor, fallback ke global
            eff_warn_th = float(self.get_setting_from_db(db, "warning_threshold_dbm", str(settings.WARNING_THRESHOLD_DBM), kantor=k if k != "all" else None))
            eff_crit_th = float(self.get_setting_from_db(db, "critical_threshold_dbm", str(settings.CRITICAL_THRESHOLD_DBM), kantor=k if k != "all" else None))
            default_user = self.get_setting_from_db(db, "default_modem_user", None, kantor=k if k != "all" else None)
            default_pass = self.get_setting_from_db(db, "default_modem_pass", None, kantor=k if k != "all" else None)
            raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]", kantor=k if k != "all" else None)

            # Jika kredensial spesifik kantor kosong, fallback ke kredensial global
            if not default_user:
                default_user = self.get_setting_from_db(db, "default_modem_user", "admin", kantor=None)
            if not default_pass:
                default_pass = self.get_setting_from_db(db, "default_modem_pass", "tekno2024", kantor=None)
            if not raw_creds or raw_creds == "[]":
                raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]", kantor=None)

            default_creds_list = []
            try:
                import json
                p_creds = json.loads(raw_creds)
                if isinstance(p_creds, list):
                    default_creds_list = [(c.get("username", ""), c.get("password", "")) for c in p_creds if c.get("username")]
            except Exception:
                default_creds_list = []

            # Tambahkan default_user & default_pass ke daftar jika belum ada
            if default_user and default_pass and (default_user, default_pass) not in default_creds_list:
                default_creds_list.insert(0, (default_user, default_pass))

            unreachable_count = 0
            stats_lock = threading.Lock()
            interrupted = False
            interrupted_response = None

            # Helper function untuk scraping 1 pelanggan secara thread-safe
            def _scan_customer_worker(cust_id: int):
                worker_db = TenantDatabaseManager.get_tenant_session(k) if k != "all" else SessionLocal()
                try:
                    c = worker_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_id).first()
                    if not c:
                        return None

                    target_scrape_ip = c.ip_ont or c.ip_router
                    is_untested_or_invalid = (getattr(c, "status_kredensial", "UNTESTED") in ("UNTESTED", "INVALID"))

                    # Parse riwayat kredensial yang pernah gagal
                    existing_failed = []
                    if getattr(c, "failed_credentials", None):
                        try:
                            import json
                            raw_f = json.loads(c.failed_credentials)
                            if isinstance(raw_f, list):
                                existing_failed = [(item.get("user", ""), item.get("pass", "")) for item in raw_f if isinstance(item, dict)]
                        except Exception:
                            existing_failed = []

                    scrape_res = ONTScraperService.scrape_ont(
                        ip=target_scrape_ip,
                        customer_user=c.user_admin,
                        customer_pass=c.pass_admin,
                        default_user=default_user,
                        default_pass=default_pass,
                        customer_name=c.nama,
                        default_credentials=default_creds_list,
                        warn_threshold=eff_warn_th,
                        crit_threshold=eff_crit_th,
                        is_mass_scan=True,
                        failed_credentials_history=existing_failed,
                        exhaustive_first_scan=is_untested_or_invalid
                    )

                    was_previously_valid = (getattr(c, "status_kredensial", "UNTESTED") == "VALID")

                    # Perbarui riwayat kredensial yang gagal jika ada
                    newly_failed = scrape_res.get("failed_credentials", [])
                    if newly_failed:
                        import json
                        combined_dict = {f"{u}::{p}": {"user": u, "pass": p} for u, p in existing_failed}
                        for u, p in newly_failed:
                            combined_dict[f"{u}::{p}"] = {"user": u, "pass": p}
                        c.failed_credentials = json.dumps(list(combined_dict.values()))

                    # Evaluasi hasil scraping
                    if scrape_res["success"] and scrape_res["rx_power"] is not None:
                        res = scrape_res
                        c.status_kredensial = "VALID"
                        c.failed_credentials = None  # Reset riwayat gagal karena sudah ketemu yang valid
                        if scrape_res.get("updated_user") and scrape_res.get("updated_pass"):
                            c.user_admin = scrape_res["updated_user"]
                            c.pass_admin = scrape_res["updated_pass"]
                        ket = f"Live Scraping OK ({res.get('gpon_state', 'Normal')})"
                    elif scrape_res.get("error_type") == "LOCKOUT":
                        if was_previously_valid:
                            c.status_kredensial = "VALID"
                            res = scrape_res
                            res["status_koneksi"] = "LOS"
                        else:
                            c.status_kredensial = "INVALID"
                            res = scrape_res
                            res["status_koneksi"] = "INVALID"
                        rem_lock = scrape_res.get("lockout_remaining_seconds", 60)
                        ket = f"Modem Lockout ONT ({rem_lock}s tersisa). Dilewati pada scan massal."
                    elif scrape_res.get("error_type") == "AUTH_FAILED":
                        if was_previously_valid:
                            c.status_kredensial = "VALID"
                            res = scrape_res
                            res["status_koneksi"] = "LOS"
                            ket = "Login Tertunda (Modem Sibuk / Session Semaphore, Kredensial Tetap Valid)"
                        else:
                            c.status_kredensial = "INVALID"
                            res = scrape_res
                            res["status_koneksi"] = "INVALID"
                            ket = "Login Gagal (Seluruh Kredensial Database Ditolak Modem)"
                    elif scrape_res.get("error_type") == "UNREACHABLE":
                        if was_previously_valid:
                            c.status_kredensial = "VALID"
                        res = scrape_res
                        ket = "Gagal Terhubung (Unreachable - Cek Jaringan Lokal)"
                    else:
                        if was_previously_valid:
                            c.status_kredensial = "VALID"
                        res = scrape_res
                        ket = f"Error: {scrape_res.get('message', 'Gagal')}"

                    if res.get("mac_address"):
                        c.mac_address = res["mac_address"]
                    if res.get("nama_wifi"):
                        c.nama_wifi = res["nama_wifi"]
                    if res.get("password_wifi"):
                        c.password_wifi = res["password_wifi"]
                    if res.get("jenis_modem"):
                        c.jenis_modem = res["jenis_modem"]

                    log_entry = LogPerformaONT(
                        id_pelanggan=c.id_pelanggan,
                        waktu_cek=now,
                        rx_power=res.get("rx_power"),
                        suhu_ont=res.get("suhu_ont"),
                        uptime=res.get("uptime"),
                        status_koneksi=res.get("status_koneksi") or "LOS",
                        latency_ms=res.get("latency_ms"),
                        keterangan=ket
                    )
                    worker_db.add(log_entry)

                    is_auth_failure = (
                        res.get("error_type") == "AUTH_FAILED"
                        or c.status_kredensial == "INVALID"
                        or "login gagal" in ket.lower()
                        or "kredensial" in ket.lower()
                        or "ditolak" in ket.lower()
                    )

                    st = res.get("status_koneksi") or "LOS"
                    if st in ("WARNING", "CRITICAL"):
                        c.los_count = 0
                    elif st == "LOS":
                        if not is_auth_failure:
                            c.los_count = (c.los_count or 0) + 1
                    else:
                        c.los_count = 0

                    worker_db.commit()

                    return {
                        "id_pelanggan": c.id_pelanggan,
                        "nama": c.nama,
                        "rx_power": res.get("rx_power"),
                        "status": st,
                        "kredensial": c.status_kredensial,
                        "keterangan": ket,
                        "error_type": res.get("error_type"),
                        "pop": c.pop or f"Server {k.upper()}",
                        "is_auth_failure": is_auth_failure
                    }
                except Exception as worker_e:
                    worker_db.rollback()
                    logger.error(f"[WORKER] Error scanning pelanggan {cust_id}: {worker_e}")
                    return None
                finally:
                    worker_db.close()

            # Pisahkan antrean pelanggan: VALID vs INVALID/UNTESTED
            valid_cust_ids = []
            invalid_cust_ids = []
            for cust in pelanggan_to_scan:
                if getattr(cust, "status_kredensial", None) == "VALID" or (cust.perangkat and cust.perangkat.status_kredensial == "VALID"):
                    valid_cust_ids.append(cust.id_pelanggan)
                else:
                    invalid_cust_ids.append(cust.id_pelanggan)

            # Kalkulasi Autoscaling Worker Dinamis:
            # - Base 25 worker untuk data pertama (< 100 data)
            # - Tambah +10 worker untuk setiap kelipatan 100 pelanggan (cth: 100-199: 35w, 200-299: 45w, 300-399: 55w, >=400: 65w)
            # - Dibatasi batas aman maksimal (Hard Cap) 65 worker per kantor agar database & bridge router tetap stabil
            total_valid = len(valid_cust_ids)
            extra_per_hundred = (total_valid // 100) * 10
            calculated_valid_workers = min(65, 25 + extra_per_hundred)
            valid_workers = min(calculated_valid_workers, total_valid) if total_valid > 0 else 1

            # Pool INVALID tetap terjaga 10 worker agar tidak memicu badai request saat lockout delay
            invalid_workers = min(10, len(invalid_cust_ids)) if invalid_cust_ids else 1

            logger.info(f"[SCAN] Memulai pemindaian serentak kantor {k.upper()}: {total_valid} VALID (Autoscale {valid_workers}w, cap 65w), {len(invalid_cust_ids)} INVALID/UNTESTED (Pool {invalid_workers}w)...")

            valid_los_to_retry = []  # Menampung pelanggan VALID yang gagal/LOS untuk di-retry di Pass Kedua

            with ThreadPoolExecutor(max_workers=valid_workers) as valid_executor, \
                 ThreadPoolExecutor(max_workers=invalid_workers) as invalid_executor:

                future_map = {}
                for cid in valid_cust_ids:
                    future_map[valid_executor.submit(_scan_customer_worker, cid)] = cid
                for cid in invalid_cust_ids:
                    future_map[invalid_executor.submit(_scan_customer_worker, cid)] = cid

                for future in as_completed(future_map):
                    # Cek interupsi STOP (Berhenti Paksa)
                    with state.lock:
                        if state.stop_requested:
                            logger.info(f"[SCAN] Pemindaian kantor {k.upper()} dihentikan paksa (STOP).")
                            self.delete_scan_state(k)
                            state.is_scanning = False
                            state.is_paused = False
                            state.stop_requested = False
                            state.resume_index = 0
                            state.scan_current = 0
                            interrupted = True
                            interrupted_response = {"status": "stopped", "message": f"Pemindaian kantor {k.upper()} dihentikan paksa oleh Admin."}
                            break

                        # Cek interupsi JEDA (Pause)
                        if state.is_paused:
                            logger.info(f"[SCAN] Pemindaian kantor {k.upper()} dijeda pada pelanggan ke-{state.scan_current} dari {state.scan_total}.")
                            state.is_scanning = False
                            state.resume_index = state.scan_current
                            self.save_scan_state(current_index=state.resume_index, total=state.scan_total, kantor=k)
                            interrupted = True
                            interrupted_response = {
                                "status": "paused",
                                "message": f"Pemindaian kantor {k.upper()} dijeda pada pelanggan ke-{state.resume_index} dari {state.scan_total}.",
                                "current_index": state.resume_index,
                                "total": state.scan_total,
                                "target_kantor": k
                            }
                            break

                        state.scan_current += 1

                    try:
                        worker_result = future.result()
                    except Exception as fe:
                        logger.error(f"[SCAN] Future exception: {fe}")
                        worker_result = None

                    if worker_result:
                        with stats_lock:
                            st = worker_result["status"]
                            cid = worker_result["id_pelanggan"]
                            
                            # Jika pelanggan berkredensial VALID tapi terdeteksi LOS / Rx None, tampung ke pass kedua
                            if cid in valid_cust_ids and (st == "LOS" or worker_result.get("rx_power") is None):
                                valid_los_to_retry.append(cid)

                            if st == "WARNING":
                                warning_count += 1
                            elif st == "CRITICAL":
                                critical_count += 1
                            elif st == "LOS":
                                los_count += 1
                                if not worker_result.get("is_auth_failure"):
                                    pop_name = worker_result.get("pop") or f"Server {k.upper()}"
                                    if pop_name not in los_by_pop:
                                        los_by_pop[pop_name] = []
                                    los_by_pop[pop_name].append(worker_result["nama"])

                            if worker_result.get("error_type") == "UNREACHABLE":
                                unreachable_count += 1

                            results.append({
                                "id_pelanggan": worker_result["id_pelanggan"],
                                "nama": worker_result["nama"],
                                "rx_power": worker_result["rx_power"],
                                "status": st,
                                "kredensial": worker_result["kredensial"],
                                "keterangan": worker_result["keterangan"]
                            })

            if interrupted and interrupted_response:
                return interrupted_response

            # Refresh data pelanggan dari DB agar objek di sesi utama sinkron setelah pembaruan worker
            db.expire_all()

            # -------------------------------------------------------------
            # PASS KEDUA (BAGIAN A): Retry Khusus VALID yang Terkena LOS / Glitch
            # Coba ulang 3x dengan jeda bertahap (exponential backoff 1s, 2s, 3s)
            # -------------------------------------------------------------
            if valid_los_to_retry and not state.stop_requested and not state.is_paused:
                logger.info(f"[RETRY_PASS_VALID] Menemukan {len(valid_los_to_retry)} modem VALID berstatus LOS. Menjalankan retry bertahap paralel...")

                def _retry_valid_los_worker(cust_id: int):
                    worker_db = TenantDatabaseManager.get_tenant_session(k) if k != "all" else SessionLocal()
                    try:
                        c_retry = worker_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_id).first()
                        if not c_retry:
                            return None

                        target_ip = c_retry.ip_ont or c_retry.ip_router
                        final_res = None
                        
                        # 3x percobaan dengan backoff bertahap (1s, 2s, 3s)
                        for attempt, wait_sec in enumerate([1.0, 2.0, 3.0], start=1):
                            time.sleep(wait_sec)
                            r_res = ONTScraperService.scrape_ont(
                                ip=target_ip,
                                customer_user=c_retry.user_admin,
                                customer_pass=c_retry.pass_admin,
                                default_user=default_user,
                                default_pass=default_pass,
                                customer_name=c_retry.nama,
                                default_credentials=default_creds_list,
                                warn_threshold=eff_warn_th,
                                crit_threshold=eff_crit_th,
                                is_mass_scan=True,
                                failed_credentials_history=[],
                                exhaustive_first_scan=False
                            )
                            if r_res.get("success") and r_res.get("rx_power") is not None:
                                final_res = r_res
                                logger.info(f"[RETRY_VALID_RECOVERED] Pelanggan {c_retry.nama} ({c_retry.id_pelanggan}) pulih dari LOS pada retry ke-{attempt} (Rx: {r_res.get('rx_power')} dBm)!")
                                break

                        if final_res and final_res.get("rx_power") is not None:
                            st_recovered = final_res.get("status_koneksi") or "NORMAL"
                            c_retry.status_kredensial = "VALID"
                            c_retry.los_count = 0
                            ket_rec = f"Pulih dari LOS (Percobaan ke-{attempt}) - {final_res.get('gpon_state', 'Normal')}"
                            
                            # Update log performa LOS sebelumnya yang dibuat di siklus pemindaian saat ini agar tidak duplikat baris
                            existing_log = (
                                worker_db.query(LogPerformaONT)
                                .filter(
                                    LogPerformaONT.id_pelanggan == c_retry.id_pelanggan,
                                    LogPerformaONT.waktu_cek == now
                                )
                                .order_by(LogPerformaONT.id.desc())
                                .first()
                            )
                            if existing_log:
                                existing_log.rx_power = final_res.get("rx_power")
                                existing_log.suhu_ont = final_res.get("suhu_ont")
                                existing_log.uptime = final_res.get("uptime")
                                existing_log.status_koneksi = st_recovered
                                existing_log.latency_ms = final_res.get("latency_ms")
                                existing_log.keterangan = ket_rec
                            else:
                                worker_db.add(LogPerformaONT(
                                    id_pelanggan=c_retry.id_pelanggan,
                                    waktu_cek=now,
                                    rx_power=final_res.get("rx_power"),
                                    suhu_ont=final_res.get("suhu_ont"),
                                    uptime=final_res.get("uptime"),
                                    status_koneksi=st_recovered,
                                    latency_ms=final_res.get("latency_ms"),
                                    keterangan=ket_rec
                                ))
                            worker_db.commit()
                            return {
                                "id_pelanggan": c_retry.id_pelanggan,
                                "rx_power": final_res.get("rx_power"),
                                "status": st_recovered,
                                "kredensial": "VALID",
                                "keterangan": ket_rec,
                                "recovered": True
                            }
                        return None
                    except Exception as ve_err:
                        worker_db.rollback()
                        logger.error(f"[RETRY_VALID_ERROR] Error retry pelanggan {cust_id}: {ve_err}")
                        return None
                    finally:
                        worker_db.close()

                retry_valid_workers = min(15, len(valid_los_to_retry))
                with ThreadPoolExecutor(max_workers=retry_valid_workers) as retry_v_executor:
                    v_futures = [retry_v_executor.submit(_retry_valid_los_worker, cid) for cid in valid_los_to_retry]
                    for vf in as_completed(v_futures):
                        try:
                            v_res = vf.result()
                            if v_res and v_res.get("recovered"):
                                with stats_lock:
                                    los_count = max(0, los_count - 1)
                                    st_rec = v_res.get("status")
                                    if st_rec == "WARNING":
                                        warning_count += 1
                                    elif st_rec == "CRITICAL":
                                        critical_count += 1
                                    
                                    for r_item in results:
                                        if r_item["id_pelanggan"] == v_res["id_pelanggan"]:
                                            r_item["rx_power"] = v_res["rx_power"]
                                            r_item["status"] = v_res["status"]
                                            r_item["keterangan"] = v_res["keterangan"]
                                            break
                        except Exception as vf_err:
                            logger.error(f"[RETRY_VALID_PASS] Exception: {vf_err}")

                db.expire_all()

            # -------------------------------------------------------------
            # PASS KEDUA (BAGIAN B): Coba ulang khusus pelanggan yang masih INVALID
            # Mencoba seluruh daftar kredensial secara lengkap setelah putaran pertama
            # -------------------------------------------------------------
            pelanggan_ids_to_scan = [c.id_pelanggan for c in pelanggan_to_scan]
            invalid_cust_ids_second_pass = [
                row[0] for row in db.query(Pelanggan.id_pelanggan)
                .join(Pelanggan.perangkat)
                .filter(Pelanggan.id_pelanggan.in_(pelanggan_ids_to_scan), PerangkatONT.status_kredensial == "INVALID")
                .all()
            ]

            if invalid_cust_ids_second_pass and not state.stop_requested and not state.is_paused:
                logger.info(f"[SECOND_PASS_INVALID] Menemukan {len(invalid_cust_ids_second_pass)} pelanggan INVALID di kantor {k.upper()}. Memulai putaran ulang paralel...")

                def _retry_customer_worker(cust_id: int):
                    worker_db = TenantDatabaseManager.get_tenant_session(k) if k != "all" else SessionLocal()
                    try:
                        inv_cust = worker_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_id).first()
                        if not inv_cust:
                            return None

                        target_ip = inv_cust.ip_ont or inv_cust.ip_router
                        existing_failed_retry = []
                        if getattr(inv_cust, "failed_credentials", None):
                            try:
                                import json
                                raw_fr = json.loads(inv_cust.failed_credentials)
                                if isinstance(raw_fr, list):
                                    existing_failed_retry = [(item.get("user", ""), item.get("pass", "")) for item in raw_fr if isinstance(item, dict)]
                            except Exception:
                                existing_failed_retry = []

                        retry_res = ONTScraperService.scrape_ont(
                            ip=target_ip,
                            customer_user=inv_cust.user_admin,
                            customer_pass=inv_cust.pass_admin,
                            default_user=default_user,
                            default_pass=default_pass,
                            customer_name=inv_cust.nama,
                            default_credentials=default_creds_list,
                            warn_threshold=eff_warn_th,
                            crit_threshold=eff_crit_th,
                            is_mass_scan=False,
                            failed_credentials_history=existing_failed_retry,
                            exhaustive_first_scan=True
                        )
                        retry_now = get_now_wib()

                        newly_failed_r = retry_res.get("failed_credentials", [])
                        if newly_failed_r:
                            import json
                            combined_dict_r = {f"{u}::{p}": {"user": u, "pass": p} for u, p in existing_failed_retry}
                            for u, p in newly_failed_r:
                                combined_dict_r[f"{u}::{p}"] = {"user": u, "pass": p}
                            inv_cust.failed_credentials = json.dumps(list(combined_dict_r.values()))

                        if retry_res["success"] and retry_res["rx_power"] is not None:
                            inv_cust.status_kredensial = "VALID"
                            inv_cust.failed_credentials = None
                            if retry_res.get("updated_user") and retry_res.get("updated_pass"):
                                inv_cust.user_admin = retry_res["updated_user"]
                                inv_cust.pass_admin = retry_res["updated_pass"]
                            retry_status_koneksi = retry_res.get("status_koneksi") or "NORMAL"
                            ket_retry = f"Live Retry OK ({retry_res.get('gpon_state', 'Normal')})"
                        elif retry_res.get("error_type") == "AUTH_FAILED":
                            inv_cust.status_kredensial = "INVALID"
                            retry_status_koneksi = "INVALID"
                            ket_retry = "Kredensial Tidak Cocok: Seluruh pasangan kredensial di Pengaturan Sistem telah dicoba dan ditolak modem."
                        else:
                            retry_status_koneksi = retry_res.get("status_koneksi") or "INVALID"
                            ket_retry = f"Retry: {retry_res.get('message', 'Unreachable')}"

                        if retry_res.get("mac_address"):
                            inv_cust.mac_address = retry_res["mac_address"]
                        if retry_res.get("nama_wifi"):
                            inv_cust.nama_wifi = retry_res["nama_wifi"]
                        if retry_res.get("password_wifi"):
                            inv_cust.password_wifi = retry_res["password_wifi"]
                        if retry_res.get("jenis_modem"):
                            inv_cust.jenis_modem = retry_res["jenis_modem"]

                        worker_db.add(LogPerformaONT(
                            id_pelanggan=inv_cust.id_pelanggan,
                            waktu_cek=now,
                            rx_power=retry_res.get("rx_power"),
                            suhu_ont=retry_res.get("suhu_ont"),
                            uptime=retry_res.get("uptime"),
                            status_koneksi=retry_status_koneksi,
                            latency_ms=retry_res.get("latency_ms"),
                            keterangan=ket_retry
                        ))
                        worker_db.commit()
                        return {
                            "id_pelanggan": inv_cust.id_pelanggan,
                            "nama": inv_cust.nama,
                            "rx_power": retry_res.get("rx_power"),
                            "status": retry_status_koneksi,
                            "kredensial": inv_cust.status_kredensial,
                            "keterangan": ket_retry
                        }
                    except Exception as re_e:
                        worker_db.rollback()
                        logger.error(f"[SECOND_PASS] Error retrying pelanggan {cust_id}: {re_e}")
                        return None
                    finally:
                        worker_db.close()

                second_pass_workers = min(15, len(invalid_cust_ids_second_pass)) if invalid_cust_ids_second_pass else 1
                with ThreadPoolExecutor(max_workers=second_pass_workers) as retry_executor:
                    retry_futures = [retry_executor.submit(_retry_customer_worker, cid) for cid in invalid_cust_ids_second_pass]
                    for rf in as_completed(retry_futures):
                        try:
                            ret_res = rf.result()
                            if ret_res and ret_res.get("kredensial") == "VALID":
                                with stats_lock:
                                    st = ret_res.get("status")
                                    if st == "WARNING":
                                        warning_count += 1
                                    elif st == "CRITICAL":
                                        critical_count += 1
                                    for r_item in results:
                                        if r_item["id_pelanggan"] == ret_res["id_pelanggan"]:
                                            r_item["rx_power"] = ret_res["rx_power"]
                                            r_item["status"] = ret_res["status"]
                                            r_item["kredensial"] = ret_res["kredensial"]
                                            r_item["keterangan"] = ret_res["keterangan"]
                                            break
                        except Exception as rfe:
                            logger.error(f"[SECOND_PASS] Future exception: {rfe}")

                db.expire_all()

            # Catat waktu pemindaian terakhir menggunakan waktu SELESAI pemindaian
            # agar penjadwalan interval pemindaian berikutnya dihitung murni setelah seluruh proses tuntas
            finish_time = get_now_wib()
            scan_time_str = finish_time.strftime("%Y-%m-%d %H:%M:%S")
            self.set_setting_in_db(db, "last_scan_time", scan_time_str, kantor=None)
            if k != "all":
                self.set_setting_in_db(db, "last_scan_time", scan_time_str, kantor=k)
            self.cleanup_old_logs(db, days=30)
            db.commit()
            
            # Reset checkpoint JSON untuk kantor ini
            self.delete_scan_state(k)
            with state.lock:
                state.resume_index = 0
                state.is_paused = False

            # Deteksi apakah server terputus dari jaringan lokal ISP / VLAN ONT
            if len(pelanggan_list) > 0 and unreachable_count == len(pelanggan_list):
                with state.lock:
                    state.is_network_error = True
                self.set_setting_in_db(db, "is_network_error", "true", kantor=None)
                if k != "all":
                    self.set_setting_in_db(db, "is_network_error", "true", kantor=k)
                db.commit()
                return {
                    "status": "error",
                    "error_type": "NETWORK_UNREACHABLE",
                    "is_network_error": True,
                    "message": f"Koneksi Gagal: Server tidak terhubung ke jaringan lokal / VLAN ISP ONT kantor {k.upper()} (10.10.x.x). Pemindaian dihentikan!",
                    "scanned_total": len(pelanggan_list),
                    "warning_count": warning_count,
                    "critical_count": critical_count,
                    "los_count": los_count,
                    "target_kantor": k,
                    "scan_time": scan_time_str
                }

            with state.lock:
                state.is_network_error = False
            self.set_setting_in_db(db, "is_network_error", "false", kantor=None)
            if k != "all":
                self.set_setting_in_db(db, "is_network_error", "false", kantor=k)
            db.commit()
            return {
                "status": "success",
                "scanned_total": len(pelanggan_list),
                "warning_count": warning_count,
                "critical_count": critical_count,
                "los_count": los_count,
                "target_kantor": k,
                "scan_time": scan_time_str
            }
        except Exception as e:
            logger.error(f"Error saat scan kantor {k.upper()}: {e}")
            with state.lock:
                if state.scan_current > 0 and state.scan_current <= state.scan_total:
                    state.resume_index = state.scan_current - 1
            return {"status": "error", "message": str(e)}
        finally:
            with state.lock:
                if state.scan_start_time > 0:
                    state.last_scan_duration = round(time.time() - state.scan_start_time, 1)
                    try:
                        s_db = SessionLocal()
                        self.set_setting_in_db(s_db, "last_scan_duration", str(state.last_scan_duration), kantor=None)
                        if k != "all":
                            self.set_setting_in_db(s_db, "last_scan_duration", str(state.last_scan_duration), kantor=k)
                        s_db.close()
                    except Exception:
                        pass
                state.is_scanning = False
            db.close()

    def scan_single(self, id_pelanggan: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        created_local_db = False
        if db is None:
            db = SessionLocal()
            created_local_db = True
        try:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if not cust:
                # Jika tidak ditemukan di database saat ini, cari di tenant database yang terdaftar
                from app.db.models import Kantor
                from app.core.tenant_database import TenantDatabaseManager
                kantors = db.query(Kantor).filter(Kantor.is_active == True).all()
                for k in kantors:
                    if not k.kode:
                        continue
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        t_cust = t_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
                        if t_cust:
                            # Delegasikan eksekusi scan_single ke sesi tenant DB ini
                            return self.scan_single(id_pelanggan, db=t_db)
                    finally:
                        t_db.close()
                return None

            cust_kantor = cust.kantor.lower().strip() if cust.kantor else None

            # Cek apakah kantor pelanggan sedang nonaktif
            if cust_kantor:
                from sqlalchemy import func
                from app.db.models import Kantor
                k_obj = db.query(Kantor).filter(func.lower(Kantor.kode) == cust_kantor).first()
                if k_obj is not None and not k_obj.is_active:
                    return {
                        "id_pelanggan": cust.id_pelanggan,
                        "nama": cust.nama,
                        "status_koneksi": "NONAKTIF",
                        "status": "NONAKTIF",
                        "rx_power": None,
                        "suhu_ont": None,
                        "mac_address": cust.mac_address,
                        "status_kredensial": cust.status_kredensial,
                        "waktu_cek": get_now_wib().strftime("%Y-%m-%d %H:%M:%S"),
                        "message": f"Uji sinyal ditolak: Kantor '{k_obj.nama}' sedang Nonaktif.",
                        "is_office_active": False
                    }

            # Cek apakah perangkat pelanggan sedang offline (status lease waiting atau tidak terpantau)
            is_offline = (getattr(cust, "status_lease", "bound") == "waiting") or (not cust.is_monitored)
            if is_offline:
                return {
                    "id_pelanggan": cust.id_pelanggan,
                    "nama": cust.nama,
                    "status_koneksi": "OFFLINE",
                    "status": "OFFLINE",
                    "rx_power": None,
                    "suhu_ont": None,
                    "mac_address": cust.mac_address,
                    "status_kredensial": cust.status_kredensial,
                    "waktu_cek": get_now_wib().strftime("%Y-%m-%d %H:%M:%S"),
                    "message": "Perangkat sedang Offline (DHCP/PPPoE tidak aktif). Tidak dapat memeriksa redaman.",
                    "success": False,
                    "is_offline": True
                }

            default_user = self.get_setting_from_db(db, "default_modem_user", None, kantor=cust_kantor)
            default_pass = self.get_setting_from_db(db, "default_modem_pass", None, kantor=cust_kantor)
            raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]", kantor=cust_kantor)

            # Jika kredensial spesifik kantor kosong, fallback ke kredensial global
            if not default_user:
                default_user = self.get_setting_from_db(db, "default_modem_user", "admin", kantor=None)
            if not default_pass:
                default_pass = self.get_setting_from_db(db, "default_modem_pass", "tekno2024", kantor=None)
            if not raw_creds or raw_creds == "[]":
                raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]", kantor=None)

            default_creds_list = []
            try:
                import json
                p_creds = json.loads(raw_creds)
                if isinstance(p_creds, list):
                    default_creds_list = [(c.get("username", ""), c.get("password", "")) for c in p_creds if c.get("username")]
            except Exception:
                default_creds_list = []

            if default_user and default_pass and (default_user, default_pass) not in default_creds_list:
                default_creds_list.insert(0, (default_user, default_pass))

            eff_warn_th = float(self.get_setting_from_db(db, "warning_threshold_dbm", str(settings.WARNING_THRESHOLD_DBM), kantor=cust_kantor))
            eff_crit_th = float(self.get_setting_from_db(db, "critical_threshold_dbm", str(settings.CRITICAL_THRESHOLD_DBM), kantor=cust_kantor))
            target_scrape_ip = cust.ip_ont or cust.ip_router
            scrape_res = ONTScraperService.scrape_ont(
                ip=target_scrape_ip,
                customer_user=cust.user_admin,
                customer_pass=cust.pass_admin,
                default_user=default_user,
                default_pass=default_pass,
                customer_name=cust.nama,
                default_credentials=default_creds_list,
                warn_threshold=eff_warn_th,
                crit_threshold=eff_crit_th,
                is_mass_scan=False
            )

            was_previously_valid = (getattr(cust, "status_kredensial", "UNTESTED") == "VALID")

            if scrape_res["success"] and scrape_res["rx_power"] is not None:
                res = scrape_res
                cust.status_kredensial = "VALID"
                if scrape_res.get("updated_user") and scrape_res.get("updated_pass"):
                    cust.user_admin = scrape_res["updated_user"]
                    cust.pass_admin = scrape_res["updated_pass"]
                ket = f"Live Single Check OK ({res.get('gpon_state', 'Normal')})"
            elif scrape_res.get("error_type") == "LOCKOUT":
                if was_previously_valid:
                    cust.status_kredensial = "VALID"
                    res = scrape_res
                    res["status_koneksi"] = "LOS"
                else:
                    cust.status_kredensial = "INVALID"
                    res = scrape_res
                    res["status_koneksi"] = "INVALID"
                rem_lock = scrape_res.get("lockout_remaining_seconds", 60)
                ket = f"Modem Lockout ONT ({rem_lock}s tersisa). Harap tunggu jeda keamanan."
            elif scrape_res.get("error_type") == "AUTH_FAILED":
                if was_previously_valid:
                    # Kredensial sudah benar/valid sebelumnya, modem mungkin sibuk atau menolak session. Pertahankan VALID!
                    cust.status_kredensial = "VALID"
                    res = scrape_res
                    res["status_koneksi"] = "LOS"
                    ket = "Login Tertunda (Modem Sibuk / Session Semaphore, Kredensial Tetap Valid)"
                else:
                    cust.status_kredensial = "INVALID"
                    res = scrape_res
                    res["status_koneksi"] = "INVALID"
                    ket = "Login Gagal (User/Pass Salah)"
            elif scrape_res.get("error_type") == "UNREACHABLE":
                if was_previously_valid:
                    cust.status_kredensial = "VALID"
                res = scrape_res
                ket = "Gagal Terhubung (Unreachable - Cek Jaringan Lokal)"
            elif settings.SNMP_SIMULATION_MODE and scrape_res.get("error_type") == "UNREACHABLE":
                res = SNMPService.query_ont_simulated(
                    baseline_rx=float(cust.redaman_baseline) if cust.redaman_baseline else None,
                    modem_type=cust.jenis_modem,
                    ip=target_scrape_ip,
                    customer_name=cust.nama
                )
                ket = "Simulasi Manual Check"
            else:
                if was_previously_valid:
                    cust.status_kredensial = "VALID"
                res = scrape_res
                ket = f"Single Check: {scrape_res.get('message', 'Unreachable')}"

            # Auto-deteksi: Update MAC Address, Kredensial WiFi, & Jenis Modem jika terdeteksi dari Web GUI ONT
            if res.get("mac_address"):
                cust.mac_address = res["mac_address"]
            if res.get("nama_wifi"):
                cust.nama_wifi = res["nama_wifi"]
            if res.get("password_wifi"):
                cust.password_wifi = res["password_wifi"]
            if res.get("jenis_modem"):
                cust.jenis_modem = res["jenis_modem"]

            now = get_now_wib()
            log_entry = LogPerformaONT(
                id_pelanggan=cust.id_pelanggan,
                waktu_cek=now,
                rx_power=res.get("rx_power"),
                suhu_ont=res.get("suhu_ont"),
                uptime=res.get("uptime"),
                status_koneksi=res.get("status_koneksi") or "LOS",
                latency_ms=res.get("latency_ms"),
                keterangan=ket
            )
            db.add(log_entry)
            db.commit()

            return {
                "id_pelanggan": cust.id_pelanggan,
                "nama": cust.nama,
                "ip_router": cust.ip_router,
                "rx_power": res.get("rx_power"),
                "suhu_ont": res.get("suhu_ont"),
                "uptime": res.get("uptime"),
                "status_koneksi": res.get("status_koneksi") or "LOS",
                "status_kredensial": cust.status_kredensial,
                "user_admin": cust.user_admin,
                "pass_admin": cust.pass_admin,
                "mac_address": cust.mac_address,
                "nama_wifi": cust.nama_wifi,
                "password_wifi": cust.password_wifi,
                "latency_ms": res.get("latency_ms"),
                "keterangan": ket,
                "success": bool(res.get("success")),
                "error_type": res.get("error_type"),
                "lockout_remaining_seconds": res.get("lockout_remaining_seconds", 0),
                "waktu_cek": now.strftime("%Y-%m-%d %H:%M:%S")
            }
        finally:
            if created_local_db:
                db.close()

scheduler = MonitoringScheduler()
ont_scheduler = scheduler
