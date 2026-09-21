from fastapi import Request, Form
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.core.security import (
    require_customer_login,
    verify_password,
    get_password_hash,
    get_portal_base_url as get_base_url
)
from app.db.models import Pelanggan, AkunPelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class ProfilController:

    @staticmethod
    def render_profil_page(request: Request, db: Session, error: str = None, success: str = None):
        cust_session = require_customer_login(request)
        id_pel = cust_session.get("id_pelanggan")
        acc_id = cust_session.get("account_id")
        
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first() if id_pel else None
        
        if acc_id:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.id == acc_id).first()
        elif id_pel:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == id_pel).first()
        else:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.username == cust_session["nama"]).first()

        base = get_base_url(request)

        return templates.TemplateResponse(
            request=request,
            name="profil/index.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "akun": akun,
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
        acc_id = cust_session.get("account_id")
        
        if acc_id:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.id == acc_id).first()
        elif id_pel:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == id_pel).first()
        else:
            akun = db.query(AkunPelanggan).filter(AkunPelanggan.username == cust_session["nama"]).first()

        if not akun or not verify_password(password_lama, akun.password_hash):
            return ProfilController.render_profil_page(
                request, db, error="Password lama yang Anda masukkan salah!"
            )

        if len(password_baru) < 6:
            return ProfilController.render_profil_page(
                request, db, error="Password baru minimal harus 6 karakter!"
            )

        if password_baru != konfirmasi_password:
            return ProfilController.render_profil_page(
                request, db, error="Konfirmasi password baru tidak cocok!"
            )

        akun.password_hash = get_password_hash(password_baru)
        db.commit()

        return ProfilController.render_profil_page(
            request, db, success="Password akun portal Anda berhasil diperbarui!"
        )
