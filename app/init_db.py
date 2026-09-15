import sys
from pathlib import Path

# Pastikan root proyek masuk ke sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.database import engine, SessionLocal
from app.db.models import Base, User
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")

def init_db():
    logger.info("Mulai inisialisasi database...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Membuat user admin default...")
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("agiltampan"),
                nama_karyawan="Administrator NOC",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            logger.info("Admin default berhasil dibuat.")
        else:
            logger.info("User sudah ada di database.")
    except Exception as e:
        logger.error(f"Terjadi kesalahan saat inisialisasi: {e}")
    finally:
        db.close()
    
    logger.info("Selesai inisialisasi database.")

if __name__ == "__main__":
    init_db()
