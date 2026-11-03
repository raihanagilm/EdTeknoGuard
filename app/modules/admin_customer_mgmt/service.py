"""
app/modules/admin_customer_mgmt/service.py - Facade & Backward Compatibility Service
Forwards to TicketService, QuotaService, and NotificationService.
"""
from app.modules.tickets.service import TicketService
from app.modules.quota.service import QuotaService
from app.modules.notifications.service import NotificationService


class AdminCustomerMgmtService(TicketService, QuotaService, NotificationService):
    """Facade for backward compatibility with older imports."""
    pass
