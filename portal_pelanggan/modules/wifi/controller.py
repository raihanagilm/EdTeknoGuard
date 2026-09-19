from fastapi import Request, Form
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.core.security import require_customer_login, get_portal_base_url as get_base_url
from app.db.models import Pelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class WifiController:

    @staticmethod
    def render_wifi_page(request: Request, db: Session, error: str = None, success: str = None):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        base = get_base_url(request)

        return templates.TemplateResponse(
            request=request,
            name="wifi/index.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "error": error,
                "success": success,
                "active_tab": "wifi",
                "base_url": base
            }
        )

    @staticmethod
    def handle_change_wifi(
        request: Request,
        db: Session,
        nama_wifi: str = Form(...),
        password_wifi: str = Form(...),
        konfirmasi_password: str = Form(...)
    ):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()

        nama_clean = nama_wifi.strip()
        pwd_clean = password_wifi.strip()
        konf_clean = konfirmasi_password.strip()

        if len(nama_clean) < 3:
            return WifiController.render_wifi_page(
                request, db, error="Nama WiFi (SSID) minimal harus 3 karakter!"
            )

        if len(pwd_clean) < 8:
            return WifiController.render_wifi_page(
                request, db, error="Kata sandi WiFi baru minimal harus 8 karakter agar aman dari pembobolan!"
            )

        if pwd_clean != konf_clean:
            return WifiController.render_wifi_page(
                request, db, error="Ulangi kata sandi tidak cocok dengan kata sandi WiFi baru!"
            )

        if not pelanggan:
            return WifiController.render_wifi_page(
                request, db, error="Data pelanggan tidak ditemukan."
            )

        # Update data WiFi di database
        pelanggan.nama_wifi = nama_clean
        pelanggan.password_wifi = pwd_clean
        db.commit()
        db.refresh(pelanggan)

        success_msg = (
            f"Nama WiFi berhasil diubah menjadi '{nama_clean}' dan kata sandi baru telah disimpan! "
            "Sambungan WiFi di HP Anda akan terputus sebentar. "
            "Silakan buka Pengaturan WiFi di HP Anda lalu sambungkan ke nama WiFi baru dengan password baru Anda."
        )

        return WifiController.render_wifi_page(
            request, db, success=success_msg
        )
