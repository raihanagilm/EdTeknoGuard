"""
routes/api.py - Gerbang Utama Rute API Admin NOC
Mendaftarkan seluruh endpoint modul backend ke FastAPI.
"""
from fastapi import FastAPI
from app.modules.auth.routes import router as auth_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.monitoring.routes import router as monitoring_router
from app.modules.customers.routes import router as customers_router
from app.modules.optical_logs.routes import router as optical_logs_router
from app.modules.tickets.routes import router as tickets_router
from app.modules.quota.routes import router as quota_router
from app.modules.notifications.routes import router as notifications_router
from app.modules.settings.routes import router as settings_router
from app.modules.activity_logs.routes import router as activity_logs_router
from app.modules.users.routes import router as users_router
from app.modules.mikrotik.routes import router as mikrotik_router


def register_api_routes(app: FastAPI):
    """Mendaftarkan seluruh rute API modul admin ke aplikasi FastAPI."""
    app.include_router(auth_router)
    app.include_router(dashboard_router)
    app.include_router(monitoring_router)
    app.include_router(customers_router)
    app.include_router(optical_logs_router)
    app.include_router(tickets_router)
    app.include_router(quota_router)
    app.include_router(notifications_router)
    app.include_router(settings_router)
    app.include_router(activity_logs_router)
    app.include_router(users_router)
    app.include_router(mikrotik_router)
