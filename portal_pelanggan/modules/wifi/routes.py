from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.wifi.controller import WifiController

router = APIRouter(prefix="/wifi", tags=["Kelola WiFi Pelanggan"])

@router.get("")
def wifi_page(request: Request, db: Session = Depends(get_db)):
    return WifiController.render_wifi_page(request, db)

@router.post("/ganti")
def change_wifi_submit(
    request: Request,
    nama_wifi: str = Form(...),
    password_wifi: str = Form(...),
    konfirmasi_password: str = Form(...),
    db: Session = Depends(get_db)
):
    return WifiController.handle_change_wifi(
        request, db, nama_wifi, password_wifi, konfirmasi_password
    )
