#!/usr/bin/env python3
"""
Skrip Migrasi Khusus User (Super Admin, Admin, Teknisi) - EdTeknoGuard
=====================================================================
Database Target: MySQL / MariaDB (via SQLAlchemy & PyMySQL)

Fungsi:
1. Memastikan database MySQL/MariaDB tersedia sesuai konfigurasi .env.
2. Membuat tabel `kantors` dan `users` jika belum ada.
3. Melakukan seeding/migrasi akun default untuk 3 role pengguna:
   - Super Admin: username 'superadmin' (atau 'admin') -> role 'super admin'
   - Admin: username 'admin_cabang' -> role 'admin'
   - Teknisi: username 'teknisi_lapangan' -> role 'teknisi'
4. Aman dijalankan berulang kali (idempotent / tidak duplikat).
"""

import sys
import json
from pathlib import Path

# Pastikan root direktori proyek masuk ke sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Atur encoding stdout terminal Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import pymysql
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.database import engine, Base, SessionLocal
from app.db.models import Kantor, User


def ensure_database_exists():
    """Memastikan skema database di MySQL/MariaDB sudah dibuat"""
    print(f"[*] Menghubungkan ke MySQL/MariaDB Server ({settings.DB_HOST}:{settings.DB_PORT})...")
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
        print(f"\n[ERROR] Gagal terhubung ke MySQL/MariaDB Server!")
        print(f"Detail error: {e}")
        print("\nPetunjuk:")
        print(f"1. Pastikan service MySQL / MariaDB (XAMPP/Docker/Service) aktif di port {settings.DB_PORT}.")
        print(f"2. Periksa kredensial di file .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD).")
        sys.exit(1)

    try:
        with conn.cursor() as cursor:
            print(f"[*] Memastikan database `{settings.DB_NAME}` tersedia...")
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            print(f"[OK] Database `{settings.DB_NAME}` siap digunakan.")
    finally:
        conn.close()


def migrate_users():
    """Migrasi tabel dan seeding user: Super Admin, Admin, Teknisi"""
    print("[*] Memastikan tabel database (termasuk `users` & `kantors`) dibuat...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tabel berhasil dipersiapkan.")

    db = SessionLocal()
    try:
        # 1. Pastikan data master kantor ada sebagai referensi
        kantor_list = [
            {"kode": "pusat", "nama": "Pusat", "alamat": "Kantor Pusat ISP TeknoIndonet"},
            {"kode": "cabang", "nama": "Cabang", "alamat": "Kantor Cabang Operasional Utama"},
            {"kode": "banyumas", "nama": "Banyumas", "alamat": "Kantor Wilayah Operasional Banyumas"},
        ]
        for k in kantor_list:
            item = db.query(Kantor).filter(Kantor.kode == k["kode"]).first()
            if not item:
                db.add(Kantor(kode=k["kode"], nama=k["nama"], alamat=k["alamat"]))
        db.commit()

        # 2. Daftar user yang akan dimigrasikan (Super Admin, Admin, Teknisi)
        users_seed = [
            {
                "username": "superadmin",
                "aliases": ["admin"],  # Jika sudah ada username 'admin', update role & infonya
                "password_plain": "agiltampan",
                "nama_karyawan": "Super Administrator NOC",
                "no_wa": "081234567890",
                "role": "super admin",
                "allowed_kantor": json.dumps(["cabang", "pusat", "banyumas"]),
                "is_active": True
            },
            {
                "username": "admin_cabang",
                "aliases": ["admin2"],
                "password_plain": "admin123",
                "nama_karyawan": "Admin Operasional Cabang",
                "no_wa": "081298765432",
                "role": "admin",
                "allowed_kantor": json.dumps(["cabang"]),
                "is_active": True
            },
            {
                "username": "teknisi_lapangan",
                "aliases": ["teknisi"],
                "password_plain": "teknisi123",
                "nama_karyawan": "Teknisi Lapangan NOC",
                "no_wa": "081311223344",
                "role": "teknisi",
                "allowed_kantor": json.dumps(["cabang", "pusat", "banyumas"]),
                "is_active": True
            }
        ]

        print("\n[*] Menjalankan migrasi akun pengguna...")
        for u in users_seed:
            # Cari user berdasarkan username utama atau alias
            existing_user = db.query(User).filter(
                (User.username == u["username"]) | (User.username.in_(u["aliases"]))
            ).first()

            if existing_user:
                # Update role dan akses kantor jika perlu
                existing_user.role = u["role"]
                existing_user.allowed_kantor = u["allowed_kantor"]
                existing_user.is_active = True
                if not existing_user.nama_karyawan:
                    existing_user.nama_karyawan = u["nama_karyawan"]
                if not existing_user.no_wa:
                    existing_user.no_wa = u["no_wa"]
                print(f"[UPDATE] User `{existing_user.username}` diperbarui sebagai Role: '{u['role']}'.")
            else:
                # Buat user baru
                new_user = User(
                    username=u["username"],
                    hashed_password=get_password_hash(u["password_plain"]),
                    nama_karyawan=u["nama_karyawan"],
                    no_wa=u["no_wa"],
                    role=u["role"],
                    allowed_kantor=u["allowed_kantor"],
                    is_active=u["is_active"]
                )
                db.add(new_user)
                print(f"[CREATE] User baru dibuat: `{u['username']}` (Role: '{u['role']}', Default Password: `{u['password_plain']}`).")

        db.commit()

        # 3. Tampilkan rangkuman daftar user di database
        print("\n" + "=" * 65)
        print(" DAFTAR PENGGUNA TERDAFTAR (SUPER ADMIN, ADMIN, TEKNISI)")
        print("=" * 65)
        current_users = db.query(User).all()
        for idx, usr in enumerate(current_users, 1):
            print(f" {idx}. Username : {usr.username}")
            print(f"    Nama     : {usr.nama_karyawan}")
            print(f"    Role     : {usr.role}")
            print(f"    Kantor   : {usr.allowed_kantor}")
            print(f"    Aktif    : {'Ya' if usr.is_active else 'Tidak'}")
            print("-" * 65)

        print("\n[SUKSES] Migrasi user ke MySQL/MariaDB selesai dengan aman!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Terjadi kesalahan saat migrasi user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 65)
    print(" 🛡️  EdTeknoGuard - Migrasi Akun User MySQL/MariaDB")
    print("=" * 65)
    print(f" • Host      : {settings.DB_HOST}")
    print(f" • Port      : {settings.DB_PORT}")
    print(f" • Database  : {settings.DB_NAME}")
    print(f" • User      : {settings.DB_USER}")
    print("-" * 65)

    ensure_database_exists()
    migrate_users()
