import os
import sys

BASE_DIR = r"C:\Users\r\Documents\Magang\EdTeknoGuard_Pelanggan"

def write_file(rel_path, content):
    full_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Created: {rel_path}")

# ==========================================
# AUTH MODULE
# ==========================================

AUTH_SERVICE_PY = """
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan, AkunPelanggan
from app.core.security import get_password_hash, verify_password, create_customer_session_token
from app.core.timezone import get_now_wib

class AuthService:

    @staticmethod
    def register_or_activate(
        db: Session,
        nama: str,
        alamat: str,
        no_hp: str,
        password: str,
        ip_router: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        nama_clean = nama.strip()
        alamat_clean = alamat.strip()
        ip_clean = ip_router.strip() if ip_router else None

        if len(password) < 6:
            return False, "Password minimal harus 6 karakter", None

        # 1. Cari data pelanggan yang sudah terdaftar di database
        matched_cust = None

        # Prioritas 1: Jika IP router diisi, cari kecocokan IP unik
        if ip_clean:
            cust_by_ip = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if cust_by_ip:
                # Verifikasi nama atau alamat mirip
                if (nama_clean.lower() in cust_by_ip.nama.lower()) or (cust_by_ip.nama.lower() in nama_clean.lower()):
                    matched_cust = cust_by_ip
                elif cust_by_ip.alamat and (alamat_clean.lower() in cust_by_ip.alamat.lower() or cust_by_ip.alamat.lower() in alamat_clean.lower()):
                    matched_cust = cust_by_ip

        # Prioritas 2: Cari berdasarkan Nama & Alamat
        if not matched_cust:
            candidates = db.query(Pelanggan).filter(
                func.lower(Pelanggan.nama).like(f"%{nama_clean.lower()}%")
            ).all()

            for c in candidates:
                # Cek alamat jika ada di database
                if c.alamat and (alamat_clean.lower() in c.alamat.lower() or c.alamat.lower() in alamat_clean.lower()):
                    matched_cust = c
                    break
                elif not c.alamat:
                    # Jika data alamat di DB belum lengkap, cocokkan dengan nama
                    matched_cust = c
                    break

        if not matched_cust:
            return False, "Data pelanggan tidak ditemukan. Pastikan nama lengkap dan alamat sesuai dengan data registrasi pemasangan WiFi Anda.", None

        # 2. Periksa apakah akun sudah pernah dibuat sebelumnya
        existing_account = db.query(AkunPelanggan).filter(
            AkunPelanggan.id_pelanggan == matched_cust.id_pelanggan
        ).first()

        if existing_account:
            return False, "Akun untuk pelanggan ini sudah pernah didaftarkan. Silakan langsung masuk (login) menggunakan password Anda.", None

        # 3. Buat akun baru di tabel akun_pelanggan
        pwd_hash = get_password_hash(password)
        new_account = AkunPelanggan(
            id_pelanggan=matched_cust.id_pelanggan,
            username=matched_cust.nama,
            password_hash=pwd_hash,
            no_hp=no_hp.strip() if no_hp else matched_cust.no_hp,
            is_active=True,
            last_login=get_now_wib()
        )
        db.add(new_account)

        # Perbarui nomor HP di profil pelanggan jika sebelumnya kosong
        if no_hp and not matched_cust.no_hp:
            matched_cust.no_hp = no_hp.strip()

        db.commit()
        db.refresh(new_account)

        token = create_customer_session_token(matched_cust.id_pelanggan, matched_cust.nama)
        return True, "Akun berhasil didaftarkan dan diaktifkan!", {
            "token": token,
            "id_pelanggan": matched_cust.id_pelanggan,
            "nama": matched_cust.nama
        }

    @staticmethod
    def authenticate(
        db: Session,
        identifier: str,
        password: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        ident = identifier.strip().lower()

        # Cari akun berdasarkan id_pelanggan, username, atau no_hp
        akun = db.query(AkunPelanggan).filter(
            (func.lower(AkunPelanggan.id_pelanggan) == ident) |
            (func.lower(AkunPelanggan.username) == ident) |
            (AkunPelanggan.no_hp == ident)
        ).first()

        if not akun:
            # Coba cari nama persis di tabel pelanggan
            cust = db.query(Pelanggan).filter(
                (func.lower(Pelanggan.id_pelanggan) == ident) |
                (func.lower(Pelanggan.nama) == ident) |
                (Pelanggan.no_hp == ident)
            ).first()
            if cust:
                akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust.id_pelanggan).first()

        if not akun:
            return False, "Akun belum terdaftar. Silakan lakukan pendaftaran akun terlebih dahulu.", None

        if not akun.is_active:
            return False, "Akun Anda dinonaktifkan oleh administrator.", None

        if not verify_password(password, akun.password_hash):
            return False, "Password yang Anda masukkan salah.", None

        akun.last_login = get_now_wib()
        db.commit()

        token = create_customer_session_token(akun.id_pelanggan, akun.username)
        return True, "Login berhasil", {
            "token": token,
            "id_pelanggan": akun.id_pelanggan,
            "nama": akun.username
        }
"""

