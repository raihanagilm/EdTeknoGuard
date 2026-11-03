"""
app/modules/quota/service.py - Quota Monitoring Service for NOC Admin
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, KuotaPelanggan
from app.core.timezone import get_now_wib


class QuotaService:

    @staticmethod
    def get_quota_overview(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        
        query = db.query(Pelanggan)
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        
        pelanggan_list = query.order_by(Pelanggan.nama.asc()).all()
        if not pelanggan_list:
            return []

        # Bulk query data kuota untuk periode berjalan (1 query efisien menggantikan N+1)
        kuota_rows = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.periode_bulan == current_period
        ).all()
        kuota_map = {k.id_pelanggan: k for k in kuota_rows}

        result = []
        for p in pelanggan_list:
            kuota = kuota_map.get(p.id_pelanggan)
            
            result.append({
                "pelanggan": p,
                "periode": current_period,
                "terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota and kuota.kuota_terpakai_gb is not None else 0.0,
                "paket": p.paket or (kuota.kecepatan_paket if kuota and kuota.kecepatan_paket else "-")
            })
        return result
