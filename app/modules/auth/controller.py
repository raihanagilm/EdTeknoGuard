from typing import Optional
from fastapi import Request, Response
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.security import SESSION_COOKIE_NAME, MAX_SESSION_AGE, get_current_user_optional
from app.modules.auth.service import AuthService
from app.modules.activity_logs.service import ActivityLogService
from app.core.config import settings

templates = Jinja2Templates(directory="templates")

class AuthController:

    @staticmethod
    def render_login_page(request: Request, error: Optional[str] = None):
        # Jika sudah login, langsung lempar ke dashboard
        if get_current_user_optional(request):
            return RedirectResponse("/", status_code=303)

        return templates.TemplateResponse(
            request=request,
            name="auth/login.html",
            context={
                "app_name": settings.APP_NAME,
                "error": error
            }
        )

    @staticmethod
    def handle_login(request: Request, username: str, password: str, db: Session) -> Response:
        ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        user_agent = request.headers.get("user-agent")

        auth_result = AuthService.authenticate(db, username, password)
        if not auth_result:
            ActivityLogService.log_activity(
                db=db,
                username=username,
                action="LOGIN_FAILED",
                ip_address=ip,
                user_agent=user_agent,
                status="FAILED",
                keterangan="Percobaan login gagal: Kredensial tidak valid"
            )
            return AuthController.render_login_page(
                request=request,
                error="Username atau password yang Anda masukkan salah!"
            )

        token, user = auth_result

        ActivityLogService.log_activity(
            db=db,
            username=username,
            nama_karyawan=user.nama_karyawan or username,
            role=user.role or "operator",
            action="LOGIN",
            ip_address=ip,
            user_agent=user_agent,
            status="SUCCESS",
            keterangan=f"{user.role.title() if user.role else 'User'} berhasil login ke dashboard EdTeknoGuard"
        )

        response = RedirectResponse("/", status_code=303)
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=token,
            max_age=MAX_SESSION_AGE,
            httponly=True,
            samesite="lax"
        )
        return response

    @staticmethod
    def handle_logout(request: Request, db: Session) -> Response:
        user = get_current_user_optional(request)
        username = user.get("user") if user else "admin"
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")

        ActivityLogService.log_activity(
            db=db,
            username=username,
            action="LOGOUT",
            ip_address=ip,
            user_agent=user_agent,
            status="SUCCESS",
            keterangan="Admin logout dari sistem"
        )

        response = RedirectResponse("/login", status_code=303)
        response.delete_cookie(SESSION_COOKIE_NAME)
        return response
