from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.modules.activity_logs.service import ActivityLogService
from app.core.config import settings

templates = Jinja2Templates(directory="templates")

class ActivityLogController:

    @staticmethod
    def render_logs_page(request: Request, db: Session):
        """Merender antarmuka web log aktivitas pengguna (templates/activity_logs/index.html)"""
        users = ActivityLogService.get_distinct_users(db)
        return templates.TemplateResponse(
            request=request,
            name="activity_logs/index.html",
            context={
                "app_name": settings.APP_NAME,
                "users": users,
                "request": request
            }
        )

    @staticmethod
    def get_logs_data(
        db: Session,
        username: Optional[str] = None,
        q: Optional[str] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 25
    ) -> Dict[str, Any]:
        """Endpoint JSON untuk fetching log aktivitas dengan filter, sort, dan pagination"""
        total, data = ActivityLogService.get_activity_logs(
            db=db,
            username=username,
            q=q,
            action=action,
            status=status,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit
        )
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data
        }
