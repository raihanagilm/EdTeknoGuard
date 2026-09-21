import random
from typing import List
from sqlalchemy.orm import Session
from app.db.models import TiketKendala, Pelanggan, LogPerformaONT
from app.core.timezone import get_now_wib

class KendalaService:

    @staticmethod
    def get_customer_tickets(db: Session, id_pelanggan: str) -> List[TiketKendala]:
        return db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan
        ).order_by(TiketKendala.created_at.desc()).all()

    @staticmethod
    def create_ticket(
        db: Session,
        id_pelanggan: str,
        kategori: str,
        deskripsi: str,
        no_wa: str
    ) -> TiketKendala:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        now = get_now_wib()

        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        redaman = last_log.rx_power if last_log else None
        status_koneksi = last_log.status_koneksi if last_log else "UNKNOWN"

        date_str = now.strftime("%Y%m")
        random_num = random.randint(1000, 9999)
        ticket_id = f"TK-{date_str}-{random_num}"
        kantor = cust.kantor if cust else "cabang"

        new_ticket = TiketKendala(
            id_tiket=ticket_id,
            id_pelanggan=id_pelanggan,
            kantor=kantor,
            kategori=kategori,
            deskripsi=deskripsi,
            no_wa_pelapor=no_wa,
            redaman_saat_lapor=redaman,
            status_ont_saat_lapor=status_koneksi,
            status="MENUNGGU"
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)

        return new_ticket

    @staticmethod
    def resolve_customer_ticket(db: Session, id_tiket: str, id_pelanggan: str) -> bool:
        t = db.query(TiketKendala).filter(
            TiketKendala.id_tiket == id_tiket,
            TiketKendala.id_pelanggan == id_pelanggan
        ).first()
        if not t:
            return False
        t.status = "SELESAI"
        t.updated_at = get_now_wib()
        db.commit()
        return True

    @staticmethod
    def delete_customer_ticket(db: Session, id_tiket: str, id_pelanggan: str) -> bool:
        t = db.query(TiketKendala).filter(
            TiketKendala.id_tiket == id_tiket,
            TiketKendala.id_pelanggan == id_pelanggan
        ).first()
        if not t:
            return False
        db.delete(t)
        db.commit()
        return True
