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

    OFFICE_SPECIFIC_KEYS = {
        "polling_interval_minutes",
        "warning_threshold_dbm",
        "critical_threshold_dbm",
        "scheduler_status",
        "scheduler_paused_at",
        "default_modem_user",
        "default_modem_pass",
        "default_modem_credentials",
        "apply_to_invalid_customers",
        "last_scan_time",
        "is_network_error",
        "last_scan_duration"
    }

    GLOBAL_KEYS = {
        "notification_alert_interval_hours",
        "alert_debounce_minutes",
        "night_mode_enabled",
        "night_mode_start",
        "night_mode_end",
        "app_vibration_enabled",
        "alert_waiting_interval_minutes",
        "last_paused_reminder_at",
        "mikrotik_host",
        "mikrotik_port",
        "mikrotik_user",
        "mikrotik_password",
        "mikrotik_kantor",
        "mikrotik_auto_sync"
    }

    @staticmethod
    def get_settings(db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        
        # Ambil seluruh setting global (kantor_kode IS NULL)
        global_rows = db.query(SystemSetting).filter(SystemSetting.kantor_kode.is_(None)).all()
        db_settings = {r.key_name: r.value_text for r in global_rows}

        # Jika kantor spesifik ditentukan, timpa dengan setting spesifik kantor tersebut
        if k:
            office_rows = db.query(SystemSetting).filter(SystemSetting.kantor_kode == k).all()
            for r in office_rows:
                db_settings[r.key_name] = r.value_text

        try:
            polling_interval = int(db_settings.get("polling_interval_minutes", "20"))
        except (ValueError, TypeError):
            polling_interval = 20

        try:
            warning_threshold = float(db_settings.get("warning_threshold_dbm", "-26.0"))
        except (ValueError, TypeError):
            warning_threshold = -26.0

        try:
            critical_threshold = float(db_settings.get("critical_threshold_dbm", "-27.0"))
        except (ValueError, TypeError):
            critical_threshold = -27.0

        try:
            notif_interval_hours = float(db_settings.get("notification_alert_interval_hours", "1.0"))
        except (ValueError, TypeError):
            notif_interval_hours = 1.0

        night_enabled = db_settings.get("night_mode_enabled", "false").lower() in ["true", "1", "yes"]
        night_start = db_settings.get("night_mode_start", "22:00")
        night_end = db_settings.get("night_mode_end", "06:00")

        app_vibration = db_settings.get("app_vibration_enabled", "true").lower() in ["true", "1", "yes"]
        try:
            alert_waiting_minutes = int(db_settings.get("alert_waiting_interval_minutes", "5"))
        except (ValueError, TypeError):
            alert_waiting_minutes = 5

        scheduler_status = db_settings.get("scheduler_status", "RUNNING")
        default_user = db_settings.get("default_modem_user", "admin")
        default_pass = db_settings.get("default_modem_pass", "tekno2024")

        # 1. Coba baca dari tabel ternormalisasi modem_credentials
        from app.db.models import ModemCredential
        credentials_list = []
        if k:
            creds_rows = (
                db.query(ModemCredential)
                .filter(ModemCredential.kantor_kode == k)
                .order_by(ModemCredential.urutan.asc(), ModemCredential.id.asc())
                .all()
            )
            if creds_rows:
                credentials_list = [
                    {"username": r.username, "password": r.password}
                    for r in creds_rows
                ]

        # 2. Fallback ke JSON di system_settings jika belum ada di tabel modem_credentials
        if not credentials_list:
            raw_creds = db_settings.get("default_modem_credentials", "")
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
        apply_invalid = db_settings.get("apply_to_invalid_customers", "false").lower() in ["true", "1", "yes"]

        return {
            "kantor": k or "all",
            "polling_interval_minutes": polling_interval,
            "warning_threshold_dbm": warning_threshold,
            "critical_threshold_dbm": critical_threshold,
            "scheduler_status": scheduler_status,
            "default_modem_user": credentials_list[0]["username"] if credentials_list else default_user,
            "default_modem_pass": credentials_list[0]["password"] if credentials_list else default_pass,
            "default_modem_credentials": credentials_list,
            "apply_to_invalid_customers": apply_invalid,
            "notification_alert_interval_hours": notif_interval_hours,
            "night_mode_enabled": night_enabled,
            "night_mode_start": night_start,
            "night_mode_end": night_end,
            "app_vibration_enabled": app_vibration,
            "alert_waiting_interval_minutes": alert_waiting_minutes,
            "mikrotik_host": mikrotik_host,
            "mikrotik_port": mikrotik_port,
            "mikrotik_user": mikrotik_user,
            "mikrotik_password": mikrotik_pass,
            "mikrotik_kantor": mikrotik_kantor,
            "mikrotik_auto_sync": mikrotik_auto
        }

    @staticmethod
    def _save_setting_pair(db: Session, key_name: str, val_text: str, kantor_kode: Optional[str] = None):
        q = db.query(SystemSetting).filter(SystemSetting.key_name == key_name)
        if kantor_kode:
            q = q.filter(SystemSetting.kantor_kode == kantor_kode)
        else:
            q = q.filter(SystemSetting.kantor_kode.is_(None))
        item = q.first()
        if item:
            item.value_text = val_text
            item.updated_at = get_now_wib()
        else:
            db.add(SystemSetting(kantor_kode=kantor_kode, key_name=key_name, value_text=val_text))

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

        notif_hours = data.notification_alert_interval_hours if data.notification_alert_interval_hours is not None else 1.0
        debounce_minutes = max(1, int(notif_hours * 60))

        # 1. Simpan pengaturan kantor (spesifik k jika ada, atau global jika tidak ada)
        office_pairs = {
            "polling_interval_minutes": str(data.polling_interval_minutes),
            "warning_threshold_dbm": str(data.warning_threshold_dbm),
            "critical_threshold_dbm": str(data.critical_threshold_dbm),
            "default_modem_user": primary_user,
            "default_modem_pass": primary_pass,
            "default_modem_credentials": json.dumps(creds_to_save),
            "apply_to_invalid_customers": "true" if data.apply_to_invalid_customers else "false"
        }
        if data.scheduler_status:
            office_pairs["scheduler_status"] = data.scheduler_status

        # Simpan office-specific settings
        if k:
            for key_n, val_n in office_pairs.items():
                SystemSettingsService._save_setting_pair(db, key_name=key_n, val_text=val_n, kantor_kode=k)

            # Sinkronisasi ke tabel ternormalisasi modem_credentials
            from app.db.models import ModemCredential
            db.query(ModemCredential).filter(ModemCredential.kantor_kode == k).delete()
            for idx, c_item in enumerate(creds_to_save, 1):
                db.add(ModemCredential(
                    kantor_kode=k,
                    username=c_item["username"],
                    password=c_item["password"],
                    urutan=idx
                ))
        else:
            for key_n, val_n in office_pairs.items():
                SystemSettingsService._save_setting_pair(db, key_name=key_n, val_text=val_n, kantor_kode=None)

        # 2. Simpan pengaturan global sistem (notifikasi & MikroTik)
        global_pairs = {
            "notification_alert_interval_hours": str(notif_hours),
            "alert_debounce_minutes": str(debounce_minutes),
            "night_mode_enabled": "true" if data.night_mode_enabled else "false",
            "night_mode_start": (data.night_mode_start or "22:00").strip(),
            "night_mode_end": (data.night_mode_end or "06:00").strip(),
            "app_vibration_enabled": "true" if data.app_vibration_enabled else "false",
            "alert_waiting_interval_minutes": str(data.alert_waiting_interval_minutes or 5),
            "mikrotik_host": (data.mikrotik_host or "192.168.202.50").strip(),
            "mikrotik_port": str(data.mikrotik_port or 8728),
            "mikrotik_user": (data.mikrotik_user or "tekno").strip(),
            "mikrotik_password": (data.mikrotik_password or "").strip(),
            "mikrotik_kantor": (data.mikrotik_kantor or "banyumas").strip(),
            "mikrotik_auto_sync": "true" if data.mikrotik_auto_sync else "false"
        }
        for key_n, val_n in global_pairs.items():
            SystemSettingsService._save_setting_pair(db, key_name=key_n, val_text=val_n, kantor_kode=None)

        # 3. Jika opsi sinkronisasi diaktifkan:
        if data.apply_to_invalid_customers:
            from app.db.models import Pelanggan, PerangkatONT
            target_q = (
                db.query(Pelanggan)
                .join(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
                .filter(PerangkatONT.status_kredensial != "VALID")
            )
            if k:
                target_q = target_q.filter(Pelanggan.kantor == k)
            target_customers = target_q.all()
            for c in target_customers:
                c.user_admin = primary_user
                c.pass_admin = primary_pass
                # Reset status kredensial ke UNTESTED dan reset failed_credentials agar siap diverifikasi penuh ulang
                c.status_kredensial = "UNTESTED"
                c.failed_credentials = None
                c.updated_at = get_now_wib()

        db.commit()

        # 4. Perbarui in-memory settings runtime & scheduler interval
        if not k:
            settings.POLLING_INTERVAL_MINUTES = data.polling_interval_minutes
            settings.WARNING_THRESHOLD_DBM = data.warning_threshold_dbm
            settings.CRITICAL_THRESHOLD_DBM = data.critical_threshold_dbm
        
        scheduler.update_interval(data.polling_interval_minutes, kantor=k)

        if data.scheduler_status == "STOPPED":
            scheduler.stop(kantor=k)
        elif data.scheduler_status == "RUNNING":
            scheduler.resume(kantor=k)

        return SystemSettingsService.get_settings(db, kantor=k)
