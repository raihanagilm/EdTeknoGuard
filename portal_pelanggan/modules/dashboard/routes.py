from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.dashboard.controller import DashboardController

router = APIRouter(tags=["Dashboard Pelanggan"])

@router.get("/")
def dashboard_home(request: Request, db: Session = Depends(get_db)):
    return DashboardController.render_dashboard(request, db)
