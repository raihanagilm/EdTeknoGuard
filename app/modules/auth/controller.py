from typing import Optional
from fastapi import Request, Response
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from app.core.security import SESSION_COOKIE_NAME, MAX_SESSION_AGE, get_current_user_optional
from app.modules.auth.service import AuthService
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
    def handle_login(request: Request, username: str, password: str) -> Response:
        token = AuthService.authenticate(username, password)
        if not token:
            return AuthController.render_login_page(
                request=request,
                error="Username atau password yang Anda masukkan salah!"
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
    def handle_logout() -> Response:
        response = RedirectResponse("/login", status_code=303)
        response.delete_cookie(SESSION_COOKIE_NAME)
        return response
