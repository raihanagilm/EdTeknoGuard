from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_role, require_admin
from app.modules.settings.controller import SystemSettingsController
from app.modules.settings.schemas import SystemSettingsSchema, MikroTikTestSchema, MikroTikSyncNowSchema

router = APIRouter(tags=["settings"])

# ----------------- HTML PAGE ROUTE -----------------
@router.get("/settings")
@router.get("/pengaturan")
def render_settings_page(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_role)
):
    """Halaman Pengaturan Interval Cek Redaman & Ambang Batas (Protected Admin & Super Admin)"""
    return SystemSettingsController.render_settings_page(request=request, db=db)


# ----------------- REST API ROUTES -----------------
@router.get("/api/pengaturan")
@router.get("/api/settings")
def get_system_settings(
    kantor: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Ambil parameter aktif interval monitoring dan threshold per kantor (Read-only untuk seluruh user NOC terotentikasi)"""
    return SystemSettingsController.get_settings(db=db, kantor=kantor)

@router.post("/api/pengaturan")
@router.post("/api/settings")
def update_system_settings(
    request: Request,
    data: SystemSettingsSchema,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_role)
):
    """Simpan perubahan interval monitoring dan ambang batas redaman"""
    return SystemSettingsController.update_settings(db=db, data=data, request=request, user=user)

@router.post("/api/settings/mikrotik/test")
def test_mikrotik_connection(
    data: MikroTikTestSchema,
    user: dict = Depends(require_admin_role)
):
    """Uji konektivitas soket dan autentikasi ke router MikroTik"""
    return SystemSettingsController.test_mikrotik(data=data)

@router.post("/api/settings/mikrotik/sync-now")
def sync_mikrotik_now(
    data: MikroTikSyncNowSchema = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_role)
):
    """Pemicu manual sinkronisasi pelanggan dari DHCP Leases bound MikroTik"""
    return SystemSettingsController.sync_mikrotik(db=db, data=data)
