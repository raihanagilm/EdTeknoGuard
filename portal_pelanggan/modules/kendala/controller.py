from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.modules.kendala.service import KendalaService
from portal_pelanggan.core.security import require_customer_login, get_portal_base_url as get_base_url
from app.db.models import Pelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class KendalaController:

    @staticmethod
    def render_tickets_page(request: Request, db: Session):
        cust = require_customer_login(request)
        tickets = KendalaService.get_customer_tickets(db, cust["id_pelanggan"])
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kendala/index.html",
            context={
                "current_cust": cust,
                "tickets": tickets,
                "active_tab": "kendala",
                "sukses": request.query_params.get("sukses"),
                "base_url": base
            }
        )

    @staticmethod
    def render_create_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kendala/create.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "active_tab": "kendala",
                "base_url": base
            }
        )

    @staticmethod
    def submit_ticket(
        request: Request,
        db: Session,
        kategori: str = Form(...),
        deskripsi: str = Form(...),
        no_wa: str = Form(...)
    ):
        base = get_base_url(request)
        cust_session = require_customer_login(request)
        KendalaService.create_ticket(
            db=db,
            id_pelanggan=cust_session["id_pelanggan"],
            kategori=kategori,
            deskripsi=deskripsi,
            no_wa=no_wa
        )
        return RedirectResponse(f"{base}/kendala?sukses=1", status_code=303)
