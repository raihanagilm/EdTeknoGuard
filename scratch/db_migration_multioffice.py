import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text, inspect
from app.core.database import engine, SessionLocal
from app.db.models import Pelanggan, User

def run_migration():
    print("=== [MIGRATION] Menjalankan migrasi Multi-Kantor & Role ===")
    inspector = inspect(engine)
    
    # 1. Cek tabel pelanggan
    pelanggan_columns = [col['name'] for col in inspector.get_columns('pelanggan')]
    with engine.connect() as conn:
        if 'kantor' not in pelanggan_columns:
            print("-> Menambahkan kolom 'kantor' ke tabel 'pelanggan'...")
            conn.execute(text("ALTER TABLE pelanggan ADD COLUMN kantor VARCHAR(50) NOT NULL DEFAULT 'cabang'"))
            conn.execute(text("CREATE INDEX idx_pelanggan_kantor ON pelanggan(kantor)"))
            conn.commit()
            print("[OK] Kolom 'kantor' berhasil ditambahkan.")
        else:
            print("[INFO] Kolom 'kantor' sudah ada di tabel 'pelanggan'.")

        # 2. Cek tabel users
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        if 'allowed_kantor' not in user_columns:
            print("-> Menambahkan kolom 'allowed_kantor' ke tabel 'users'...")
            conn.execute(text("ALTER TABLE users ADD COLUMN allowed_kantor VARCHAR(255) NOT NULL DEFAULT '[\"cabang\"]'"))
            conn.commit()
            print("[OK] Kolom 'allowed_kantor' berhasil ditambahkan.")
        else:
            print("[INFO] Kolom 'allowed_kantor' sudah ada di tabel 'users'.")

    # 3. Update data users & pelanggan dengan session
    db = SessionLocal()
    try:
        # Update user role 'karyawan' -> 'teknisi'
        users = db.query(User).all()
        for u in users:
            if u.role in ['karyawan', 'operator']:
                print(f"-> Memperbarui role user '{u.username}' dari '{u.role}' ke 'teknisi'")
                u.role = 'teknisi'
            if u.role == 'super admin' or u.username == 'admin':
                u.allowed_kantor = '["cabang", "pusat", "banyumas"]'
            elif not u.allowed_kantor:
                u.allowed_kantor = '["cabang"]'
        
        # Update kantor pada pelanggan berdasarkan POP / Sheet
        customers = db.query(Pelanggan).all()
        cabang_cnt = 0
        pusat_cnt = 0
        bms_cnt = 0
        for c in customers:
            pop_lower = (c.pop or '').lower()
            if 'pusat' in pop_lower:
                c.kantor = 'pusat'
                pusat_cnt += 1
            elif 'bms' in pop_lower or 'banyumas' in pop_lower:
                c.kantor = 'banyumas'
                bms_cnt += 1
            else:
                c.kantor = 'cabang'
                cabang_cnt += 1
                
        db.commit()
        print(f"[OK] Pelanggan terpetakan: Cabang={cabang_cnt}, Pusat={pusat_cnt}, Banyumas={bms_cnt}")
        print("[SUCCESS] Migrasi Multi-Kantor & Role selesai dengan sukses!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migrasi gagal: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
