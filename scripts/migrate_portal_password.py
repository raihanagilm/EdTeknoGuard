import sys
import logging
from sqlalchemy import text
from app.core.tenant_database import TenantDatabaseManager, master_engine
from app.core.database import SessionLocal
from app.db.models import Kantor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

def migrate():
    # 1. Master DB
    logger.info("Memeriksa Master DB...")
    with master_engine.connect() as conn:
        try:
            col_check = conn.execute(text("SHOW COLUMNS FROM pelanggan LIKE 'password_portal';")).fetchone()
            if not col_check:
                conn.execute(text("ALTER TABLE pelanggan ADD COLUMN password_portal VARCHAR(100) NULL;"))
                conn.commit()
                logger.info("Kolom 'password_portal' berhasil ditambahkan ke master DB.")
            else:
                logger.info("Kolom 'password_portal' sudah ada di master DB.")
        except Exception as e:
            logger.warning(f"Master DB warning: {e}")

    # 2. Tenant DBs
    db = SessionLocal()
    try:
        kantors = db.query(Kantor).filter(Kantor.is_active == True).all()
        kantor_list = [k.nama for k in kantors]
    except Exception as e:
        logger.error(f"Gagal mengambil daftar kantor: {e}")
        kantor_list = ["banyumas", "tengaran", "slawi", "karanggede"]
    finally:
        db.close()

    if not kantor_list:
        kantor_list = ["banyumas", "tengaran", "slawi", "karanggede"]

    for k in kantor_list:
        logger.info(f"Memeriksa Tenant DB '{k}'...")
        try:
            engine = TenantDatabaseManager.get_engine_for_kantor(k)
            with engine.connect() as conn:
                col_check = conn.execute(text("SHOW COLUMNS FROM pelanggan LIKE 'password_portal';")).fetchone()
                if not col_check:
                    conn.execute(text("ALTER TABLE pelanggan ADD COLUMN password_portal VARCHAR(100) NULL;"))
                    conn.commit()
                    logger.info(f"Kolom 'password_portal' berhasil ditambahkan ke Tenant DB '{k}'.")
                else:
                    logger.info(f"Kolom 'password_portal' sudah ada di Tenant DB '{k}'.")
        except Exception as e:
            logger.error(f"Gagal migrasi Tenant DB '{k}': {e}")

if __name__ == "__main__":
    migrate()
