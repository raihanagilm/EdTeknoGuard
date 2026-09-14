from fastapi import APIRouter, Request, Form, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
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
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Memproses submit kredensial login admin"""
    return AuthController.handle_login(request=request, username=username, password=password, db=db)

@router.get("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db)
):
    """Menghapus sesi admin dan redirect ke halaman login"""
    return AuthController.handle_logout(request=request, db=db)
