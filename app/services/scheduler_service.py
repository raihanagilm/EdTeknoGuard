import asyncio
import os
import json
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib, get_today_wib

from app.core.database import SessionLocal
from app.core.config import settings
from app.db.models import Pelanggan, LogPerformaONT, SystemSetting, AlertLog, UserActivityLog, Kantor
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
        """Menghapus alert_logs yang berusia lebih dari 7 hari. Dipanggil dari job scheduler harian."""
        db = SessionLocal()
        try:
            cutoff = get_now_wib() - timedelta(days=days)
            deleted = db.query(AlertLog).filter(AlertLog.waktu_kirim < cutoff).delete(synchronize_session=False)
            db.commit()
            if deleted > 0:
                logger.info(f"[CLEANUP] Berhasil membersihkan {deleted} alert log lama (> {days} hari).")
            return deleted
        except Exception as e:
            logger.error(f"[CLEANUP] Gagal membersihkan alert log lama: {e}")
            db.rollback()
            return 0
        finally:
            db.close()

    @classmethod
    def cleanup_activity_logs(cls, days: int = 60) -> int:
        """Menghapus user_activity_logs yang berusia lebih dari 60 hari (2 bulan). Dipanggil dari job scheduler bulanan."""
        db = SessionLocal()
        try:
            cutoff = get_now_wib() - timedelta(days=days)
            deleted = db.query(UserActivityLog).filter(UserActivityLog.created_at < cutoff).delete(synchronize_session=False)
            db.commit()
            if deleted > 0:
                logger.info(f"[CLEANUP] Berhasil membersihkan {deleted} log aktivitas lama (> {days} hari / 2 bulan).")
            return deleted
        except Exception as e:
            logger.error(f"[CLEANUP] Gagal membersihkan log aktivitas lama: {e}")
            db.rollback()
            return 0
        finally:
            db.close()


    @classmethod
    def get_setting_from_db(cls, db: Session, key: str, default: str, kantor: Optional[str] = None) -> str:
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        if k:
            item = db.query(SystemSetting).filter(SystemSetting.key_name == key, SystemSetting.kantor_kode == k).first()
            if item and item.value_text is not None:
                return item.value_text
        # Fallback ke setting global (kantor_kode IS NULL)
        item_global = db.query(SystemSetting).filter(SystemSetting.key_name == key, SystemSetting.kantor_kode.is_(None)).first()
        return item_global.value_text if (item_global and item_global.value_text is not None) else default

    @classmethod
    def set_setting_in_db(cls, db: Session, key: str, value: str, kantor: Optional[str] = None):
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        q = db.query(SystemSetting).filter(SystemSetting.key_name == key)
        if k:
            q = q.filter(SystemSetting.kantor_kode == k)
        else:
            q = q.filter(SystemSetting.kantor_kode.is_(None))
        item = q.first()
        if item:
            item.value_text = value
            item.updated_at = get_now_wib()
        else:
            db.add(SystemSetting(kantor_kode=k, key_name=key, value_text=value))
        db.commit()

    def start(self):
        if self._scheduler and not self._scheduler.running:
            db = SessionLocal()
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
                # Pembersihan log lama > 30 hari otomatis saat startup
                self.cleanup_old_logs(db, days=30)
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
        db = SessionLocal()
        try:
            self.set_setting_in_db(db, "polling_interval_minutes", str(minutes), kantor=kantor)
        finally:
            db.close()

        if not kantor or kantor == "all":
            settings.POLLING_INTERVAL_MINUTES = minutes
        logger.info(f"Interval pemantauan kantor '{kantor or 'global'}' diperbarui menjadi {minutes} menit di DB.")

    def stop(self, kantor: Optional[str] = None):
        db = SessionLocal()
        try:
            now_str = get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
            if kantor and kantor != "all":
                k = kantor.lower().strip()
                self.set_setting_in_db(db, "scheduler_status", "STOPPED", kantor=k)
                self.set_setting_in_db(db, "scheduler_paused_at", now_str, kantor=k)
                logger.info(f"Pemantauan otomatis ONT kantor {k.upper()} dijeda (STOPPED) dan disimpan permanen.")
            else:
                self.set_setting_in_db(db, "scheduler_status", "STOPPED", kantor=None)
                self.set_setting_in_db(db, "scheduler_paused_at", now_str, kantor=None)
                self.set_setting_in_db(db, "last_paused_reminder_at", now_str, kantor=None)
                # Sinkronkan juga ke semua kantor terdaftar
                kantors = db.query(Kantor).all()
                for kt in kantors:
                    self.set_setting_in_db(db, "scheduler_status", "STOPPED", kantor=kt.kode.lower())
                logger.info("Pemantauan otomatis ONT SELURUH KANTOR dijeda (STOPPED) dan disimpan permanen.")
        finally:
            db.close()

    def resume(self, kantor: Optional[str] = None):
        db = SessionLocal()
        try:
            if kantor and kantor != "all":
                k = kantor.lower().strip()
                self.set_setting_in_db(db, "scheduler_status", "RUNNING", kantor=k)
                self.set_setting_in_db(db, "scheduler_paused_at", "", kantor=k)
                logger.info(f"Pemantauan otomatis ONT kantor {k.upper()} dilanjutkan (RUNNING) dan disimpan permanen.")
            else:
                self.set_setting_in_db(db, "scheduler_status", "RUNNING", kantor=None)
                self.set_setting_in_db(db, "scheduler_paused_at", "", kantor=None)
                kantors = db.query(Kantor).all()
                for kt in kantors:
                    self.set_setting_in_db(db, "scheduler_status", "RUNNING", kantor=kt.kode.lower())
                logger.info("Pemantauan otomatis ONT SELURUH KANTOR dilanjutkan (RUNNING) dan disimpan permanen.")
        finally:
            db.close()

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

            seconds_since_last_reminder = (now_dt - last_reminder_dt).total_seconds()
            # Picu notifikasi tiap 1 jam (3600 detik)
            if seconds_since_last_reminder >= 3600:
                total_paused_hours = max(1, int(round((now_dt - paused_dt).total_seconds() / 3600)))
                return {
                    "show": True,
                    "paused_hours": total_paused_hours,
                    "paused_at": paused_at_str,
                    "title": "PENGINGAT: Pemantauan Otomatis Sedang Dijeda!",
                    "message": f"Pemantauan otomatis ONT telah dijeda selama {total_paused_hours} jam. Apakah ingin melanjutkan jeda atau mengaktifkan jadwal sekarang?"
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

    def get_status(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k = (kantor or "all").lower().strip()
        is_office_active = True
        db = SessionLocal()
        try:
            # Cek status aktif/nonaktif kantor dari tabel kantors
            if k != "all":
                from sqlalchemy import func
                from app.db.models import Kantor
                k_obj = db.query(Kantor).filter(func.lower(Kantor.kode) == k).first()
                if k_obj is not None:
                    is_office_active = bool(k_obj.is_active)

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

            query = db.query(Pelanggan).filter(
                Pelanggan.is_active == True,
                Pelanggan.is_monitored == True
            )
            if k != "all":
                query = query.filter(Pelanggan.kantor == k)
            pelanggan_list = query.all()
            
            with state.lock:
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
            for cust in pelanggan_to_scan:
                # 0. Cek interupsi STOP (Berhenti Paksa)
                with state.lock:
                    if state.stop_requested:
                        logger.info(f"[SCAN] Pemindaian kantor {k.upper()} dihentikan paksa (STOP).")
                        self.delete_scan_state(k)
                        state.is_scanning = False
                        state.is_paused = False
                        state.stop_requested = False
                        state.resume_index = 0
                        state.scan_current = 0
                        return {"status": "stopped", "message": f"Pemindaian kantor {k.upper()} dihentikan paksa oleh Admin."}

                    # 0. Cek interupsi JEDA (Pause)
                    if state.is_paused:
                        logger.info(f"[SCAN] Pemindaian kantor {k.upper()} dijeda pada pelanggan ke-{state.scan_current} dari {state.scan_total}.")
                        state.is_scanning = False
                        state.resume_index = state.scan_current
                        self.save_scan_state(current_index=state.resume_index, total=state.scan_total, kantor=k)
                        return {
                            "status": "paused",
                            "message": f"Pemindaian kantor {k.upper()} dijeda pada pelanggan ke-{state.resume_index} dari {state.scan_total}.",
                            "current_index": state.resume_index,
                            "total": state.scan_total,
                            "target_kantor": k
                        }

                    state.scan_current += 1

                # 1. Coba Scraping Live ONT GM220-S via HTTP (Prioritas IP ONT, fallback IP Router)
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
                    crit_threshold=eff_crit_th
                )

                # Evaluasi hasil scraping
                if scrape_res["success"] and scrape_res["rx_power"] is not None:
                    res = scrape_res
                    cust.status_kredensial = "VALID"
                    if scrape_res.get("updated_user") and scrape_res.get("updated_pass"):
                        cust.user_admin = scrape_res["updated_user"]
                        cust.pass_admin = scrape_res["updated_pass"]
                    ket = f"Live Scraping OK ({res.get('gpon_state', 'Normal')})"
                elif scrape_res.get("error_type") == "AUTH_FAILED":
                    cust.status_kredensial = "INVALID"
                    res = scrape_res
                    ket = "Login Gagal (User/Pass Salah)"
                elif scrape_res.get("error_type") == "UNREACHABLE":
                    unreachable_count += 1
                    res = scrape_res
                    ket = "Gagal Terhubung (Unreachable - Cek Jaringan Lokal)"
                else:
                    res = scrape_res
                    ket = f"Error: {scrape_res.get('message', 'Gagal')}"

                # Auto-deteksi: Simpan MAC Address & Kredensial WiFi jika berhasil terbaca dari ONT
                if res.get("mac_address"):
                    cust.mac_address = res["mac_address"]
                if res.get("nama_wifi"):
                    cust.nama_wifi = res["nama_wifi"]
                if res.get("password_wifi"):
                    cust.password_wifi = res["password_wifi"]

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

                is_auth_failure = (
                    res.get("error_type") == "AUTH_FAILED"
                    or cust.status_kredensial == "INVALID"
                    or "login gagal" in ket.lower()
                    or "kredensial" in ket.lower()
                    or "ditolak" in ket.lower()
                )

                st = res.get("status_koneksi") or "LOS"
                if st == "WARNING":
                    warning_count += 1
                    cust.los_count = 0
                elif st == "CRITICAL":
                    critical_count += 1
                    cust.los_count = 0
                elif st == "LOS":
                    los_count += 1
                    if not is_auth_failure:
                        cust.los_count += 1
                        pop_name = cust.pop or f"Server {k.upper()}"
                        if pop_name not in los_by_pop:
                            los_by_pop[pop_name] = []
                        los_by_pop[pop_name].append(cust.nama)
                else:
                    cust.los_count = 0

                results.append({
                    "id_pelanggan": cust.id_pelanggan,
                    "nama": cust.nama,
                    "rx_power": res.get("rx_power"),
                    "status": st,
                    "kredensial": cust.status_kredensial,
                    "keterangan": ket
                })
                
                try:
                    db.commit()
                except Exception as inner_e:
                    db.rollback()
                    with state.lock:
                        state.resume_index = max(0, state.scan_current - 1)
                    raise inner_e

            scan_time_str = now.strftime("%Y-%m-%d %H:%M:%S")
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

    def scan_single(self, id_pelanggan: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if not cust:
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
                crit_threshold=eff_crit_th
            )

            if scrape_res["success"] and scrape_res["rx_power"] is not None:
                res = scrape_res
                cust.status_kredensial = "VALID"
                if scrape_res.get("updated_user") and scrape_res.get("updated_pass"):
                    cust.user_admin = scrape_res["updated_user"]
                    cust.pass_admin = scrape_res["updated_pass"]
                ket = f"Live Single Check OK ({res.get('gpon_state', 'Normal')})"
            elif scrape_res.get("error_type") == "AUTH_FAILED":
                cust.status_kredensial = "INVALID"
                res = scrape_res
                ket = "Login Gagal (User/Pass Salah)"
            elif settings.SNMP_SIMULATION_MODE and scrape_res.get("error_type") == "UNREACHABLE":
                res = SNMPService.query_ont_simulated(
                    baseline_rx=float(cust.redaman_baseline) if cust.redaman_baseline else None,
                    modem_type=cust.jenis_modem,
                    ip=target_scrape_ip,
                    customer_name=cust.nama
                )
                ket = "Simulasi Manual Check"
            else:
                res = scrape_res
                ket = f"Single Check Error: {scrape_res.get('message', 'Unreachable')}"

            # Auto-deteksi: Update MAC Address & Kredensial WiFi jika terdeteksi dari Web GUI ONT
            if res.get("mac_address"):
                cust.mac_address = res["mac_address"]
            if res.get("nama_wifi"):
                cust.nama_wifi = res["nama_wifi"]
            if res.get("password_wifi"):
                cust.password_wifi = res["password_wifi"]

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
                "mac_address": cust.mac_address,
                "nama_wifi": cust.nama_wifi,
                "password_wifi": cust.password_wifi,
                "latency_ms": res.get("latency_ms"),
                "keterangan": ket,
                "waktu_cek": now.strftime("%Y-%m-%d %H:%M:%S")
            }
        finally:
            db.close()

scheduler = MonitoringScheduler()
ont_scheduler = scheduler
