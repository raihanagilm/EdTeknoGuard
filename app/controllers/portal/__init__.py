"""
app/controllers/portal/__init__.py - Laravel style Portal Controllers registry
"""
from app.portal.modules.auth.controller import AuthController as PortalAuthController
from app.portal.modules.dashboard.controller import DashboardController as PortalDashboardController
from app.portal.modules.profile.controller import ProfilController as PortalProfileController
from app.portal.modules.quota.controller import KuotaController as PortalQuotaController
from app.portal.modules.tickets.controller import KendalaController as PortalTicketController
from app.portal.modules.wifi.controller import WifiController as PortalWifiController

__all__ = [
    "PortalAuthController",
    "PortalDashboardController",
    "PortalProfileController",
    "PortalQuotaController",
    "PortalTicketController",
    "PortalWifiController",
]