AUTH_CONTROLLER_PY = """
from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.auth.service import AuthService
from app.core.security import (
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    get_current_customer_optional
)

templates = Jinja2Templates(directory="templates")

class AuthController:

    @staticmethod
    def render_login_page(request: Request, error: str = None, success: str = None):
        if get_current_customer_optional(request):
            return RedirectResponse("/", status_code=303)
        return templates.TemplateResponse(
            request=request,
            name="auth/login.html",
            context={"error": error, "success": success}
        )

    @staticmethod
    def render_register_page(request: Request, error: str = None, form_data: dict = None):
        if get_current_customer_optional(request):
            return RedirectResponse("/", status_code=303)
        return templates.TemplateResponse(
            request=request,
            name="auth/register.html",
            context={"error": error, "data": form_data or {}}
        )

    @staticmethod
    def handle_login(request: Request, db: Session, identifier: str = Form(...), password: str = Form(...)):
        success, msg, res = AuthService.authenticate(db, identifier, password)
        if not success:
            return templates.TemplateResponse(
                request=request,
                name="auth/login.html",
                context={"error": msg, "identifier": identifier}
            )

        response = RedirectResponse("/", status_code=303)
        response.set_cookie(
            key=CUSTOMER_SESSION_COOKIE,
            value=res["token"],
            max_age=MAX_SESSION_AGE,
            httponly=True,
            samesite="lax"
        )
        return response

    @staticmethod
    def handle_register(
        request: Request,
        db: Session,
        nama: str = Form(...),
        alamat: str = Form(...),
        no_hp: str = Form(""),
        ip_router: str = Form(""),
        password: str = Form(...),
        confirm_password: str = Form(...)
    ):
        form_data = {
            "nama": nama,
            "alamat": alamat,
            "no_hp": no_hp,
            "ip_router": ip_router
        }

        if password != confirm_password:
            return templates.TemplateResponse(
                request=request,
                name="auth/register.html",
                context={"error": "Konfirmasi password tidak cocok dengan password baru.", "data": form_data}
            )

        success, msg, res = AuthService.register_or_activate(
            db=db,
            nama=nama,
            alamat=alamat,
            no_hp=no_hp,
            password=password,
            ip_router=ip_router
        )

        if not success:
            return templates.TemplateResponse(
                request=request,
                name="auth/register.html",
                context={"error": msg, "data": form_data}
            )

        # Pendaftaran sukses -> langsung beri sesi login dan arahkan ke dashboard
        response = RedirectResponse("/", status_code=303)
        response.set_cookie(
            key=CUSTOMER_SESSION_COOKIE,
            value=res["token"],
            max_age=MAX_SESSION_AGE,
            httponly=True,
            samesite="lax"
        )
        return response

    @staticmethod
    def handle_logout(request: Request):
        response = RedirectResponse("/login", status_code=303)
        response.delete_cookie(CUSTOMER_SESSION_COOKIE)
        return response
"""

