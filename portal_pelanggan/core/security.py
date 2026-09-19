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

