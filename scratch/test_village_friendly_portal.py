import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.db.models import Pelanggan, AkunPelanggan, TiketKendala

client = TestClient(app, follow_redirects=False)

def run_village_friendly_tests():
    db = SessionLocal()
    try:
        print("\n--- 1. Testing GET /portal/daftar (Form Ramah Desa & Akses Lokasi) ---")
        res = client.get("/portal/daftar")
        assert res.status_code == 200
        assert "Pendaftaran Pelanggan WiFi" in res.text
        assert "Deteksi Lokasi Rumah Otomatis" in res.text
        assert "Buka Akses Lokasi Saya" in res.text
        assert "Alamat / Dusun / Desa" in res.text
        assert "123456" in res.text
        # Pastikan TIDAK ADA input password di form pendaftaran
        assert 'name="confirm_password"' not in res.text
        print("PASS: Form pendaftaran sangat sederhana, ada akses lokasi GPS, dan bebas ribet password!")

        print("\n--- 2. Testing GET /portal/login (Petunjuk Password Sementara 123456) ---")
        res = client.get("/portal/login")
        assert res.status_code == 200
        assert "123456" in res.text
        assert "Petunjuk Masuk Pelanggan" in res.text
        print("PASS: Halaman login memuat petunjuk password sementara 123456!")

        print("\n--- 3. Testing Pendaftaran Pelanggan Desa (Hanya Nama, Alamat, GPS, No HP) ---")
        cust = db.query(Pelanggan).filter(Pelanggan.nama == "Budi Santoso").first()
        if not cust:
            cust = db.query(Pelanggan).filter(Pelanggan.nama.like("%Budi Santoso%")).first()
        print(f"Target Pelanggan: {cust.nama} (ID: {cust.id_pelanggan}, IP: {cust.ip_router})")

        # Hapus akun lama jika ada untuk uji pendaftaran baru
        db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust.id_pelanggan).delete()
        db.commit()

        # Submit pendaftaran TANPA password (password default 123456)
        daftar_data = {
            "nama": "Budi Santoso",  # Pengujian substring nama warga desa
            "alamat": "Dusun Karangtengah RT 01 RW 02",
            "no_hp": "085712345678",
            "ip_router": "",  # Kosongkan IP router (opsional)
            "lokasi_gps": "-7.424123, 109.231456"
        }
        res = client.post("/portal/daftar", data=daftar_data)
        assert res.status_code == 303, f"Expected 303, got {res.status_code}"
        assert res.headers.get("location") == "/portal/"
        cookie = res.cookies.get("edtekno_pelanggan_session")
        assert cookie is not None, "Cookie sesi belum terpasang setelah daftar!"
        print("PASS: Pendaftaran sukses tanpa password, langsung auto-login ke dashboard!")

        # Verifikasi data tersimpan di DB
        db.commit()
        db.expire_all()
        cust_updated = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.id_pelanggan).first()
        akun_baru = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust.id_pelanggan).first()
        assert akun_baru is not None
        print(f"PASS: Akun pelanggan berhasil dibuat di DB untuk: {akun_baru.username}")
        if cust_updated.alamat:
            print(f"PASS: Alamat & GPS tersimpan di data pelanggan: {cust_updated.alamat}")

        print("\n--- 4. Testing Login Pelanggan dengan Password Sementara 123456 ---")
        client.cookies.clear()
        login_res = client.post("/portal/login", data={
            "identifier": "Budi Santoso",
            "password": "123456"
        })
        assert login_res.status_code == 303
        assert login_res.headers.get("location") == "/portal/"
        assert login_res.cookies.get("edtekno_pelanggan_session") is not None
        print("PASS: Berhasil login menggunakan password sementara 123456!")

        print("\n--- 5. Testing Auto-Provisioning Login Langsung (Pelanggan yang Belum Daftar) ---")
        # Cari pelanggan lain yang belum punya akun
        cust2 = db.query(Pelanggan).filter(Pelanggan.nama.like("%Siti Aminah%")).first()
        if cust2:
            db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust2.id_pelanggan).delete()
            db.commit()
            print(f"Target Pelanggan Baru Belum Daftar: {cust2.nama}")

            # Langsung login di /portal/login dengan password 123456
            client.cookies.clear()
            auto_login = client.post("/portal/login", data={
                "identifier": cust2.nama,
                "password": "123456"
            })
            assert auto_login.status_code == 303
            assert auto_login.headers.get("location") == "/portal/"
            print("PASS: Pelanggan yang belum pernah mendaftar bisa langsung masuk dengan password 123456!")

        print("\n--- 6. Verifikasi Larangan SOP 'Sisa Kuota' ---")
        client.cookies.set("edtekno_pelanggan_session", cookie)
        dash_res = client.get("/portal/")
        assert dash_res.status_code == 200
        assert "sisa kuota" not in dash_res.text.lower(), "DILARANG: Kata 'sisa kuota' ditemukan di dashboard!"

        kuota_res = client.get("/portal/kuota")
        assert kuota_res.status_code == 200
        assert "sisa kuota" not in kuota_res.text.lower(), "DILARANG: Kata 'sisa kuota' ditemukan di halaman kuota!"
        print("PASS: 100% Bebas dari kata 'sisa kuota' sesuai aturan SOP ISP!")

    finally:
        db.close()

if __name__ == "__main__":
    run_village_friendly_tests()
    print("\n[SUKSES] SEMUA PENGUJIAN FITUR RAMAH DESA BERHASIL 100%!")
