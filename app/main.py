import sys
from pathlib import Path

# Pastikan root proyek masuk ke sys.path agar aman dijalankan langsung (python app/main.py atau Run VS Code)
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.services.scheduler_service import scheduler
from app.modules.auth.routes import router as auth_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.monitoring.routes import router as monitoring_router
from app.modules.customers.routes import router as customers_router
from app.modules.logs_mgmt.routes import router as logs_router
from app.modules.settings.routes import router as settings_router
from app.modules.activity_logs.routes import router as activity_logs_router
from app.modules.users.routes import router as users_router
from app.modules.admin_customer_mgmt.routes import router as admin_customer_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Memulai {settings.APP_NAME}...")
    # Mulai scheduler background pemantau 5 menit
    scheduler.start()
    yield
    logger.info(f"Menghentikan {settings.APP_NAME}...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistem Deteksi Dini & Monitoring Kualitas Jaringan ONT/Modem ISP",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handler untuk Redirect Auth (HTTP 303)
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 303 and exc.headers and "Location" in exc.headers:
        return RedirectResponse(url=exc.headers["Location"], status_code=303)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.middleware("http")
async def inject_current_user_middleware(request: Request, call_next):
    from app.core.security import (
        get_current_user_optional,
        get_active_kantor,
        get_user_allowed_kantor,
        create_session_token,
        SESSION_COOKIE_NAME,
        MAX_SESSION_AGE
    )
    current_user = get_current_user_optional(request)
    request.state.current_user = current_user
    if current_user:
        request.state.allowed_kantor = get_user_allowed_kantor(current_user)
        request.state.active_kantor = get_active_kantor(request, current_user)
    else:
        request.state.allowed_kantor = ["cabang"]
        request.state.active_kantor = "cabang"
    response = await call_next(request)

    # Aturan Sesi Inaktivitas 30 Hari:
    # Selama pengguna aktif membuka/menggunakan aplikasi, masa aktif sesi diperpanjang ke 30 hari ke depan.
    # Jika pengguna tidak mengakses aplikasi selama 30 hari, sesi kedaluwarsa dan otomatis logout sendiri.
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
            allowed_kantor=current_user.get("allowed_kantor", ["cabang"])
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

@app.get("/switch-kantor")
async def switch_kantor(request: Request, kantor: str = "cabang"):
    from app.core.security import get_current_user_optional, get_user_allowed_kantor
    user = get_current_user_optional(request)
    referer = request.headers.get("referer", "/")
    # Hindari redirect loop jika referer adalah /switch-kantor
    if "/switch-kantor" in referer:
        referer = "/"
    response = RedirectResponse(url=referer, status_code=303)
    
    if not user:
        return response
        
    kantor_clean = kantor.strip().lower()
    allowed = get_user_allowed_kantor(user)
    
    if kantor_clean in allowed and kantor_clean != "all":
        response.set_cookie("active_kantor", kantor_clean, max_age=86400 * 30, path="/")
        
    return response

# Mount folder static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Registrasi Router
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(monitoring_router)
app.include_router(customers_router)
app.include_router(logs_router)
app.include_router(settings_router)
app.include_router(activity_logs_router)
app.include_router(users_router)
app.include_router(admin_customer_router)

# Mount Portal Pelanggan
from portal_pelanggan.main import app as portal_app
app.mount("/portal", portal_app)

@app.get("/api/notifications/poll")
def poll_notifications_alias(request: Request):
    from app.core.database import SessionLocal
    from app.core.security import get_current_user_optional, get_active_kantor
    from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
    db = SessionLocal()
    try:
        user = get_current_user_optional(request)
        kantor = get_active_kantor(request, user) if user else "all"
        return AdminCustomerMgmtService.get_realtime_notifications(db=db, kantor=kantor)
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)

