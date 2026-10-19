import os
from pathlib import Path
from fastapi import Request
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.modules.dashboard.service import DashboardService

DIST_INDEX = Path("frontend/dist/index.html")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        if DIST_INDEX.exists():
            return FileResponse(str(DIST_INDEX))

        templates_dir = Path("templates")
        if templates_dir.exists() and (templates_dir / "dashboard/index.html").exists():
            from fastapi.templating import Jinja2Templates
            templates = Jinja2Templates(directory="templates")
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

        return HTMLResponse("<!doctype html><html><head><title>EdTeknoGuard</title></head><body><h1>EdTeknoGuard Monitoring &amp; Deteksi Dini ONT</h1><div id='root'></div></body></html>")
