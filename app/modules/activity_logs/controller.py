from typing import Optional, Dict, Any, List
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
        import datetime
        from sqlalchemy import func
        from app.db.models import UserActivityLog

        users = ActivityLogService.get_distinct_users(db)
        dates = ActivityLogService.get_distinct_dates(db)
        earliest_log = db.query(func.min(UserActivityLog.created_at)).scalar()
        min_date_str = earliest_log.strftime("%Y-%m-%d") if earliest_log else datetime.date.today().strftime("%Y-%m-%d")
        today_str = datetime.date.today().strftime("%Y-%m-%d")

        return templates.TemplateResponse(
            request=request,
            name="activity_logs/index.html",
            context={
                "app_name": settings.APP_NAME,
                "users": users,
                "available_dates": dates,
                "min_date": min_date_str,
                "today_date": today_str,
                "request": request
            }
        )

    @staticmethod
    def get_logs_data(
        db: Session,
        username: Optional[str] = None,
        q: Optional[str] = None,
        action: Optional[str] = None,
        range_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        date: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 25
    ) -> Dict[str, Any]:
        """Endpoint JSON untuk fetching log aktivitas dengan filter, sort, dan pagination"""
        total, data, min_date_str = ActivityLogService.get_activity_logs(
            db=db,
            username=username,
            q=q,
            action=action,
            range_type=range_type,
            start_date=start_date,
            end_date=end_date,
            date=date,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit
        )
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "min_date": min_date_str,
            "data": data
        }

    @staticmethod
    def get_available_dates(db: Session) -> List[str]:
        """Endpoint JSON untuk mendapatkan daftar tanggal yang tersedia di database"""
        return ActivityLogService.get_distinct_dates(db)
