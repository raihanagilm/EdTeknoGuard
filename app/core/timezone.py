from datetime import datetime, date, timedelta
from typing import Optional
import zoneinfo

# Zona waktu resmi sistem EdTeknoGuard (Waktu Indonesia Barat / UTC+7)
WIB_TZ = zoneinfo.ZoneInfo("Asia/Jakarta")

def get_now_wib() -> datetime:
    """
    Mengembalikan waktu saat ini dalam zona waktu Asia/Jakarta (WIB)
    sebagai naive datetime (tanpa offset tzinfo) agar tersimpan secara presisi
    dan konsisten pada kolom DATETIME MySQL / TiDB.
    """
    return datetime.now(WIB_TZ).replace(tzinfo=None)

def get_today_wib() -> date:
    """
    Mengembalikan tanggal hari ini dalam zona waktu Asia/Jakarta (WIB).
    """
    return datetime.now(WIB_TZ).date()

def to_wib(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Mengonversi objek datetime (baik naive maupun timezone-aware) ke waktu WIB naive.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(WIB_TZ).replace(tzinfo=None)
    return dt

def format_wib(dt: Optional[datetime], fmt: str = "%d/%m/%Y %H:%M:%S") -> str:
    """
    Memformat datetime ke representasi string WIB.
    """
    if not dt:
        return "-"
    return dt.strftime(fmt)
