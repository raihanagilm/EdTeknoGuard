from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings
import bcrypt

CUSTOMER_SESSION_COOKIE = "edtekno_pelanggan_session"
MAX_SESSION_AGE = 86400 * 60  # 60 Hari (2 Bulan) Inaktivitas Sesi Pelanggan

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_customer_session_token(
    id_pelanggan: str,
    nama: str,
    status_verifikasi: str,
    kantor: str,
    account_id: Optional[int] = None
) -> str:
    return _serializer.dumps({
        "id_pelanggan": id_pelanggan,
        "nama": nama,
        "status_verifikasi": status_verifikasi,
        "kantor": (kantor or "").lower().strip(),
        "account_id": account_id
    })

def verify_customer_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        return data
    except (BadSignature, SignatureExpired):
        return None

def create_password_reset_token(id_pelanggan: str, no_hp: str, kantor: str) -> str:
    """Membuat token bertanda tangan kriptografis untuk reset kata sandi mandiri berbatas 15 menit."""
    return _serializer.dumps({
        "type": "password_reset",
        "id_pelanggan": id_pelanggan,
        "no_hp": no_hp,
        "kantor": (kantor or "").lower().strip()
    })

def verify_password_reset_token(token: str, max_age: int = 900) -> Optional[Dict[str, Any]]:
    """Memverifikasi token reset kata sandi (default 15 menit = 900 detik)."""
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=max_age)
        if isinstance(data, dict) and data.get("type") == "password_reset":
            return data
        return None
    except (BadSignature, SignatureExpired):
        return None

def get_current_customer_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(CUSTOMER_SESSION_COOKIE)
    if not token:
        return None
    return verify_customer_session_token(token)

def get_portal_base_url(request: Request) -> str:
    root = request.scope.get("root_path", "")
    if root.startswith("/portal"):
        return root.rstrip("/")
    if request.url.path.startswith("/portal"):
        return "/portal"
    return ""

def require_customer_login(request: Request) -> Dict[str, Any]:
    cust = get_current_customer_optional(request)
    if not cust:
        base = get_portal_base_url(request)
        raise HTTPException(
            status_code=303,
            detail="Silakan login terlebih dahulu",
            headers={"Location": f"{base}/login"}
        )
    return cust

