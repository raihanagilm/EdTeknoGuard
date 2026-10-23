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
            kuota = KuotaPelanggan(
                id_pelanggan=id_pelanggan,
                periode_bulan=current_period,
                kuota_terpakai_gb=0.0,
                kecepatan_paket=cust.paket or "-"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        total_now = float(kuota.kuota_terpakai_gb) if (kuota and kuota.kuota_terpakai_gb is not None) else 0.0
        # Kuota hari ini dihitung proporsional dari pemakaian riil bulan ini, atau 0.0 jika belum ada pemakaian
        kuota_hari_ini = round((total_now / max(now.day, 1)), 1) if total_now > 0 else 0.0

        # 3. Tiket aktif pelanggan & tiket terakhir
        active_tickets = db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan,
            TiketKendala.status.in_(["MENUNGGU", "DICEK_ADMIN", "DIPROSES"])
        ).count()

        latest_ticket = db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan
        ).order_by(TiketKendala.created_at.desc()).first()

        return {
            "pelanggan": cust,
            "last_log": last_log,
            "kuota": kuota,
            "kuota_hari_ini_gb": kuota_hari_ini,
            "active_tickets_count": active_tickets,
            "latest_ticket": {
                "id_tiket": latest_ticket.id_tiket,
                "status": latest_ticket.status,
                "kategori": latest_ticket.kategori
            } if latest_ticket else None,
            "now": now
        }

