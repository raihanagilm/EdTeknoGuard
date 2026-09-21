from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.auth.controller import AuthController
from portal_pelanggan.core.security import get_portal_base_url as get_base_url

router = APIRouter(tags=["Autentikasi Pelanggan"])

@router.get("/login")
def login_page(request: Request):
    return AuthController.render_login_page(request)

@router.post("/login")
def login_submit(
    request: Request,
    identifier: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    return AuthController.handle_login(request, db, identifier, password)

@router.get("/daftar")
def register_page(request: Request):
    # Akses akun diberikan langsung oleh kantor, alihkan ke login
    base = get_base_url(request)
    return RedirectResponse(f"{base}/login", status_code=303)

@router.get("/lupa-password")
def lupa_password_page(request: Request):
    return AuthController.render_lupa_password_page(request)

@router.post("/lupa-password")
def lupa_password_submit(
    request: Request,
    ip_router: str = Form(""),
    nama: str = Form(""),
    no_hp: str = Form(""),
    password_baru: str = Form("123456"),
    db: Session = Depends(get_db)
):
    return AuthController.handle_lupa_password(
        request, db, ip_router=ip_router, nama=nama, no_hp=no_hp, password_baru=password_baru
    )

@router.get("/logout")
def logout(request: Request):
    return AuthController.handle_logout(request)
