from typing import Optional, Dict, Any
from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.logs_mgmt.service import LogsMgmtService

templates = Jinja2Templates(directory="templates")

class LogsMgmtController:

    @staticmethod
    def render_logs_page(request: Request, db: Session):
        total, data, summary = LogsMgmtService.get_logs(db=db, page=1, limit=50)
        min_date = LogsMgmtService.get_min_date(db)
        return templates.TemplateResponse(
            request=request,
            name="logs/index.html",
            context={
                "app_name": settings.APP_NAME,
                "summary": summary,
                "min_date": min_date,
                "request": request
            }
        )

    @staticmethod
    def list_logs(
        db: Session,
        q: Optional[str] = None,
        status: Optional[str] = None,
        range_type: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sort_by: Optional[str] = "waktu_cek",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        total, data, summary = LogsMgmtService.get_logs(
            db=db,
            q=q,
            status=status,
            range_type=range_type,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit
        )
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data,
            "summary": summary,
            "min_date": LogsMgmtService.get_min_date(db)
        }
