import json
from typing import Optional, Dict, Any, List
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from app.core.config import settings

import bcrypt

SESSION_COOKIE_NAME = "edteknoguard_session"
MAX_SESSION_AGE = 86400 * 30  # 30 hari inaktivitas (2.592.000 detik)
ALL_KANTOR = ["cabang", "pusat", "banyumas"]

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def parse_allowed_kantor(allowed_kantor_val) -> List[str]:
    if isinstance(allowed_kantor_val, list):
        return [k.lower().strip() for k in allowed_kantor_val if k.lower().strip() in ALL_KANTOR]
    if isinstance(allowed_kantor_val, str):
        try:
            parsed = json.loads(allowed_kantor_val)
            if isinstance(parsed, list):
                return [k.lower().strip() for k in parsed if k.lower().strip() in ALL_KANTOR]
        except Exception:
            pass
        items = [k.lower().strip() for k in allowed_kantor_val.split(",") if k.lower().strip() in ALL_KANTOR]
        if items:
            return items
    return ["cabang"]

def create_session_token(username: str, role: str = "teknisi", nama_karyawan: str = "User", allowed_kantor: Optional[List[str]] = None) -> str:
    if role == "super admin" or username == "admin":
        kantor_list = ALL_KANTOR
    else:
        kantor_list = parse_allowed_kantor(allowed_kantor) if allowed_kantor else ["cabang"]
    return _serializer.dumps({
        "user": username,
        "role": role,
        "nama_karyawan": nama_karyawan,
        "allowed_kantor": kantor_list
    })

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        # Pastikan allowed_kantor selalu ada
        if "allowed_kantor" not in data:
            if data.get("role") == "super admin" or data.get("user") == "admin":
                data["allowed_kantor"] = ALL_KANTOR
            else:
                data["allowed_kantor"] = ["cabang"]
        return data
    except (BadSignature, SignatureExpired):
        return None

def get_user_allowed_kantor(user: Dict[str, Any]) -> List[str]:
    if not user:
        return []
    if user.get("role") == "super admin" or user.get("user") == "admin":
        return ALL_KANTOR
    return parse_allowed_kantor(user.get("allowed_kantor"))

def get_active_kantor(request: Request, user: Optional[Dict[str, Any]]) -> str:
    if not user:
        return "cabang"
    
    allowed = get_user_allowed_kantor(user)
    cookie_val = request.cookies.get("active_kantor", "").strip().lower()
    
    if cookie_val in allowed and cookie_val != "all":
        return cookie_val
        
    return allowed[0] if allowed else "cabang"

def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    return verify_session_token(token)

def require_admin(request: Request) -> Dict[str, Any]:
    user = get_current_user_optional(request)
    if not user:
        # Jika request meminta HTML (dari browser)
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header or request.method == "GET" and not request.url.path.startswith("/api/"):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                detail="Not authenticated",
                headers={"Location": "/login"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akses ditolak. Silakan login."
        )
    return user

def require_super_admin(request: Request) -> Dict[str, Any]:
    user = require_admin(request)
    if user.get("role") != "super admin":
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header or request.method == "GET" and not request.url.path.startswith("/api/"):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                detail="Akses khusus Super Admin",
                headers={"Location": "/"}
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Fitur ini hanya untuk Super Admin."
        )
    return user

require_login = require_admin

