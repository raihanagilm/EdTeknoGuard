from typing import Optional, List
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.activity_logs.controller import ActivityLogController

router = APIRouter(tags=["activity_logs"])

@router.get("/user-logs")
@router.get("/log-aktivitas")
def get_user_logs_page(
    request: Request,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    """Menampilkan halaman audit log aktivitas karyawan / user"""
    return ActivityLogController.render_logs_page(request=request, db=db)

@router.get("/api/activity-logs")
def get_user_logs_api(
    username: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    range: Optional[str] = Query(None, description="Rentang waktu: today, 7d, 30d, custom"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    """API JSON log aktivitas karyawan / user"""
    return ActivityLogController.get_logs_data(
        db=db,
        username=username,
        q=q,
        action=action,
        range_type=range,
        start_date=start_date,
        end_date=end_date,
        date=date,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit
    )

@router.get("/api/activity-logs/dates")
def get_available_dates_api(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin)
) -> List[str]:
    """API JSON daftar tanggal yang tersedia di log aktivitas"""
    return ActivityLogController.get_available_dates(db)
