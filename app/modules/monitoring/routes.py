from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.monitoring.controller import MonitoringController

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

@router.get("/status")
def get_monitoring_status():
    """Route status engine monitoring dan interval"""
    return MonitoringController.get_status()

@router.post("/toggle-scheduler")
def toggle_scheduler():
    """Route toggle scheduler antara RUNNING dan STOPPED"""
    return MonitoringController.toggle_scheduler()

@router.post("/scan-all")
def trigger_scan_all():
    """Route trigger pemindaian manual seluruh ONT"""
    return MonitoringController.trigger_scan_all()

@router.post("/scan/{id_pelanggan}")
def trigger_scan_single(id_pelanggan: str):
    """Route trigger pemindaian on-demand untuk satu ONT pelanggan"""
    return MonitoringController.trigger_scan_single(id_pelanggan=id_pelanggan)

@router.post("/check-single/{id_pelanggan}")
def check_single_alias(id_pelanggan: str):
    """Alias route probe single ONT untuk kompatibilitas frontend"""
    res = MonitoringController.trigger_scan_single(id_pelanggan=id_pelanggan)
    return {
        "status": "success",
        "probe_result": {
            "id_pelanggan": res.get("id_pelanggan"),
            "nama": res.get("nama"),
            "rx_power": res.get("rx_power"),
            "suhu_ont": res.get("suhu_ont"),
            "status": res.get("status_koneksi"),
            "mac_address": res.get("mac_address"),
            "nama_wifi": res.get("nama_wifi"),
            "password_wifi": res.get("password_wifi"),
            "status_kredensial": res.get("status_kredensial"),
            "latency_ms": res.get("latency_ms"),
            "waktu_cek": res.get("waktu_cek")
        }
    }

@router.get("/kpi")
def get_kpi_metrics(db: Session = Depends(get_db)):
    """Route ringkasan metrik kesehatan jaringan ONT"""
    return MonitoringController.get_kpi(db=db)

@router.get("/chart-data")
def get_chart_data(
    range_type: str = Query("today", alias="range"),
    date_filter: Optional[str] = Query(None, alias="date"),
    id_pelanggan: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Route data historis redaman optik untuk Chart.js dengan filter tanggal (date=YYYY-MM-DD) atau range (today, yesterday, week, month)"""
    return MonitoringController.get_chart_data(
        db=db, range_type=range_type, date_filter=date_filter, id_pelanggan=id_pelanggan
    )
