from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import SystemSetting
from app.services.scheduler_service import scheduler
from app.modules.settings.schemas import SystemSettingsSchema

class SystemSettingsService:

    @staticmethod
    def get_settings(db: Session) -> Dict[str, Any]:
        keys = [
            "polling_interval_minutes",
            "warning_threshold_dbm",
            "critical_threshold_dbm",
            "scheduler_status",
            "default_modem_user",
            "default_modem_pass"
        ]
        db_settings = {}
        rows = db.query(SystemSetting).filter(SystemSetting.key_name.in_(keys)).all()
        for r in rows:
            db_settings[r.key_name] = r.value_text

        try:
            polling_interval = int(db_settings.get("polling_interval_minutes", settings.POLLING_INTERVAL_MINUTES))
        except (ValueError, TypeError):
            polling_interval = 5

        try:
            warning_threshold = float(db_settings.get("warning_threshold_dbm", settings.WARNING_THRESHOLD_DBM))
        except (ValueError, TypeError):
            warning_threshold = -26.0

        try:
            critical_threshold = float(db_settings.get("critical_threshold_dbm", settings.CRITICAL_THRESHOLD_DBM))
        except (ValueError, TypeError):
            critical_threshold = -32.0

        scheduler_status = db_settings.get("scheduler_status", "RUNNING")
        default_user = db_settings.get("default_modem_user", "admin")
        default_pass = db_settings.get("default_modem_pass", "tekno2024")

        return {
            "polling_interval_minutes": polling_interval,
            "warning_threshold_dbm": warning_threshold,
            "critical_threshold_dbm": critical_threshold,
            "scheduler_status": scheduler_status,
            "default_modem_user": default_user,
            "default_modem_pass": default_pass
        }

    @staticmethod
    def update_settings(db: Session, data: SystemSettingsSchema) -> Dict[str, Any]:
        # 1. Simpan ke database TiDB Cloud
        pairs = {
            "polling_interval_minutes": str(data.polling_interval_minutes),
            "warning_threshold_dbm": str(data.warning_threshold_dbm),
            "critical_threshold_dbm": str(data.critical_threshold_dbm),
            "scheduler_status": data.scheduler_status or "RUNNING",
            "default_modem_user": (data.default_modem_user or "admin").strip(),
            "default_modem_pass": (data.default_modem_pass or "tekno2024").strip()
        }

        for k, v in pairs.items():
            item = db.query(SystemSetting).filter(SystemSetting.key_name == k).first()
            if item:
                item.value_text = v
                item.updated_at = datetime.now()
            else:
                db.add(SystemSetting(key_name=k, value_text=v))

        # 2. Jika opsi sinkronisasi diaktifkan:
        # Ubah username & password HANYA untuk pelanggan yang status_kredensial != 'VALID'
        updated_cust_count = 0
        if data.apply_to_invalid_customers:
            from app.db.models import Pelanggan
            target_customers = db.query(Pelanggan).filter(Pelanggan.status_kredensial != "VALID").all()
            for c in target_customers:
                c.user_admin = pairs["default_modem_user"]
                c.pass_admin = pairs["default_modem_pass"]
                c.updated_at = datetime.now()
                updated_cust_count += 1

        db.commit()

        # 2. Perbarui in-memory settings runtime
        settings.POLLING_INTERVAL_MINUTES = data.polling_interval_minutes
        settings.WARNING_THRESHOLD_DBM = data.warning_threshold_dbm
        settings.CRITICAL_THRESHOLD_DBM = data.critical_threshold_dbm

        # 3. Sinkronisasi background scheduler realtime
        scheduler.update_interval(data.polling_interval_minutes)

        if data.scheduler_status == "STOPPED":
            scheduler.stop()
        elif data.scheduler_status == "RUNNING":
            scheduler.resume()

        return SystemSettingsService.get_settings(db)
