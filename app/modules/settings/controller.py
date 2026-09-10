from typing import Dict, Any
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
    def update_settings(db: Session, data: SystemSettingsSchema) -> Dict[str, Any]:
        updated = SystemSettingsService.update_settings(db=db, data=data)
        return {
            "status": "success",
            "message": "Pengaturan interval dan ambang batas redaman berhasil disimpan!",
            "data": updated
        }
