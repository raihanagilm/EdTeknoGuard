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

        date_str = now.strftime("%Y%m%d")
        random_num = random.randint(1000, 9999)
        ticket_id = f"tkt{date_str}{random_num}"
        kantor = (cust.kantor if cust else "") or ""

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

        # Trigger Push Notifikasi FCM ke seluruh Teknisi & Admin NOC kantor terkait
        try:
            from app.services.fcm_service import send_push_notification
            from app.core.database import SessionLocal as MasterSessionLocal
            from app.db.models import User as MasterUser
            m_db = MasterSessionLocal()
            try:
                users_to_alert = m_db.query(MasterUser).filter(
                    MasterUser.is_active == True,
                    MasterUser.fcm_token != None,
                    MasterUser.fcm_token != ""
                ).all()
                target_tokens = []
                for u in users_to_alert:
                    if u.role == "super admin" or (kantor and kantor.lower() in [k.lower() for k in u.allowed_kantor_list]):
                        target_tokens.append(u.fcm_token)

                if target_tokens:
                    cust_name = cust.nama if cust else "Pelanggan"
                    title = f"[TIKET BARU] Kantor: {kantor.upper()}"
                    body = f"[{ticket_id}] {cust_name}: {kategori}"
                    send_push_notification(
                        tokens=target_tokens,
                        title=title,
                        body=body,
                        data={
                            "target_tab": "tiket",
                            "target_kantor": kantor,
                            "target_filter": ticket_id,
                            "level": "critical",
                            "type": "ticket_new"
                        },
                        channel_id="tekno_emergency_v3_channel",
                        sound="tekno_alarm"
                    )

                # Push notifikasi konfirmasi tepat 1 kali ke HP Pelanggan (MyTekno)
                if cust and cust.fcm_token and cust.fcm_token.strip():
                    try:
                        send_push_notification(
                            tokens=[cust.fcm_token.strip()],
                            title="Laporan Kendala Diterima",
                            body="Laporan kendala internet Anda telah kami terima dan segera diverifikasi oleh tim teknisi.",
                            data={
                                "target_tab": "tiket",
                                "target_filter": ticket_id,
                                "level": "info",
                                "type": "ticket_created_confirmation"
                            },
                            channel_id="tekno_customer_channel",
                            sound="default"
                        )
                    except Exception as cust_fcm_err:
                        logging.getLogger("ticket_service").warning(f"[FCM_CUST_TICKET] Gagal push konfirmasi tiket ke warga: {cust_fcm_err}")
            finally:
                m_db.close()
        except Exception as fcm_err:
            import logging
            logging.getLogger("ticket_service").warning(f"[FCM_TICKET] Gagal push notifikasi tiket baru: {fcm_err}")

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
