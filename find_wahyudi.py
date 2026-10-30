import sys
sys.path.insert(0, '.')
from app.core.tenant_database import TenantDatabaseManager
from sqlalchemy import text

engine = TenantDatabaseManager.get_engine_for_kantor('tengaran')
with engine.connect() as conn:
    res = conn.execute(text("SELECT p.id_pelanggan, p.nama, ont.ip_router, ont.ip_ont, ont.user_admin, ont.pass_admin, ont.nama_wifi, ont.password_wifi FROM pelanggan p LEFT JOIN perangkat_ont ont ON p.id_pelanggan = ont.id_pelanggan WHERE p.id_pelanggan = 'PLG-0063'")).fetchall()
    for r in res:
        print(dict(r._mapping))

