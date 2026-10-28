import sys
from pathlib import Path

# Pastikan root proyek masuk ke sys.path agar aman dijalankan langsung (python app/main.py atau Run VS Code)
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from typing import Optional
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
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
from app.modules.mikrotik.routes import router as mikrotik_router

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

# Custom Exception Handler untuk Redirect Auth (HTTP 303) & Error Terstruktur
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 303 and exc.headers and "Location" in exc.headers:
        return RedirectResponse(url=exc.headers["Location"], status_code=303)
    return JSONResponse(
        status_code=exc.status_code, 
        content={"ok": False, "status_code": exc.status_code, "detail": exc.detail, "message": str(exc.detail)}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "status_code": 500,
            "detail": "Internal Server Error",
            "message": "Terjadi kendala pada server backend. Silakan coba beberapa saat lagi."
        }
    )

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
        # Periksa apakah ada sesi portal pelanggan (TeknoCust)
        cust_kantor = None
        cust_cookie = request.cookies.get("edtekno_pelanggan_session")
        if cust_cookie:
            try:
                from portal_pelanggan.core.security import verify_customer_session_token
                c_data = verify_customer_session_token(cust_cookie)
                if c_data and c_data.get("kantor"):
                    cust_kantor = c_data.get("kantor")
            except Exception:
                pass

        from app.core.security import get_all_kantor_codes
        all_k = get_all_kantor_codes()
        fallback_k = cust_kantor or (all_k[0] if all_k else None)
        request.state.allowed_kantor = all_k
        request.state.active_kantor = fallback_k
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

# Mount folder static dan frontend dist (jika telah dibuild)
Path("static").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

