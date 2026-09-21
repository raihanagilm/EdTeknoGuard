from app.core.database import engine
from sqlalchemy import text, inspect
from app.core.security import get_password_hash

default_hash = get_password_hash("123456")

def run_migration():
    with engine.connect() as conn:
        print("1. Memeriksa kolom pada tabel pelanggan...")
        insp = inspect(engine)
        existing_cols = [c["name"] for c in insp.get_columns("pelanggan")]
        
        if "password_hash" not in existing_cols:
            conn.execute(text("ALTER TABLE pelanggan ADD COLUMN password_hash VARCHAR(255) NULL"))
            print("-> Kolom password_hash berhasil ditambahkan.")
        if "lokasi_gps" not in existing_cols:
            conn.execute(text("ALTER TABLE pelanggan ADD COLUMN lokasi_gps VARCHAR(100) NULL"))
            print("-> Kolom lokasi_gps berhasil ditambahkan.")
        if "status_verifikasi" not in existing_cols:
            conn.execute(text("ALTER TABLE pelanggan ADD COLUMN status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'TERVERIFIKASI'"))
            print("-> Kolom status_verifikasi berhasil ditambahkan.")
        if "last_login" not in existing_cols:
            conn.execute(text("ALTER TABLE pelanggan ADD COLUMN last_login DATETIME NULL"))
            print("-> Kolom last_login berhasil ditambahkan.")
        conn.commit()

        print("2. Mengisi default password_hash (123456) untuk pelanggan yang belum memiliki password...")
        conn.execute(text("UPDATE pelanggan SET password_hash = :pwd WHERE password_hash IS NULL"), {"pwd": default_hash})
        conn.commit()
        print("-> Password default terisi.")

        tables = insp.get_table_names()
        if "akun_pelanggan" in tables:
            print("3. Menyalin data dari akun_pelanggan ke pelanggan...")
            conn.execute(text("""
                UPDATE pelanggan p
                JOIN akun_pelanggan a ON p.id_pelanggan = a.id_pelanggan
                SET p.password_hash = COALESCE(a.password_hash, p.password_hash),
                    p.lokasi_gps = COALESCE(a.lokasi_gps, p.lokasi_gps),
                    p.status_verifikasi = COALESCE(a.status_verifikasi, p.status_verifikasi),
                    p.last_login = COALESCE(a.last_login, p.last_login)
                WHERE a.id_pelanggan IS NOT NULL
            """))
            conn.commit()
            print("-> Berhasil menyalin data akun portal ke pelanggan.")

            print("4. Menghapus constraint dan tabel akun_pelanggan...")
            try:
                conn.execute(text("ALTER TABLE akun_pelanggan DROP FOREIGN KEY fk_akun_pelanggan"))
                conn.commit()
                print("-> Foreign key fk_akun_pelanggan berhasil di-drop.")
            except Exception as e:
                print("-> Catatan drop FK:", e)
            conn.execute(text("DROP TABLE IF EXISTS akun_pelanggan"))
            conn.commit()
            print("-> Tabel akun_pelanggan berhasil di-drop.")

    print("Migrasi database berhasil selesai 100%!")

if __name__ == "__main__":
    run_migration()
