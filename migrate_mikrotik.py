"""
migrate_mikrotik.py - Script Migrasi DDL Aman untuk Integrasi MikroTik
Menambahkan kolom baru:
1. `pelanggan`: `status_isolir` (TINYINT/BOOLEAN) dan `queue_name` (VARCHAR)
2. `kuota_pelanggan`: `upload_bytes` (BIGINT), `download_bytes` (BIGINT), `last_sync_mikrotik` (DATETIME)
Mengecek keberadaan kolom sebelum menambahkan agar bersifat idempotent & aman dijalankan berulang kali.
"""

import sys
from pathlib import Path

# Pastikan root direktori proyek masuk ke sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Atur stdout utf-8 di Windows terminal
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy import inspect, text
from app.core.database import engine
from app.core.config import settings

def run_migration():
    print("=" * 65)
    print(" 🛡️  EdTeknoGuard - Migrasi DDL Integrasi MikroTik (MySQL/MariaDB)")
    print("=" * 65)
    print(f" • Host      : {settings.DB_HOST}")
    print(f" • Port      : {settings.DB_PORT}")
    print(f" • Database  : {settings.DB_NAME}")
    print(f" • User      : {settings.DB_USER}")
    print("-" * 65)
    print("[MIGRASI] Memeriksa struktur tabel database...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # 1. Tabel pelanggan
    if 'pelanggan' in existing_tables:
        pelanggan_cols = [c['name'] for c in inspector.get_columns('pelanggan')]
        print(f"-> Kolom eksisting pelanggan: {len(pelanggan_cols)} kolom")

        with engine.begin() as conn:
            if 'status_isolir' not in pelanggan_cols:
                print("-> Menambahkan kolom `status_isolir` ke tabel `pelanggan`...")
                conn.execute(text("ALTER TABLE pelanggan ADD COLUMN status_isolir TINYINT(1) DEFAULT 0 NOT NULL"))
                print("   [OK] Kolom status_isolir berhasil ditambahkan.")
            else:
                print("   [SKIP] Kolom status_isolir sudah ada.")

            if 'queue_name' not in pelanggan_cols:
                print("-> Menambahkan kolom `queue_name` ke tabel `pelanggan`...")
                conn.execute(text("ALTER TABLE pelanggan ADD COLUMN queue_name VARCHAR(150) NULL"))
                print("   [OK] Kolom queue_name berhasil ditambahkan.")
            else:
                print("   [SKIP] Kolom queue_name sudah ada.")
    else:
        print("   [INFO] Tabel `pelanggan` belum ada di database. Jalankan `python migrate.py` terlebih dahulu.")

    # 2. Tabel kuota_pelanggan
    if 'kuota_pelanggan' in existing_tables:
        kuota_cols = [c['name'] for c in inspector.get_columns('kuota_pelanggan')]
        print(f"-> Kolom eksisting kuota_pelanggan: {len(kuota_cols)} kolom")

        with engine.begin() as conn:
            if 'upload_bytes' not in kuota_cols:
                print("-> Menambahkan kolom `upload_bytes` ke tabel `kuota_pelanggan`...")
                conn.execute(text("ALTER TABLE kuota_pelanggan ADD COLUMN upload_bytes BIGINT DEFAULT 0 NOT NULL"))
                print("   [OK] Kolom upload_bytes berhasil ditambahkan.")
            else:
                print("   [SKIP] Kolom upload_bytes sudah ada.")

            if 'download_bytes' not in kuota_cols:
                print("-> Menambahkan kolom `download_bytes` ke tabel `kuota_pelanggan`...")
                conn.execute(text("ALTER TABLE kuota_pelanggan ADD COLUMN download_bytes BIGINT DEFAULT 0 NOT NULL"))
                print("   [OK] Kolom download_bytes berhasil ditambahkan.")
            else:
                print("   [SKIP] Kolom download_bytes sudah ada.")

            if 'last_sync_mikrotik' not in kuota_cols:
                print("-> Menambahkan kolom `last_sync_mikrotik` ke tabel `kuota_pelanggan`...")
                conn.execute(text("ALTER TABLE kuota_pelanggan ADD COLUMN last_sync_mikrotik DATETIME NULL"))
                print("   [OK] Kolom last_sync_mikrotik berhasil ditambahkan.")
            else:
                print("   [SKIP] Kolom last_sync_mikrotik sudah ada.")
    else:
        print("   [INFO] Tabel `kuota_pelanggan` belum ada di database. Jalankan `python migrate.py` terlebih dahulu.")

    print("\n[SUKSES] Seluruh migrasi kolom MikroTik berhasil diaplikasikan ke database!")

if __name__ == "__main__":
    run_migration()
