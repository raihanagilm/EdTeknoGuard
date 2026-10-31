from typing import Optional
from datetime import timedelta
from sqlalchemy.orm import Session
from app.db.models import KuotaPelanggan, LogKuotaHarian, Pelanggan
from app.core.timezone import get_now_wib

class KuotaService:

    @staticmethod
    def get_kuota_details(db: Session, id_pelanggan: Optional[str]):
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")

        if not id_pelanggan:
            mock_kuota = KuotaPelanggan(
                id_pelanggan="-",
                periode_bulan=current_period,
                kuota_terpakai_gb=0.0,
                kecepatan_paket="Menunggu Verifikasi"
            )
            return {
                "pelanggan": None,
                "kuota": mock_kuota,
                "usage_history": [],
                "now": now
            }

        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        kuota = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.id_pelanggan == id_pelanggan,
            KuotaPelanggan.periode_bulan == current_period
        ).first()

        if not kuota:
            kuota = KuotaPelanggan(
                id_pelanggan=id_pelanggan,
                periode_bulan=current_period,
                kuota_terpakai_gb=0.0,
                kecepatan_paket=cust.paket if cust and cust.paket else "-"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)
        elif not kuota.kecepatan_paket and cust and cust.paket:
            kuota.kecepatan_paket = cust.paket
            try:
                db.commit()
            except Exception:
                db.rollback()

        # Ambil histori 7 hari terakhir dari tabel riil LogKuotaHarian
        start_date = (now - timedelta(days=6)).date()
        daily_records = (
            db.query(LogKuotaHarian)
            .filter(
                LogKuotaHarian.id_pelanggan == id_pelanggan,
                LogKuotaHarian.tanggal >= start_date
            )
            .all()
        )
        daily_map = {r.tanggal: float(r.pemakaian_gb or 0.0) for r in daily_records}

        total_now = float(kuota.kuota_terpakai_gb) if (kuota and kuota.kuota_terpakai_gb is not None) else 0.0
        usage_history = []

        # Susun riwayat 7 hari berturut-turut dari 6 hari lalu sampai hari ini
        for i in range(7):
            days_ago = 6 - i
            d = now - timedelta(days=days_ago)
            dt_date = d.date()
            day_name = d.strftime("%d %b")

            if dt_date in daily_map:
                daily_gb = round(daily_map[dt_date], 1)
            elif dt_date == now.date() and total_now > 0:
                # Jika hari ini belum tersinkron di tabel harian, gunakan selisih atau estimasi hari ini
                daily_gb = round(total_now * 0.15, 1)
            else:
                daily_gb = 0.0

            usage_history.append({"tanggal": day_name, "pemakaian_gb": daily_gb})

        return {
            "pelanggan": cust,
            "kuota": kuota,
            "usage_history": usage_history,
            "now": now
        }
