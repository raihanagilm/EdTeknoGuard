"""
app/portal/api_router.py - Aggregator Router API Portal Pelanggan TeknoCust
Menggabungkan router per-domain (auth, dashboard, quota, tickets, wifi, profile, speedtest, payment)
ke dalam satu APIRouter dengan prefix '/api'.
"""
from fastapi import APIRouter

from app.portal.modules.auth.routes import router as auth_router
from app.portal.modules.dashboard.routes import router as dashboard_router
from app.portal.modules.quota.routes import router as quota_router
from app.portal.modules.tickets.routes import router as tickets_router
from app.portal.modules.wifi.routes import router as wifi_router
from app.portal.modules.profile.routes import router as profile_router
from app.portal.modules.speedtest.routes import router as speedtest_router
from app.portal.modules.payment.routes import router as payment_router

api_router = APIRouter(prefix="/api", tags=["Portal Pelanggan REST API"])

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(quota_router)
api_router.include_router(tickets_router)
api_router.include_router(wifi_router)
api_router.include_router(profile_router)
api_router.include_router(speedtest_router)
api_router.include_router(payment_router)

__all__ = ["api_router"]
