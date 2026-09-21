from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import AkunPelanggan, Pelanggan, TiketKendala, KuotaPelanggan, LogPerformaONT
from app.core.timezone import get_now_wib

class AdminCustomerMgmtService:

    @staticmethod
    def get_pending_registrations(db: Session, kantor: Optional[str] = None) -> List[AkunPelanggan]:
        query = db.query(AkunPelanggan).filter(AkunPelanggan.status_verifikasi == "PENDING")
        if kantor and kantor != "all":
            # Jika ada filter kantor
            query = query.filter(AkunPelanggan.kantor == kantor)
        return query.order_by(AkunPelanggan.created_at.desc()).all()

    @staticmethod
    def get_unlinked_customers_options(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        """Mengambil daftar pelanggan kantor yang belum terhubung ke akun portal aktif untuk opsi pencocokan."""
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
        account_id: int,
        id_pelanggan: str,
        admin_user: Optional[str] = None
    ) -> Dict[str, Any]:
        akun = db.query(AkunPelanggan).filter(AkunPelanggan.id == account_id).first()
        if not akun:
            return {"status": "error", "message": "Akun pendaftar tidak ditemukan."}

        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not pelanggan:
            return {"status": "error", "message": "Data pelanggan kantor tidak ditemukan."}

        # Cek apakah id_pelanggan ini sudah terhubung ke akun lain yang terverifikasi
        existing_linked = db.query(AkunPelanggan).filter(
            AkunPelanggan.id_pelanggan == id_pelanggan,
            AkunPelanggan.id != account_id,
            AkunPelanggan.status_verifikasi == "TERVERIFIKASI"
        ).first()
        if existing_linked:
            return {
                "status": "error",
                "message": f"Data pelanggan '{pelanggan.nama}' sudah terhubung ke akun portal '{existing_linked.username}'."
            }

        # Hubungkan akun pendaftar ke data pelanggan
        akun.id_pelanggan = pelanggan.id_pelanggan
        akun.status_verifikasi = "TERVERIFIKASI"
        akun.kantor = pelanggan.kantor
        akun.updated_at = get_now_wib()

        # Update data pelanggan jika pendaftar melampirkan no HP baru
        if akun.no_hp:
            pelanggan.no_hp = akun.no_hp

        # Update alamat pelanggan dari data pendaftar jika pendaftar mengisi alamat
        if akun.alamat_pendaftar:
            pelanggan.alamat = akun.alamat_pendaftar

        db.commit()
        db.refresh(akun)

        return {
            "status": "success",
            "message": f"Akun '{akun.username}' berhasil diverifikasi dan terhubung ke pelanggan '{pelanggan.nama}' ({pelanggan.id_pelanggan})."
        }

    @staticmethod
    def reject_registration(db: Session, account_id: int, alasan: str = "") -> Dict[str, Any]:
        akun = db.query(AkunPelanggan).filter(AkunPelanggan.id == account_id).first()
        if not akun:
            return {"status": "error", "message": "Akun tidak ditemukan."}

        akun.status_verifikasi = "DITOLAK"
        akun.is_active = False
        akun.updated_at = get_now_wib()
        db.commit()

        return {
            "status": "success",
            "message": f"Pendaftaran akun '{akun.username}' telah ditolak."
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
