"""
database/migrations/migrate_fcm_token.py
Skrip migrasi otomatis penambahan kolom fcm_token pada tabel users (database master)
dan tabel pelanggan (seluruh database tenant per kantor).
"""
import os
import sys

# Tambahkan direktori root proyek ke sys.path agar modul 'app' dapat di-import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Kantor

def migrate():
    print("=" * 60)
    print("🛡️  MIGRASI DATABASE: PENAMBAHAN KOLOM fcm_token")
    print("=" * 60)

    # 1. Tambahkan fcm_token ke tabel users di Database Master
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN fcm_token TEXT NULL;"))
            conn.commit()
            print("✅ [MASTER] Kolom 'fcm_token' berhasil ditambahkan ke tabel 'users'.")
        except Exception as e:
            if "Duplicate column name" in str(e) or "1060" in str(e):
                print("ℹ️  [MASTER] Kolom 'fcm_token' sudah ada di tabel 'users'.")
            else:
                print(f"⚠️  [MASTER] Gagal tambah kolom di 'users': {e}")

    # 2. Tambahkan fcm_token ke tabel pelanggan di seluruh database tenant
    m_db = SessionLocal()
    try:
        kantors = m_db.query(Kantor).all()
        for k in kantors:
            target = getattr(k, "kode", None) or k.nama
            try:
                t_engine = TenantDatabaseManager.get_engine_for_kantor(target)
                with t_engine.connect() as t_conn:
                    # Tambahkan ke pelanggan
                    try:
                        t_conn.execute(text("ALTER TABLE pelanggan ADD COLUMN fcm_token TEXT NULL;"))
                        t_conn.commit()
                        print(f"✅ [TENANT: {target}] Kolom 'fcm_token' berhasil ditambahkan ke tabel 'pelanggan'.")
                    except Exception as e:
                        if "Duplicate column name" in str(e) or "1060" in str(e):
                            print(f"ℹ️  [TENANT: {target}] Kolom 'fcm_token' sudah ada di tabel 'pelanggan'.")
                        else:
                            print(f"⚠️  [TENANT: {target}] Gagal tambah kolom di 'pelanggan': {e}")

                    # Defensif: Tambahkan juga ke users jika tabel users ada di tenant
                    try:
                        t_conn.execute(text("ALTER TABLE users ADD COLUMN fcm_token TEXT NULL;"))
                        t_conn.commit()
                        print(f"✅ [TENANT: {target}] Kolom 'fcm_token' berhasil ditambahkan ke tabel cadangan 'users'.")
                    except Exception as e:
                        if "Duplicate column name" in str(e) or "1060" in str(e):
                            print(f"ℹ️  [TENANT: {target}] Kolom 'fcm_token' sudah ada di tabel 'users'.")
                        elif "doesn't exist" in str(e) or "1146" in str(e):
                            pass  # Normal, tabel users hanya wajib di database master
                        else:
                            pass
            except Exception as e:
                print(f"❌ [TENANT: {target}] Gagal terhubung ke database: {e}")
    finally:
        m_db.close()

    print("=" * 60)
    print("🎉 Migrasi fcm_token selesai!")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
