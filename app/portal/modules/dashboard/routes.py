from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_portal_db
from app.portal.modules.dashboard.controller import DashboardController

router = APIRouter(tags=["Dashboard Pelanggan"])

@router.get("/")
def dashboard_home(request: Request, db: Session = Depends(get_portal_db)):
    return DashboardController.render_dashboard(request, db)

@router.post("/live-probe")
def dashboard_live_probe(request: Request, db: Session = Depends(get_portal_db)):
    from app.portal.api_router import portal_live_probe_signal
    return portal_live_probe_signal(request, db)
