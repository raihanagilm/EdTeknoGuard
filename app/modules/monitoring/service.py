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
    def get_chart_data(
        db: Session,
        range_type: str = "today",
        date_filter: Optional[str] = None,
        id_pelanggan: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now()

        # Menentukan rentang tanggal
        if date_filter:
            try:
                target_date = datetime.strptime(date_filter, "%Y-%m-%d")
                start_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                range_mode = "single_day"
            except ValueError:
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                range_mode = "single_day"
        elif range_type == "yesterday":
            yesterday = now - timedelta(days=1)
            start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
            range_mode = "single_day"
        elif range_type == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            range_mode = "single_day"
        elif range_type == "week":
            start_date = now - timedelta(days=7)
            end_date = now
            range_mode = "multi_day"
        elif range_type == "month":
            start_date = now - timedelta(days=30)
            end_date = now
            range_mode = "multi_day"
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            range_mode = "single_day"

        # Query dasar log
        query = db.query(LogPerformaONT).filter(
            LogPerformaONT.waktu_cek >= start_date,
            LogPerformaONT.waktu_cek <= end_date,
            LogPerformaONT.rx_power != None
        )

        if id_pelanggan:
            # Mode satu pelanggan spesifik
            query = query.filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            logs = query.order_by(LogPerformaONT.waktu_cek.asc()).all()

            if not logs:
                return {
                    "labels": ["Tidak ada data pada rentang ini"],
                    "values": [None],
                    "threshold": settings.WARNING_THRESHOLD_DBM,
                    "avg_dbm": None,
                    "min_dbm": None,
                    "max_dbm": None,
                    "total_points": 0,
                    "date": start_date.strftime("%Y-%m-%d")
                }

            labels = [
                l.waktu_cek.strftime("%H:%M" if range_mode == "single_day" else "%d/%m %H:%M")
                for l in logs
            ]
            values = [float(l.rx_power) for l in logs]
        else:
            # Mode agregasi rata-rata jaringan (Dashboard)
            # Kelompokkan per batch scan (menit atau jam)
            if range_mode == "single_day":
                time_fmt = "%H:%i"
            else:
                time_fmt = "%d/%m %H:%i"

            grouped_rows = (
                db.query(
                    func.date_format(LogPerformaONT.waktu_cek, time_fmt).label("time_label"),
                    func.round(func.avg(LogPerformaONT.rx_power), 2).label("avg_rx"),
                    func.min(LogPerformaONT.rx_power).label("min_rx"),
                    func.max(LogPerformaONT.rx_power).label("max_rx"),
                    func.count(LogPerformaONT.id).label("ont_count"),
                    func.min(LogPerformaONT.waktu_cek).label("min_waktu")
                )
                .filter(
                    LogPerformaONT.waktu_cek >= start_date,
                    LogPerformaONT.waktu_cek <= end_date,
                    LogPerformaONT.rx_power != None
                )
                .group_by(func.date_format(LogPerformaONT.waktu_cek, time_fmt))
                .order_by("min_waktu")
                .all()
            )

            if not grouped_rows:
                return {
                    "labels": ["Belum ada log pada tanggal ini"],
                    "values": [None],
                    "threshold": settings.WARNING_THRESHOLD_DBM,
                    "avg_dbm": None,
                    "min_dbm": None,
                    "max_dbm": None,
                    "total_points": 0,
                    "date": start_date.strftime("%Y-%m-%d")
                }

            labels = [r[0] for r in grouped_rows]
            values = [float(r[1]) if r[1] is not None else None for r in grouped_rows]
            counts = [int(r[4]) if r[4] is not None else 1 for r in grouped_rows]

        # Ringkasan statistik
        valid_vals = [v for v in values if v is not None]
        avg_dbm = round(sum(valid_vals) / len(valid_vals), 2) if valid_vals else None
        min_dbm = round(max(valid_vals), 2) if valid_vals else None # terbagus (paling mendekati 0)
        max_dbm = round(min(valid_vals), 2) if valid_vals else None # terburuk (paling drop/minus besar)

        return {
            "labels": labels,
            "values": values,
            "counts": counts if not id_pelanggan else [1] * len(values),
            "threshold": settings.WARNING_THRESHOLD_DBM,
            "avg_dbm": avg_dbm,
            "min_dbm": min_dbm,
            "max_dbm": max_dbm,
            "total_points": len(values),
            "date": start_date.strftime("%Y-%m-%d")
        }

