"""
app/modules/notifications/routes.py - Notification Routes for NOC Admin
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user_optional, get_active_kantor
from app.core.tenant_database import TenantDatabaseManager
from app.modules.notifications.service import NotificationService

router = APIRouter(tags=["notifications"])


@router.get("/api/notifications/poll")
@router.get("/admin/api/notifications/poll")
def poll_realtime_notifications(request: Request, kantor: Optional[str] = Query(None), db: Session = Depends(get_db)):
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Belum login")
    # get_active_kantor membaca ?kantor= lalu memvalidasinya terhadap allowed_kantor user,
    # sehingga pengguna tidak dapat mengintip notifikasi kantor di luar haknya.
    target_kantor = get_active_kantor(request, user)
    active_db = TenantDatabaseManager.get_tenant_session(target_kantor)

    try:
        return NotificationService.get_realtime_notifications(db=active_db, kantor=target_kantor, user=user)
    finally:
        active_db.close()


@router.post("/api/notifications/read")
@router.post("/admin/api/notifications/read")
async def mark_single_notification_read(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Belum login")
    try:
        body = await request.json()
    except Exception:
        body = {}
    n_type = body.get("type", "general")
    ref_id = body.get("reference_id") or body.get("id")
    if not ref_id:
        raise HTTPException(status_code=400, detail="reference_id wajib diisi")

    # user_notification_reads berada di database tenant, jadi sesi kantor aktif wajib dipakai.
    active_db = TenantDatabaseManager.get_tenant_session(get_active_kantor(request, user))
    try:
        return NotificationService.mark_notification_read(db=active_db, user=user, notification_type=n_type, reference_id=str(ref_id))
    finally:
        active_db.close()


@router.post("/api/notifications/read-all")
@router.post("/admin/api/notifications/read-all")
async def mark_all_notifications_read(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Belum login")
    try:
        body = await request.json()
    except Exception:
        body = {}
    items = body.get("items", [])

    # user_notification_reads berada di database tenant, jadi sesi kantor aktif wajib dipakai.
    active_db = TenantDatabaseManager.get_tenant_session(get_active_kantor(request, user))
    try:
        return NotificationService.mark_all_notifications_read(db=active_db, user=user, items=items)
    finally:
        active_db.close()


@router.post("/api/monitoring/snooze-pause-reminder")
def snooze_pause_reminder(request: Request, db: Session = Depends(get_db)):
    from app.services.scheduler_service import ont_scheduler
    user = get_current_user_optional(request)
    if not user or user.get("role") != "super admin":
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    ont_scheduler.snooze_paused_reminder(db)
    return {"status": "success", "message": "Pengingat jeda ditunda 1 jam."}

