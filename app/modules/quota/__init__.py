"""
Quota Module for NOC Admin
"""
from app.modules.quota.service import QuotaService
from app.modules.quota.routes import router

__all__ = ["QuotaService", "router"]

