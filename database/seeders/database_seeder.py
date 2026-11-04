"""
Database Seeder - Mengisi Data Awal & Sampel Sistem EdTeknoGuard.
Mematuhi Protokol P11 (vibe-coding-guardrails):
Data sampel HANYA boleh dibuat melalui Database Seeder, lalu diambil via ORM dinamis.
"""
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Kantor, User, UserKantor, SystemSetting
from app.core.security import get_password_hash
from app.core.timezone import get_now_wib

logger = logging.getLogger("database_seeder")

def seed_master_data():
    """Mengisi data kantor cabang dan akun pengguna awal pada database master."""
    db: Session = SessionLocal()
    try:
        # 1. Seeder Kantor
        kantors_data = [
            {"nama": "Pusat", "is_active": True},
        ]
        for k_data in kantors_data:
            existing = db.query(Kantor).filter(Kantor.nama == k_data["nama"]).first()
            if not existing:
                db.add(Kantor(**k_data))
                logger.info(f"Seeded kantor: {k_data['nama']}")
        db.flush()

        # 2. Seeder Super Admin Default
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("123456"),
                nama_karyawan="Administrator NOC",
                role="super admin",
                allowed_kantor='["pusat"]',
                is_active=True
            )
            db.add(admin_user)
            db.flush()
            logger.info("Seeded super admin default: admin")

            pusat_kantor = db.query(Kantor).filter(Kantor.nama == "Pusat").first()
            if pusat_kantor:
                db.add(UserKantor(user_id=admin_user.id, id_kantor=pusat_kantor.id_kantor))

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding master data: {e}")
    finally:
        db.close()

def seed_tenant_settings():
    """Mengisi kredensial default modem ONT di setiap database tenant."""
    default_creds_json = (
        '[{"username": "admin", "password": "tekno2024"}, '
        '{"username": "admin", "password": "admin"}, '
        '{"username": "tekno", "password": "tekno2025"}]'
    )
    for k_code in ["pusat"]:
        try:
            t_db = TenantDatabaseManager.get_tenant_session(k_code)
            setting = t_db.query(SystemSetting).filter(
                SystemSetting.key_name == "default_modem_credentials"
            ).first()
            if not setting:
                t_db.add(SystemSetting(
                    key_name="default_modem_credentials",
                    value_text=default_creds_json
                ))
                t_db.commit()
                logger.info(f"Seeded default modem credentials for tenant: {k_code}")
            t_db.close()
        except Exception as e:
            logger.debug(f"Tenant {k_code} setting seed: {e}")

if __name__ == "__main__":
    print("Menjalankan Seeder Database EdTeknoGuard...")
    seed_master_data()
    seed_tenant_settings()
    print("Seeding database master & tenant settings selesai.")
