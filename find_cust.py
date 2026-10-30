import sys
sys.path.insert(0, '.')
from app.core.tenant_database import TenantDatabaseManager
from sqlalchemy import text

for k in ['banyumas', 'tengaran', 'karang_gede', 'slawi']:
    engine = TenantDatabaseManager.get_engine_for_kantor(k)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id_pelanggan, nama, no_hp FROM pelanggan WHERE nama LIKE '%Wahyudi%' OR nama LIKE '%wahyu%'")).fetchall()
        print(f"=== KANTOR {k} ===")
        for r in res:
            print(dict(r._mapping))

