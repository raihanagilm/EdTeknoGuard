"""
migrate_mikrotik.py - Script Migrasi DDL Aman untuk Integrasi MikroTik
Menambahkan kolom baru:
1. `pelanggan`: `status_isolir` (TINYINT/BOOLEAN) dan `queue_name` (VARCHAR)
2. `kuota_pelanggan`: `upload_bytes` (BIGINT), `download_bytes` (BIGINT), `last_sync_mikrotik` (DATETIME)
Mengecek keberadaan kolom sebelum menambahkan agar bersifat idempotent & aman dijalankan berulang kali.
"""

import sys
from sqlalchemy import inspect, text
from app.core.database import engine

def run_migration():
    print("[MIGRASI] Memeriksa struktur tabel database...")
    inspector = inspect(engine)
    
    # 1. Tabel pelanggan
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

    # 2. Tabel kuota_pelanggan
    inspector = inspect(engine)
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

    print("\n[SUKSES] Seluruh migrasi kolom MikroTik berhasil diaplikasikan ke database!")

if __name__ == "__main__":
    run_migration()
