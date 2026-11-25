"""
app/middleware/security_middleware.py
Middleware Pengerasan Keamanan (Security Hardening & Rate Limiter)
Memenuhi Standar OWASP & Alibaba OCR Quality Gate
"""
import time
from collections import defaultdict
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Menyisipkan header keamanan standar HTTP industri (OWASP Recommended)
    pada setiap response untuk mencegah MIME-sniffing, Clickjacking, dan XSS.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class LoginRateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory Sliding Window Rate Limiter untuk mencegah serangan Brute-Force & Credential Stuffing
    pada endpoint otentikasi (/api/auth/login dan /portal/api/auth/login).
    Batas default: 10 percobaan per 60 detik per alamat IP.
    """
    def __init__(self, app, max_attempts: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts = defaultdict(list)
        self.last_cleanup = time.time()

    def _cleanup_old_entries(self, now: float):
        # Bersihkan memori setiap 5 menit agar penggunaan RAM tetap minimal
        if now - self.last_cleanup > 300:
            threshold = now - self.window_seconds
            keys_to_delete = []
            for ip, timestamps in self.attempts.items():
                self.attempts[ip] = [t for t in timestamps if t > threshold]
                if not self.attempts[ip]:
                    keys_to_delete.append(ip)
            for k in keys_to_delete:
                del self.attempts[k]
            self.last_cleanup = now

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")
        # Batasi request POST pada endpoint sensitif otentikasi (Login Admin, Login Pelanggan MyTekno, & Reset Password)
        is_sensitive_auth = request.method == "POST" and (
            path.endswith("/auth/login")
            or path.endswith("/api/auth/login")
            or "reset-password" in path
        )
        if is_sensitive_auth:
            from app.core.security import get_trusted_client_ip
            client_ip = get_trusted_client_ip(request)

            now = time.time()
            self._cleanup_old_entries(now)

            # Saring percobaan dalam rentang waktu window_seconds
            threshold = now - self.window_seconds
            recent = [t for t in self.attempts[client_ip] if t > threshold]
            self.attempts[client_ip] = recent

            if len(recent) >= self.max_attempts:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "ok": False,
                        "detail": "Terlalu banyak percobaan masuk. Mohon tunggu 1 menit demi keamanan akun Anda."
                    },
                    headers={"Retry-After": str(self.window_seconds)}
                )

            # Catat timestamp percobaan saat ini
            self.attempts[client_ip].append(now)

        return await call_next(request)
