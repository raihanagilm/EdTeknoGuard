"""
app/models/__init__.py - Model ORM terpusat sesuai standar Laravel (app/models/)
"""
from app.models.models import (
    Base,
    MasterBase,
    TenantBase,
    Kantor,
    User,
    UserKantor,
    UserActivityLog,
    Pelanggan,
    PerangkatONT,
    LogPerformaONT,
    AlertLog,
    SystemSetting,
    ModemCredential,
    UserNotificationRead,
    TiketKendala,
    KuotaPelanggan,
    LogKuotaHarian,
    Paket,
    PerangkatTerhubung
)

__all__ = [
    "Base",
    "MasterBase",
    "TenantBase",
    "Kantor",
    "User",
    "UserKantor",
    "UserActivityLog",
    "Pelanggan",
    "PerangkatONT",
    "LogPerformaONT",
    "AlertLog",
    "SystemSetting",
    "ModemCredential",
    "UserNotificationRead",
    "TiketKendala",
    "KuotaPelanggan",
    "LogKuotaHarian",
    "Paket",
    "PerangkatTerhubung"
]
