from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Pelanggan, LogPerformaONT
from app.services.scheduler_service import scheduler
from app.core.config import settings

class MonitoringService:

    @staticmethod
    def get_status() -> Dict[str, Any]:
        return scheduler.get_status()

    @staticmethod
    def toggle_scheduler() -> str:
        curr = scheduler.get_status().get("status")
        if curr == "RUNNING":
            scheduler.stop()
            return "STOPPED"
        else:
            scheduler.resume()
            return "RUNNING"

    @staticmethod
    def scan_all() -> Dict[str, Any]:
        return scheduler.execute_scan_sync()

    @staticmethod
    def scan_single(id_pelanggan: str) -> Optional[Dict[str, Any]]:
        return scheduler.scan_single(id_pelanggan)

    @staticmethod
    def get_kpi_metrics(db: Session) -> Dict[str, Any]:
        total_customers = db.query(Pelanggan).filter(Pelanggan.is_active == True).count()

        subq = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.waktu_cek).label("max_waktu")
            )
            .group_by(LogPerformaONT.id_pelanggan)
            .subquery()
        )

        latest_logs = (
            db.query(LogPerformaONT)
            .join(
                subq,
                (LogPerformaONT.id_pelanggan == subq.c.id_pelanggan) &
                (LogPerformaONT.waktu_cek == subq.c.max_waktu)
            )
            .all()
        )

        normal_count = 0
        warning_count = 0
        critical_count = 0
        los_count = 0

        for l in latest_logs:
            if l.status_koneksi == "NORMAL":
                normal_count += 1
            elif l.status_koneksi == "WARNING":
                warning_count += 1
            elif l.status_koneksi == "CRITICAL":
                critical_count += 1
            elif l.status_koneksi == "LOS":
                los_count += 1

        return {
            "total_monitored": total_customers,
            "normal": normal_count,
            "warning": warning_count,
            "critical": critical_count,
            "los": los_count,
            "warning_threshold": settings.WARNING_THRESHOLD_DBM,
            "critical_threshold": settings.CRITICAL_THRESHOLD_DBM
        }

    @staticmethod
    def get_chart_data(db: Session, range_type: str = "today", id_pelanggan: Optional[str] = None) -> Dict[str, Any]:
        now = datetime.now()
        if range_type == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_type == "week":
            start_date = now - timedelta(days=7)
        elif range_type == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)

        query = db.query(LogPerformaONT).filter(
            LogPerformaONT.waktu_cek >= start_date,
            LogPerformaONT.rx_power != None
        )

        if id_pelanggan:
            query = query.filter(LogPerformaONT.id_pelanggan == id_pelanggan)

        logs = query.order_by(LogPerformaONT.waktu_cek.asc()).all()

        if not logs:
            return {
                "labels": ["Belum ada data"],
                "values": [-22.0],
                "threshold": settings.WARNING_THRESHOLD_DBM
            }

        labels = []
        values = []
        for l in logs:
            if range_type == "today":
                lbl = l.waktu_cek.strftime("%H:%M")
            elif range_type == "week":
                lbl = l.waktu_cek.strftime("%d/%m %H:%M")
            else:
                lbl = l.waktu_cek.strftime("%d/%m")

            labels.append(lbl)
            values.append(float(l.rx_power))

        if len(labels) > 60:
            step = len(labels) // 60
            labels = labels[::step]
            values = values[::step]

        return {
            "labels": labels,
            "values": values,
            "threshold": settings.WARNING_THRESHOLD_DBM
        }
