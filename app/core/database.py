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
Base = declarative_base()

from fastapi import Request

def get_master_db():
    """Dependency eksplisit untuk modul master global (Users, Auth, Kantor Global)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db(request: Request = None):
    """
    Dependency dinamis:
    Jika request memiliki active_kantor di state/header/cookie,
    maka otomatis menghubungkan sesi ke Tenant DB kantor tersebut.
    Jika tidak ada atau modul global, fallback ke Master DB.
    """
    from app.core.tenant_database import TenantDatabaseManager
    
    active_kantor = None
    if request:
        # 1. Cek sesi admin / header
        active_kantor = getattr(request.state, "active_kantor", None)
        if not active_kantor:
            active_kantor = request.headers.get("X-Active-Kantor") or request.cookies.get("active_kantor")

        # 2. Cek sesi portal pelanggan (TeknoCust)
        if not active_kantor or active_kantor.lower() in ["master", "global", "all"]:
            cust_cookie = request.cookies.get("edtekno_pelanggan_session")
            if cust_cookie:
                try:
                    from portal_pelanggan.core.security import verify_customer_session_token
                    c_data = verify_customer_session_token(cust_cookie)
                    if c_data and c_data.get("kantor"):
                        active_kantor = c_data.get("kantor")
                except Exception:
                    pass

    if active_kantor and active_kantor.lower() not in ["master", "global", "all"]:
        db = TenantDatabaseManager.get_tenant_session(active_kantor)
    else:
        db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
