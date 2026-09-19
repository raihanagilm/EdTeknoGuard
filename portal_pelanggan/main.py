import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from portal_pelanggan.core.security import (
    get_current_customer_optional,
    create_customer_session_token,
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE
)
from portal_pelanggan.modules.auth.routes import router as auth_router
from portal_pelanggan.modules.dashboard.routes import router as dashboard_router
from portal_pelanggan.modules.kendala.routes import router as kendala_router
from portal_pelanggan.modules.kuota.routes import router as kuota_router
from portal_pelanggan.modules.profil.routes import router as profil_router
from portal_pelanggan.modules.wifi.routes import router as wifi_router

app = FastAPI(
    title="EdTeknoGuard - Portal Pelanggan",
    description="Aplikasi Layanan Mandiri & Lapor Kendala Pelanggan ONT",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# Exception Handler untuk 303 Redirect
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 303 and exc.headers and "Location" in exc.headers:
        return RedirectResponse(url=exc.headers["Location"], status_code=303)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# Middleware Sliding Expiration Sesi Pelanggan 30 Hari
@app.middleware("http")
async def customer_session_middleware(request: Request, call_next):
    cust = get_current_customer_optional(request)
    request.state.current_customer = cust
    response = await call_next(request)

    path_lower = request.url.path.lower().rstrip("/")
    is_auth_or_static = (
        path_lower.endswith("/logout")
        or path_lower.endswith("/login")
        or path_lower.endswith("/daftar")
        or request.url.path.startswith("/static")
        or "/static" in path_lower
    )

    if cust and request.method == "GET" and not is_auth_or_static:
        refreshed_token = create_customer_session_token(
            id_pelanggan=cust.get("id_pelanggan", ""),
            nama=cust.get("nama", "")
        )
        response.set_cookie(
            key=CUSTOMER_SESSION_COOKIE,
            value=refreshed_token,
            max_age=MAX_SESSION_AGE,
            httponly=True,
            samesite="lax",
            path="/"
        )
    return response

# Mount static folder jika ada
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="portal_static")

# Registrasi Router
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(kendala_router)
app.include_router(kuota_router)
app.include_router(profil_router)
app.include_router(wifi_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("portal_pelanggan.main:app", host="0.0.0.0", port=8001, reload=True)
