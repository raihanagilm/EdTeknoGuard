"""
routes/__init__.py
"""
from .api import register_api_routes
from .portal import register_portal_routes

__all__ = ["register_api_routes", "register_portal_routes"]
