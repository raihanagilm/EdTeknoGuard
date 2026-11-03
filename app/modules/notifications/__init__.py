"""
Notifications Module for NOC Admin
"""
from app.modules.notifications.service import NotificationService
from app.modules.notifications.routes import router

__all__ = ["NotificationService", "router"]

