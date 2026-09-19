import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.db.models import Pelanggan, AkunPelanggan, TiketKendala, KuotaPelanggan

client = TestClient(app, follow_redirects=False)

def test_portal():
    print("\n--- 1. Testing GET /portal/login ---")
    res = client.get("/portal/login")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "Portal Pelanggan" in res.text
    assert "svg" in res.text
    print("PASS: /portal/login rendered successfully")

    print("\n--- 2. Testing GET /portal/daftar ---")
    res = client.get("/portal/daftar")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "Aktivasi Akun Pelanggan" in res.text
    print("PASS: /portal/daftar rendered successfully")

    print("\n--- 3. Testing GET /portal/ (unauthenticated) ---")
    res = client.get("/portal/")
    assert res.status_code == 303, f"Expected 303 redirect, got {res.status_code}"
    assert "/portal/login" in res.headers.get("location", "")
    print(f"PASS: Unauthenticated access redirects to {res.headers.get('location')}")

    print("\n--- 4. Finding a test customer in DB ---")
    db = SessionLocal()
    try:
        sample_cust = db.query(Pelanggan).first()
        if not sample_cust:
            print("No customers found in database to test activation!")
            return
        print(f"Found customer: ID={sample_cust.id_pelanggan}, Name={sample_cust.nama}, Address={sample_cust.alamat}, IP={sample_cust.ip_router}")

        # Clean existing test account if any
        existing_acc = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == sample_cust.id_pelanggan).first()
        if existing_acc:
            db.delete(existing_acc)
            db.commit()
            print("Deleted old test account for fresh activation test")

        print("\n--- 5. Testing POST /portal/daftar (Activation) ---")
        reg_payload = {
            "nama": sample_cust.nama,
            "alamat": sample_cust.alamat or "Jl. Kantor No. 1",
            "no_hp": "081234567890",
            "ip_router": sample_cust.ip_router,
            "password": "password123",
            "confirm_password": "password123"
        }
        res = client.post("/portal/daftar", data=reg_payload)
        print(f"Register status: {res.status_code}")
        assert res.status_code == 303, f"Expected 303 redirect after register, got {res.status_code}"
        assert res.headers.get("location") == "/portal/"
        reg_cookie = res.cookies.get("edtekno_pelanggan_session")
        assert reg_cookie is not None, "edtekno_pelanggan_session cookie not set after registration!"
        print("PASS: Customer account activation registered successfully and auto-logged in!")

        print("\n--- 6. Testing POST /portal/login explicitly ---")
        client.cookies.clear()  # Clear cookies to test fresh login
        login_payload = {
            "identifier": sample_cust.nama,
            "password": "password123"
        }
        res = client.post("/portal/login", data=login_payload)
        assert res.status_code == 303, f"Expected 303 redirect after login, got {res.status_code}"
        assert res.headers.get("location") == "/portal/"
        cookies = res.cookies
        session_cookie = cookies.get("edtekno_pelanggan_session")
        assert session_cookie is not None, "edtekno_pelanggan_session cookie not set!"
        print(f"PASS: Logged in! Session cookie: {session_cookie[:25]}...")

        # Setup client with session cookie
        client.cookies.set("edtekno_pelanggan_session", session_cookie)

        print("\n--- 7. Testing GET /portal/ (Authenticated Dashboard) ---")
        res = client.get("/portal/")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert sample_cust.nama in res.text
        # Verify SOP: NO "sisa kuota" anywhere
        assert "sisa kuota" not in res.text.lower(), "VIOLATION: 'sisa kuota' detected in dashboard!"
        print("PASS: Customer Dashboard rendered with live data & NO 'sisa kuota'")

        print("\n--- 8. Testing GET /portal/kuota ---")
        res = client.get("/portal/kuota")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert "sisa kuota" not in res.text.lower(), "VIOLATION: 'sisa kuota' detected in kuota page!"
        print("PASS: Kuota page rendered & NO 'sisa kuota'")

        print("\n--- 9. Testing GET /portal/kendala & POST /portal/kendala/buat ---")
        res = client.get("/portal/kendala")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"

        ticket_payload = {
            "kategori": "Internet Lambat / Lemot",
            "deskripsi": "Testing pengajuan kendala dari automated test portal pelanggan.",
            "no_wa": "081234567890"
        }
        res = client.post("/portal/kendala/buat", data=ticket_payload)
        assert res.status_code == 303, f"Expected 303 redirect after ticket submit, got {res.status_code}"
        print("PASS: Ticket created successfully")

        # Verify ticket in DB
        db.commit() # ensure latest snapshot
        latest_ticket = db.query(TiketKendala).filter(TiketKendala.id_pelanggan == sample_cust.id_pelanggan).order_by(TiketKendala.id.desc()).first()
        assert latest_ticket is not None
        print(f"PASS: Verified Ticket in DB: ID={latest_ticket.id_tiket}, Category={latest_ticket.kategori}, Status={latest_ticket.status}")

        print("\n--- 10. Testing GET /portal/profil ---")
        res = client.get("/portal/profil")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert sample_cust.ip_router in res.text
        print("PASS: Profil page rendered successfully")

        print("\n--- 11. Testing GET /portal/logout ---")
        res = client.get("/portal/logout")
        assert res.status_code == 303
        assert "/portal/login" in res.headers.get("location", "")
        print("PASS: Logout redirected to /portal/login and cleared cookie")

    finally:
        db.close()

if __name__ == "__main__":
    test_portal()
    print("\n[SUCCESS] ALL PORTAL E2E TESTS PASSED SUCCESSFULLY!")
