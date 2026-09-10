import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.config import settings
from app.db.models import Pelanggan, LogPerformaONT, SystemSetting
from app.services.snmp_service import SNMPService
from app.services.telegram_service import TelegramService

logger = logging.getLogger("scheduler_service")

class MonitoringScheduler:
    _instance = None
    _scheduler: Optional[BackgroundScheduler] = None
    _is_scanning: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MonitoringScheduler, cls).__new__(cls)
            cls._instance._scheduler = BackgroundScheduler(daemon=True)
        return cls._instance

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
            try:
                interval_str = self.get_setting_from_db(db, "polling_interval_minutes", str(settings.POLLING_INTERVAL_MINUTES))
                interval = int(interval_str)
            except Exception:
                interval = settings.POLLING_INTERVAL_MINUTES
            finally:
                db.close()

            settings.POLLING_INTERVAL_MINUTES = interval
            self._scheduler.add_job(
                self.scheduled_job_wrapper,
                "interval",
                minutes=interval,
                id="ont_monitoring_job",
                replace_existing=True
            )
            self._scheduler.start()
            logger.info(f"Scheduler pemantau ONT dimulai (Interval: {interval} menit).")

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
        logger.info("Pemantauan otomatis ONT dijeda (STOPPED).")

    def resume(self):
        db = SessionLocal()
        try:
            self.set_setting_in_db(db, "scheduler_status", "RUNNING")
        finally:
            db.close()
        logger.info("Pemantauan otomatis ONT dilanjutkan (RUNNING).")

    def get_status(self) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            status = self.get_setting_from_db(db, "scheduler_status", "RUNNING")
            last_scan = self.get_setting_from_db(db, "last_scan_time", "-")
            total_customers = db.query(Pelanggan).count()
        finally:
            db.close()

        return {
            "status": status,
            "interval_minutes": settings.POLLING_INTERVAL_MINUTES,
            "last_scan_time": last_scan,
            "is_scanning": self._is_scanning,
            "total_customers": total_customers
        }

    def scheduled_job_wrapper(self):
        """Dijalankan tiap 5 menit oleh APScheduler background thread"""
        db = SessionLocal()
        try:
            current_status = self.get_setting_from_db(db, "scheduler_status", "RUNNING")
            if current_status != "RUNNING":
                logger.info("Scheduler dalam keadaan STOPPED, melewati siklus pengecekan.")
                return
        finally:
            db.close()

        # Eksekusi scanning
        self.execute_scan_sync()

    def execute_scan_sync(self) -> Dict[str, Any]:
        if self._is_scanning:
            return {"status": "busy", "message": "Proses pemindaian sedang berjalan."}

        self._is_scanning = True
        db = SessionLocal()
        try:
            pelanggan_list = db.query(Pelanggan).filter(Pelanggan.is_active == True).all()
            now = datetime.now()
            results = []
            warning_count = 0
            critical_count = 0
            los_count = 0
            los_by_pop = {}

            for cust in pelanggan_list:
                res = SNMPService.query_ont(
                    ip=cust.ip_router,
                    community=cust.snmp_community,
                    modem_type=cust.jenis_modem,
                    baseline_rx=float(cust.redaman_baseline) if cust.redaman_baseline else None
                )

                log_entry = LogPerformaONT(
                    id_pelanggan=cust.id_pelanggan,
                    waktu_cek=now,
                    rx_power=res.get("rx_power"),
                    suhu_ont=res.get("suhu_ont"),
                    uptime=res.get("uptime"),
                    status_koneksi=res.get("status_koneksi"),
                    latency_ms=res.get("latency_ms"),
                    keterangan="Periodic 5m Check"
                )
                db.add(log_entry)

                st = res.get("status_koneksi")
                if st == "WARNING":
                    warning_count += 1
                elif st == "CRITICAL":
                    critical_count += 1
                elif st == "LOS":
                    los_count += 1
                    pop_name = cust.pop or "Server Cabang"
                    if pop_name not in los_by_pop:
                        los_by_pop[pop_name] = []
                    los_by_pop[pop_name].append(cust.nama)

                # Kirim telegram alert jika warning/critical/LOS dengan anti-spam debounce
                if st in ["WARNING", "CRITICAL", "LOS"]:
                    TelegramService.process_and_send_alert_sync(
                        pelanggan=cust,
                        log_entry=log_entry,
                        db=db
                    )

                results.append({
                    "id_pelanggan": cust.id_pelanggan,
                    "nama": cust.nama,
                    "rx_power": res.get("rx_power"),
                    "status": st
                })

            # Evaluasi Gangguan Massal (>= 3 ONT LOS di POP yang sama sesuai PRD Section 4.4)
            for pop_name, affected_names in los_by_pop.items():
                if len(affected_names) >= 3:
                    TelegramService.send_mass_outage_alert_sync(
                        pop=pop_name,
                        count=len(affected_names),
                        customer_names=affected_names,
                        db=db
                    )

            self.set_setting_in_db(db, "last_scan_time", now.strftime("%Y-%m-%d %H:%M:%S"))
            db.commit()

            return {
                "status": "success",
                "scanned_total": len(pelanggan_list),
                "warning_count": warning_count,
                "critical_count": critical_count,
                "los_count": los_count,
                "scan_time": now.strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            logger.error(f"Error saat scan all: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            self._is_scanning = False
            db.close()

    def scan_single(self, id_pelanggan: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if not cust:
                return None

            res = SNMPService.query_ont(
                ip=cust.ip_router,
                community=cust.snmp_community,
                modem_type=cust.jenis_modem,
                baseline_rx=float(cust.redaman_baseline) if cust.redaman_baseline else None
            )

            now = datetime.now()
            log_entry = LogPerformaONT(
                id_pelanggan=cust.id_pelanggan,
                waktu_cek=now,
                rx_power=res.get("rx_power"),
                suhu_ont=res.get("suhu_ont"),
                uptime=res.get("uptime"),
                status_koneksi=res.get("status_koneksi"),
                latency_ms=res.get("latency_ms"),
                keterangan="Manual Single Check"
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
                "status_koneksi": res.get("status_koneksi"),
                "latency_ms": res.get("latency_ms"),
                "waktu_cek": now.strftime("%Y-%m-%d %H:%M:%S")
            }
        finally:
            db.close()

scheduler = MonitoringScheduler()
