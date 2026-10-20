from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.monitoring.service import MonitoringService

class MonitoringController:

    @staticmethod
    def get_status(kantor: Optional[str] = None) -> Dict[str, Any]:
        return MonitoringService.get_status(kantor=kantor)

    @staticmethod
    def toggle_scheduler(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        if not user or user.get("role") != "super admin":
            raise HTTPException(status_code=403, detail="Akses ditolak: Hanya Super Admin yang berhak menjeda atau mengaktifkan jadwal pemantauan berkala.")
        
        target_kantor = kantor
        if not target_kantor and request:
            from app.core.security import get_active_kantor
            target_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)

        new_status = MonitoringService.toggle_scheduler(kantor=target_kantor)
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            office_label = f"kantor {target_kantor.upper()}" if target_kantor and target_kantor != "all" else "SELURUH KANTOR"
            action = "START_MONITORING" if new_status == "RUNNING" else "PAUSE_MONITORING"
            ket = f"Memulai pemantauan otomatis (scheduler ONT {office_label} diaktifkan)" if new_status == "RUNNING" else f"Menjeda pemantauan otomatis (scheduler ONT {office_label} dihentikan sementara)"
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action=action,
                status="SUCCESS",
                keterangan=ket,
                user=user
            )
        return {"status": "success", "scheduler_status": new_status, "kantor": target_kantor or "all"}

    @staticmethod
    def trigger_scan_all(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        if user and user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak: Teknisi tidak diizinkan memulai pemindaian serentak. Gunakan fitur cek per pelanggan (Single Probe)."
            )
        
        from app.core.security import get_active_kantor, get_user_allowed_kantor
        user_allowed = get_user_allowed_kantor(user) if user else []
        active = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user) if request else None

        target_kantor = kantor or active
        
        # Jika bukan super admin, batasi scan hanya ke kantor yang diizinkan
        if user and user.get("role") != "super admin":
            if target_kantor in user_allowed:
                pass
            else:
                target_kantor = user_allowed[0] if user_allowed else "cabang"
        else:
            # Super admin
            if not target_kantor or target_kantor == "all":
                target_kantor = active if (active and active in user_allowed and active != "all") else "cabang"

        # Jalankan pemindaian di background thread agar API merespons secara non-blocking dan independen
        import threading
        th = threading.Thread(target=MonitoringService.scan_all, kwargs={"kantor": target_kantor}, daemon=True)
        th.start()

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
        return {"status": "started", "kantor": target_kantor, "message": f"Pemindaian kantor {target_kantor.upper()} berhasil dimulai di latar belakang."}

    @staticmethod
    def _validate_scan_control_permission(user: Optional[Dict[str, Any]], kantor: Optional[str] = None):
        if not user or user.get("role") in ["operator", "teknisi", "karyawan"]:
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi/Operator tidak diizinkan mengontrol proses pemindaian.")
        
        # Super admin selalu diizinkan
        if user.get("role") == "super admin":
            return
            
        from app.core.security import get_user_allowed_kantor
        user_allowed = get_user_allowed_kantor(user)
        
        if kantor and kantor != "all" and kantor not in user_allowed:
            raise HTTPException(
                status_code=403, 
                detail=f"Akses ditolak: Anda tidak memiliki wewenang mengontrol pemindaian untuk kantor '{kantor.upper()}'."
            )

    @staticmethod
    def trigger_scan_pause(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        target_kantor = kantor
        if not target_kantor and request:
            from app.core.security import get_active_kantor
            target_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        
        MonitoringController._validate_scan_control_permission(user, target_kantor)
        res = MonitoringService.pause_scan(kantor=target_kantor)
        if request and db and res.get("status") == "success":
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="PAUSE_MONITORING",
                status="SUCCESS",
                keterangan=f"Menjeda proses pemindaian aktif ONT kantor {(target_kantor or 'all').upper()}",
                user=user
            )
        return res

    @staticmethod
    def trigger_scan_resume(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        target_kantor = kantor
        if not target_kantor and request:
            from app.core.security import get_active_kantor
            target_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
            
        MonitoringController._validate_scan_control_permission(user, target_kantor)
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="START_MONITORING",
                status="SUCCESS",
                keterangan=f"Melanjutkan pemindaian ONT kantor {(target_kantor or 'all').upper()} dari checkpoint JSON",
                user=user
            )
        return MonitoringService.resume_scan(kantor=target_kantor)

    @staticmethod
    def trigger_scan_stop(request: Optional[Any] = None, db: Optional[Session] = None, user: Optional[Dict[str, Any]] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        target_kantor = kantor
        if not target_kantor and request:
            from app.core.security import get_active_kantor
            target_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
            
        MonitoringController._validate_scan_control_permission(user, target_kantor)
        res = MonitoringService.stop_scan(kantor=target_kantor)
        if request and db:
            from app.modules.activity_logs.service import ActivityLogService
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="STOP_MONITORING",
                status="SUCCESS",
                keterangan=f"Menghentikan paksa pemindaian aktif ONT kantor {(target_kantor or 'all').upper()}",
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
    def get_kpi(request: Optional[Any] = None, db: Optional[Session] = None, kantor: Optional[str] = None) -> Dict[str, Any]:
        target_kantor = kantor
        allowed_kantor = None
        if request:
            if not target_kantor:
                target_kantor = getattr(request.state, "active_kantor", None)
            allowed_kantor = getattr(request.state, "allowed_kantor", None)
        return MonitoringService.get_kpi_metrics(db=db, kantor=target_kantor, allowed_kantor=allowed_kantor)

    @staticmethod
    def get_chart_data(
        request: Optional[Any] = None,
        db: Optional[Session] = None,
        range_type: str = "today",
        date_filter: Optional[str] = None,
        id_pelanggan: Optional[str] = None,
        kantor: Optional[str] = None
    ) -> Dict[str, Any]:
        target_kantor = kantor
        allowed_kantor = None
        if request:
            if not target_kantor:
                target_kantor = getattr(request.state, "active_kantor", None)
            allowed_kantor = getattr(request.state, "allowed_kantor", None)
        return MonitoringService.get_chart_data(
            db=db,
            range_type=range_type,
            date_filter=date_filter,
            id_pelanggan=id_pelanggan,
            kantor=target_kantor,
            allowed_kantor=allowed_kantor
        )

    @staticmethod
    def get_available_dates(
        request: Optional[Any] = None,
        db: Optional[Session] = None,
        kantor: Optional[str] = None
    ) -> Dict[str, Any]:
        target_kantor = kantor
        allowed_kantor = None
        if request:
            if not target_kantor:
                target_kantor = getattr(request.state, "active_kantor", None)
            allowed_kantor = getattr(request.state, "allowed_kantor", None)
        return MonitoringService.get_available_dates(
            db=db,
            kantor=target_kantor,
            allowed_kantor=allowed_kantor
        )
