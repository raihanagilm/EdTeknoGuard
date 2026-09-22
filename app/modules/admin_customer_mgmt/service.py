from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan, TiketKendala, KuotaPelanggan, LogPerformaONT
from app.core.timezone import get_now_wib

class AdminCustomerMgmtService:

    @staticmethod
    def get_pending_registrations(db: Session, kantor: Optional[str] = None) -> List[Pelanggan]:
        """Mengambil data pelanggan berstatus PENDING jika ada (alur registrasi mandiri telah dinonaktifkan)."""
        query = db.query(Pelanggan).filter(Pelanggan.status_verifikasi == "PENDING")
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        return query.order_by(Pelanggan.created_at.desc()).all()

    @staticmethod
    def get_unlinked_customers_options(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        """Mengambil daftar pelanggan kantor."""
        query = db.query(Pelanggan)
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        
        pelanggan_list = query.order_by(Pelanggan.nama.asc()).all()
        return [
            {
                "id_pelanggan": p.id_pelanggan,
                "nama": p.nama,
                "alamat": p.alamat or "-",
                "ip_router": p.ip_router or "-",
                "pop": p.pop or "-",
                "kantor": p.kantor or "cabang"
            }
            for p in pelanggan_list
        ]

    @staticmethod
    def approve_registration(
        db: Session,
        account_id: Any,
        id_pelanggan: str,
        admin_user: Optional[str] = None
    ) -> Dict[str, Any]:
        target_id = id_pelanggan or str(account_id)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == target_id).first()
        if not pelanggan:
            return {"status": "error", "message": "Data pelanggan kantor tidak ditemukan."}

        pelanggan.status_verifikasi = "TERVERIFIKASI"
        pelanggan.updated_at = get_now_wib()
        db.commit()
        db.refresh(pelanggan)

        return {
            "status": "success",
            "message": f"Akun pelanggan '{pelanggan.nama}' ({pelanggan.id_pelanggan}) berhasil diverifikasi."
        }

    @staticmethod
    def reject_registration(db: Session, account_id: Any, alasan: str = "") -> Dict[str, Any]:
        target_id = str(account_id)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == target_id).first()
        if not pelanggan:
            return {"status": "error", "message": "Pelanggan tidak ditemukan."}

        pelanggan.status_verifikasi = "DITOLAK"
        pelanggan.updated_at = get_now_wib()
        db.commit()

        return {
            "status": "success",
            "message": f"Status akun pelanggan '{pelanggan.nama}' telah ditolak."
        }

    @staticmethod
    def get_tickets(
        db: Session,
        status_filter: Optional[str] = None,
        kantor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(TiketKendala)
        if status_filter and status_filter != "SEMUA":
            query = query.filter(TiketKendala.status == status_filter)
        if kantor and kantor != "all":
            query = query.filter(TiketKendala.kantor == kantor)

        tickets = query.order_by(TiketKendala.created_at.desc()).all()

        # Ambil relasi pelanggan
        result = []
        for t in tickets:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == t.id_pelanggan).first()
            result.append({
                "tiket": t,
                "pelanggan": cust
            })
        return result

    @staticmethod
    def update_ticket_status(
        db: Session,
        ticket_id: str,
        new_status: str,
        catatan: Optional[str] = None
    ) -> Dict[str, Any]:
        t = db.query(TiketKendala).filter(TiketKendala.id_tiket == ticket_id).first()
        if not t:
            return {"status": "error", "message": "Tiket tidak ditemukan."}

        t.status = new_status
        if catatan is not None:
            t.catatan_teknisi = catatan
        t.updated_at = get_now_wib()
        db.commit()

        return {
            "status": "success",
            "message": f"Status tiket {ticket_id} berhasil diubah menjadi {new_status}."
        }

    @staticmethod
    def get_quota_overview(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        
        query = db.query(Pelanggan)
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        
        pelanggan_list = query.order_by(Pelanggan.nama.asc()).all()
        result = []
        for p in pelanggan_list:
            kuota = db.query(KuotaPelanggan).filter(
                KuotaPelanggan.id_pelanggan == p.id_pelanggan,
                KuotaPelanggan.periode_bulan == current_period
            ).first()
            
            result.append({
                "pelanggan": p,
                "periode": current_period,
                "terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
                "paket": p.paket or (kuota.kecepatan_paket if kuota else "20 Mbps Unlimited")
            })
        return result

    @staticmethod
    def get_realtime_notifications(db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Mengambil data notifikasi realtime (tiket baru & status redaman) untuk polling admin/teknisi."""
        query = db.query(TiketKendala).filter(TiketKendala.status == "MENUNGGU")
        if kantor and kantor != "all":
            query = query.filter(TiketKendala.kantor == kantor)

        unread_count = query.count()
        latest_ticket = query.order_by(TiketKendala.created_at.desc()).first()

        latest_data = None
        if latest_ticket:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == latest_ticket.id_pelanggan).first()
            cust_name = cust.nama if cust else latest_ticket.id_pelanggan
            latest_data = {
                "id": latest_ticket.id,
                "id_tiket": latest_ticket.id_tiket,
                "id_pelanggan": latest_ticket.id_pelanggan,
                "nama_pelanggan": cust_name,
                "kategori": latest_ticket.kategori,
                "deskripsi_kendala": latest_ticket.deskripsi or "Laporan keluhan baru dari pelanggan.",
                "kantor": latest_ticket.kantor,
                "created_at": latest_ticket.created_at.strftime("%H:%M:%S") if latest_ticket.created_at else ""
            }

        return {
            "status": "success",
            "unread_tickets_count": unread_count,
            "latest_ticket": latest_data
        }
