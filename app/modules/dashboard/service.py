from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, SystemSetting
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

        return {
            "app_name": settings.APP_NAME,
            "total_customers": total_customers,
            "unique_pops": unique_pops,
            "scheduler_status": scheduler_status,
            "last_scan_time": last_scan_time,
            "warning_threshold": settings.WARNING_THRESHOLD_DBM,
            "critical_threshold": settings.CRITICAL_THRESHOLD_DBM,
            "polling_interval": settings.POLLING_INTERVAL_MINUTES
        }
