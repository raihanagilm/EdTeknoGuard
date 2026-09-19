from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from portal_pelanggan.modules.auth.service import AuthService
from portal_pelanggan.core.security import (
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    get_current_customer_optional,
    get_portal_base_url as get_base_url
)

templates = Jinja2Templates(directory="portal_pelanggan/templates")

class AuthController:

    @staticmethod
    def render_login_page(request: Request, error: str = None, success: str = None):
        base = get_base_url(request)
        is_logout = request.query_params.get("logout") == "1"
        if is_logout:
            response = templates.TemplateResponse(
                request=request,
                name="auth/login.html",
                context={"error": error, "success": success or "Anda telah berhasil keluar dari akun.", "base_url": base}
            )
            response.delete_cookie(CUSTOMER_SESSION_COOKIE, path="/")
            response.delete_cookie(CUSTOMER_SESSION_COOKIE, path="/portal")
            response.delete_cookie(CUSTOMER_SESSION_COOKIE)
            response.set_cookie(
                key=CUSTOMER_SESSION_COOKIE,
                value="",
                max_age=0,
                expires=0,
                path="/",
                httponly=True,
                samesite="lax"
            )
            return response

        if request.query_params.get("reset_success") == "1":
            success = "Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda."

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
            samesite="lax",
            path="/"
        )
        return response

    @staticmethod
    def handle_register(
        request: Request,
        db: Session,
        nama: str = Form(...),
        alamat: str = Form(""),
        no_hp: str = Form(""),
        ip_router: str = Form(""),
        lokasi_gps: str = Form(""),
        password: str = Form("123456")
    ):
        base = get_base_url(request)
        form_data = {
            "nama": nama,
            "alamat": alamat,
            "no_hp": no_hp,
            "ip_router": ip_router,
            "lokasi_gps": lokasi_gps
        }

        success, msg, res = AuthService.register_or_activate(
            db=db,
            nama=nama,
            alamat=alamat,
            no_hp=no_hp,
            ip_router=ip_router,
            lokasi_gps=lokasi_gps,
            password=password or "123456"
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
            samesite="lax",
            path="/"
        )
        return response

    @staticmethod
    def handle_logout(request: Request):
        base = get_base_url(request)
        response = RedirectResponse(f"{base}/login?logout=1", status_code=303)
        response.delete_cookie(CUSTOMER_SESSION_COOKIE, path="/")
        response.delete_cookie(CUSTOMER_SESSION_COOKIE, path="/portal")
        response.delete_cookie(CUSTOMER_SESSION_COOKIE)
        response.set_cookie(
            key=CUSTOMER_SESSION_COOKIE,
            value="",
            max_age=0,
            expires=0,
            path="/",
            httponly=True,
            samesite="lax"
        )
        return response

    @staticmethod
    def render_lupa_password_page(request: Request, error: str = None, success: str = None, data: dict = None):
        base = get_base_url(request)
        if get_current_customer_optional(request):
            return RedirectResponse(f"{base}/", status_code=303)
        return templates.TemplateResponse(
            request=request,
            name="auth/lupa_password.html",
            context={"error": error, "success": success, "data": data or {}, "base_url": base}
        )

    @staticmethod
    def handle_lupa_password(
        request: Request,
        db: Session,
        ip_router: str = Form(""),
        nama: str = Form(""),
        no_hp: str = Form(""),
        password_baru: str = Form("123456")
    ):
        base = get_base_url(request)
        form_data = {
            "nama": nama,
            "no_hp": no_hp,
            "ip_router": ip_router,
            "password_baru": password_baru
        }

        success, msg, res = AuthService.reset_customer_password(
            db=db,
            nama=nama,
            no_hp=no_hp,
            ip_router=ip_router,
            password_baru=password_baru or "123456"
        )

        if not success:
            return templates.TemplateResponse(
                request=request,
                name="auth/lupa_password.html",
                context={"error": msg, "data": form_data, "base_url": base}
            )

        # Jika sukses reset, arahkan ke login dengan pesan sukses
        return RedirectResponse(f"{base}/login?reset_success=1", status_code=303)
