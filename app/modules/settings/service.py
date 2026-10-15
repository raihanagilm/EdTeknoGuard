import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import SystemSetting
from app.services.scheduler_service import scheduler
from app.modules.settings.schemas import SystemSettingsSchema

class SystemSettingsService:

    @staticmethod
    def get_settings(db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        
        # Base keys
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
            "telegram_night_mode_end",
            "app_vibration_enabled",
            "alert_waiting_interval_minutes",
            "mikrotik_host",
            "mikrotik_port",
            "mikrotik_user",
            "mikrotik_password",
            "mikrotik_kantor",
            "mikrotik_auto_sync"
        ]
        
        # Tambahkan keys spesifik kantor jika kantor ditentukan
        lookup_keys = list(keys)
        if k:
            lookup_keys.extend([
                f"polling_interval_minutes_{k}",
                f"warning_threshold_dbm_{k}",
                f"critical_threshold_dbm_{k}",
                f"scheduler_status_{k}",
                f"default_modem_user_{k}",
                f"default_modem_pass_{k}",
                f"default_modem_credentials_{k}"
            ])

        db_settings = {}
        rows = db.query(SystemSetting).filter(SystemSetting.key_name.in_(lookup_keys)).all()
        for r in rows:
            db_settings[r.key_name] = r.value_text

        # Ambil nilai dengan prioritas setting spesifik kantor
        def get_val(base_key: str, default_val: str) -> str:
            if k and f"{base_key}_{k}" in db_settings:
                return db_settings[f"{base_key}_{k}"]
            return db_settings.get(base_key, default_val)

        try:
            polling_interval = int(get_val("polling_interval_minutes", "20"))
        except (ValueError, TypeError):
            polling_interval = 20

        try:
            warning_threshold = float(get_val("warning_threshold_dbm", "-26.0"))
        except (ValueError, TypeError):
            warning_threshold = -26.0

        try:
            critical_threshold = float(get_val("critical_threshold_dbm", "-27.0"))
        except (ValueError, TypeError):
            critical_threshold = -27.0

        try:
            tg_interval_hours = float(db_settings.get("telegram_alert_interval_hours", "1.0"))
        except (ValueError, TypeError):
            tg_interval_hours = 1.0

        tg_night_enabled = db_settings.get("telegram_night_mode_enabled", "false").lower() in ["true", "1", "yes"]
        tg_night_start = db_settings.get("telegram_night_mode_start", "22:00")
        tg_night_end = db_settings.get("telegram_night_mode_end", "06:00")

        app_vibration = db_settings.get("app_vibration_enabled", "true").lower() in ["true", "1", "yes"]
        try:
            alert_waiting_minutes = int(db_settings.get("alert_waiting_interval_minutes", "5"))
        except (ValueError, TypeError):
            alert_waiting_minutes = 5

        scheduler_status = get_val("scheduler_status", "RUNNING")
        default_user = get_val("default_modem_user", "admin")
        default_pass = get_val("default_modem_pass", "tekno2024")

        # Parse multi-credentials list JSON spesifik kantor
        raw_creds = get_val("default_modem_credentials", "")
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
            credentials_list = [
                {"username": default_user, "password": default_pass},
                {"username": "admin", "password": "admin"},
                {"username": "tekno", "password": "tekno2025"}
            ]

        # MikroTik Settings
        mikrotik_host = db_settings.get("mikrotik_host", getattr(settings, "MIKROTIK_HOST", "192.168.202.50"))
        try:
            mikrotik_port = int(db_settings.get("mikrotik_port", getattr(settings, "MIKROTIK_PORT", 8728)))
        except (ValueError, TypeError):
            mikrotik_port = 8728
        mikrotik_user = db_settings.get("mikrotik_user", getattr(settings, "MIKROTIK_USER", "tekno"))
        mikrotik_pass = db_settings.get("mikrotik_password", getattr(settings, "MIKROTIK_PASSWORD", ""))
        mikrotik_kantor = db_settings.get("mikrotik_kantor", getattr(settings, "MIKROTIK_DEFAULT_KANTOR", "banyumas"))
        mikrotik_auto = db_settings.get("mikrotik_auto_sync", "true").lower() in ["true", "1", "yes"]

        bot_token = settings.TELEGRAM_BOT_TOKEN or ""
        masked_token = f"{bot_token[:6]}...{bot_token[-4:]}" if len(bot_token) > 10 else ("Terkonfigurasi" if bot_token else "Belum diisi di .env")

        return {
            "kantor": k or "all",
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
            "app_vibration_enabled": app_vibration,
            "alert_waiting_interval_minutes": alert_waiting_minutes,
            "telegram_token_configured": bool(settings.TELEGRAM_BOT_TOKEN),
            "telegram_token_masked": masked_token,
            "telegram_chat_ids_configured": settings.TELEGRAM_CHAT_IDS or "-",
            "mikrotik_host": mikrotik_host,
            "mikrotik_port": mikrotik_port,
            "mikrotik_user": mikrotik_user,
            "mikrotik_password": mikrotik_pass,
            "mikrotik_kantor": mikrotik_kantor,
            "mikrotik_auto_sync": mikrotik_auto
        }

    @staticmethod
    def update_settings(db: Session, data: SystemSettingsSchema) -> Dict[str, Any]:
        k = data.kantor.lower().strip() if data.kantor and data.kantor != "all" else None

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

        tg_interval_hours = data.telegram_alert_interval_hours if data.telegram_alert_interval_hours is not None else 1.0
        debounce_minutes = max(1, int(tg_interval_hours * 60))

        # 1. Simpan ke database MySQL lokal (spesifik kantor jika k terdefinisi)
        pairs = {}
        if k:
            pairs[f"polling_interval_minutes_{k}"] = str(data.polling_interval_minutes)
            pairs[f"warning_threshold_dbm_{k}"] = str(data.warning_threshold_dbm)
            pairs[f"critical_threshold_dbm_{k}"] = str(data.critical_threshold_dbm)
            if data.scheduler_status:
                pairs[f"scheduler_status_{k}"] = data.scheduler_status
            pairs[f"default_modem_user_{k}"] = primary_user
            pairs[f"default_modem_pass_{k}"] = primary_pass
            pairs[f"default_modem_credentials_{k}"] = json.dumps(creds_to_save)
        else:
            pairs["polling_interval_minutes"] = str(data.polling_interval_minutes)
            pairs["warning_threshold_dbm"] = str(data.warning_threshold_dbm)
            pairs["critical_threshold_dbm"] = str(data.critical_threshold_dbm)
            pairs["scheduler_status"] = data.scheduler_status or "RUNNING"
            pairs["default_modem_user"] = primary_user
            pairs["default_modem_pass"] = primary_pass
            pairs["default_modem_credentials"] = json.dumps(creds_to_save)

        # Setting global notifikasi & MikroTik
        pairs.update({
            "telegram_alert_interval_hours": str(tg_interval_hours),
            "alert_debounce_minutes": str(debounce_minutes),
            "telegram_night_mode_enabled": "true" if data.telegram_night_mode_enabled else "false",
            "telegram_night_mode_start": (data.telegram_night_mode_start or "22:00").strip(),
            "telegram_night_mode_end": (data.telegram_night_mode_end or "06:00").strip(),
            "app_vibration_enabled": "true" if data.app_vibration_enabled else "false",
            "alert_waiting_interval_minutes": str(data.alert_waiting_interval_minutes or 5),
            "mikrotik_host": (data.mikrotik_host or "192.168.202.50").strip(),
            "mikrotik_port": str(data.mikrotik_port or 8728),
            "mikrotik_user": (data.mikrotik_user or "tekno").strip(),
            "mikrotik_password": (data.mikrotik_password or "").strip(),
            "mikrotik_kantor": (data.mikrotik_kantor or "banyumas").strip(),
            "mikrotik_auto_sync": "true" if data.mikrotik_auto_sync else "false"
        })

        for key_n, val_n in pairs.items():
            item = db.query(SystemSetting).filter(SystemSetting.key_name == key_n).first()
            if item:
                item.value_text = val_n
                item.updated_at = get_now_wib()
            else:
                db.add(SystemSetting(key_name=key_n, value_text=val_n))

        # 2. Jika opsi sinkronisasi diaktifkan:
        # Ubah username & password HANYA untuk pelanggan yang status_kredensial != 'VALID'
        # Dibatasi per kantor jika k ditentukan
        if data.apply_to_invalid_customers:
            from app.db.models import Pelanggan
            target_q = db.query(Pelanggan).filter(Pelanggan.status_kredensial != "VALID")
            if k:
                target_q = target_q.filter(Pelanggan.kantor == k)
            target_customers = target_q.all()
            for c in target_customers:
                c.user_admin = primary_user
                c.pass_admin = primary_pass
                c.updated_at = get_now_wib()

        db.commit()

        # 3. Perbarui in-memory settings runtime jika global atau kantor aktif
        if not k:
            settings.POLLING_INTERVAL_MINUTES = data.polling_interval_minutes
            settings.WARNING_THRESHOLD_DBM = data.warning_threshold_dbm
            settings.CRITICAL_THRESHOLD_DBM = data.critical_threshold_dbm
            scheduler.update_interval(data.polling_interval_minutes)

        if data.scheduler_status == "STOPPED":
            scheduler.stop(kantor=k)
        elif data.scheduler_status == "RUNNING":
            scheduler.resume(kantor=k)

        return SystemSettingsService.get_settings(db, kantor=k)
