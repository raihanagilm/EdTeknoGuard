from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.logs_mgmt.controller import LogsMgmtController

router = APIRouter(tags=["logs"])

# ----------------- HTML PAGE ROUTE -----------------
@router.get("/logs")
def render_logs_page(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Halaman Audit Riwayat Log Pemeriksaan ONT (Protected NOC Admin)"""
    return LogsMgmtController.render_logs_page(request=request, db=db)


# ----------------- REST API ROUTE -----------------
@router.get("/api/logs")
def list_logs(
    q: Optional[str] = Query(None, description="Pencarian nama, IP, atau ID pelanggan"),
    status: Optional[str] = Query(None, description="Filter status NORMAL, WARNING, CRITICAL, LOS"),
    range: str = Query("today", description="Rentang waktu: today, 7d, 30d, custom"),
    start_date: Optional[str] = Query(None, description="Tanggal mulai (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Tanggal selesai (YYYY-MM-DD)"),
    sort_by: Optional[str] = Query("waktu_cek", description="Kolom urutan: waktu_cek, nama, ip_router, rx_power, suhu_ont, latency_ms, status_koneksi"),
    sort_dir: str = Query("desc", description="Arah urutan: asc atau desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=10, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """API data time-series log performa ONT dengan filter, sorting, dan pagination"""
    return LogsMgmtController.list_logs(
        db=db,
        q=q,
        status=status,
        range_type=range,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit
    )
