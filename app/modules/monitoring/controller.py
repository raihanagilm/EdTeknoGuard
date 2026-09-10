from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.monitoring.service import MonitoringService

class MonitoringController:

    @staticmethod
    def get_status() -> Dict[str, Any]:
        return MonitoringService.get_status()

    @staticmethod
    def toggle_scheduler() -> Dict[str, Any]:
        new_status = MonitoringService.toggle_scheduler()
        return {"status": "success", "scheduler_status": new_status}

    @staticmethod
    def trigger_scan_all() -> Dict[str, Any]:
        return MonitoringService.scan_all()

    @staticmethod
    def trigger_scan_single(id_pelanggan: str) -> Dict[str, Any]:
        res = MonitoringService.scan_single(id_pelanggan)
        if not res:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
        return res

    @staticmethod
    def get_kpi(db: Session) -> Dict[str, Any]:
        return MonitoringService.get_kpi_metrics(db=db)

    @staticmethod
    def get_chart_data(
        db: Session,
        range_type: str = "today",
        date_filter: Optional[str] = None,
        id_pelanggan: Optional[str] = None
    ) -> Dict[str, Any]:
        return MonitoringService.get_chart_data(
            db=db, range_type=range_type, date_filter=date_filter, id_pelanggan=id_pelanggan
        )
