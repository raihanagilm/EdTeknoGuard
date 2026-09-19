import os
import sys

BASE_DIR = os.path.abspath("portal_pelanggan")

def write_file(rel_path, content):
    full_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Created: portal_pelanggan/{rel_path}")

# ==========================================
# 1. CORE & SERVICES
# ==========================================

CORE_SECURITY_PY = """
from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings
import bcrypt

CUSTOMER_SESSION_COOKIE = "edtekno_pelanggan_session"
MAX_SESSION_AGE = 86400 * 30  # 30 Hari Inaktivitas

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_customer_session_token(id_pelanggan: str, nama: str) -> str:
    return _serializer.dumps({
        "id_pelanggan": id_pelanggan,
        "nama": nama
    })

def verify_customer_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        return data
    except (BadSignature, SignatureExpired):
        return None

def get_current_customer_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(CUSTOMER_SESSION_COOKIE)
    if not token:
        return None
    return verify_customer_session_token(token)

def require_customer_login(request: Request) -> Dict[str, Any]:
    cust = get_current_customer_optional(request)
    if not cust:
        raise HTTPException(
            status_code=303,
            detail="Silakan login terlebih dahulu",
            headers={"Location": "/portal/login" if request.url.path.startswith("/portal") else "/login"}
        )
    return cust
"""

SERVICES_TELEGRAM_PY = """
import requests
import logging
from app.core.config import settings

logger = logging.getLogger("portal_telegram")

class PortalTelegramService:
    @staticmethod
    def send_ticket_notification(
        id_tiket: str,
        nama_pelanggan: str,
        id_pelanggan: str,
        kantor: str,
        alamat: str,
        kategori: str,
        deskripsi: str,
        no_wa: str,
        redaman: str,
        status_koneksi: str
    ) -> bool:
        if not settings.TELEGRAM_BOT_TOKEN or not settings.telegram_recipient_list:
            logger.warning("Bot Telegram belum dikonfigurasi.")
            return False

        emoji_status = "⚠️" if status_koneksi == "WARNING" else ("🚨" if status_koneksi in ["CRITICAL", "LOS"] else "📶")

        pesan = (
            f"🎫 <b>[TIKET GANGGUAN PELANGGAN BARU]</b>\\n"
            f"━━━━━━━━━━━━━━━━━━━━\\n"
            f"🆔 <b>No Tiket:</b> <code>{id_tiket}</code>\\n"
            f"👤 <b>Pelanggan:</b> {nama_pelanggan} (<code>{id_pelanggan}</code>)\\n"
            f"🏢 <b>Kantor:</b> {kantor.upper()}\\n"
            f"📍 <b>Alamat:</b> {alamat or '-'}\\n"
            f"⚠️ <b>Kategori:</b> {kategori}\\n"
            f"📝 <b>Keluhan:</b> {deskripsi}\\n"
            f"{emoji_status} <b>Redaman Terakhir:</b> {redaman} ({status_koneksi})\\n"
            f"📞 <b>Kontak Pelapor:</b> {no_wa}\\n"
            f"━━━━━━━━━━━━━━━━━━━━\\n"
            f"<i>Laporan dikirim otomatis melalui Portal Pelanggan. Mohon teknisi segera merespons!</i>"
        )

        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        sukses = False

        for chat_id in settings.telegram_recipient_list:
            try:
                res = requests.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": pesan,
                        "parse_mode": "HTML"
                    },
                    timeout=5
                )
                if res.status_code == 200:
                    sukses = True
            except Exception as e:
                logger.error(f"Gagal kirim notifikasi tiket ke chat {chat_id}: {e}")

        return sukses
"""

write_file("core/__init__.py", "")
write_file("core/security.py", CORE_SECURITY_PY)
write_file("services/__init__.py", "")
write_file("services/telegram_service.py", SERVICES_TELEGRAM_PY)

# ==========================================
# 2. MODULES (AUTH, DASHBOARD, KENDALA, KUOTA, PROFIL)
# ==========================================

