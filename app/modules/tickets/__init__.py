"""
Tickets Module for NOC Admin
"""
from app.modules.tickets.service import TicketService
from app.modules.tickets.routes import router

__all__ = ["TicketService", "router"]

