"""
app/modules/admin_customer_mgmt/routes.py - Facade & Backward Compatibility Router
Aggregates routes from tickets, quota, and notifications modules.
"""
from fastapi import APIRouter
from app.modules.tickets.routes import (
    router as tickets_router,
    get_tickets_json,
    update_ticket_status
)
from app.modules.quota.routes import (
    router as quota_router,
    get_quota_json
)
from app.modules.notifications.routes import (
    router as notifications_router,
    poll_realtime_notifications,
    mark_single_notification_read,
    mark_all_notifications_read,
    snooze_pause_reminder
)

router = APIRouter(tags=["admin_customer_mgmt"])
router.include_router(tickets_router)
router.include_router(quota_router)
router.include_router(notifications_router)
