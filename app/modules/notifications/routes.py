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

    from app.core.security import get_user_allowed_kantor
    allowed = get_user_allowed_kantor(user)

    # Jika user berhak atas lebih dari 1 kantor (Super Admin, Admin/Teknisi multi-kantor),
    # kumpulkan notifikasi dari seluruh database tenant yang menjadi hak aksesnya.
    if len(allowed) > 1:
        merged_notifications = []
        seen_ids = set()
        paused_reminder = None
        notif_config = None

        for k in allowed:
            t_sess = TenantDatabaseManager.get_tenant_session(k)
            try:
                res = NotificationService.get_realtime_notifications(db=t_sess, kantor=k, user=user)
                for item in res.get("notifications", []):
                    item_id = item.get("id")
                    if item_id not in seen_ids:
                        seen_ids.add(item_id)
                        merged_notifications.append(item)
                if not paused_reminder and res.get("paused_reminder"):
                    paused_reminder = res.get("paused_reminder")
                if not notif_config and res.get("notification_config"):
                    notif_config = res.get("notification_config")
            finally:
                t_sess.close()

        # Urutkan notifikasi: Kritis/Terputus paling atas, lalu tiket/peringatan
        priority_order = {"critical": 0, "los": 1, "warning": 2, "invalid": 3, "info": 4}
        merged_notifications.sort(key=lambda x: priority_order.get(x.get("level", "info"), 5))

        return {
            "status": "success",
            "total_unread": len(merged_notifications),
            "notifications": merged_notifications,
            "paused_reminder": paused_reminder,
            "notification_config": notif_config
        }

    # Untuk user 1 kantor (single-branch), baca dari kantor yang menjadi haknya
    target_kantor = allowed[0] if allowed else get_active_kantor(request, user)
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

    # Ambil kantor target dari payload jika dikirim, fallback ke active kantor
    item_kantor = body.get("kantor") or get_active_kantor(request, user)
    active_db = TenantDatabaseManager.get_tenant_session(item_kantor)
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

    # Kelompokkan item berdasarkan kantor agar disimpan ke database tenant masing-masing
    from collections import defaultdict
    items_by_kantor = defaultdict(list)
    default_k = get_active_kantor(request, user)
    for it in items:
        k = it.get("kantor") or default_k
        items_by_kantor[k].append(it)

    total_marked = 0
    for k, k_items in items_by_kantor.items():
        active_db = TenantDatabaseManager.get_tenant_session(k)
        try:
            res = NotificationService.mark_all_notifications_read(db=active_db, user=user, items=k_items)
            total_marked += res.get("marked_count", 0)
        finally:
            active_db.close()

    return {"status": "success", "marked_count": total_marked}


@router.post("/api/monitoring/snooze-pause-reminder")
def snooze_pause_reminder(request: Request, db: Session = Depends(get_db)):
    from app.services.scheduler_service import ont_scheduler
    user = get_current_user_optional(request)
    if not user or user.get("role") != "super admin":
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    ont_scheduler.snooze_paused_reminder(db)
    return {"status": "success", "message": "Pengingat jeda ditunda 1 jam."}

