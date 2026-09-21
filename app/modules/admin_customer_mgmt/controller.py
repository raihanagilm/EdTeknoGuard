from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
from app.core.security import require_login, get_active_kantor
from app.modules.activity_logs.service import ActivityLogService

from app.core.timezone import get_now_wib

templates = Jinja2Templates(directory="templates")

class AdminCustomerMgmtController:

    @staticmethod
    def render_verification_page(request: Request, db: Session):
        user = require_login(request)
        kantor = get_active_kantor(request, user)
        pending_list = AdminCustomerMgmtService.get_pending_registrations(db, kantor=kantor)
        customer_options = AdminCustomerMgmtService.get_unlinked_customers_options(db, kantor=kantor)

        return templates.TemplateResponse(
            request=request,
            name="admin_customers/verifikasi.html",
            context={
                "pending_list": pending_list,
                "customer_options": customer_options,
                "total_pending": len(pending_list),
                "active_kantor": kantor,
                "current_user": user
            }
        )

    @staticmethod
    def approve_registration(request: Request, db: Session, account_id: int, id_pelanggan: str):
        user = require_login(request)
        res = AdminCustomerMgmtService.approve_registration(
            db=db,
            account_id=account_id,
            id_pelanggan=id_pelanggan,
            admin_user=user.get("user")
        )
        if res.get("status") == "success":
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="APPROVE_CUSTOMER",
                status="SUCCESS",
                keterangan=res.get("message", "Verifikasi pendaftar baru disetujui"),
                user=user
            )
        return res

    @staticmethod
    def reject_registration(request: Request, db: Session, account_id: int, alasan: str = ""):
        user = require_login(request)
        res = AdminCustomerMgmtService.reject_registration(db=db, account_id=account_id, alasan=alasan)
        if res.get("status") == "success":
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="REJECT_CUSTOMER",
                status="SUCCESS",
                keterangan=f"Pendaftaran akun ID #{account_id} ditolak: {alasan}",
                user=user
            )
        return res

    @staticmethod
    def render_tickets_page(request: Request, db: Session, status_filter: str = "SEMUA"):
        user = require_login(request)
        kantor = get_active_kantor(request, user)
        # Ambil semua tiket untuk kantor aktif agar Alpine.js memfilter client-side instan
        ticket_items = AdminCustomerMgmtService.get_tickets(db, status_filter="SEMUA", kantor=kantor)

        serialized_tickets = []
        for item in ticket_items:
            t = item["tiket"]
            p = item["pelanggan"]
            serialized_tickets.append({
                "id_tiket": t.id_tiket,
                "created_at_str": t.created_at.strftime('%d/%m/%Y %H:%M') if t.created_at else '-',
                "created_at_iso": t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else '',
                "created_at_date": t.created_at.strftime('%Y-%m-%d') if t.created_at else '',
                "id_pelanggan": t.id_pelanggan or '',
                "nama_pelanggan": p.nama if p else (t.id_pelanggan or 'Tidak Terdaftar'),
                "alamat_pelanggan": p.alamat if (p and p.alamat) else '-',
                "no_wa": t.no_wa_pelapor or (p.no_hp if p else '') or '',
                "kategori": t.kategori or 'Lainnya',
                "deskripsi": t.deskripsi or '',
                "redaman_saat_lapor": float(t.redaman_saat_lapor) if t.redaman_saat_lapor is not None else None,
                "status_ont_saat_lapor": t.status_ont_saat_lapor or 'STATUS',
                "status": t.status or 'MENUNGGU',
                "catatan_teknisi": t.catatan_teknisi or '',
                "kantor": t.kantor or 'cabang'
            })

        now_wib = get_now_wib()
        today_date = now_wib.strftime("%Y-%m-%d")

        return templates.TemplateResponse(
            request=request,
            name="admin_customers/tiket.html",
            context={
                "ticket_items": ticket_items,
                "serialized_tickets": serialized_tickets,
                "status_filter": status_filter,
                "active_kantor": kantor,
                "today_date": today_date,
                "current_user": user
            }
        )

    @staticmethod
    def update_ticket_status(request: Request, db: Session, ticket_id: str, new_status: str, catatan: str = ""):
        user = require_login(request)
        res = AdminCustomerMgmtService.update_ticket_status(
            db=db,
            ticket_id=ticket_id,
            new_status=new_status,
            catatan=catatan
        )
        if res.get("status") == "success":
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="UPDATE_TICKET",
                status="SUCCESS",
                keterangan=f"Status tiket {ticket_id} diubah ke {new_status}",
                user=user
            )
        return res

    @staticmethod
    def render_quota_page(request: Request, db: Session):
        user = require_login(request)
        kantor = get_active_kantor(request, user)
        quota_items = AdminCustomerMgmtService.get_quota_overview(db, kantor=kantor)

        serialized_quota = []
        paket_list = []
        for item in quota_items:
            p = item["pelanggan"]
            paket_name = item["paket"] or "20 Mbps Unlimited"
            if paket_name not in paket_list:
                paket_list.append(paket_name)
            serialized_quota.append({
                "id_pelanggan": p.id_pelanggan,
                "nama": p.nama,
                "alamat": p.alamat or '-',
                "paket": paket_name,
                "terpakai_gb": float(item["terpakai_gb"]) if item["terpakai_gb"] is not None else 0.0,
                "periode": item["periode"],
                "kantor": p.kantor or "cabang",
                "ip_router": p.ip_router or "-"
            })

        return templates.TemplateResponse(
            request=request,
            name="admin_customers/kuota.html",
            context={
                "quota_items": quota_items,
                "serialized_quota": serialized_quota,
                "paket_options": sorted(paket_list),
                "active_kantor": kantor,
                "current_user": user
            }
        )

