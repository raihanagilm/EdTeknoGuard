from datetime import timedelta
from sqlalchemy.orm import Session
from app.db.models import KuotaPelanggan, Pelanggan
from app.core.timezone import get_now_wib

class KuotaService:

    @staticmethod
    def get_kuota_details(db: Session, id_pelanggan: str):
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
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
                kuota_terpakai_gb=84.2,
                kecepatan_paket=cust.paket if cust and cust.paket else "20 Mbps Unlimited"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        usage_history = []
        total_now = float(kuota.kuota_terpakai_gb)
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            day_name = d.strftime("%d %b")
            daily_gb = round(max(1.8, (total_now / 30) * (0.85 + (i % 3) * 0.2)), 1)
            usage_history.append({"tanggal": day_name, "pemakaian_gb": daily_gb})

        return {
            "pelanggan": cust,
            "kuota": kuota,
            "usage_history": usage_history,
            "now": now
        }
