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
        if not user or user.get("role") != "super admin":
            raise HTTPException(status_code=403, detail="Akses ditolak: Hanya Super Admin yang berhak menjeda atau mengaktifkan jadwal pemantauan")
        
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
        if user and user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak: Teknisi tidak diizinkan memulai pemindaian serentak. Gunakan fitur cek per pelanggan (Single Probe)."
            )
        
        target_kantor = None
        if request:
            from app.core.security import get_active_kantor, get_user_allowed_kantor
            user_allowed = get_user_allowed_kantor(user) if user else []
            active = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
            
            # Jika bukan super admin, batasi scan hanya ke kantor yang diizinkan
            if user and user.get("role") != "super admin":
                if active in user_allowed:
                    target_kantor = active
                else:
                    target_kantor = user_allowed[0] if user_allowed else "cabang"
            else:
                # Super admin: scan kantor aktif yang sedang dipilih (tidak ada opsi "all")
                target_kantor = active if (active and active in user_allowed and active != "all") else "cabang"

        res = MonitoringService.scan_all(kantor=target_kantor)
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            office_desc = f"kantor {target_kantor.upper()}" if target_kantor else "kantor CABANG"
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="START_MONITORING",
                status="SUCCESS",
                keterangan=f"Memulai pemindaian manual ONT {office_desc}",
                user=user
            )
        return res

    @staticmethod
    def trigger_scan_pause(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi/Operator tidak diizinkan menjeda pemindaian")
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
        if user and user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi/Operator tidak diizinkan melanjutkan pemindaian")
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
        if user and user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi/Operator tidak diizinkan menghentikan pemindaian")
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
    def trigger_scan_single(id_pelanggan: str, user: Optional[Dict[str, Any]] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan memulai pemindaian")
        
        # Validasi kantor pelanggan jika user bukan super admin
        if user and user.get("role") != "super admin" and db:
            from app.db.models import Pelanggan
            from app.core.security import get_user_allowed_kantor
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if cust:
                allowed = get_user_allowed_kantor(user)
                if cust.kantor not in allowed:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Akses ditolak: Pelanggan berada di kantor '{cust.kantor.upper()}', di luar akses kantor Anda."
                    )

        res = MonitoringService.scan_single(id_pelanggan)
        if not res:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
        return res

    @staticmethod
    def get_kpi(request: Optional[Any] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        kantor = None
        allowed_kantor = None
        if request:
            kantor = getattr(request.state, "active_kantor", None)
            allowed_kantor = getattr(request.state, "allowed_kantor", None)
        return MonitoringService.get_kpi_metrics(db=db, kantor=kantor, allowed_kantor=allowed_kantor)

    @staticmethod
    def get_chart_data(
        request: Optional[Any] = None,
        db: Optional[Session] = None,
        range_type: str = "today",
        date_filter: Optional[str] = None,
        id_pelanggan: Optional[str] = None
    ) -> Dict[str, Any]:
        kantor = None
        allowed_kantor = None
        if request:
            kantor = getattr(request.state, "active_kantor", None)
            allowed_kantor = getattr(request.state, "allowed_kantor", None)
        return MonitoringService.get_chart_data(
            db=db,
            range_type=range_type,
            date_filter=date_filter,
            id_pelanggan=id_pelanggan,
            kantor=kantor,
            allowed_kantor=allowed_kantor
        )
