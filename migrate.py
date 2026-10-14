#!/usr/bin/env python3
"""
Skrip Migrasi Basis Data MySQL Lokal - EdTeknoGuard
===================================================
Menjalankan migrasi database otomatis menggunakan koneksi Python (PyMySQL/SQLAlchemy)
membaca konfigurasi dari file .env (Host, Port, User, Password, DB Name).

Dapat dijalankan secara interaktif dengan opsi:
1. Migrasi Normal (Auto create database & tables jika belum ada)
2. Fresh Migration (Drop database lama & rebuild dari nol)
3. Eksekusi skrip db/init.sql murni secara presisi
"""

import os
import sys
import argparse
from pathlib import Path

# Pastikan root proyek masuk ke sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Atur stdout utf-8 di Windows terminal
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.config import settings

def print_banner():
    print("=" * 65)
    print(" 🛡️  EdTeknoGuard - MySQL Local Database Migration Runner")
    print("=" * 65)
    print(f" • Host      : {settings.DB_HOST}")
    print(f" • Port      : {settings.DB_PORT}")
    print(f" • Database  : {settings.DB_NAME}")
    print(f" • User      : {settings.DB_USER}")
    print("-" * 65)

def ensure_database_exists(drop_first=False):
    """Pastikan schema database sudah ada di MySQL server host"""
    import pymysql

    print(f"[1/4] Menghubungkan ke MySQL Server {settings.DB_HOST}:{settings.DB_PORT}...")
    try:
        conn = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            charset="utf8mb4",
            autocommit=True
        )
    except Exception as e:
        print(f"\n❌ [ERROR] Gagal terhubung ke MySQL Server!")
        print(f"Detail error: {e}")
        print("\n💡 Tips:")
        print(f" - Pastikan service MySQL/container MySQL sedang aktif di port {settings.DB_PORT}.")
        print(f" - Jika menggunakan port default MySQL host, periksa DB_PORT di .env (saat ini: {settings.DB_PORT}).")
        sys.exit(1)

    try:
        with conn.cursor() as cursor:
            if drop_first:
                print(f"[WARN] Menghapus database `{settings.DB_NAME}` (Fresh Migration)...")
                cursor.execute(f"DROP DATABASE IF EXISTS `{settings.DB_NAME}`;")
                print(f"[OK] Database `{settings.DB_NAME}` lama berhasil di-drop.")

            print(f"[2/4] Memastikan database `{settings.DB_NAME}` tersedia...")
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            print(f"[OK] Database `{settings.DB_NAME}` siap digunakan.")
    finally:
        conn.close()

def run_migration_orm():
    """Jalankan migrasi tabel ORM dan seeding default via init_db()"""
    print("[3/4] Menjalankan migrasi skema tabel via SQLAlchemy ORM...")
    from app.db.init_db import init_db
    init_db()

def run_sql_script(sql_path: Path):
    """Mengeksekusi file SQL murni (db/init.sql) jika dipilih"""
    import pymysql

    if not sql_path.exists():
        print(f"❌ File SQL tidak ditemukan di {sql_path}")
        return False

    print(f"[SQL] Membaca dan mengeksekusi berkas: {sql_path.name}...")
    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS,
        autocommit=True
    )

    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with conn.cursor() as cursor:
            cursor.execute(sql_content)
        print(f"[OK] Berkas {sql_path.name} berhasil dieksekusi 100% ke database `{settings.DB_NAME}`!")
        return True
    except Exception as e:
        print(f"❌ Gagal mengeksekusi SQL: {e}")
        return False
    finally:
        conn.close()

def main():
    parser = argparse.ArgumentParser(description="Script Migrasi Database MySQL EdTeknoGuard")
    parser.add_argument("--fresh", action="store_true", help="Drop database lama dan rebuild dari awal (fresh install)")
    parser.add_argument("--sql", action="store_true", help="Gunakan eksekutor file db/init.sql secara langsung")
    args = parser.parse_args()

    print_banner()

    # Step 1: Pastikan database exists
    ensure_database_exists(drop_first=args.fresh)

    # Step 2: Eksekusi Migrasi
    if args.sql:
        sql_file = ROOT_DIR / "db" / "init.sql"
        run_sql_script(sql_file)
    else:
        run_migration_orm()

    print("-" * 65)
    print("✅ MIGRASI BASIS DATA SELESAI DENGAN SUKSES!")
    print(f"👉 Sistem siap dijalankan: uvicorn app.main:app --port {settings.APP_PORT}")
    print("=" * 65)

if __name__ == "__main__":
    main()
