from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.monitoring.service import MonitoringService

class MonitoringController:

    @staticmethod
    def get_status() -> Dict[str, Any]:
        return MonitoringService.get_status()

    @staticmethod
    def toggle_scheduler(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan mengubah status pemantauan")
        
        new_status = MonitoringService.toggle_scheduler()
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            action = "START_MONITORING" if new_status == "RUNNING" else "PAUSE_MONITORING"
            ket = "Memulai pemantauan otomatis (scheduler ONT diaktifkan)" if new_status == "RUNNING" else "Menjeda pemantauan otomatis (scheduler ONT dihentikan sementara)"
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action=action,
                status="SUCCESS",
                keterangan=ket,
                user=user
            )
        return {"status": "success", "scheduler_status": new_status}

    @staticmethod
    def trigger_scan_all(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan memulai pemindaian")
        
        res = MonitoringService.scan_all()
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="START_MONITORING",
                status="SUCCESS",
                keterangan="Memulai pemindaian serentak seluruh ONT jaringan pelanggan",
                user=user
            )
        return res

    @staticmethod
    def trigger_scan_pause(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan menjeda pemindaian")
        res = MonitoringService.pause_scan()
        if request and db and res.get("status") == "success":
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="PAUSE_MONITORING",
                status="SUCCESS",
                keterangan="Menjeda proses pemindaian aktif ONT",
                user=user
            )
        return res

    @staticmethod
    def trigger_scan_resume(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan melanjutkan pemindaian")
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="START_MONITORING",
                status="SUCCESS",
                keterangan="Melanjutkan pemindaian ONT yang terjeda dari checkpoint JSON",
                user=user
            )
        return MonitoringService.resume_scan()

    @staticmethod
    def trigger_scan_stop(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan menghentikan pemindaian")
        res = MonitoringService.stop_scan()
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="STOP_MONITORING",
                status="SUCCESS",
                keterangan="Menghentikan paksa proses pemindaian ONT dan membersihkan antrean",
                user=user
            )
        return res

    @staticmethod
    def trigger_scan_single(id_pelanggan: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan memulai pemindaian")
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
