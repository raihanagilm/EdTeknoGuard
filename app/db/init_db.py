import os
import sys
import logging
from app.core.timezone import get_now_wib
from app.core.database import engine, MasterBase, SessionLocal
from app.db.models import (
    Kantor, User, UserKantor, UserActivityLog, UserNotificationRead
)
from app.core.tenant_database import TenantDatabaseManager
from app.core.config import settings

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")

MASTER_TABLE_NAMES = ["kantors", "users", "user_kantors", "user_activity_logs"]

def init_db():
    print("=" * 65)
    print(" 🛡️  EdTeknoGuard - Inisialisasi Database Multi-Tenant")
    print("=" * 65)

    # 1. Pastikan seluruh tabel MasterBase dibuat di Database Master (edteknoguard)
    from app.db import models
    print(f"\n[1/3] Memastikan {len(models.MasterBase.metadata.tables)} Tabel Master di Database Utama (edteknoguard)...")
    models.MasterBase.metadata.create_all(bind=engine)
    print("  -> Tabel Master terdaftar: " + ", ".join(models.MasterBase.metadata.tables.keys()))
    print("  -> [OK] Database master bersih dari tabel operasional/pelanggan.")

    db = SessionLocal()
    try:
        # Inisialisasi Master Kantor default jika belum ada
        kantor_count = db.query(Kantor).count()
        if kantor_count == 0:
            print("\n[INFO] Menambahkan kantor default...")
            default_kantors = [
                Kantor(nama="Pusat", alamat="Kantor Pusat ISP"),
                Kantor(nama="Cabang", alamat="Kantor Cabang Operasional"),
            ]
            db.add_all(default_kantors)
            db.commit()
            print("  -> [OK] Kantor default dibuat.")

        # Inisialisasi Super Admin default jika belum ada
        import secrets
        from app.core.security import get_password_hash
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            initial_pw = os.getenv("ADMIN_INITIAL_PASSWORD", "").strip()
            generated_pw = False
            if not initial_pw:
                initial_pw = secrets.token_urlsafe(12)
                generated_pw = True
            print("\n[INFO] Membuat akun Super Admin awal (username: admin)...")
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash(initial_pw),
                nama_karyawan="Super Administrator NOC",
                no_wa="081234567890",
                role="super admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

            all_kantors = db.query(Kantor).all()
            for kt in all_kantors:
                db.add(UserKantor(user_id=admin_user.id, id_kantor=kt.id_kantor))
            db.commit()
            if generated_pw:
                print(f"  -> [OK] Super Admin dibuat dengan password acak awal: {initial_pw}")
                print("  -> [PENTING] Segera simpan dan ganti password ini setelah login pertama.")
            else:
                print("  -> [OK] Super Admin & hak akses kantor berhasil dibuat dari ADMIN_INITIAL_PASSWORD.")

        # 2. Sinkronkan skema seluruh database tenant (per-kantor)
        print("\n[2/3] Memastikan skema seluruh database tenant aktif...")
        kantors = db.query(Kantor).filter(Kantor.is_active == True).all()
        for k in kantors:
            try:
                TenantDatabaseManager.init_tenant_schema(k.nama)
                print(f"  -> [OK] Skema tenant '{k.nama}' siap.")
            except Exception as e:
                print(f"  -> [WARN] Gagal inisialisasi tenant '{k.nama}': {e}")

        print("\n[3/3] Verifikasi selesai!")
        print("=" * 65)
        print("✅ INISIALISASI DATABASE MULTI-TENANT SELESAI!")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
