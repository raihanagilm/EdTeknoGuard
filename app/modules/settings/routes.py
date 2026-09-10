from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.settings.controller import SystemSettingsController
from app.modules.settings.schemas import SystemSettingsSchema

router = APIRouter(tags=["settings"])

# ----------------- HTML PAGE ROUTE -----------------
@router.get("/settings")
@router.get("/pengaturan")
def render_settings_page(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Halaman Pengaturan Interval Cek Redaman & Ambang Batas (Protected NOC Admin)"""
    return SystemSettingsController.render_settings_page(request=request, db=db)


# ----------------- REST API ROUTES -----------------
@router.get("/api/settings")
def get_system_settings(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Ambil parameter aktif interval monitoring dan threshold"""
    return SystemSettingsController.get_settings(db=db)

@router.post("/api/settings")
def update_system_settings(
    data: SystemSettingsSchema,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Simpan perubahan interval monitoring dan ambang batas redaman"""
    return SystemSettingsController.update_settings(db=db, data=data)
