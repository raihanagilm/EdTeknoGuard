from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, SystemSetting, LogPerformaONT
from app.core.config import settings

class DashboardService:

    @staticmethod
    def get_dashboard_data(db: Session) -> Dict[str, Any]:
        total_customers = db.query(Pelanggan).filter(Pelanggan.is_active == True).count()
        
        pops_raw = db.query(Pelanggan.pop).distinct().all()
        unique_pops = [p[0] for p in pops_raw if p[0]]

        setting_status = db.query(SystemSetting).filter(SystemSetting.key_name == "scheduler_status").first()
        scheduler_status = setting_status.value_text if setting_status else "RUNNING"

        last_scan_setting = db.query(SystemSetting).filter(SystemSetting.key_name == "last_scan_time").first()
        last_scan_time = last_scan_setting.value_text if last_scan_setting else "-"

        earliest = db.query(LogPerformaONT.waktu_cek).order_by(LogPerformaONT.waktu_cek.asc()).first()
        min_date = earliest[0].strftime("%Y-%m-%d") if (earliest and earliest[0]) else "2026-09-01"

        interval_setting = db.query(SystemSetting).filter(SystemSetting.key_name == "polling_interval_minutes").first()
        try:
            polling_interval = int(interval_setting.value_text) if interval_setting else settings.POLLING_INTERVAL_MINUTES
        except Exception:
            polling_interval = settings.POLLING_INTERVAL_MINUTES

        return {
            "app_name": settings.APP_NAME,
            "total_customers": total_customers,
            "unique_pops": unique_pops,
            "scheduler_status": scheduler_status,
            "last_scan_time": last_scan_time,
            "warning_threshold": settings.WARNING_THRESHOLD_DBM,
            "critical_threshold": settings.CRITICAL_THRESHOLD_DBM,
            "polling_interval": polling_interval,
            "min_date": min_date
        }
