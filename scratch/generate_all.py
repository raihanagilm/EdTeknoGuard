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
# 1. ROOT CONFIG & DEPENDENCIES
# ==========================================

REQUIREMENTS_TXT = """
fastapi>=0.100.0
uvicorn[standard]>=0.22.0
jinja2>=3.1.2
python-multipart>=0.0.6
sqlalchemy>=2.0.0
pymysql>=1.1.0
cryptography>=41.0.0
bcrypt>=4.0.1
itsdangerous>=2.1.2
pydantic-settings>=2.0.0
requests>=2.31.0
python-dotenv>=1.0.0
"""

ENV_FILE = """
APP_NAME="EdTeknoGuard Pelanggan"
APP_ENV="development"
APP_PORT=8001
APP_URL="http://localhost:8001"
SECRET_KEY="edteknoguard-pelanggan-secret-key-2026"

# Database TiDB Cloud (Terkoneksi ke database EdTeknoGuard yang sama)
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=VXH7qwuAhDTaE6d.root
DB_PASSWORD=pEPqz1Tx8GiX7ePQ
DB_NAME=EdTeknoGuard

# Telegram Bot Alerting untuk Teruskan Tiket Kendala ke Tim Teknisi
TELEGRAM_BOT_TOKEN="8956513081:AAHTRX0vCqgxsZNujrE_45wRANpv0G1gy1M"
TELEGRAM_CHAT_IDS="1320037657"
"""

ENV_EXAMPLE_FILE = """
APP_NAME="EdTeknoGuard Pelanggan"
APP_ENV="development"
APP_PORT=8001
APP_URL="http://localhost:8001"
SECRET_KEY="change-me"

# Database TiDB Cloud
DB_HOST="gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
DB_PORT=4000
DB_USER=""
DB_PASSWORD=""
DB_NAME="EdTeknoGuard"

# Telegram Bot
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_IDS=""
"""

# ==========================================
# 2. APP CORE
# ==========================================

CORE_CONFIG_PY = """
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "EdTeknoGuard Pelanggan"
    APP_ENV: str = "development"
    APP_PORT: int = 8001
    APP_URL: str = "http://localhost:8001"
    SECRET_KEY: str = "edteknoguard-pelanggan-secret-key-2026"

    # Database TiDB Cloud (MySQL-Compatible Engine)
    DB_HOST: str = "gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
    DB_PORT: int = 4000
    DB_USER: str = "VXH7qwuAhDTaE6d.root"
    DB_PASSWORD: str = "pEPqz1Tx8GiX7ePQ"
    DB_NAME: str = "EdTeknoGuard"

    # Telegram Bot Alerting
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_IDS: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    @property
    def telegram_recipient_list(self) -> List[str]:
        if not self.TELEGRAM_CHAT_IDS:
            return []
        return [cid.strip() for cid in self.TELEGRAM_CHAT_IDS.split(",") if cid.strip()]

settings = Settings()
"""

CORE_TIMEZONE_PY = """
from datetime import datetime, timezone, timedelta

WIB = timezone(timedelta(hours=7))

def get_now_wib() -> datetime:
    return datetime.now(WIB).replace(tzinfo=None)
"""

CORE_DATABASE_PY = """
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_recycle=300,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={
        "ssl": {
            "ca": "/etc/ssl/certs/ca-certificates.crt" if False else None
        }
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

CORE_SECURITY_PY = """
from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException, status
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
            headers={"Location": "/login"}
        )
    return cust
"""

# ==========================================
# 3. DATABASE MODELS
# ==========================================

DB_MODELS_PY = """
from datetime import datetime
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, 
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.timezone import get_now_wib

