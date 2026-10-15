"""
routes.py - Endpoint API MikroTik NOC Center untuk TeknoGuard
Menyediakan REST endpoint untuk:
- /api/mikrotik/health: Metrik router gateway (CPU, RAM, Uptime, RouterOS 7.x)
- /api/mikrotik/queues: Live Simple Queues, limits, byte kuota & korelasi pelanggan
- /api/mikrotik/sync-quota: Trigger sinkronisasi kuota dari Simple Queues ke database
- /api/mikrotik/toggle-isolir: Mengubah status isolir pelanggan (Firewall Address List / Queue)
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.services.mikrotik_service import MikroTikSyncService
from app.modules.activity_logs.service import ActivityLogService

router = APIRouter(prefix="/api/mikrotik", tags=["MikroTik NOC Center"])

@router.get("/health")
def get_mikrotik_health(
    request: Request,
    kantor: Optional[str] = "banyumas",
    db: Session = Depends(get_db)
):
    """Mengambil status metrik hardware dan identitas router MikroTik"""
    require_admin(request)
    knt = kantor or "banyumas"
    return MikroTikSyncService.get_router_health(db, kantor=knt)

@router.get("/queues")
def get_mikrotik_queues(
    request: Request,
    kantor: Optional[str] = "banyumas",
    db: Session = Depends(get_db)
):
    """Mengambil daftar seluruh Simple Queues, limit paket, live data usage, dan status isolir"""
    require_admin(request)
    knt = kantor or "banyumas"
    data = MikroTikSyncService.get_live_queues_and_bandwidth(db, kantor=knt)
    return {
        "status": "success",
        "kantor": knt,
        "total_rules": len(data),
        "data": data
    }

@router.post("/sync-quota")
def sync_mikrotik_quota(
    request: Request,
    payload: dict = Body(default={}),
    db: Session = Depends(get_db)
):
    """Memicu sinkronisasi counter bytes dari Simple Queues ke tabel kuota_pelanggan"""
    user_sess = require_admin(request)
    kantor = payload.get("kantor")
    res = MikroTikSyncService.sync_traffic_quota_to_db(db, kantor=kantor)

    # Catat audit log aktivitas
    try:
        ActivityLogService.log_activity(
            db=db,
            username=user_sess.get("user", "admin"),
            action="SYNC_MIKROTIK_QUOTA",
            ip_address=request.client.host if request.client else "unknown",
            status="SUCCESS",
            keterangan=f"Sinkronisasi kuota dari MikroTik kantor {kantor or 'semua'}: {res.get('total_synced', 0)} data diperbarui."
        )
    except Exception:
        pass

    return res

@router.post("/toggle-isolir")
def toggle_customer_isolir(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Mengaktifkan atau menonaktifkan isolir akses internet pelanggan"""
    user_sess = require_admin(request)
    id_pelanggan = payload.get("id_pelanggan")
    isolir = bool(payload.get("isolir", True))

    if not id_pelanggan:
        raise HTTPException(status_code=400, detail="id_pelanggan wajib disertakan.")

    res = MikroTikSyncService.toggle_customer_isolation(db, id_pelanggan=id_pelanggan, isolir=isolir)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))

    # Catat audit log aktivitas
    try:
        act = "ISOLIR_PELANGGAN" if isolir else "UNBLOCK_PELANGGAN"
        ActivityLogService.log_activity(
            db=db,
            username=user_sess.get("user", "admin"),
            action=act,
            ip_address=request.client.host if request.client else "unknown",
            status="SUCCESS",
            keterangan=res.get("message")
        )
    except Exception:
        pass

    return res
