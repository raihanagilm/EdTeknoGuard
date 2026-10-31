"""
routes/portal.py - Gerbang Rute API Portal Pelanggan Mandiri TeknoCust (Laravel Route Style)
"""
from fastapi import FastAPI
from app.portal.api_router import api_router as portal_api_router
from app.portal.main import app as portal_sub_app

def register_portal_routes(app: FastAPI):
    """Me-mount portal pelanggan sub-application ke FastAPI utama."""
    app.mount("/portal", portal_sub_app)
