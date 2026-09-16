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
        # Hanya hitung pelanggan yang aktif dan berstatus dipantau (is_monitored == True)
        total_customers = db.query(Pelanggan).filter(
            Pelanggan.is_active == True,
            Pelanggan.is_monitored == True
        ).count()

        subq = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.waktu_cek).label("max_waktu")
            )
            .join(Pelanggan, Pelanggan.id_pelanggan == LogPerformaONT.id_pelanggan)
            .filter(
                Pelanggan.is_active == True,
                Pelanggan.is_monitored == True
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

        total_with_logs = normal_count + warning_count + critical_count + los_count
        if total_customers > total_with_logs:
            normal_count += (total_customers - total_with_logs)

        total_all = db.query(Pelanggan).filter(Pelanggan.is_active == True).count()
        monitored_inactive = total_all - total_customers

        return {
            "total_monitored": total_customers,
            "total_all": total_all,
            "monitored_inactive": monitored_inactive,
            "normal": normal_count,
            "warning": warning_count,
            "critical": critical_count,
            "los": los_count,
            "warning_threshold": settings.WARNING_THRESHOLD_DBM,
            "critical_threshold": settings.CRITICAL_THRESHOLD_DBM
        }

    @staticmethod
    def pause_scan() -> Dict[str, Any]:
        return scheduler.pause_scan()

    @staticmethod
    def resume_scan() -> Dict[str, Any]:
        return scheduler.resume_scan()

    @staticmethod
    def stop_scan() -> Dict[str, Any]:
        return scheduler.stop_scan()

    @staticmethod
    def get_chart_data(
        db: Session,
        range_type: str = "today",
        date_filter: Optional[str] = None,
        id_pelanggan: Optional[str] = None
    ) -> Dict[str, Any]:
        from sqlalchemy import case
        now = datetime.now()
        today = now.date()

        warning_th = getattr(settings, "WARNING_THRESHOLD_DBM", -26.0)
        critical_th = getattr(settings, "CRITICAL_THRESHOLD_DBM", -27.0)

        # Helper query data hourly untuk 1 hari tertentu
        def query_day_hourly(target_d):
            d_start = datetime.combine(target_d, datetime.min.time())
            d_end = datetime.combine(target_d, datetime.max.time())
            q = (
                db.query(
                    func.date_format(LogPerformaONT.waktu_cek, '%H:00').label('hour_label'),
                    func.round(func.avg(LogPerformaONT.rx_power), 2).label('avg_rx'),
                    func.count(LogPerformaONT.id).label('total_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'NORMAL', 1), else_=0)).label('normal_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'WARNING', 1), else_=0)).label('warning_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'CRITICAL', 1), else_=0)).label('critical_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'LOS', 1), else_=0)).label('los_count'),
                    func.min(LogPerformaONT.rx_power).label('min_rx'),
                    func.max(LogPerformaONT.rx_power).label('max_rx')
                )
                .filter(LogPerformaONT.waktu_cek >= d_start, LogPerformaONT.waktu_cek <= d_end)
            )
            if id_pelanggan:
                q = q.filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            rows = q.group_by(func.date_format(LogPerformaONT.waktu_cek, '%H:00')).all()
            
            res = {}
            for r in rows:
                res[r[0]] = {
                    "avg": float(r[1]) if r[1] is not None else None,
                    "total": int(r[2]) if r[2] is not None else 0,
                    "normal": int(r[3]) if r[3] is not None else 0,
                    "warning": int(r[4]) if r[4] is not None else 0,
                    "critical": int(r[5]) if r[5] is not None else 0,
                    "los": int(r[6]) if r[6] is not None else 0,
                    "min_rx": float(r[7]) if r[7] is not None else None,
                    "max_rx": float(r[8]) if r[8] is not None else None
                }
            return res

        if date_filter:
            try:
                anchor_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            except Exception:
                anchor_date = today
        else:
            anchor_date = today

        # Skenario 1: Kemarin (2 Garis: Hari Ini & Kemarin diplot pada sumbu jam 24 jam)
        if range_type == "yesterday" and not id_pelanggan:
            day_target = anchor_date
            yesterday = day_target - timedelta(days=1)
            data_today = query_day_hourly(day_target)
            data_yesterday = query_day_hourly(yesterday)

            # Buat 24 jam label 00:00 s/d 23:00
            hours_labels = [f"{h:02d}:00" for h in range(24)]
            
            today_values = []
            today_details = []
            yest_values = []
            yest_details = []

            for h_str in hours_labels:
                t_item = data_today.get(h_str)
                if t_item:
                    today_values.append(t_item["avg"])
                    today_details.append(t_item)
                else:
                    today_values.append(None)
                    today_details.append(None)

                y_item = data_yesterday.get(h_str)
                if y_item:
                    yest_values.append(y_item["avg"])
                    yest_details.append(y_item)
                else:
                    yest_values.append(None)
                    yest_details.append(None)

            datasets = [
                {
                    "id": "today",
                    "label": f"Hari Ini ({day_target.strftime('%d/%m')})",
                    "color": "#4F46E5",
                    "values": today_values,
                    "details": today_details
                },
                {
                    "id": "yesterday",
                    "label": f"Kemarin ({yesterday.strftime('%d/%m')})",
                    "color": "#F59E0B",
                    "values": yest_values,
                    "details": yest_details
                }
            ]

            valid_today = [v for v in today_values if v is not None]
            valid_yest = [v for v in yest_values if v is not None]
            all_valid = valid_today + valid_yest
            avg_dbm = round(sum(all_valid) / len(all_valid), 2) if all_valid else None
            min_dbm = round(max(all_valid), 2) if all_valid else None
            max_dbm = round(min(all_valid), 2) if all_valid else None

            return {
                "range": "yesterday",
                "is_multi_series": True,
                "labels": hours_labels,
                "datasets": datasets,
                "values": today_values,
                "counts": [d["total"] if d else 0 for d in today_details],
                "threshold": warning_th,
                "critical_threshold": critical_th,
                "avg_dbm": avg_dbm,
                "min_dbm": min_dbm,
                "max_dbm": max_dbm,
                "total_points": len(valid_today) + len(valid_yest),
                "date": day_target.strftime("%Y-%m-%d")
            }

        # Skenario 2: 7 Hari (7 Garis: H-6 s/d H diplot pada sumbu jam 24 jam)
        elif range_type == "week" and not id_pelanggan:
            colors = [
                "#4F46E5", # Hari Ini (Indigo)
                "#F59E0B", # H-1 (Amber)
                "#10B981", # H-2 (Emerald)
                "#06B6D4", # H-3 (Cyan)
                "#8B5CF6", # H-4 (Violet)
                "#EC4899", # H-5 (Pink)
                "#64748B"  # H-6 (Slate)
            ]
            hours_labels = [f"{h:02d}:00" for h in range(24)]
            datasets = []
            all_valid = []

            for i in range(7):
                d_target = anchor_date - timedelta(days=i)
                d_data = query_day_hourly(d_target)
                d_values = []
                d_details = []

                for h_str in hours_labels:
                    item = d_data.get(h_str)
                    if item:
                        d_values.append(item["avg"])
                        d_details.append(item)
                    else:
                        d_values.append(None)
                        d_details.append(None)

                label_title = f"Hari Ini ({d_target.strftime('%d/%m')})" if i == 0 else (f"Kemarin ({d_target.strftime('%d/%m')})" if i == 1 else f"H-{i} ({d_target.strftime('%d/%m')})")
                datasets.append({
                    "id": f"day_{i}",
                    "label": label_title,
                    "color": colors[i % len(colors)],
                    "values": d_values,
                    "details": d_details
                })
                all_valid.extend([v for v in d_values if v is not None])

            primary_ds = datasets[0]
            avg_dbm = round(sum(all_valid) / len(all_valid), 2) if all_valid else None
            min_dbm = round(max(all_valid), 2) if all_valid else None
            max_dbm = round(min(all_valid), 2) if all_valid else None

            return {
                "range": "week",
                "is_multi_series": True,
                "labels": hours_labels,
                "datasets": datasets,
                "values": primary_ds["values"],
                "counts": [d["total"] if d else 0 for d in primary_ds["details"]],
                "threshold": warning_th,
                "critical_threshold": critical_th,
                "avg_dbm": avg_dbm,
                "min_dbm": min_dbm,
                "max_dbm": max_dbm,
                "total_points": len(all_valid),
                "date": today.strftime("%Y-%m-%d")
            }

        # Skenario 3: Single Day (Hari Ini atau Tanggal Spesifik via Date Picker)
        else:
            if date_filter:
                try:
                    target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                except ValueError:
                    target_date = today
            else:
                target_date = today

            d_start = datetime.combine(target_date, datetime.min.time())
            d_end = datetime.combine(target_date, datetime.max.time())

            q = (
                db.query(
                    func.date_format(LogPerformaONT.waktu_cek, '%H:%i').label('time_label'),
                    func.round(func.avg(LogPerformaONT.rx_power), 2).label('avg_rx'),
                    func.count(LogPerformaONT.id).label('total_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'NORMAL', 1), else_=0)).label('normal_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'WARNING', 1), else_=0)).label('warning_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'CRITICAL', 1), else_=0)).label('critical_count'),
                    func.sum(case((LogPerformaONT.status_koneksi == 'LOS', 1), else_=0)).label('los_count'),
                    func.min(LogPerformaONT.rx_power).label('min_rx'),
                    func.max(LogPerformaONT.rx_power).label('max_rx'),
                    func.min(LogPerformaONT.waktu_cek).label('min_waktu')
                )
                .filter(LogPerformaONT.waktu_cek >= d_start, LogPerformaONT.waktu_cek <= d_end)
            )

            if id_pelanggan:
                q = q.filter(LogPerformaONT.id_pelanggan == id_pelanggan)

            rows = q.group_by(func.date_format(LogPerformaONT.waktu_cek, '%H:%i')).order_by('min_waktu').all()

            if not rows:
                return {
                    "range": range_type,
                    "is_multi_series": False,
                    "labels": ["Belum ada log pada tanggal ini"],
                    "datasets": [{
                        "id": "single",
                        "label": f"Redaman ({target_date.strftime('%d/%m')})",
                        "color": "#4F46E5",
                        "values": [None],
                        "details": [None]
                    }],
                    "values": [None],
                    "counts": [0],
                    "details": [None],
                    "threshold": warning_th,
                    "critical_threshold": critical_th,
                    "avg_dbm": None,
                    "min_dbm": None,
                    "max_dbm": None,
                    "total_points": 0,
                    "date": target_date.strftime("%Y-%m-%d")
                }

            labels = [r[0] for r in rows]
            values = [float(r[1]) if r[1] is not None else None for r in rows]
            counts = [int(r[2]) if r[2] is not None else 1 for r in rows]
            details = [
                {
                    "avg": float(r[1]) if r[1] is not None else None,
                    "total": int(r[2]) if r[2] is not None else 0,
                    "normal": int(r[3]) if r[3] is not None else 0,
                    "warning": int(r[4]) if r[4] is not None else 0,
                    "critical": int(r[5]) if r[5] is not None else 0,
                    "los": int(r[6]) if r[6] is not None else 0,
                    "min_rx": float(r[7]) if r[7] is not None else None,
                    "max_rx": float(r[8]) if r[8] is not None else None
                }
                for r in rows
            ]

            valid_vals = [v for v in values if v is not None]
            avg_dbm = round(sum(valid_vals) / len(valid_vals), 2) if valid_vals else None
            min_dbm = round(max(valid_vals), 2) if valid_vals else None
            max_dbm = round(min(valid_vals), 2) if valid_vals else None

            day_title = f"Hari Ini ({target_date.strftime('%d/%m')})" if target_date == today else f"Tanggal ({target_date.strftime('%d/%m')})"
            datasets = [
                {
                    "id": "single",
                    "label": day_title,
                    "color": "#4F46E5",
                    "values": values,
                    "details": details
                }
            ]

            return {
                "range": range_type,
                "is_multi_series": False,
                "labels": labels,
                "datasets": datasets,
                "values": values,
                "counts": counts,
                "details": details,
                "threshold": warning_th,
                "critical_threshold": critical_th,
                "avg_dbm": avg_dbm,
                "min_dbm": min_dbm,
                "max_dbm": max_dbm,
                "total_points": len(valid_vals),
                "date": target_date.strftime("%Y-%m-%d")
            }