AUTH_SERVICE_PY = """
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan, AkunPelanggan
from portal_pelanggan.core.security import get_password_hash, verify_password, create_customer_session_token
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

        # Prioritas 1: Jika IP router diisi, cocokkan IP unik
        if ip_clean:
            cust_by_ip = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if cust_by_ip:
                matched_cust = cust_by_ip

        # Prioritas 2: Cari berdasarkan Nama & Alamat
        if not matched_cust:
            candidates = db.query(Pelanggan).filter(
                func.lower(Pelanggan.nama).like(f"%{nama_clean.lower()}%")
            ).all()

            for c in candidates:
                if c.alamat and (alamat_clean.lower() in c.alamat.lower() or c.alamat.lower() in alamat_clean.lower()):
                    matched_cust = c
                    break
                elif not c.alamat:
                    matched_cust = c
                    break

        if not matched_cust:
            return False, "Data pelanggan tidak ditemukan. Pastikan nama lengkap dan alamat sesuai dengan data yang terdaftar saat pemasangan WiFi.", None

        # 2. Periksa apakah akun sudah terdaftar
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

        akun = db.query(AkunPelanggan).filter(
            (func.lower(AkunPelanggan.id_pelanggan) == ident) |
            (func.lower(AkunPelanggan.username) == ident) |
            (AkunPelanggan.no_hp == ident)
        ).first()

        if not akun:
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
            return False, "Akun dinonaktifkan. Silakan hubungi administrator.", None

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
from portal_pelanggan.modules.auth.service import AuthService
from portal_pelanggan.core.security import (
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    get_current_customer_optional
)

templates = Jinja2Templates(directory="portal_pelanggan/templates")

def get_base_url(request: Request) -> str:
    return "/portal" if request.url.path.startswith("/portal") else ""

class AuthController:

    @staticmethod
    def render_login_page(request: Request, error: str = None, success: str = None):
        base = get_base_url(request)
        if get_current_customer_optional(request):
            return RedirectResponse(f"{base}/", status_code=303)
        return templates.TemplateResponse(
            request=request,
            name="auth/login.html",
            context={"error": error, "success": success, "base_url": base}
        )

    @staticmethod
    def render_register_page(request: Request, error: str = None, form_data: dict = None):
        base = get_base_url(request)
        if get_current_customer_optional(request):
            return RedirectResponse(f"{base}/", status_code=303)
        return templates.TemplateResponse(
            request=request,
            name="auth/register.html",
            context={"error": error, "data": form_data or {}, "base_url": base}
        )

    @staticmethod
    def handle_login(request: Request, db: Session, identifier: str = Form(...), password: str = Form(...)):
        base = get_base_url(request)
        success, msg, res = AuthService.authenticate(db, identifier, password)
        if not success:
            return templates.TemplateResponse(
                request=request,
                name="auth/login.html",
                context={"error": msg, "identifier": identifier, "base_url": base}
            )

        response = RedirectResponse(f"{base}/", status_code=303)
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
        base = get_base_url(request)
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
                context={"error": "Konfirmasi password tidak cocok dengan password baru.", "data": form_data, "base_url": base}
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
                context={"error": msg, "data": form_data, "base_url": base}
            )

        response = RedirectResponse(f"{base}/", status_code=303)
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
        base = get_base_url(request)
        response = RedirectResponse(f"{base}/login", status_code=303)
        response.delete_cookie(CUSTOMER_SESSION_COOKIE)
        return response
"""

AUTH_ROUTES_PY = """
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

write_file("modules/auth/__init__.py", "")
write_file("modules/auth/service.py", AUTH_SERVICE_PY)
write_file("modules/auth/controller.py", AUTH_CONTROLLER_PY)
write_file("modules/auth/routes.py", AUTH_ROUTES_PY)

# ==========================================
# DASHBOARD MODULE
# ==========================================

DASHBOARD_SERVICE_PY = """
import random
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, LogPerformaONT, KuotaPelanggan, TiketKendala
from app.core.timezone import get_now_wib

class DashboardService:

    @staticmethod
    def get_dashboard_data(db: Session, id_pelanggan: str):
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        # 1. Log performa ONT terakhir (Live Signal)
        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        # 2. Kuota periode bulan ini (TANPA SISA KUOTA)
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        kuota = db.query(KuotaPelanggan).filter(
            KuotaPelanggan.id_pelanggan == id_pelanggan,
            KuotaPelanggan.periode_bulan == current_period
        ).first()

        if not kuota:
            random_usage = round(random.uniform(50.0, 195.0), 1)
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
from portal_pelanggan.modules.dashboard.service import DashboardService
from portal_pelanggan.core.security import require_customer_login

templates = Jinja2Templates(directory="portal_pelanggan/templates")

def get_base_url(request: Request) -> str:
    return "/portal" if request.url.path.startswith("/portal") else ""

class DashboardController:

    @staticmethod
    def render_dashboard(request: Request, db: Session):
        current_cust = require_customer_login(request)
        data = DashboardService.get_dashboard_data(db, current_cust["id_pelanggan"])
        if not data:
            raise HTTPException(status_code=404, detail="Data pelanggan tidak ditemukan")

        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="dashboard/index.html",
            context={
                "current_cust": current_cust,
                "data": data,
                "active_tab": "dashboard",
                "base_url": base
            }
        )
"""

DASHBOARD_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.dashboard.controller import DashboardController

router = APIRouter(tags=["Dashboard Pelanggan"])

@router.get("/")
def dashboard_home(request: Request, db: Session = Depends(get_db)):
    return DashboardController.render_dashboard(request, db)
"""

write_file("modules/dashboard/__init__.py", "")
write_file("modules/dashboard/service.py", DASHBOARD_SERVICE_PY)
write_file("modules/dashboard/controller.py", DASHBOARD_CONTROLLER_PY)
write_file("modules/dashboard/routes.py", DASHBOARD_ROUTES_PY)

# ==========================================
# KENDALA MODULE
# ==========================================

