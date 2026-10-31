"""
app/services/admin/__init__.py - Laravel style Admin Domain Services
"""
from app.modules.auth.service import AuthService
from app.modules.dashboard.service import DashboardService
from app.modules.monitoring.service import MonitoringService
from app.modules.customers.service import CustomerService
from app.modules.logs_mgmt.service import LogsMgmtService
from app.modules.settings.service import SystemSettingsService
from app.modules.activity_logs.service import ActivityLogService
from app.modules.users.service import UsersService
from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService

__all__ = [
    "AuthService",
    "DashboardService",
    "MonitoringService",
    "CustomerService",
    "LogsMgmtService",
    "SystemSettingsService",
    "ActivityLogService",
    "UsersService",
    "AdminCustomerMgmtService",
]