AUTH_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.controller import AuthController

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
    alamat: str = Form(...),
    no_hp: str = Form(""),
    ip_router: str = Form(""),
    password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    return AuthController.handle_register(
        request, db, nama, alamat, no_hp, ip_router, password, confirm_password
    )

@router.get("/logout")
def logout(request: Request):
    return AuthController.handle_logout(request)
"""

print("Writing Auth Module...")
write_file("app/modules/auth/__init__.py", "")
write_file("app/modules/auth/service.py", AUTH_SERVICE_PY)
write_file("app/modules/auth/controller.py", AUTH_CONTROLLER_PY)
write_file("app/modules/auth/routes.py", AUTH_ROUTES_PY)
"""
"""
# ==========================================
# DASHBOARD MODULE
# ==========================================

DASHBOARD_SERVICE_PY = """
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, LogPerformaONT, KuotaPelanggan, TiketKendala
from app.core.timezone import get_now_wib

class DashboardService:

    @staticmethod
    def get_dashboard_data(db: Session, id_pelanggan: str):
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        # 1. Log performa terakhir
        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        # 2. Kuota periode bulan ini (YYYY-MM)
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        kuota = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.id_pelanggan == id_pelanggan,
            KuotaPelanggan.periode_bulan == current_period
        ).first()

        if not kuota:
            # Inisialisasi kuota default bulan ini
            import random
            random_usage = round(random.uniform(45.0, 180.0), 1)
            kuota = KuotaPelanggan(
                id_pelanggan=id_pelanggan,
                periode_bulan=current_period,
                kuota_terpakai_gb=random_usage,
                kecepatan_paket=cust.paket or "20 Mbps Unlimited"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        # 3. Tiket aktif pelanggan
        active_tickets = db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan,
            TiketKendala.status.in_(["MENUNGGU", "DIPROSES"])
        ).count()

        return {
            "pelanggan": cust,
            "last_log": last_log,
            "kuota": kuota,
            "active_tickets_count": active_tickets,
            "now": now
        }
"""

DASHBOARD_CONTROLLER_PY = """
from fastapi import Request, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.dashboard.service import DashboardService
from app.core.security import require_customer_login

templates = Jinja2Templates(directory="templates")

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        current_cust = require_customer_login(request)
        data = DashboardService.get_dashboard_data(db, current_cust["id_pelanggan"])
        if not data:
            raise HTTPException(status_code=404, detail="Data pelanggan tidak ditemukan")

        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context={
                "current_cust": current_cust,
                "data": data,
                "active_tab": "dashboard"
            }
        )
"""

DASHBOARD_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.dashboard.controller import DashboardController

router = APIRouter(tags=["Dashboard Pelanggan"])

@router.get("/")
def dashboard_home(request: Request, db: Session = Depends(get_db)):
    return DashboardController.render_dashboard(request, db)
"""

print("Writing Dashboard Module...")
write_file("app/modules/dashboard/__init__.py", "")
write_file("app/modules/dashboard/service.py", DASHBOARD_SERVICE_PY)
write_file("app/modules/dashboard/controller.py", DASHBOARD_CONTROLLER_PY)
write_file("app/modules/dashboard/routes.py", DASHBOARD_ROUTES_PY)

# ==========================================
# KENDALA (TROUBLE TICKET) MODULE
# ==========================================

