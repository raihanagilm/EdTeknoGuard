from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.dashboard.controller import DashboardController

router = APIRouter(tags=["dashboard"])

@router.get("/")
def render_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Route antarmuka utama dashboard NOC EdTeknoGuard"""
    return DashboardController.render_dashboard(request=request, db=db)

