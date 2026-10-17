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
    kantor: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mengambil status metrik hardware dan identitas router MikroTik"""
    require_admin(request)
    return MikroTikSyncService.get_router_health(db, kantor=kantor)

@router.get("/queues")
def get_mikrotik_queues(
    request: Request,
    kantor: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mengambil daftar seluruh Simple Queues, limit paket, live data usage, dan status isolir"""
    require_admin(request)
    data = MikroTikSyncService.get_live_queues_and_bandwidth(db, kantor=kantor)
    return {
        "status": "success",
        "kantor": kantor or "all",
        "total_rules": len(data),
        "data": data
    }

@router.post("/sync-quota")
def sync_mikrotik_quota(
    request: Request,
    payload: dict = Body(default={}),
    db: Session = Depends(get_db)
):
    """
    Memicu sinkronisasi lengkap dari router MikroTik:
    1. Tarik & perbarui daftar pelanggan (DHCP Leases / ARP / PPPoE).
    2. Perbarui counter bytes / kuota internet dari Simple Queues.
    """
    user_sess = require_admin(request)
    kantor = payload.get("kantor")

    # 1. Tarik data pelanggan dari router MikroTik kantor yang bersangkutan
    sync_cust_res = {"added_count": 0, "updated_count": 0}
    try:
        from app.db.models import Kantor
        knt_obj = db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor and kantor != "all" else None
        if knt_obj and knt_obj.mikrotik_host and knt_obj.mikrotik_user:
            params = {
                "host": knt_obj.mikrotik_host,
                "port": knt_obj.mikrotik_port or 8728,
                "username": knt_obj.mikrotik_user,
                "password": knt_obj.mikrotik_pass or "",
                "kantor": knt_obj.kode
            }
            sync_cust_res = MikroTikSyncService.sync_customers_from_mikrotik(db, params)
        else:
            # Fallback ke konfigurasi global/auto-sync semua kantor
            res_all = MikroTikSyncService.sync_all_configured_kantors(db)
            for r in res_all:
                sync_cust_res["added_count"] = sync_cust_res.get("added_count", 0) + r.get("added_count", 0)
                sync_cust_res["updated_count"] = sync_cust_res.get("updated_count", 0) + r.get("updated_count", 0)
    except Exception as e:
        pass

    # 2. Tarik data kuota & Simple Queues
    res = MikroTikSyncService.sync_traffic_quota_to_db(db, kantor=kantor)
    res["added_customers"] = sync_cust_res.get("added_count", 0)
    res["updated_customers"] = sync_cust_res.get("updated_count", 0)

    # Catat audit log aktivitas
    try:
        ActivityLogService.log_activity(
            db=db,
            username=user_sess.get("user", "admin"),
            action="SYNC_MIKROTIK_ALL",
            ip_address=request.client.host if request.client else "unknown",
            status="SUCCESS",
            keterangan=f"Sinkronisasi MikroTik kantor {kantor or 'semua'}: {res.get('added_customers', 0)} pelanggan baru, {res.get('total_synced', 0)} kuota diperbarui."
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