KENDALA_SERVICE_PY = """
import random
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import TiketKendala, Pelanggan, LogPerformaONT
from app.services.telegram_service import TelegramService
from app.core.timezone import get_now_wib

class KendalaService:

    @staticmethod
    def get_customer_tickets(db: Session, id_pelanggan: str) -> List[TiketKendala]:
        return db.query(TiketKendala).filter(
            TiketKendala.id_pelanggan == id_pelanggan
        ).order_by(TiketKendala.created_at.desc()).all()

    @staticmethod
    def create_ticket(
        db: Session,
        id_pelanggan: str,
        kategori: str,
        deskripsi: str,
        no_wa: str
    ) -> TiketKendala:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        now = get_now_wib()

        # Ambil redaman & status ONT terakhir
        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        redaman = last_log.rx_power if last_log else None
        status_koneksi = last_log.status_koneksi if last_log else "UNKNOWN"

        # Generate ticket ID unik
        date_str = now.strftime("%Y%m")
        random_num = random.randint(1000, 9999)
        ticket_id = f"TK-{date_str}-{random_num}"

        kantor = cust.kantor if cust else "cabang"

        new_ticket = TiketKendala(
            id_tiket=ticket_id,
            id_pelanggan=id_pelanggan,
            kantor=kantor,
            kategori=kategori,
            deskripsi=deskripsi,
            no_wa_pelapor=no_wa,
            redaman_saat_lapor=redaman,
            status_ont_saat_lapor=status_koneksi,
            status="MENUNGGU"
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)

        # Kirim notifikasi Telegram ke tim teknisi
        nama = cust.nama if cust else "Pelanggan"
        alamat = cust.alamat if cust else "-"
        redaman_str = f"{redaman} dBm" if redaman is not None else "Belum terbaca"

        try:
            TelegramService.send_ticket_notification(
                id_tiket=ticket_id,
                nama_pelanggan=nama,
                id_pelanggan=id_pelanggan,
                kantor=kantor,
                alamat=alamat,
                kategori=kategori,
                deskripsi=deskripsi,
                no_wa=no_wa,
                redaman=redaman_str,
                status_koneksi=status_koneksi
            )
        except Exception:
            pass

        return new_ticket
"""

KENDALA_CONTROLLER_PY = """
from fastapi import Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.kendala.service import KendalaService
from app.core.security import require_customer_login
from app.db.models import Pelanggan

templates = Jinja2Templates(directory="templates")

class KendalaController:

    @staticmethod
    def render_tickets_page(request: Request, db: Session):
        cust = require_customer_login(request)
        tickets = KendalaService.get_customer_tickets(db, cust["id_pelanggan"])
        return templates.TemplateResponse(
            request=request,
            name="kendala/index.html",
            context={
                "current_cust": cust,
                "tickets": tickets,
                "active_tab": "kendala"
            }
        )

    @staticmethod
    def render_create_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        return templates.TemplateResponse(
            request=request,
            name="kendala/create.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "active_tab": "kendala"
            }
        )

    @staticmethod
    def submit_ticket(
        request: Request,
        db: Session,
        kategori: str = Form(...),
        deskripsi: str = Form(...),
        no_wa: str = Form(...)
    ):
        cust_session = require_customer_login(request)
        KendalaService.create_ticket(
            db=db,
            id_pelanggan=cust_session["id_pelanggan"],
            kategori=kategori,
            deskripsi=deskripsi,
            no_wa=no_wa
        )
        return RedirectResponse("/kendala?sukses=1", status_code=303)
"""

KENDALA_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.kendala.controller import KendalaController

router = APIRouter(prefix="/kendala", tags=["Lapor Kendala Pelanggan"])

@router.get("")
def list_tickets(request: Request, db: Session = Depends(get_db)):
    return KendalaController.render_tickets_page(request, db)

@router.get("/buat")
def create_ticket_page(request: Request, db: Session = Depends(get_db)):
    return KendalaController.render_create_page(request, db)

@router.post("/buat")
def submit_ticket(
    request: Request,
    kategori: str = Form(...),
    deskripsi: str = Form(...),
    no_wa: str = Form(...),
    db: Session = Depends(get_db)
):
    return KendalaController.submit_ticket(request, db, kategori, deskripsi, no_wa)