frontend_dist = Path("frontend/dist")
if frontend_dist.exists() and (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

# Sajikan file root frontend/dist (seperti frame-36.png, favicon.svg, icons.svg)
@app.get("/frame-36.png")
@app.get("/favicon.svg")
@app.get("/icons.svg")
@app.get("/teknocust-mascot.png")
def serve_frontend_dist_root_files(request: Request):
    filename = request.url.path.lstrip("/")
    target = frontend_dist / filename
    if target.exists() and target.is_file():
        return FileResponse(str(target))
    return JSONResponse(status_code=404, content={"detail": f"{filename} not found"})

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
app.include_router(mikrotik_router)

# Route Halaman SPA Dashboard NOC (Support Direct URL & Refresh)
@app.get("/manajemen-kantor")
@app.get("/pengguna")
@app.get("/kantor")
def serve_management_kantor_page(request: Request):
    from app.core.security import require_admin
    user = require_admin(request)
    dist_index = Path("frontend/dist/index.html")
    if dist_index.exists():
        return FileResponse(str(dist_index))
    return RedirectResponse("/", status_code=303)

# Mount Static Files (Uploads, Profil Pelanggan, Aset Statis)
static_dir = Path("static")
static_dir.mkdir(parents=True, exist_ok=True)
(static_dir / "uploads" / "profil").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Portal Pelanggan
from portal_pelanggan.main import app as portal_app
app.mount("/portal", portal_app)

@app.get("/api/notifications/poll")
def poll_notifications_alias(request: Request, kantor: Optional[str] = None):
    from app.core.database import get_db
    from app.core.security import get_current_user_optional, get_active_kantor
    from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
    from app.core.tenant_database import TenantDatabaseManager
    
    user = get_current_user_optional(request)
    target_kantor = kantor or (get_active_kantor(request, user) if user else "all")
    
    if target_kantor and target_kantor.lower() not in ["master", "global", "all"]:
        db = TenantDatabaseManager.get_tenant_session(target_kantor)
    else:
        # Fallback kantor aktif pertama jika target_kantor bernilai all/master
        default_k = get_active_kantor(request, user)
        db = TenantDatabaseManager.get_tenant_session(default_k)
        target_kantor = default_k

    try:
        return AdminCustomerMgmtService.get_realtime_notifications(db=db, kantor=target_kantor, user=user)
    finally:
        db.close()

@app.post("/api/notifications/read")
async def read_notification_alias(request: Request):
    from app.core.database import get_db
    from app.modules.admin_customer_mgmt.routes import mark_single_notification_read
    db = next(get_db(request))
    try:
        return await mark_single_notification_read(request=request, db=db)
    finally:
        db.close()

@app.post("/api/notifications/read-all")
async def read_all_notifications_alias(request: Request):
    from app.core.database import get_db
    from app.modules.admin_customer_mgmt.routes import mark_all_notifications_read
    db = next(get_db(request))
    try:
        return await mark_all_notifications_read(request=request, db=db)
    finally:
        db.close()

@app.get("/api/tiket")
def get_tickets_alias(request: Request, status: str = "SEMUA"):
    from app.core.database import get_db
    from app.modules.admin_customer_mgmt.routes import get_tickets_json
    db = next(get_db(request))
    try:
        return get_tickets_json(request=request, status=status, db=db)
    finally:
        db.close()

@app.get("/api/kuota")
def get_quota_alias(request: Request):
    from app.core.database import get_db
    from app.modules.admin_customer_mgmt.routes import get_quota_json
    db = next(get_db(request))
    try:
        return get_quota_json(request=request, db=db)
    finally:
        db.close()

@app.get("/api/pengguna/list")
@app.get("/api/users/list")
async def get_users_alias(request: Request):
    from app.core.database import SessionLocal
    from app.modules.users.routes import get_users_json
    db = SessionLocal()
    try:
        return await get_users_json(request=request, db=db)
    finally:
        db.close()

@app.get("/api/kantor/list")
async def get_kantor_list_alias(request: Request):
    from app.core.database import SessionLocal
    from app.db.models import Kantor
    db = SessionLocal()
    try:
        kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()
        if not kantors:
            default_items = [
                ("pusat", "Pusat", "Kantor Pusat ISP"),
                ("cabang", "Cabang", "Kantor Cabang Operasional"),
                ("banyumas", "Banyumas", "Kantor Wilayah Banyumas")
            ]
            for k_code, k_name, k_desc in default_items:
                db.add(Kantor(kode=k_code, nama=k_name, alamat=k_desc))
            db.commit()
            kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()
        return {
            "status": "success",
            "kantors": [{
                "id": k.id,
                "kode": k.kode,
                "nama": k.nama,
                "is_active": k.is_active if k.is_active is not None else True,
                "alamat": k.alamat or "",
                "mikrotik_host": k.mikrotik_host or "",
                "mikrotik_port": k.mikrotik_port or "",
                "mikrotik_user": k.mikrotik_user or "",
                "mikrotik_pass": k.mikrotik_pass or "",
                "mikrotik_sync_interval": k.mikrotik_sync_interval if k.mikrotik_sync_interval is not None else 3,
                "last_mikrotik_sync": k.last_mikrotik_sync.strftime("%Y-%m-%d %H:%M:%S") if k.last_mikrotik_sync else None
            } for k in kantors]
        }
    finally:
        db.close()

@app.get("/api/log")
def get_log_alias(request: Request):
    from app.core.database import get_db
    from app.modules.activity_logs.controller import ActivityLogController
    from app.core.security import require_admin, get_current_user_optional
    db = next(get_db(request))
    try:
        user = require_admin(request)
        params = dict(request.query_params)
        
        target_k = params.get("kantor")
        if not target_k:
            target_k = request.headers.get("X-Active-Kantor") or request.cookies.get("active_kantor")

        return ActivityLogController.get_logs_data(
            db=db,
            username=params.get("username"),
            q=params.get("q"),
            action=params.get("action"),
            range_type=params.get("range", "today"),
            start_date=params.get("start_date"),
            end_date=params.get("end_date"),
            date=params.get("date"),
            sort_by=params.get("sort_by", "created_at"),
            sort_dir=params.get("sort_dir", "desc"),
            page=int(params.get("page", 1)),
            limit=int(params.get("limit", 15)),
            target_kantor=target_k,
            current_user=user
        )
    finally:
        db.close()

@app.get("/api/auth/me")
def get_current_user_profile(request: Request):
    from app.core.database import SessionLocal
    from app.core.security import get_current_user_optional, get_user_allowed_kantor, get_all_kantor_codes, parse_allowed_kantor
    from app.db.models import User
    
    user_sess = get_current_user_optional(request)
    if not user_sess:
        return {"ok": True, "authenticated": False, "user": None, "message": "Belum terautentikasi"}
        
    db = SessionLocal()
    try:
        all_kantors = get_all_kantor_codes(db=db)
        username = user_sess.get("user")
        db_user = db.query(User).filter(User.username == username).first()
        if db_user:
            allowed = all_kantors if db_user.role == "super admin" or db_user.username == "admin" else parse_allowed_kantor(db_user.allowed_kantor, all_kantors)
            return {
                "ok": True,
                "authenticated": True,
                "user": {
                    "id": db_user.id,
                    "username": db_user.username,
                    "nama_lengkap": db_user.nama_karyawan or "Administrator NOC",
                    "no_wa": db_user.no_wa or "",
                    "role": db_user.role,
                    "allowed_kantor": allowed
                },
                "all_kantor": all_kantors
            }
        
        role = user_sess.get("role", "super admin")
        allowed = all_kantors if role == "super admin" or username == "admin" else parse_allowed_kantor(user_sess.get("allowed_kantor"), all_kantors)
        return {
            "ok": True,
            "authenticated": True,
            "user": {
                "id": 1,
                "username": username,
                "nama_lengkap": "Administrator NOC",
                "role": role,
                "allowed_kantor": allowed
            },
            "all_kantor": all_kantors
        }
    finally:
        db.close()

@app.post("/api/auth/login")
async def api_auth_login(request: Request):
    from app.core.database import SessionLocal
    from app.modules.auth.service import AuthService
    from app.modules.activity_logs.service import ActivityLogService
    from app.core.security import SESSION_COOKIE_NAME, MAX_SESSION_AGE
    from fastapi.responses import JSONResponse
    
    body = await request.json()
    username = body.get("username", "").strip()
    password = body.get("password", "")
    remember_me = body.get("remember_me", True)
    
    db = SessionLocal()
    try:
        auth_result = AuthService.authenticate(db, username, password)
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        
        if not auth_result:
            ActivityLogService.log_activity(
                db=db,
                username=username,
                action="LOGIN_FAILED",
                ip_address=ip,
                user_agent=user_agent,
                status="FAILED",
                keterangan="Percobaan login API gagal: Kredensial tidak valid"
            )
            return JSONResponse(
                status_code=401,
                content={"ok": False, "message": "Nama pengguna atau kata sandi tidak sesuai!"}
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
            keterangan="Login berhasil melalui antarmuka web TeknoGuard"
        )
        
        response = JSONResponse(
            content={
                "ok": True,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "nama_lengkap": user.nama_karyawan or "Administrator NOC",
                    "role": user.role,
                    "allowed_kantor": user.allowed_kantor
                }
            }
        )
        # Jika 'Ingat Saya' dicentang, cookie bertahan 30 hari (MAX_SESSION_AGE = 2.592.000 detik)
        # Jika tidak dicentang, cookie menjadi Session Cookie (otomatis hangus saat browser ditutup)
        cookie_kwargs = {
            "key": SESSION_COOKIE_NAME,
            "value": token,
            "httponly": True,
            "samesite": "lax",
            "path": "/"
        }
        if remember_me:
            cookie_kwargs["max_age"] = MAX_SESSION_AGE
        response.set_cookie(**cookie_kwargs)
        return response
    finally:
        db.close()

