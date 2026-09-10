from fastapi import APIRouter, Request, Form
from app.modules.auth.controller import AuthController

router = APIRouter(tags=["auth"])

@router.get("/login")
def login_page(request: Request):
    """Menampilkan form login admin"""
    return AuthController.render_login_page(request=request)

@router.post("/login")
def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    """Memproses submit kredensial login admin"""
    return AuthController.handle_login(request=request, username=username, password=password)

@router.get("/logout")
def logout():
    """Menghapus sesi admin dan redirect ke halaman login"""
    return AuthController.handle_logout()