"""

print("Writing Kendala Module...")
write_file("app/modules/kendala/__init__.py", "")
write_file("app/modules/kendala/service.py", KENDALA_SERVICE_PY)
write_file("app/modules/kendala/controller.py", KENDALA_CONTROLLER_PY)
write_file("app/modules/kendala/routes.py", KENDALA_ROUTES_PY)

# ==========================================
# KUOTA MODULE (TANPA SISA KUOTA)
# ==========================================

KUOTA_SERVICE_PY = """
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.models import KuotaPelanggan, Pelanggan
from app.core.timezone import get_now_wib

class KuotaService:

    @staticmethod
    def get_kuota_details(db: Session, id_pelanggan: str):
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")

        kuota = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.id_pelanggan == id_pelanggan,
            KuotaPelanggan.periode_bulan == current_period
        ).first()

        if not kuota:
            kuota = KuotaPelanggan(
                id_pelanggan=id_pelanggan,
                periode_bulan=current_period,
                kuota_terpakai_gb=78.4,
                kecepatan_paket=cust.paket if cust and cust.paket else "20 Mbps Unlimited"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        # Buat simulasi riwayat 7 hari terakhir
        usage_history = []
        total_now = float(kuota.kuota_terpakai_gb)
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            day_name = d.strftime("%d %b")
            daily_gb = round(max(1.5, (total_now / 30) * (0.8 + (i % 3) * 0.2)), 1)
            usage_history.append({"tanggal": day_name, "pemakaian_gb": daily_gb})

        return {
            "pelanggan": cust,
            "kuota": kuota,
            "usage_history": usage_history,
            "now": now
        }
"""

KUOTA_CONTROLLER_PY = """
from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.modules.kuota.service import KuotaService
from app.core.security import require_customer_login

templates = Jinja2Templates(directory="templates")

class KuotaController:

    @staticmethod
    def render_kuota_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        data = KuotaService.get_kuota_details(db, cust_session["id_pelanggan"])
        return templates.TemplateResponse(
            request=request,
            name="kuota/index.html",
            context={
                "current_cust": cust_session,
                "data": data,
                "active_tab": "kuota"
            }
        )
"""

KUOTA_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.kuota.controller import KuotaController

router = APIRouter(prefix="/kuota", tags=["Kuota & Pemakaian Data"])

@router.get("")
def kuota_page(request: Request, db: Session = Depends(get_db)):
    return KuotaController.render_kuota_page(request, db)
"""

print("Writing Kuota Module...")
write_file("app/modules/kuota/__init__.py", "")
write_file("app/modules/kuota/service.py", KUOTA_SERVICE_PY)
write_file("app/modules/kuota/controller.py", KUOTA_CONTROLLER_PY)
write_file("app/modules/kuota/routes.py", KUOTA_ROUTES_PY)

# ==========================================
# PROFIL MODULE
# ==========================================

PROFIL_CONTROLLER_PY = """
from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.core.security import require_customer_login, verify_password, get_password_hash
from app.db.models import Pelanggan, AkunPelanggan

templates = Jinja2Templates(directory="templates")

class ProfilController:

    @staticmethod
    def render_profil_page(request: Request, db: Session, error: str = None, success: str = None):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()

        return templates.TemplateResponse(
            request=request,
            name="profil/index.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "akun": akun,
                "error": error,
                "success": success,
                "active_tab": "profil"
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
        akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()

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
"""

PROFIL_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.profil.controller import ProfilController

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
"""

print("Writing Profil Module...")
write_file("app/modules/profil/__init__.py", "")
write_file("app/modules/profil/controller.py", PROFIL_CONTROLLER_PY)
write_file("app/modules/profil/routes.py", PROFIL_ROUTES_PY)

print("Part 2 Complete.")
