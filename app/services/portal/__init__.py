"""
app/services/portal/__init__.py - Laravel style Portal Domain Services
"""
from app.portal.modules.auth.service import AuthService as PortalAuthService
from app.portal.modules.dashboard.service import DashboardService as PortalDashboardService
from app.portal.modules.quota.service import KuotaService as PortalQuotaService
from app.portal.modules.tickets.service import KendalaService as PortalTicketService
from app.portal.services.customer_service import PortalCustomerService

__all__ = [
    "PortalAuthService",
    "PortalDashboardService",
    "PortalQuotaService",
    "PortalTicketService",
    "PortalCustomerService",
]
