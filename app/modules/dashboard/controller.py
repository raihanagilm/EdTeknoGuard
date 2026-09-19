from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.modules.dashboard.service import DashboardService

templates = Jinja2Templates(directory="templates")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        from app.core.security import get_current_user_optional
        active_kantor = getattr(request.state, "active_kantor", "cabang")
        allowed_kantor = getattr(request.state, "allowed_kantor", ["cabang"])
        context_data = DashboardService.get_dashboard_data(db=db, kantor=active_kantor, allowed_kantor=allowed_kantor)
        context_data["current_user"] = get_current_user_optional(request)
        context_data["active_kantor"] = active_kantor
        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context=context_data
        )
