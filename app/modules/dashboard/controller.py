from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.modules.dashboard.service import DashboardService

templates = Jinja2Templates(directory="templates")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        from app.core.security import get_current_user_optional
        context_data = DashboardService.get_dashboard_data(db=db)
        context_data["current_user"] = get_current_user_optional(request)
        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context=context_data
        )
