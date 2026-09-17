from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc, case

from app.core.timezone import get_now_wib
from app.db.models import LogPerformaONT, Pelanggan

class LogsMgmtService:

    @staticmethod
    def get_min_date(db: Session) -> str:
        earliest = db.query(LogPerformaONT.waktu_cek).order_by(LogPerformaONT.waktu_cek.asc()).first()
        if earliest and earliest[0]:
            return earliest[0].strftime("%Y-%m-%d")
        return "2026-09-01"

    @staticmethod
    def get_logs(
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
    ) -> Tuple[int, List[Dict[str, Any]], Dict[str, Any]]:
        query = db.query(LogPerformaONT, Pelanggan).join(
            Pelanggan, LogPerformaONT.id_pelanggan == Pelanggan.id_pelanggan
        )

        now = get_now_wib()
        if range_type == "today":
            cutoff = datetime(now.year, now.month, now.day)
            query = query.filter(LogPerformaONT.waktu_cek >= cutoff)
        elif range_type == "7d":
            cutoff = now - timedelta(days=7)
            query = query.filter(LogPerformaONT.waktu_cek >= cutoff)
        elif range_type == "30d":
            cutoff = now - timedelta(days=30)
            query = query.filter(LogPerformaONT.waktu_cek >= cutoff)
        elif start_date and end_date:
            try:
                s_dt = datetime.strptime(start_date, "%Y-%m-%d")
                e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                query = query.filter(LogPerformaONT.waktu_cek >= s_dt, LogPerformaONT.waktu_cek < e_dt)
            except ValueError:
                pass

        # Simpan state query sebelum difilter oleh status dan search untuk keperluan summary
        summary_base_query = query

        if status and status != "Semua Status":
            # Saat filter CRITICAL, ikutkan juga LOS karena keduanya masuk kategori Kritis
            if status == 'CRITICAL':
                query = query.filter(LogPerformaONT.status_koneksi.in_(['CRITICAL', 'LOS']))
            else:
                query = query.filter(LogPerformaONT.status_koneksi == status)

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Pelanggan.nama.ilike(search_pattern),
                    Pelanggan.id_pelanggan.ilike(search_pattern),
                    Pelanggan.ip_router.ilike(search_pattern),
                    Pelanggan.pop.ilike(search_pattern)
                )
            )

        total_count = query.count()

        # Calculate quick summary metrics based on date range ONLY (ignore status and search query)
        summary_stats = summary_base_query.with_entities(
            func.count(LogPerformaONT.id),
            func.sum(case((LogPerformaONT.status_koneksi == 'NORMAL', 1), else_=0)),
            func.sum(case((LogPerformaONT.status_koneksi == 'WARNING', 1), else_=0)),
            func.sum(case((LogPerformaONT.status_koneksi.in_(['CRITICAL', 'LOS']), 1), else_=0)),
        ).first()

        total_records = summary_stats[0] if summary_stats and summary_stats[0] else 0
        normal_count = summary_stats[1] if summary_stats and summary_stats[1] else 0
        warning_count = summary_stats[2] if summary_stats and summary_stats[2] else 0
        kritis_los_count = summary_stats[3] if summary_stats and summary_stats[3] else 0

        # Sorting logic
        sort_column_map = {
            "waktu_cek": LogPerformaONT.waktu_cek,
            "nama": Pelanggan.nama,
            "pop": Pelanggan.pop,
            "ip_router": Pelanggan.ip_router,
            "jenis_modem": Pelanggan.jenis_modem,
            "rx_power": LogPerformaONT.rx_power,
            "suhu_ont": LogPerformaONT.suhu_ont,
            "latency_ms": LogPerformaONT.latency_ms,
            "status_koneksi": LogPerformaONT.status_koneksi
        }
        col = sort_column_map.get(sort_by, LogPerformaONT.waktu_cek)
        if sort_dir.lower() == "asc":
            query = query.order_by(col.asc())
        else:
            query = query.order_by(col.desc())

        offset = (page - 1) * limit
        rows = query.offset(offset).limit(limit).all()

        data = []
        for log_entry, cust in rows:
            data.append({
                "id": log_entry.id,
                "waktu_cek": log_entry.waktu_cek.strftime("%Y-%m-%d %H:%M:%S"),
                "id_pelanggan": cust.id_pelanggan,
                "nama": cust.nama,
                "pop": cust.pop,
                "ip_router": cust.ip_router,
                "jenis_modem": cust.jenis_modem,
                "rx_power": float(log_entry.rx_power) if log_entry.rx_power is not None else None,
                "suhu_ont": float(log_entry.suhu_ont) if log_entry.suhu_ont is not None else None,
                "uptime": log_entry.uptime,
                "latency_ms": log_entry.latency_ms,
                "status_koneksi": log_entry.status_koneksi,
                "keterangan": log_entry.keterangan
            })

        summary = {
            "total_records": total_records,
            "normal": int(normal_count),
            "warning": int(warning_count),
            "kritis_los": int(kritis_los_count)
        }

        return total_count, data, summary