@app.post("/api/auth/logout")
@app.get("/api/auth/logout")
def api_auth_logout(request: Request):
    from app.core.database import SessionLocal
    from app.core.security import SESSION_COOKIE_NAME, get_current_user_optional
    from app.modules.activity_logs.service import ActivityLogService
    from fastapi.responses import JSONResponse
    
    db = SessionLocal()
    try:
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
            keterangan="Admin berhasil logout dari sesi TeknoGuard"
        )
        
        response = JSONResponse(content={"ok": True, "message": "Sesi berhasil ditutup."})
        response.delete_cookie(SESSION_COOKIE_NAME, path="/")
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value="",
            max_age=0,
            expires=0,
            path="/",
            httponly=True,
            samesite="lax"
        )
        return response
    finally:
        db.close()

@app.get("/api/auth/check")
def api_auth_check(request: Request):
    from app.core.database import SessionLocal
    from app.core.security import SESSION_COOKIE_NAME, verify_session_token
    from app.db.models import User
    
    token = request.cookies.get(SESSION_COOKIE_NAME)
    verified = verify_session_token(token) if token else None
    
    if not verified:
        return {"authenticated": False}
        
    db = SessionLocal()
    try:
        username = verified.get("user", "admin")
        db_user = db.query(User).filter(User.username == username).first()
        return {
            "authenticated": True,
            "user": {
                "id": db_user.id if db_user else 1,
                "username": username,
                "nama_lengkap": (db_user.nama_karyawan if db_user else None) or "Administrator NOC",
                "no_wa": (db_user.no_wa if db_user else "") or "",
                "role": verified.get("role", "super admin"),
                "allowed_kantor": verified.get("allowed_kantor", ["cabang", "pusat", "banyumas"])
            }
        }
    finally:
        db.close()

