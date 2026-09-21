from fastapi import Request, Form
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.core.security import (
    require_customer_login,
    verify_password,
    get_password_hash,
    get_portal_base_url as get_base_url
)
from app.db.models import Pelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class ProfilController:

    @staticmethod
    def render_profil_page(request: Request, db: Session, error: str = None, success: str = None):
        cust_session = require_customer_login(request)
        id_pel = cust_session.get("id_pelanggan")
        
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first() if id_pel else None
        base = get_base_url(request)

        return templates.TemplateResponse(
            request=request,
            name="profil/index.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "error": error,
                "success": success,
                "active_tab": "profil",
                "base_url": base
            }
        )

    @staticmethod
    def handle_change_password(
        request: Request,
        db: Session,
        password_lama: str = Form(...),
        password_baru: str = Form(...),
        konfirmasi_password: str = Form(...)
    ):
        cust_session = require_customer_login(request)
        id_pel = cust_session.get("id_pelanggan")
        
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first() if id_pel else None

        if not pelanggan:
            return ProfilController.render_profil_page(
                request, db, error="Data pelanggan tidak ditemukan!"
            )

        if not pelanggan.password_hash or not verify_password(password_lama, pelanggan.password_hash):
            return ProfilController.render_profil_page(
                request, db, error="Kata sandi lama yang Anda masukkan salah!"
            )

        if len(password_baru) < 6:
            return ProfilController.render_profil_page(
                request, db, error="Kata sandi baru minimal harus 6 karakter!"
            )

        if password_baru != konfirmasi_password:
            return ProfilController.render_profil_page(
                request, db, error="Konfirmasi kata sandi baru tidak cocok!"
            )

        pelanggan.password_hash = get_password_hash(password_baru)
        db.commit()

        return ProfilController.render_profil_page(
            request, db, success="Kata sandi akun portal Anda berhasil diperbarui!"
        )
