from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, SystemSetting, LogPerformaONT
from app.core.config import settings

class DashboardService:

    @staticmethod
    def get_dashboard_data(
        db: Session,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        q_cust = db.query(Pelanggan).filter(
            Pelanggan.is_active == True,
            Pelanggan.is_monitored == True
        )
        if kantor and kantor != "all":
            q_cust = q_cust.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q_cust = q_cust.filter(Pelanggan.kantor.in_(allowed_kantor))
        total_customers = q_cust.count()
        
        q_pops = db.query(Pelanggan.pop).filter(
            Pelanggan.is_active == True,
            Pelanggan.is_monitored == True
        )
        if kantor and kantor != "all":
            q_pops = q_pops.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q_pops = q_pops.filter(Pelanggan.kantor.in_(allowed_kantor))
        pops_raw = q_pops.distinct().all()
        unique_pops = [p[0] for p in pops_raw if p[0]]

        from app.modules.settings.service import SystemSettingsService
        cfg = SystemSettingsService.get_settings(db, kantor=kantor)

        earliest = db.query(LogPerformaONT.waktu_cek).order_by(LogPerformaONT.waktu_cek.asc()).first()
        min_date = earliest[0].strftime("%Y-%m-%d") if (earliest and earliest[0]) else "2026-09-01"

        return {
            "app_name": settings.APP_NAME,
            "total_customers": total_customers,
            "unique_pops": unique_pops,
            "scheduler_status": cfg.get("scheduler_status", "RUNNING"),
            "last_scan_time": cfg.get("last_scan_time", "-"),
            "warning_threshold": cfg.get("warning_threshold_dbm", settings.WARNING_THRESHOLD_DBM),
            "critical_threshold": cfg.get("critical_threshold_dbm", settings.CRITICAL_THRESHOLD_DBM),
            "polling_interval": cfg.get("polling_interval_minutes", settings.POLLING_INTERVAL_MINUTES),
            "min_date": min_date
        }
