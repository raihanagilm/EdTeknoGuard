import json
from datetime import datetime
from typing import Dict, Any, List
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
            "default_modem_pass",
            "default_modem_credentials",
            "telegram_alert_interval_hours",
            "telegram_night_mode_enabled",
            "telegram_night_mode_start",
            "telegram_night_mode_end"
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
            critical_threshold = -27.0

        try:
            tg_interval_hours = float(db_settings.get("telegram_alert_interval_hours", "1.0"))
        except (ValueError, TypeError):
            tg_interval_hours = 1.0

        tg_night_enabled = db_settings.get("telegram_night_mode_enabled", "false").lower() in ["true", "1", "yes"]
        tg_night_start = db_settings.get("telegram_night_mode_start", "22:00")
        tg_night_end = db_settings.get("telegram_night_mode_end", "06:00")

        scheduler_status = db_settings.get("scheduler_status", "RUNNING")
        default_user = db_settings.get("default_modem_user", "admin")
        default_pass = db_settings.get("default_modem_pass", "tekno2024")

        # Parse multi-credentials list JSON
        raw_creds = db_settings.get("default_modem_credentials")
        credentials_list = []
        if raw_creds:
            try:
                parsed = json.loads(raw_creds)
                if isinstance(parsed, list):
                    credentials_list = [
                        {"username": str(item.get("username", "")).strip(), "password": str(item.get("password", "")).strip()}
                        for item in parsed
                        if item.get("username")
                    ]
            except Exception:
                credentials_list = []

        if not credentials_list:
            # Fallback default presets jika belum pernah diatur
            credentials_list = [
                {"username": default_user, "password": default_pass},
                {"username": "admin", "password": "admin"},
                {"username": "tekno", "password": "tekno2025"}
            ]

        # Status token dari .env
        bot_token = settings.TELEGRAM_BOT_TOKEN or ""
        masked_token = f"{bot_token[:6]}...{bot_token[-4:]}" if len(bot_token) > 10 else ("Terkonfigurasi" if bot_token else "Belum diisi di .env")

        return {
            "polling_interval_minutes": polling_interval,
            "warning_threshold_dbm": warning_threshold,
            "critical_threshold_dbm": critical_threshold,
            "scheduler_status": scheduler_status,
            "default_modem_user": credentials_list[0]["username"] if credentials_list else default_user,
            "default_modem_pass": credentials_list[0]["password"] if credentials_list else default_pass,
            "default_modem_credentials": credentials_list,
            "telegram_alert_interval_hours": tg_interval_hours,
            "telegram_night_mode_enabled": tg_night_enabled,
            "telegram_night_mode_start": tg_night_start,
            "telegram_night_mode_end": tg_night_end,
            "telegram_token_configured": bool(settings.TELEGRAM_BOT_TOKEN),
            "telegram_token_masked": masked_token,
            "telegram_chat_ids_configured": settings.TELEGRAM_CHAT_IDS or "-"
        }

    @staticmethod
    def update_settings(db: Session, data: SystemSettingsSchema) -> Dict[str, Any]:
        # Siapkan list kredensial
        creds_to_save = []
        if data.default_modem_credentials:
            for item in data.default_modem_credentials:
                u = item.username.strip()
                p = item.password.strip()
                if u:
                    creds_to_save.append({"username": u, "password": p})
        
        if not creds_to_save and (data.default_modem_user or data.default_modem_pass):
            creds_to_save.append({
                "username": (data.default_modem_user or "admin").strip(),
                "password": (data.default_modem_pass or "tekno2024").strip()
            })

        primary_user = creds_to_save[0]["username"] if creds_to_save else "admin"
        primary_pass = creds_to_save[0]["password"] if creds_to_save else "tekno2024"

        # Konversi interval jam ke menit untuk debounce
        tg_interval_hours = data.telegram_alert_interval_hours if data.telegram_alert_interval_hours is not None else 1.0
        debounce_minutes = max(1, int(tg_interval_hours * 60))

        # 1. Simpan ke database TiDB Cloud
        pairs = {
            "polling_interval_minutes": str(data.polling_interval_minutes),
            "warning_threshold_dbm": str(data.warning_threshold_dbm),
            "critical_threshold_dbm": str(data.critical_threshold_dbm),
            "scheduler_status": data.scheduler_status or "RUNNING",
            "default_modem_user": primary_user,
            "default_modem_pass": primary_pass,
            "default_modem_credentials": json.dumps(creds_to_save),
            "telegram_alert_interval_hours": str(tg_interval_hours),
            "alert_debounce_minutes": str(debounce_minutes),
            "telegram_night_mode_enabled": "true" if data.telegram_night_mode_enabled else "false",
            "telegram_night_mode_start": (data.telegram_night_mode_start or "22:00").strip(),
            "telegram_night_mode_end": (data.telegram_night_mode_end or "06:00").strip()
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
        if data.apply_to_invalid_customers:
            from app.db.models import Pelanggan
            target_customers = db.query(Pelanggan).filter(Pelanggan.status_kredensial != "VALID").all()
            for c in target_customers:
                c.user_admin = primary_user
                c.pass_admin = primary_pass
                c.updated_at = datetime.now()

        db.commit()

        # 3. Perbarui in-memory settings runtime
        settings.POLLING_INTERVAL_MINUTES = data.polling_interval_minutes
        settings.WARNING_THRESHOLD_DBM = data.warning_threshold_dbm
        settings.CRITICAL_THRESHOLD_DBM = data.critical_threshold_dbm

        # 4. Sinkronisasi background scheduler realtime
        scheduler.update_interval(data.polling_interval_minutes)

        if data.scheduler_status == "STOPPED":
            scheduler.stop()
        elif data.scheduler_status == "RUNNING":
            scheduler.resume()

        return SystemSettingsService.get_settings(db)
