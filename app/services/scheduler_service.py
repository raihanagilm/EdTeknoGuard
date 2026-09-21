import asyncio
import os
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib, get_today_wib

from app.core.database import SessionLocal
from app.core.config import settings
from app.db.models import Pelanggan, LogPerformaONT, SystemSetting, AlertLog, UserActivityLog
from app.services.snmp_service import SNMPService
from app.services.ont_scraper_service import ONTScraperService

logger = logging.getLogger("scheduler_service")

class MonitoringScheduler:
    _instance = None
    _scheduler: Optional[BackgroundScheduler] = None
    _is_scanning: bool = False
    _is_paused: bool = False
    _stop_requested: bool = False
    _is_network_error: bool = False
    _scan_current: int = 0
    _scan_total: int = 0
    _scan_start_time: float = 0.0
    _last_scan_duration: float = 0.0
    _resume_index: int = 0
    _scan_target_kantor: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MonitoringScheduler, cls).__new__(cls)
            cls._instance._scheduler = BackgroundScheduler(daemon=True)
            cls._instance._is_scanning = False
            cls._instance._is_paused = False
            cls._instance._stop_requested = False
            cls._instance._is_network_error = False
            cls._instance._scan_current = 0
            cls._instance._scan_total = 0
            cls._instance._scan_start_time = 0.0
            cls._instance._last_scan_duration = 0.0
            cls._instance._resume_index = 0
            cls._instance._scan_target_kantor = None
        return cls._instance

    @classmethod
    def get_state_file_path(cls) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        return os.path.join(data_dir, "scan_state.json")

    @classmethod
    def save_scan_state(cls, current_index: int, total: int, kantor: Optional[str] = None):
        try:
            filepath = cls.get_state_file_path()
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump({
                    "status": "PAUSED",
                    "current_index": current_index,
                    "total": total,
                    "kantor": kantor,
                    "timestamp": get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
                }, f, indent=2)
            logger.info(f"[STATE] State pemindaian disimpan ke JSON: {current_index}/{total} (Kantor: {kantor or 'SEMUA'})")
        except Exception as e:
            logger.error(f"[STATE] Gagal menyimpan scan_state.json: {e}")

    @classmethod
    def load_scan_state(cls) -> Optional[Dict[str, Any]]:
        try:
            filepath = cls.get_state_file_path()
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"[STATE] Gagal membaca scan_state.json: {e}")
        return None

    @classmethod
    def delete_scan_state(cls):
        try:
            filepath = cls.get_state_file_path()
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info("[STATE] State file scan_state.json berhasil dihapus.")
        except Exception as e:
            logger.error(f"[STATE] Gagal menghapus scan_state.json: {e}")

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
    def get_setting_from_db(cls, db: Session, key: str, default: str) -> str:
        item = db.query(SystemSetting).filter(SystemSetting.key_name == key).first()
        return item.value_text if item else default

    @classmethod
    def set_setting_in_db(cls, db: Session, key: str, value: str):
        item = db.query(SystemSetting).filter(SystemSetting.key_name == key).first()
        if item:
            item.value_text = value
        else:
            db.add(SystemSetting(key_name=key, value_text=value))
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
            
            # Deteksi apakah jadwal scan sebelumnya terlewat saat server mati/reboot
            need_immediate_scan = False
            if current_status == "RUNNING":
                if not last_scan_time_str or last_scan_time_str == "-":
                    need_immediate_scan = True
                else:
                    try:
                        last_dt = datetime.strptime(last_scan_time_str, "%Y-%m-%d %H:%M:%S")
                        now_dt = get_now_wib()
                        if (now_dt - last_dt).total_seconds() > (interval * 60):
                            need_immediate_scan = True
                    except Exception:
                        need_immediate_scan = True

            self._scheduler.add_job(
                self.scheduled_job_wrapper,
                "interval",
                minutes=interval,
                id="ont_monitoring_job",
                replace_existing=True
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
                logger.info(f"Aplikasi aktif. Status Scheduler dipulihkan ke: RUNNING (Interval: {interval} menit) sesuai status terakhir.")
                if need_immediate_scan:
                    logger.info("Jadwal scan terlewat saat server mati/nonaktif. Menjadwalkan catch-up scan otomatis dalam 5 detik...")
                    self._scheduler.add_job(
                        self.scheduled_job_wrapper,
                        "date",
                        run_date=datetime.now() + timedelta(seconds=5),
                        id="immediate_recovery_scan_job"
                    )

            logger.info("[CLEANUP] Job cleanup alert_logs (setiap hari, >7 hari) & activity_logs (setiap hari, >60 hari) aktif.")

    def update_interval(self, minutes: int):
        db = SessionLocal()
        try:
            self.set_setting_in_db(db, "polling_interval_minutes", str(minutes))
        finally:
            db.close()

        settings.POLLING_INTERVAL_MINUTES = minutes
        if self._scheduler and self._scheduler.running:
            try:
                self._scheduler.reschedule_job(
                    "ont_monitoring_job",
                    trigger="interval",
                    minutes=minutes
                )
                logger.info(f"Interval scheduler berhasil diubah menjadi {minutes} menit.")
            except Exception as e:
                logger.error(f"Gagal reschedule job: {e}")

    def stop(self):
        db = SessionLocal()
        try:
            self.set_setting_in_db(db, "scheduler_status", "STOPPED")
        finally:
            db.close()
        logger.info("Pemantauan otomatis ONT dijeda (STOPPED) dan disimpan permanen.")

    def resume(self):
        db = SessionLocal()
        try:
            self.set_setting_in_db(db, "scheduler_status", "RUNNING")
        finally:
            db.close()
        logger.info("Pemantauan otomatis ONT dilanjutkan (RUNNING) dan disimpan permanen.")

    def pause_scan(self) -> Dict[str, Any]:
        """Menjeda pemindaian manual/berkala yang sedang aktif berjalan."""
        if not self._is_scanning:
            return {"status": "error", "message": "Tidak ada proses pemindaian yang sedang berjalan untuk dijeda."}
        self._is_paused = True
        logger.info("[SCAN] Sinyal jeda pemindaian diterima.")
        return {"status": "success", "message": "Sinyal jeda dikirim, pemindaian akan dijeda setelah modem saat ini."}

    def stop_scan(self) -> Dict[str, Any]:
        """Menghentikan paksa pemindaian yang sedang berjalan atau membatalkan yang dijeda."""
        self._stop_requested = True
        self._is_paused = False
        self._scan_target_kantor = None
        self.delete_scan_state()
        if not self._is_scanning:
            self._resume_index = 0
            self._scan_current = 0
            self._stop_requested = False
        logger.info("[SCAN] Sinyal berhenti paksa pemindaian diterima.")
        return {"status": "success", "message": "Pemindaian dihentikan paksa dan progres dibersihkan."}

    def resume_scan(self) -> Dict[str, Any]:
        """Melanjutkan pemindaian yang dijeda dari checkpoint JSON."""
        if self._is_scanning:
            return {"status": "busy", "message": "Proses pemindaian sedang berjalan."}
        state = self.load_scan_state()
        kantor = None
        if state and state.get("current_index") is not None:
            self._resume_index = state.get("current_index", 0)
            kantor = state.get("kantor")
        self._is_paused = False
        self._stop_requested = False
        logger.info(f"[SCAN] Melanjutkan pemindaian dari indeks ke-{self._resume_index} (Kantor: {kantor or 'SEMUA'})...")
        return self.execute_scan_sync(kantor=kantor)

    def get_status(self) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            status = self.get_setting_from_db(db, "scheduler_status", "RUNNING")
            interval_str = self.get_setting_from_db(db, "polling_interval_minutes", str(settings.POLLING_INTERVAL_MINUTES))
            last_scan = self.get_setting_from_db(db, "last_scan_time", "-")
            net_err_str = self.get_setting_from_db(db, "is_network_error", "false")
            total_customers = db.query(Pelanggan).count()
            interval = int(interval_str) if interval_str.isdigit() else settings.POLLING_INTERVAL_MINUTES
            is_net_err = (net_err_str.lower() == "true") or self._is_network_error
            last_duration_str = self.get_setting_from_db(db, "last_scan_duration", str(self._last_scan_duration or 0.0))
            last_duration = float(last_duration_str) if last_duration_str.replace('.', '', 1).isdigit() else (self._last_scan_duration or 0.0)
        finally:
            db.close()

        state = self.load_scan_state()
        has_saved_state = state is not None and state.get("status") == "PAUSED"
        is_paused = self._is_paused or (has_saved_state and not self._is_scanning)

        # Hitung estimasi waktu pemindaian real-time
        elapsed = round(time.time() - self._scan_start_time, 1) if (self._is_scanning and self._scan_start_time > 0) else 0.0
        if self._is_scanning and self._scan_current > 0 and self._scan_total > 0:
            avg_per_ont = (time.time() - self._scan_start_time) / self._scan_current
            est_total = round(avg_per_ont * self._scan_total, 1)
        else:
            est_total = last_duration if last_duration > 0 else 0.0

        scan_current_val = self._scan_current
        if not self._is_scanning and has_saved_state:
            scan_current_val = state.get("current_index", self._scan_current)
            if self._scan_total == 0:
                self._scan_total = state.get("total", total_customers)

        target_kantor = self._scan_target_kantor or (state.get("kantor") if state else None) or "all"
        scan_progress = {
            "current": scan_current_val,
            "total": self._scan_total,
            "target_kantor": target_kantor,
            "percent": int((scan_current_val / self._scan_total) * 100) if self._scan_total > 0 else 0,
            "is_scanning": self._is_scanning,
            "is_paused": is_paused,
            "can_resume": is_paused and not self._is_scanning,
            "can_stop": self._is_scanning or is_paused,
            "elapsed_seconds": elapsed,
            "estimated_total_seconds": est_total,
            "last_scan_duration": last_duration
        }

        next_run_time_str = "-"
        if self._scheduler and self._scheduler.running:
            job = self._scheduler.get_job("ont_monitoring_job")
            if job and job.next_run_time:
                next_run_time_str = job.next_run_time.strftime("%Y-%m-%d %H:%M:%S")

        return {
            "status": status,
            "interval_minutes": interval,
            "last_scan_time": last_scan,
            "next_run_time": next_run_time_str,
            "is_scanning": self._is_scanning,
            "is_paused": is_paused,
            "can_resume": is_paused and not self._is_scanning,
            "can_stop": self._is_scanning or is_paused,
            "is_network_error": is_net_err,
            "total_customers": total_customers,
            "scan_progress": scan_progress
        }

    def scheduled_job_wrapper(self):
        """Dijalankan tiap 5 menit oleh APScheduler background thread (Semua Kantor)"""
        db = SessionLocal()
        try:
            current_status = self.get_setting_from_db(db, "scheduler_status", "RUNNING")
            if current_status != "RUNNING":
                logger.info("Scheduler dalam keadaan STOPPED, melewati siklus pengecekan.")
                return
        finally:
            db.close()

        # Eksekusi scanning untuk seluruh kantor
        self.execute_scan_sync(kantor=None)

    def execute_scan_sync(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        if self._is_scanning:
            return {"status": "busy", "message": "Proses pemindaian sedang berjalan."}

        # Cek jika ada state tersimpan di JSON jika resume_index belum diset
        state = self.load_scan_state()
        if state and state.get("current_index") is not None and self._resume_index == 0:
            self._resume_index = state.get("current_index", 0)
            if not kantor and state.get("kantor"):
                kantor = state.get("kantor")

        self._is_scanning = True
        self._is_paused = False
        self._stop_requested = False
        self._scan_target_kantor = kantor if (kantor and kantor != "all") else None
        self._scan_start_time = time.time()
        
        db = SessionLocal()
        try:
            query = db.query(Pelanggan).filter(
                Pelanggan.is_active == True,
                Pelanggan.is_monitored == True
            )
            if self._scan_target_kantor:
                query = query.filter(Pelanggan.kantor == self._scan_target_kantor)
            pelanggan_list = query.all()
            self._scan_total = len(pelanggan_list)
            
            if self._resume_index >= self._scan_total:
                self._resume_index = 0
                self.delete_scan_state()
                
            self._scan_current = self._resume_index
            pelanggan_to_scan = pelanggan_list[self._resume_index:]

            now = get_now_wib()
            results = []
            warning_count = 0
            critical_count = 0
            los_count = 0
            los_by_pop = {}
            # Buffer LOS alerts — dikirim setelah scan selesai (batch jika >= 5)
            los_pending_alerts = []  # list of (cust, log_entry)

            default_user = self.get_setting_from_db(db, "default_modem_user", "admin")
            default_pass = self.get_setting_from_db(db, "default_modem_pass", "tekno2024")
            raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]")
            default_creds_list = []
            try:
                import json
                p_creds = json.loads(raw_creds)
                if isinstance(p_creds, list):
                    default_creds_list = [(c.get("username", ""), c.get("password", "")) for c in p_creds if c.get("username")]
            except Exception:
                default_creds_list = []

            unreachable_count = 0
            for cust in pelanggan_to_scan:
                # 0. Cek interupsi STOP (Berhenti Paksa)
                if self._stop_requested:
                    logger.info("[SCAN] Pemindaian dihentikan paksa (STOP).")
                    self.delete_scan_state()
                    self._is_scanning = False
                    self._is_paused = False
                    self._stop_requested = False
                    self._resume_index = 0
                    self._scan_current = 0
                    return {"status": "stopped", "message": "Pemindaian dihentikan paksa oleh Admin."}

                # 0. Cek interupsi JEDA (Pause)
                if self._is_paused:
                    logger.info(f"[SCAN] Pemindaian dijeda pada pelanggan ke-{self._scan_current} dari {self._scan_total} (Kantor: {self._scan_target_kantor or 'SEMUA'}).")
                    self._is_scanning = False
                    self._resume_index = self._scan_current
                    self.save_scan_state(current_index=self._resume_index, total=self._scan_total, kantor=self._scan_target_kantor)
                    return {
                        "status": "paused",
                        "message": f"Pemindaian dijeda pada pelanggan ke-{self._resume_index} dari {self._scan_total}.",
                        "current_index": self._resume_index,
                        "total": self._scan_total,
                        "target_kantor": self._scan_target_kantor or "all"
                    }

                self._scan_current += 1
                # 1. Coba Scraping Live ONT GM220-S via HTTP
                scrape_res = ONTScraperService.scrape_ont(
                    ip=cust.ip_router,
                    customer_user=cust.user_admin,
                    customer_pass=cust.pass_admin,
                    default_user=default_user,
                    default_pass=default_pass,
                    customer_name=cust.nama,
                    default_credentials=default_creds_list
                )

                # Evaluasi hasil scraping
                if scrape_res["success"] and scrape_res["rx_power"] is not None:
                    res = scrape_res
                    cust.status_kredensial = "VALID"
                    # Jika berhasil via kredensial default, sinkronkan ke pelanggan
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

                # Auto-deteksi: Hanya simpan MAC Address jika berhasil terbaca (WiFi diatur manual)
                if res.get("mac_address"):
                    cust.mac_address = res["mac_address"]

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

                # Cek apakah kegagalan ini disebabkan oleh kredensial / gagal login
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
                    # Hanya kelompokkan ke deteksi pemadaman massal jika bukan gagal login
                    if not is_auth_failure:
                        cust.los_count += 1
                        pop_name = cust.pop or "Server Cabang"
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
                    self._resume_index = self._scan_current - 1
                    raise inner_e


            self.set_setting_in_db(db, "last_scan_time", now.strftime("%Y-%m-%d %H:%M:%S"))
            # Pembersihan log > 30 hari berkala
            self.cleanup_old_logs(db, days=30)
            db.commit()
            
            # Jika berhasil selesai semuanya, reset resume_index & hapus state file JSON
            self.delete_scan_state()
            self._resume_index = 0
            self._is_paused = False
            effective_kantor = self._scan_target_kantor or "all"
            self._scan_target_kantor = None

            # Deteksi apakah server terputus dari jaringan lokal ISP / VLAN ONT
            if len(pelanggan_list) > 0 and unreachable_count == len(pelanggan_list):
                self._is_network_error = True
                self.set_setting_in_db(db, "is_network_error", "true")
                db.commit()
                return {
                    "status": "error",
                    "error_type": "NETWORK_UNREACHABLE",
                    "is_network_error": True,
                    "message": "Koneksi Gagal: Server tidak terhubung ke jaringan lokal / VLAN ISP ONT (10.10.x.x). Pemindaian dihentikan!",
                    "scanned_total": len(pelanggan_list),
                    "warning_count": warning_count,
                    "critical_count": critical_count,
                    "los_count": los_count,
                    "target_kantor": effective_kantor,
                    "scan_time": now.strftime("%Y-%m-%d %H:%M:%S")
                }

            self._is_network_error = False
            self.set_setting_in_db(db, "is_network_error", "false")
            db.commit()
            return {
                "status": "success",
                "scanned_total": len(pelanggan_list),
                "warning_count": warning_count,
                "critical_count": critical_count,
                "los_count": los_count,
                "target_kantor": effective_kantor,
                "scan_time": now.strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            logger.error(f"Error saat scan all: {e}")
            if self._scan_current > 0 and self._scan_current <= self._scan_total:
                self._resume_index = self._scan_current - 1
            return {"status": "error", "message": str(e)}
        finally:
            if self._scan_start_time > 0:
                self._last_scan_duration = round(time.time() - self._scan_start_time, 1)
                try:
                    s_db = SessionLocal()
                    self.set_setting_in_db(s_db, "last_scan_duration", str(self._last_scan_duration))
                    s_db.close()
                except Exception:
                    pass
            self._is_scanning = False
            db.close()

    def scan_single(self, id_pelanggan: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if not cust:
                return None

            default_user = self.get_setting_from_db(db, "default_modem_user", "admin")
            default_pass = self.get_setting_from_db(db, "default_modem_pass", "tekno2024")
            raw_creds = self.get_setting_from_db(db, "default_modem_credentials", "[]")
            default_creds_list = []
            try:
                import json
                p_creds = json.loads(raw_creds)
                if isinstance(p_creds, list):
                    default_creds_list = [(c.get("username", ""), c.get("password", "")) for c in p_creds if c.get("username")]
            except Exception:
                default_creds_list = []

            scrape_res = ONTScraperService.scrape_ont(
                ip=cust.ip_router,
                customer_user=cust.user_admin,
                customer_pass=cust.pass_admin,
                default_user=default_user,
                default_pass=default_pass,
                customer_name=cust.nama,
                default_credentials=default_creds_list
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
                    ip=cust.ip_router,
                    customer_name=cust.nama
                )
                ket = "Simulasi Manual Check"
            else:
                res = scrape_res
                ket = f"Single Check Error: {scrape_res.get('message', 'Unreachable')}"

            # Auto-deteksi: Update MAC Address jika terdeteksi (WiFi manual)
            if res.get("mac_address"):
                cust.mac_address = res["mac_address"]

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
