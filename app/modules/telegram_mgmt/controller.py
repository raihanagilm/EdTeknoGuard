from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.telegram_mgmt.service import TelegramMgmtService
from app.modules.telegram_mgmt.schemas import TelegramSettingsSchema, TelegramTestAlertRequest

templates = Jinja2Templates(directory="templates")

class TelegramMgmtController:

    @staticmethod
    def render_telegram_page(request: Request, db: Session):
        current_cfg = TelegramMgmtService.get_settings(db)
        history = TelegramMgmtService.get_alert_history(db, limit=20)
        return templates.TemplateResponse(
            request=request,
            name="telegram/index.html",
            context={
                "app_name": settings.APP_NAME,
                "config": current_cfg,
                "history": history,
                "request": request
            }
        )

    @staticmethod
    def get_settings(db: Session) -> Dict[str, Any]:
        return TelegramMgmtService.get_settings(db)

    @staticmethod
    def update_settings(db: Session, data: TelegramSettingsSchema) -> Dict[str, Any]:
        try:
            cfg = TelegramMgmtService.update_settings(
                db=db,
                bot_token=data.bot_token,
                chat_ids=data.chat_ids,
                warning_threshold_dbm=data.warning_threshold_dbm,
                debounce_minutes=data.debounce_minutes
            )
            return {
                "status": "success",
                "message": "Pengaturan Bot Telegram & Ambang Batas Redaman berhasil diperbarui.",
                "config": cfg
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan pengaturan: {e}")

    @staticmethod
    async def send_test_alert(db: Session, req: TelegramTestAlertRequest) -> Dict[str, Any]:
        result = await TelegramMgmtService.send_test_alert(db=db, custom_chat_id=req.custom_chat_id)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result

    @staticmethod
    def get_alert_history(db: Session) -> Dict[str, Any]:
        data = TelegramMgmtService.get_alert_history(db, limit=50)
        return {"total": len(data), "data": data}
