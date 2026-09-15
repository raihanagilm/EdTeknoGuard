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
        return templates.TemplateResponse(
            request=request,
            name="settings/index.html",
            context={
                "app_name": settings.APP_NAME,
                "config": cfg,
                "request": request
            }
        )

    @staticmethod
    def get_settings(db: Session) -> Dict[str, Any]:
        return SystemSettingsService.get_settings(db)

    @staticmethod
    def update_settings(db: Session, data: SystemSettingsSchema, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator hanya dapat melihat pengaturan")
            
        updated = SystemSettingsService.update_settings(db=db, data=data)
        if request:
            from app.modules.activity_logs.service import ActivityLogService
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
                keterangan="Ubah Pengaturan Sistem: " + ", ".join(ket_parts),
                user=user
            )
        return {
            "status": "success",
            "message": "Pengaturan interval dan ambang batas redaman berhasil disimpan!",
            "data": updated
        }
