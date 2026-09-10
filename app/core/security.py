from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from app.core.config import settings

SESSION_COOKIE_NAME = "edteknoguard_session"
MAX_SESSION_AGE = 86400 * 7  # 7 hari

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

def create_session_token(username: str) -> str:
    return _serializer.dumps({"user": username, "role": "admin"})

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        return data
    except (BadSignature, SignatureExpired):
        return None

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
            detail="Akses ditolak. Silakan login sebagai admin."
        )
    return user
