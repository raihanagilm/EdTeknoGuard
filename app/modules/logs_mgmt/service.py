from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc

from app.db.models import LogPerformaONT, Pelanggan

class LogsMgmtService:

    @staticmethod
    def get_logs(
        db: Session,
        q: Optional[str] = None,
        status: Optional[str] = None,
        range_type: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Tuple[int, List[Dict[str, Any]], Dict[str, Any]]:
        query = db.query(LogPerformaONT, Pelanggan).join(
            Pelanggan, LogPerformaONT.id_pelanggan == Pelanggan.id_pelanggan
        )

        now = datetime.utcnow()
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

        if status and status != "Semua Status":
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

        # Calculate quick summary metrics
        summary_query = query.with_entities(
            func.count(LogPerformaONT.id),
            func.avg(LogPerformaONT.rx_power)
        ).first()

        total_records = summary_query[0] if summary_query else 0
        avg_rx = round(float(summary_query[1]), 2) if (summary_query and summary_query[1] is not None) else None

        offset = (page - 1) * limit
        rows = query.order_by(desc(LogPerformaONT.waktu_cek)).offset(offset).limit(limit).all()

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
            "avg_rx_power": avg_rx
        }

        return total_count, data, summary
