from fastapi import Request, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.modules.dashboard.service import DashboardService
from portal_pelanggan.core.security import require_customer_login, get_portal_base_url as get_base_url

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        current_cust = require_customer_login(request)
        data = DashboardService.get_dashboard_data(db, current_cust["id_pelanggan"])
        if not data:
            raise HTTPException(status_code=404, detail="Data pelanggan tidak ditemukan")

        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context={
                "current_cust": current_cust,
                "data": data,
                "active_tab": "dashboard",
                "base_url": base
            }
        )