class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    no_hp = Column(String(50), nullable=True)
    pop = Column(String(100), nullable=False, default="Server Cabang", index=True)
    kantor = Column(String(50), nullable=False, default="cabang", index=True)
    ip_router = Column(String(45), nullable=False, index=True)
    paket = Column(String(50), nullable=True)
    jenis_modem = Column(String(50), nullable=False, default="GM220-S")
    mac_address = Column(String(30), nullable=True)
    redaman_baseline = Column(Numeric(5, 2), nullable=True)
    nama_wifi = Column(String(100), nullable=True)
    password_wifi = Column(String(100), nullable=True)
    user_admin = Column(String(50), nullable=True)
    pass_admin = Column(String(100), nullable=True)
    status_kredensial = Column(String(20), default="UNTESTED", nullable=False)
    snmp_community = Column(String(50), default="public")
    los_count = Column(Integer, default=0, nullable=False)
    is_monitored = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    logs = relationship("LogPerformaONT", back_populates="pelanggan", cascade="all, delete-orphan")


class LogPerformaONT(Base):
    __tablename__ = "log_performa_ont"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    waktu_cek = Column(DateTime, default=get_now_wib, nullable=False, index=True)
    rx_power = Column(Numeric(5, 2), nullable=True)
    suhu_ont = Column(Numeric(4, 1), nullable=True)
    uptime = Column(BigInteger, nullable=True)
    status_koneksi = Column(String(20), nullable=False, index=True)  # NORMAL, WARNING, CRITICAL, LOS
    latency_ms = Column(Integer, nullable=True)
    keterangan = Column(String(255), nullable=True)

    pelanggan = relationship("Pelanggan", back_populates="logs")


class AkunPelanggan(Base):
    __tablename__ = "akun_pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), nullable=False, unique=True, index=True)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    no_hp = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)


class TiketKendala(Base):
    __tablename__ = "tiket_kendala"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_tiket = Column(String(32), unique=True, nullable=False, index=True)
    id_pelanggan = Column(String(64), nullable=False, index=True)
    kantor = Column(String(50), default="cabang", nullable=False)
    kategori = Column(String(100), nullable=False)
    deskripsi = Column(Text, nullable=False)
    no_wa_pelapor = Column(String(50), nullable=False)
    redaman_saat_lapor = Column(Numeric(5, 2), nullable=True)
    status_ont_saat_lapor = Column(String(20), nullable=True)
    status = Column(String(30), default="MENUNGGU", nullable=False, index=True) # MENUNGGU, DIPROSES, SELESAI, DIBATALKAN
    catatan_teknisi = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)


class KuotaPelanggan(Base):
    __tablename__ = "kuota_pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), nullable=False, index=True)
    periode_bulan = Column(String(10), nullable=False) # YYYY-MM
    kuota_terpakai_gb = Column(Numeric(8, 2), default=0, nullable=False)
    kecepatan_paket = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)
"""

# ==========================================
# 4. TELEGRAM SERVICE
# ==========================================

SERVICES_TELEGRAM_PY = """
import requests
import logging
from app.core.config import settings

logger = logging.getLogger("telegram_service")

class TelegramService:
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
            f"<i>Laporan dikirim otomatis melalui Portal Pelanggan. Mohon tim teknisi segera merespons!</i>"
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
                logger.error(f"Gagal mengirim tiket ke chat_id {chat_id}: {e}")

        return sukses
"""

print("Writing Core & Models...")
write_file("requirements.txt", REQUIREMENTS_TXT)
write_file(".env", ENV_FILE)
write_file(".env.example", ENV_EXAMPLE_FILE)
write_file("app/core/__init__.py", "")
write_file("app/core/config.py", CORE_CONFIG_PY)
write_file("app/core/timezone.py", CORE_TIMEZONE_PY)
write_file("app/core/database.py", CORE_DATABASE_PY)
write_file("app/core/security.py", CORE_SECURITY_PY)
write_file("app/db/__init__.py", "")
write_file("app/db/models.py", DB_MODELS_PY)
write_file("app/services/__init__.py", "")
write_file("app/services/telegram_service.py", SERVICES_TELEGRAM_PY)

print("Part 1 Complete.")
