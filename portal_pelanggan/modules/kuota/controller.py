from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.modules.kuota.service import KuotaService
from portal_pelanggan.core.security import require_customer_login, get_portal_base_url as get_base_url

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class KuotaController:

    @staticmethod
    def render_kuota_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        data = KuotaService.get_kuota_details(db, cust_session["id_pelanggan"])
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kuota/index.html",
            context={
                "current_cust": cust_session,
                "data": data,
                "active_tab": "kuota",
                "base_url": base
            }
        )