@app.post("/api/auth/update-profile")
async def api_auth_update_profile(request: Request):
    from app.core.database import SessionLocal
    from app.core.security import get_current_user_optional, get_password_hash
    from app.db.models import User
    from app.modules.activity_logs.service import ActivityLogService
    from fastapi.responses import JSONResponse

    user_sess = get_current_user_optional(request)
    if not user_sess:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Sesi tidak valid atau telah berakhir."})

    try:
        body = await request.json()
    except Exception:
        body = {}

    nama_lengkap = body.get("nama_lengkap", "").strip()
    no_wa = body.get("no_wa", "").strip()
    password_baru = body.get("password_baru", "").strip()

    db = SessionLocal()
    try:
        username = user_sess.get("user")
        db_user = db.query(User).filter(User.username == username).first()
        if not db_user:
            return JSONResponse(status_code=404, content={"ok": False, "message": "Pengguna tidak ditemukan."})

        if nama_lengkap:
            db_user.nama_karyawan = nama_lengkap

        if "no_wa" in body:
            db_user.no_wa = no_wa

        if password_baru:
            if len(password_baru) < 6:
                return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi baru minimal 6 karakter."})
            db_user.hashed_password = get_password_hash(password_baru)

        db.commit()
        db.refresh(db_user)

        ActivityLogService.log_activity(
            db=db,
            user_id=db_user.id,
            username=username,
            nama_karyawan=db_user.nama_karyawan or username,
            role=db_user.role,
            action="UPDATE_PROFILE",
            ip_address=request.client.host if request.client else "unknown",
            status="SUCCESS",
            keterangan=f"Pengguna '{username}' ({db_user.role}) berhasil memperbarui profil & kata sandi"
        )

        return {
            "ok": True,
            "message": "Profil dan kata sandi berhasil diperbarui.",
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "nama_lengkap": db_user.nama_karyawan or "Administrator NOC",
                "no_wa": db_user.no_wa or "",
                "role": db_user.role,
                "allowed_kantor": db_user.allowed_kantor
            }
        }
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)

