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
        catatan: Optional[str] = None
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

        t.status = new_status
        if catatan is not None:
            t.catatan_teknisi = catatan
        t.updated_at = get_now_wib()
        target_db.commit()

        if target_db != db:
            target_db.close()

        return {
            "status": "success",
            "message": f"Status tiket {ticket_id} berhasil diubah menjadi {new_status}."
        }

