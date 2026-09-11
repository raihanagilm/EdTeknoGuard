from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class ModemCredentialItem(BaseModel):
    username: str = Field(..., description="Username login modem ONT")
    password: str = Field(..., description="Password login modem ONT")

class SystemSettingsSchema(BaseModel):
    polling_interval_minutes: int = Field(5, ge=1, le=1440, description="Interval pemantauan berkala dalam menit")
    warning_threshold_dbm: float = Field(-26.0, le=-15.0, ge=-40.0, description="Ambang batas deteksi dini redaman optik (dBm)")
    critical_threshold_dbm: float = Field(-27.0, le=-20.0, ge=-45.0, description="Ambang batas notifikasi merah / kritis (dBm)")
    scheduler_status: Optional[str] = Field("RUNNING", description="Status pemantau (RUNNING / STOPPED)")
    default_modem_user: Optional[str] = Field("admin", description="Username default modem ONT")
    default_modem_pass: Optional[str] = Field("tekno2024", description="Password default modem ONT")
    default_modem_credentials: Optional[List[ModemCredentialItem]] = Field(
        default_factory=list,
        description="Daftar pasangan username & password modem ONT"
    )
    apply_to_invalid_customers: Optional[bool] = Field(False, description="Sinkronkan kredensial ke pelanggan berstatus INVALID/UNTESTED")
    telegram_alert_interval_hours: Optional[float] = Field(1.0, ge=0.1, le=72.0, description="Interval pengulangan pengiriman notifikasi ke Telegram (Jam)")
    telegram_night_mode_enabled: Optional[bool] = Field(False, description="Aktifkan Mode Malam untuk notifikasi senyap")
    telegram_night_mode_start: Optional[str] = Field("22:00", description="Jam mulai mode malam (HH:MM)")
    telegram_night_mode_end: Optional[str] = Field("06:00", description="Jam selesai mode malam (HH:MM)")
