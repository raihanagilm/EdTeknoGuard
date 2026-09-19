from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.auth.controller import AuthController

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
    return AuthController.render_register_page(request)

@router.post("/daftar")
def register_submit(
    request: Request,
    nama: str = Form(...),
    alamat: str = Form(""),
    no_hp: str = Form(""),
    ip_router: str = Form(""),
    lokasi_gps: str = Form(""),
    password: str = Form("123456"),
    db: Session = Depends(get_db)
):
    return AuthController.handle_register(
        request, db, nama, alamat, no_hp, ip_router, lokasi_gps, password
    )

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
