import random
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, LogPerformaONT, KuotaPelanggan, TiketKendala
from app.core.timezone import get_now_wib

class DashboardService:

    @staticmethod
    def get_dashboard_data(db: Session, id_pelanggan: Optional[str]):
        now = get_now_wib()
        if not id_pelanggan:
            return {
                "pelanggan": None,
                "is_pending": True,
                "last_log": None,
                "kuota": None,
                "active_tickets_count": 0,
                "now": now
            }

        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return {
                "pelanggan": None,
                "is_pending": True,
                "last_log": None,
                "kuota": None,
                "active_tickets_count": 0,
                "now": now
            }

        # 1. Log performa ONT terakhir (Live Signal)
        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        # 2. Kuota periode bulan ini (TANPA SISA KUOTA)
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        kuota = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.id_pelanggan == id_pelanggan,
            KuotaPelanggan.periode_bulan == current_period
        ).first()

        if not kuota:
            random_usage = round(random.uniform(50.0, 195.0), 1)
            kuota = KuotaPelanggan(
                id_pelanggan=id_pelanggan,
                periode_bulan=current_period,
                kuota_terpakai_gb=random_usage,
                kecepatan_paket=cust.paket or "20 Mbps Unlimited"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        # 3. Tiket aktif pelanggan
        active_tickets = db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan,
            TiketKendala.status.in_(["MENUNGGU", "DIPROSES"])
        ).count()

        return {
            "pelanggan": cust,
            "last_log": last_log,
            "kuota": kuota,
            "active_tickets_count": active_tickets,
            "now": now
        }
