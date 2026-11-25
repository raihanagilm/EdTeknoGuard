"""
app/modules/tickets/service.py - Ticket Service for NOC Admin
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import TiketKendala, Pelanggan
from app.core.timezone import get_now_wib


class TicketService:

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
        catatan: Optional[str] = None,
        user: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        target_db = db
        t = db.query(TiketKendala).filter(TiketKendala.id_tiket == ticket_id).first()

        # Fallback multi-tenant jika tiket berada di database tenant kantor lain
        if not t:
            try:
                from app.core.tenant_database import TenantDatabaseManager
                from app.core.security import get_all_kantor_codes
                for k_code in get_all_kantor_codes():
                    try:
                        s = TenantDatabaseManager.get_tenant_session(k_code)
                        found = s.query(TiketKendala).filter(TiketKendala.id_tiket == ticket_id).first()
                        if found:
                            t = found
                            target_db = s
                            break
                        else:
                            s.close()
                    except Exception:
                        pass
            except Exception:
                pass

        if not t:
            return {"status": "error", "message": "Tiket tidak ditemukan."}

        # Keamanan: Hanya Admin / Super Admin yang boleh memproses tiket RESET_PASSWORD
        if t.kategori == "RESET_PASSWORD" and user and user.get("role") not in ("admin", "super admin"):
            if target_db != db:
                target_db.close()
            return {"status": "error", "message": "Akses ditolak: Hanya Admin atau Super Admin yang dapat memproses tiket reset kata sandi."}

        # Aktifkan password baru hanya saat Admin menyetujui/menyelesaikan tiket RESET_PASSWORD
        if t.kategori == "RESET_PASSWORD" and new_status == "SELESAI" and t.status != "SELESAI":
            import re
            match_pw = re.search(r'(?:Kata Sandi Baru.*?|password.*?):?\s*(\d{6})', t.deskripsi or '', re.IGNORECASE)
            if match_pw:
                new_pw = match_pw.group(1)
                cust_reset = target_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == t.id_pelanggan).first()
                if cust_reset:
                    from app.core.security import get_password_hash
                    from app.core.account_lockout import account_lockout_manager
                    cust_reset.password_hash = get_password_hash(new_pw)
                    cust_reset.password_portal = new_pw
                    if cust_reset.no_hp:
                        account_lockout_manager.unlock(cust_reset.no_hp.strip())

        t.status = new_status
        if catatan is not None:
            t.catatan_teknisi = catatan
        t.updated_at = get_now_wib()
        target_db.commit()

        # Kirim push notifikasi ke HP Pelanggan (MyTekno) saat status tiket diperbarui teknisi
        try:
            cust = target_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == t.id_pelanggan).first()
            if cust and cust.fcm_token:
                from app.services.fcm_service import send_push_notification
                status_label = {
                    "DICEK_ADMIN": "Laporan Anda sedang diverifikasi admin NOC",
                    "DIPROSES": "Teknisi sedang memproses perbaikan tiket Anda",
                    "SELESAI": "Kendala internet Anda telah selesai ditangani",
                    "DIBATALKAN": "Laporan kendala telah dibatalkan"
                }.get(new_status, f"Status laporan: {new_status}")

                send_push_notification(
                    tokens=[cust.fcm_token],
                    title=f"Status Tiket #{t.id_tiket}",
                    body=f"{status_label}. {catatan or ''}".strip(),
                    channel_id="tekno_customer_channel",
                    sound="default",
                    data={
                        "target_tab": "tiket",
                        "target_filter": t.id_tiket,
                        "type": "ticket_update"
                    }
                )
        except Exception as fcm_err:
            import logging
            logging.getLogger("ticket_service").warning(f"[FCM_CUST] Gagal kirim notifikasi update tiket ke warga: {fcm_err}")

        if target_db != db:
            target_db.close()

        return {
            "status": "success",
            "message": f"Status tiket {ticket_id} berhasil diubah menjadi {new_status}."
        }

