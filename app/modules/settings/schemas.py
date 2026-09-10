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
