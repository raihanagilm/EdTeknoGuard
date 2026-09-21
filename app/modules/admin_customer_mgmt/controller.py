from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
from app.core.security import require_login, get_active_kantor
from app.modules.activity_logs.service import ActivityLogService

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
        ticket_items = AdminCustomerMgmtService.get_tickets(db, status_filter=status_filter, kantor=kantor)

        return templates.TemplateResponse(
            request=request,
            name="admin_customers/tiket.html",
            context={
                "ticket_items": ticket_items,
                "status_filter": status_filter,
                "active_kantor": kantor,
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

        return templates.TemplateResponse(
            request=request,
            name="admin_customers/kuota.html",
            context={
                "quota_items": quota_items,
                "active_kantor": kantor,
                "current_user": user
            }
        )