KENDALA_SERVICE_PY = """
import random
from typing import List
from sqlalchemy.orm import Session
from app.db.models import TiketKendala, Pelanggan, LogPerformaONT
from portal_pelanggan.services.telegram_service import PortalTelegramService
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

        last_log = db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pelanggan
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

        redaman = last_log.rx_power if last_log else None
        status_koneksi = last_log.status_koneksi if last_log else "UNKNOWN"

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

        nama = cust.nama if cust else "Pelanggan"
        alamat = cust.alamat if cust else "-"
        redaman_str = f"{redaman} dBm" if redaman is not None else "Belum ada data"

        try:
            PortalTelegramService.send_ticket_notification(
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
from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.modules.kendala.service import KendalaService
from portal_pelanggan.core.security import require_customer_login
from app.db.models import Pelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

def get_base_url(request: Request) -> str:
    return "/portal" if request.url.path.startswith("/portal") else ""

class KendalaController:

    @staticmethod
    def render_tickets_page(request: Request, db: Session):
        cust = require_customer_login(request)
        tickets = KendalaService.get_customer_tickets(db, cust["id_pelanggan"])
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kendala/index.html",
            context={
                "current_cust": cust,
                "tickets": tickets,
                "active_tab": "kendala",
                "sukses": request.query_params.get("sukses"),
                "base_url": base
            }
        )

    @staticmethod
    def render_create_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kendala/create.html",
            context={
                "current_cust": cust_session,
                "pelanggan": pelanggan,
                "active_tab": "kendala",
                "base_url": base
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
        base = get_base_url(request)
        cust_session = require_customer_login(request)
        KendalaService.create_ticket(
            db=db,
            id_pelanggan=cust_session["id_pelanggan"],
            kategori=kategori,
            deskripsi=deskripsi,
            no_wa=no_wa
        )
        return RedirectResponse(f"{base}/kendala?sukses=1", status_code=303)
"""

KENDALA_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.kendala.controller import KendalaController

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

write_file("modules/kendala/__init__.py", "")
write_file("modules/kendala/service.py", KENDALA_SERVICE_PY)
write_file("modules/kendala/controller.py", KENDALA_CONTROLLER_PY)
write_file("modules/kendala/routes.py", KENDALA_ROUTES_PY)

# ==========================================
# KUOTA MODULE (TANPA SISA KUOTA)
# ==========================================

KUOTA_SERVICE_PY = """
from datetime import timedelta
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
                kuota_terpakai_gb=84.2,
                kecepatan_paket=cust.paket if cust and cust.paket else "20 Mbps Unlimited"
            )
            db.add(kuota)
            db.commit()
            db.refresh(kuota)

        usage_history = []
        total_now = float(kuota.kuota_terpakai_gb)
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            day_name = d.strftime("%d %b")
            daily_gb = round(max(1.8, (total_now / 30) * (0.85 + (i % 3) * 0.2)), 1)
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
from portal_pelanggan.modules.kuota.service import KuotaService
from portal_pelanggan.core.security import require_customer_login

templates = Jinja2Templates(directory="portal_pelanggan/templates")

def get_base_url(request: Request) -> str:
    return "/portal" if request.url.path.startswith("/portal") else ""

class KuotaController:

    @staticmethod
    def render_kuota_page(request: Request, db: Session):
        cust_session = require_customer_login(request)
        data = KuotaService.get_kuota_details(db, cust_session["id_pelanggan"])
        base = get_base_url(request)
        return templates.TemplateResponse(
            request=request,
            name="kuota/index.html",
            context={
                "current_cust": cust_session,
                "data": data,
                "active_tab": "kuota",
                "base_url": base
            }
        )
"""

KUOTA_ROUTES_PY = """
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.kuota.controller import KuotaController

router = APIRouter(prefix="/kuota", tags=["Kuota & Pemakaian Data"])

@router.get("")
def kuota_page(request: Request, db: Session = Depends(get_db)):
    return KuotaController.render_kuota_page(request, db)
"""

write_file("modules/kuota/__init__.py", "")
write_file("modules/kuota/service.py", KUOTA_SERVICE_PY)
write_file("modules/kuota/controller.py", KUOTA_CONTROLLER_PY)
write_file("modules/kuota/routes.py", KUOTA_ROUTES_PY)

# ==========================================
# PROFIL MODULE
# ==========================================

PROFIL_CONTROLLER_PY = """
from fastapi import Request, Form
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.core.security import require_customer_login, verify_password, get_password_hash
from app.db.models import Pelanggan, AkunPelanggan

templates = Jinja2Templates(directory="portal_pelanggan/templates")

def get_base_url(request: Request) -> str:
    return "/portal" if request.url.path.startswith("/portal") else ""

class ProfilController:

    @staticmethod
    def render_profil_page(request: Request, db: Session, error: str = None, success: str = None):
        cust_session = require_customer_login(request)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
        akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust_session["id_pelanggan"]).first()
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
"""

write_file("modules/profil/__init__.py", "")
write_file("modules/profil/controller.py", PROFIL_CONTROLLER_PY)
write_file("modules/profil/routes.py", PROFIL_ROUTES_PY)

print("Portal Pelanggan Core & Modules written successfully!")
