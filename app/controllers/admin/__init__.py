"""
app/controllers/admin/__init__.py - Laravel style Admin Controllers registry
"""
from app.modules.auth.controller import AuthController
from app.modules.dashboard.controller import DashboardController
from app.modules.monitoring.controller import MonitoringController
from app.modules.customers.controller import CustomerController
from app.modules.logs_mgmt.controller import LogsMgmtController
from app.modules.settings.controller import SystemSettingsController
from app.modules.activity_logs.controller import ActivityLogController
from app.modules.users.controller import UsersController
from app.modules.admin_customer_mgmt.controller import AdminCustomerMgmtController

__all__ = [
    "AuthController",
    "DashboardController",
    "MonitoringController",
    "CustomerController",
    "LogsMgmtController",
    "SystemSettingsController",
    "ActivityLogController",
    "UsersController",
    "AdminCustomerMgmtController",
]
