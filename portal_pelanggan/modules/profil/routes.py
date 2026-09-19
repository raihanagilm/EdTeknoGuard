from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.profil.controller import ProfilController

router = APIRouter(prefix="/profil", tags=["Profil Pelanggan"])

@router.get("")
def profil_page(request: Request, db: Session = Depends(get_db)):
    return ProfilController.render_profil_page(request, db)

@router.post("/ganti-password")
def change_password(
    request: Request,
    password_lama: str = Form(...),
    password_baru: str = Form(...),
    konfirmasi_password: str = Form(...),
    db: Session = Depends(get_db)
):
    return ProfilController.handle_change_password(
        request, db, password_lama, password_baru, konfirmasi_password
    )
