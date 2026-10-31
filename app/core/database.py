from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Engine SQLAlchemy untuk Database MySQL Lokal
connect_args = {}
if settings.DB_HOST not in ["127.0.0.1", "localhost", "::1"]:
    connect_args["ssl_verify_cert"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=30,
    max_overflow=50
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Deklarasi Model Terpisah: MasterBase (Global) & TenantBase (Per-Kantor)
MasterBase = declarative_base()
TenantBase = declarative_base()

# Base alias untuk backward compatibility
Base = MasterBase

from fastapi import Request

def get_master_db():
    """Dependency eksplisit untuk modul master global (Users, Auth, Kantor Global)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_portal_db(request: Request = None):
    """
    Dependency database khusus Portal Pelanggan (TeknoCust).
    Sangat terisolasi dari sesi admin NOC (TeknoGuard):
    1. Mengutamakan kantor dari cookie sesi pelanggan (edtekno_pelanggan_session).
    2. Jika belum login (misal halaman login / lupa password), periksa query param ?kantor=
       atau header X-Active-Kantor.
    3. Sama sekali TIDAK membaca cookie active_kantor milik admin NOC agar perubahan
       kantor di admin dashboard tidak pernah memengaruhi/mengubah tenant database pelanggan!
    """
    from app.core.tenant_database import TenantDatabaseManager
    
    target_kantor = None
    if request:
        # Prioritas 1: Sesi pelanggan TeknoCust
        cust_cookie = request.cookies.get("edtekno_pelanggan_session")
        if cust_cookie:
            try:
                from app.portal.core.security import verify_customer_session_token
                c_data = verify_customer_session_token(cust_cookie)
                if c_data and c_data.get("kantor"):
                    target_kantor = c_data.get("kantor").lower().strip()
            except Exception:
                pass

        # Prioritas 2: Jika belum login, periksa query param eksplisit atau state
        if not target_kantor:
            target_kantor = request.query_params.get("kantor")
        if not target_kantor:
            target_kantor = getattr(request.state, "portal_kantor", None)

    if not target_kantor or target_kantor.lower() in ["master", "global", "all"]:
        from app.core.security import get_all_kantor_codes
        all_k = get_all_kantor_codes()
        target_kantor = all_k[0] if all_k else None

    if target_kantor:
        db = TenantDatabaseManager.get_tenant_session(target_kantor)
    else:
        db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_db(request: Request = None):
    """
    Dependency dinamis:
    Jika request berasal dari /portal, prioritaskan mutlak sesi pelanggan TeknoCust.
    Jika request memiliki active_kantor di state/header/cookie,
    maka otomatis menghubungkan sesi ke Tenant DB kantor tersebut.
    Jika tidak ada atau modul global, fallback ke Master DB.
    """
    from app.core.tenant_database import TenantDatabaseManager
    
    active_kantor = None
    if request:
        path = request.url.path if hasattr(request, "url") else ""
        is_portal = path.startswith("/portal") or path.startswith("/api/portal") or "/portal" in path
        
        # 1. Jika request berasal dari portal pelanggan, prioritaskan mutlak sesi pelanggan
        if is_portal:
            cust_cookie = request.cookies.get("edtekno_pelanggan_session")
            if cust_cookie:
                try:
                    from app.portal.core.security import verify_customer_session_token
                    c_data = verify_customer_session_token(cust_cookie)
                    if c_data and c_data.get("kantor"):
                        active_kantor = c_data.get("kantor").lower().strip()
                except Exception:
                    pass

        # 2. Cek query param ?kantor=, sesi admin state, header, atau cookie
        if not active_kantor:
            active_kantor = request.query_params.get("kantor")
        if not active_kantor:
            active_kantor = getattr(request.state, "active_kantor", None)
        if not active_kantor and not is_portal:
            active_kantor = request.headers.get("X-Active-Kantor") or request.cookies.get("active_kantor")

        # 3. Cek sesi portal pelanggan (TeknoCust) sebagai fallback jika bukan portal
        if not active_kantor or active_kantor.lower() in ["master", "global", "all"]:
            cust_cookie = request.cookies.get("edtekno_pelanggan_session")
            if cust_cookie:
                try:
                    from app.portal.core.security import verify_customer_session_token
                    c_data = verify_customer_session_token(cust_cookie)
                    if c_data and c_data.get("kantor"):
                        active_kantor = c_data.get("kantor").lower().strip()
                except Exception:
                    pass

    if not active_kantor or active_kantor.lower() in ["master", "global", "all"]:
        from app.core.security import get_all_kantor_codes
        all_k = get_all_kantor_codes()
        active_kantor = all_k[0] if all_k else None

    if active_kantor:
        db = TenantDatabaseManager.get_tenant_session(active_kantor)
    else:
        db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
