from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.modules.dashboard.service import DashboardService

templates = Jinja2Templates(directory="templates")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        context_data = DashboardService.get_dashboard_data(db=db)
        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context=context_data
        )
