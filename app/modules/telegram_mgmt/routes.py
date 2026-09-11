from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.telegram_mgmt.controller import TelegramMgmtController
from app.modules.telegram_mgmt.schemas import TelegramSettingsSchema, TelegramTestAlertRequest

router = APIRouter(tags=["telegram"])

from fastapi.responses import RedirectResponse

# ----------------- HTML PAGE ROUTE -----------------
@router.get("/telegram")
def render_telegram_page(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Halaman Bot Telegram dialihkan ke Tab Pengaturan Terpusat"""
    return RedirectResponse(url="/settings", status_code=302)


# ----------------- REST API ROUTES -----------------
@router.get("/api/telegram/settings")
def get_telegram_settings(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Ambil konfigurasi aktif bot telegram"""
    return TelegramMgmtController.get_settings(db=db)

@router.post("/api/telegram/settings")
def update_telegram_settings(
    data: TelegramSettingsSchema,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Simpan konfigurasi baru bot telegram & parameter alert"""
    return TelegramMgmtController.update_settings(db=db, data=data)

@router.post("/api/telegram/test")
async def send_test_alert(
    req: TelegramTestAlertRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Uji coba pengiriman pesan instan ke bot telegram"""
    return await TelegramMgmtController.send_test_alert(db=db, req=req)

@router.get("/api/telegram/history")
def get_alert_history(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Riwayat pesan alert yang dikirim ke telegram"""
    return TelegramMgmtController.get_alert_history(db=db)
