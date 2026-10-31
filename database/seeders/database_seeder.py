"""
Database Seeder - Mengisi Data Awal & Sampel Sistem EdTeknoGuard.
Mematuhi Protokol P11 (vibe-coding-guardrails):
Data sampel HANYA boleh dibuat melalui Database Seeder, lalu diambil via ORM dinamis.
"""
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Kantor, User, UserKantor, SystemSetting, Pelanggan, PerangkatONT
from app.core.security import get_password_hash
from app.core.timezone import get_now_wib

logger = logging.getLogger("database_seeder")

def seed_master_data():
    """Mengisi data kantor cabang dan akun pengguna awal pada database master."""
    db: Session = SessionLocal()
    try:
        # 1. Seeder Kantor
        kantors_data = [
            {"nama": "cabang", "is_active": True},
            {"nama": "pusat", "is_active": True},
            {"nama": "banyumas", "is_active": True},
        ]
        for k_data in kantors_data:
            existing = db.query(Kantor).filter(Kantor.nama == k_data["nama"]).first()
            if not existing:
                db.add(Kantor(**k_data))
                logger.info(f"Seeded kantor: {k_data['nama']}")

        # 2. Seeder Super Admin Default
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("agiltampan"),
                nama_karyawan="Administrator NOC",
                role="super admin",
                is_active=True
            )
            db.add(admin_user)
            db.flush()
            logger.info("Seeded super admin default: admin")

            for k in ["cabang", "pusat", "banyumas"]:
                db.add(UserKantor(id_user=admin_user.id, kode_kantor=k))

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
    for k_code in ["cabang", "pusat", "banyumas"]:
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

def seed_initial_customers():
    """
    Mengisi data sampel pelanggan awal (Seeder Pelanggan Awal) secara steril.
    Mematuhi Format ID P3-01: cust<YYYYMMDD><4digit>.
    """
    now = get_now_wib()
    date_str = now.strftime("%Y%m%d")

    sample_customers = [
        {
            "id_pelanggan": f"cust{date_str}1001",
            "nama": "Pak Sugeng Santoso",
            "alamat": "RT 02 RW 01 Desa Karangreja",
            "no_wa": "081234567890",
            "kantor": "banyumas",
            "is_active": True,
            "is_monitored": True,
            "ip_ont": "192.168.1.101",
            "mac_address": "48:2C:A0:11:22:33",
            "nama_wifi": "Sugeng_Net_2.4G",
            "password_hash": get_password_hash("123456")
        },
        {
            "id_pelanggan": f"cust{date_str}1002",
            "nama": "Ibu Siti Rahmawati",
            "alamat": "Dusun Krajan Timur No. 14",
            "no_wa": "082345678901",
            "kantor": "cabang",
            "is_active": True,
            "is_monitored": True,
            "ip_ont": "192.168.1.102",
            "mac_address": "00:2B:67:AA:BB:CC",
            "nama_wifi": "Siti_Family_WiFi",
            "password_hash": get_password_hash("123456")
        }
    ]

    for c_data in sample_customers:
        k_code = c_data["kantor"]
        try:
            t_db = TenantDatabaseManager.get_tenant_session(k_code)
            exist_cust = t_db.query(Pelanggan).filter(
                Pelanggan.id_pelanggan == c_data["id_pelanggan"]
            ).first()

            if not exist_cust:
                ont_ip = c_data.pop("ip_ont")
                ont_mac = c_data.pop("mac_address")
                new_cust = Pelanggan(**c_data)
                t_db.add(new_cust)
                t_db.flush()

                # Tambahkan entri perangkat ONT
                new_ont = PerangkatONT(
                    id_pelanggan=new_cust.id_pelanggan,
                    ip_address=ont_ip,
                    mac_address=ont_mac,
                    user_admin="admin",
                    pass_admin="tekno2024",
                    status_kredensial="VALID",
                    jenis_modem="ZTE GM220-S",
                    status_koneksi="NORMAL"
                )
                t_db.add(new_ont)
                t_db.commit()
                logger.info(f"Seeded pelanggan awal: {new_cust.nama} ({new_cust.id_pelanggan})")
            t_db.close()
        except Exception as e:
            logger.debug(f"Tenant {k_code} customer seed: {e}")

if __name__ == "__main__":
    print("Menjalankan Seeder Database EdTeknoGuard...")
    seed_master_data()
    seed_tenant_settings()
    seed_initial_customers()
    print("Seeding database lengkap selesai.")
