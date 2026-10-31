"""
routes/api.py - Gerbang Utama Rute API Admin NOC (Laravel Route Style)
Mendaftarkan seluruh endpoint modul backend ke FastAPI.
"""
from fastapi import FastAPI
from app.modules.auth.routes import router as auth_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.monitoring.routes import router as monitoring_router
from app.modules.customers.routes import router as customers_router
from app.modules.logs_mgmt.routes import router as logs_router
from app.modules.settings.routes import router as settings_router
from app.modules.activity_logs.routes import router as activity_logs_router
from app.modules.users.routes import router as users_router
from app.modules.admin_customer_mgmt.routes import router as admin_customer_router
from app.modules.mikrotik.routes import router as mikrotik_router

def register_api_routes(app: FastAPI):
    """Mendaftarkan seluruh rute API modul admin ke aplikasi FastAPI."""
    app.include_router(auth_router)
    app.include_router(dashboard_router)
    app.include_router(monitoring_router)
    app.include_router(customers_router)
    app.include_router(logs_router)
    app.include_router(settings_router)
    app.include_router(activity_logs_router)
    app.include_router(users_router)
    app.include_router(admin_customer_router)
    app.include_router(mikrotik_router)
