"""
app/Middleware/session_middleware.py - Middleware Pengelolaan Sesi & Auth Guard (Laravel Middleware Style)
Mematuhi P2-01 (vibe-coding-guardrails)
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import (
    get_current_user_optional,
    create_session_token,
    SESSION_COOKIE_NAME,
    MAX_SESSION_AGE
)

class SlidingSessionMiddleware(BaseHTTPMiddleware):
    """
    Middleware yang memperpanjang masa aktif sesi admin NOC secara otomatis
    (Sliding 30-Day Expiration) pada setiap request yang aktif.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        current_user = get_current_user_optional(request)
        path_lower = request.url.path.lower().rstrip("/")
        is_auth_or_static = (
            path_lower.endswith("/logout")
            or path_lower.endswith("/login")
            or request.url.path.startswith("/static")
            or "/static" in path_lower
            or request.url.path.startswith("/portal")
        )

        if current_user and request.method == "GET" and not is_auth_or_static:
            refreshed_token = create_session_token(
                username=current_user.get("user", "admin"),
                role=current_user.get("role", "teknisi"),
                nama_karyawan=current_user.get("nama_karyawan", "User"),
                allowed_kantor=current_user.get("allowed_kantor", ["cabang"]),
                user_id=current_user.get("user_id")
            )
            response.set_cookie(
                key=SESSION_COOKIE_NAME,
                value=refreshed_token,
                max_age=MAX_SESSION_AGE,
                httponly=True,
                samesite="lax",
                path="/"
            )

        return response
