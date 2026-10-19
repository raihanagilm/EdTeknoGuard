from typing import Dict, Any, Optional
from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.settings.service import SystemSettingsService
from app.modules.settings.schemas import SystemSettingsSchema

templates = Jinja2Templates(directory="templates")

class SystemSettingsController:

    @staticmethod
    def render_settings_page(request: Request, db: Session):
        cfg = SystemSettingsService.get_settings(db)
        from pathlib import Path
        dist_index = Path("frontend/dist/index.html")
        if dist_index.exists():
            from fastapi.responses import FileResponse
            return FileResponse(str(dist_index))

        templates_dir = Path("templates")
        if templates_dir.exists() and (templates_dir / "settings/index.html").exists():
            return templates.TemplateResponse(
                request=request,
                name="settings/index.html",
                context={
                    "app_name": settings.APP_NAME,
                    "config": cfg,
                    "request": request
                }
            )

        from fastapi.responses import HTMLResponse
        return HTMLResponse("<!doctype html><html><head><title>Pengaturan Monitoring</title></head><body><h1>Pengaturan Monitoring</h1><div id='root'></div></body></html>")

    @staticmethod
    def get_settings(db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        return SystemSettingsService.get_settings(db, kantor=kantor)

    @staticmethod
    def update_settings(db: Session, data: SystemSettingsSchema, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ["operator", "teknisi"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi/Operator hanya dapat melihat profil akun.")
            
        target_kantor = data.kantor
        if not target_kantor and request:
            from app.core.security import get_active_kantor
            target_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        if target_kantor:
            data.kantor = target_kantor

        # Validasi hak akses kantor jika admin cabang
        if user and user.get("role") != "super admin":
            from app.core.security import get_user_allowed_kantor
            from fastapi import HTTPException
            user_allowed = get_user_allowed_kantor(user)
            if data.kantor and data.kantor != "all" and data.kantor not in user_allowed:
                raise HTTPException(
                    status_code=403,
                    detail=f"Akses ditolak: Anda tidak memiliki wewenang mengubah pengaturan kantor '{data.kantor.upper()}'."
                )

        updated = SystemSettingsService.update_settings(db=db, data=data)
        if request:
            from app.modules.activity_logs.service import ActivityLogService
            office_tag = f"[{data.kantor.upper()}] " if data.kantor and data.kantor != "all" else "[GLOBAL] "
            ket_parts = [
                f"Interval: {data.polling_interval_minutes}m",
                f"Warning: {data.warning_threshold_dbm} dBm",
                f"Kritis: {data.critical_threshold_dbm} dBm"
            ]
            if data.default_modem_credentials:
                ket_parts.append(f"Kredensial ONT: {len(data.default_modem_credentials)} entri")
            if data.apply_to_invalid_customers:
                ket_parts.append("Sinkronisasi massal aktif")

            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="UPDATE_SETTINGS",
                status="SUCCESS",
                keterangan=f"Ubah Pengaturan Sistem {office_tag}: " + ", ".join(ket_parts),
                user=user
            )
        return {
            "status": "success",
            "message": f"Pengaturan untuk kantor {(data.kantor or 'aktif').upper()} berhasil disimpan!",
            "data": updated
        }

    @staticmethod
    def test_mikrotik(data: Any) -> Dict[str, Any]:
        from app.services.mikrotik_service import MikroTikSyncService
        return MikroTikSyncService.test_connection(
            host=data.host,
            port=data.port,
            username=data.username,
            password=data.password or ""
        )

    @staticmethod
    def sync_mikrotik(db: Session, data: Optional[Any] = None) -> Dict[str, Any]:
        from app.services.mikrotik_service import MikroTikSyncService
        custom_params = None
        if data and data.host and data.username:
            custom_params = {
                "host": data.host,
                "port": data.port or 8728,
                "username": data.username,
                "password": data.password or "",
                "kantor": data.kantor or "banyumas",
                "auto_sync": True
            }
        return MikroTikSyncService.sync_customers_from_mikrotik(db=db, custom_params=custom_params)
