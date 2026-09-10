import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.security import SESSION_COOKIE_NAME, create_session_token

def test_unauthenticated_redirect():
    """Halaman terproteksi harus me-redirect (303 atau ke login) jika belum login"""
    client = TestClient(app, follow_redirects=False)
    
    # Test root dashboard
    resp = client.get("/")
    assert resp.status_code in [303, 307]
    assert resp.headers["location"] == "/login"

    # Test /pelanggan
    resp_cust = client.get("/pelanggan")
    assert resp_cust.status_code in [303, 307]
    assert resp_cust.headers["location"] == "/login"

    # Test /telegram
    resp_tele = client.get("/telegram")
    assert resp_tele.status_code in [303, 307]
    assert resp_tele.headers["location"] == "/login"

    # Test /logs
    resp_logs = client.get("/logs")
    assert resp_logs.status_code in [303, 307]
    assert resp_logs.headers["location"] == "/login"


def test_login_success():
    """Login dengan kredensial yang benar harus sukses dan menyetel cookie sesi"""
    client = TestClient(app, follow_redirects=False)
    
    resp = client.post(
        "/login",
        data={"username": "admin", "password": "agiltampan"}
    )
    assert resp.status_code == 303
    assert resp.headers["location"] == "/"
    assert SESSION_COOKIE_NAME in resp.cookies


def test_login_failure():
    """Login dengan password salah harus ditolak dan menampilkan pesan kesalahan"""
    client = TestClient(app, follow_redirects=True)
    
    resp = client.post(
        "/login",
        data={"username": "admin", "password": "wrongpassword"}
    )
    assert resp.status_code == 200
    assert "Username atau password yang Anda masukkan salah" in resp.text
    assert SESSION_COOKIE_NAME not in client.cookies


def test_authenticated_access():
    """Client dengan cookie sesi valid harus dapat mengakses seluruh halaman"""
    client = TestClient(app)
    token = create_session_token("admin")
    client.cookies.set(SESSION_COOKIE_NAME, token)

    # Dashboard
    resp = client.get("/")
    assert resp.status_code == 200
    assert "EdTekno" in resp.text
    assert "Monitoring &amp; Deteksi Dini ONT" in resp.text

    # Pelanggan
    resp_cust = client.get("/pelanggan")
    assert resp_cust.status_code == 200
    assert "Manajemen Pelanggan" in resp_cust.text

    # Telegram
    resp_tele = client.get("/telegram")
    assert resp_tele.status_code == 200
    assert "Manajemen Bot Telegram" in resp_tele.text

    # Logs
    resp_logs = client.get("/logs")
    assert resp_logs.status_code == 200
    assert "Riwayat Log Performa ONT" in resp_logs.text


def test_logout():
    """Logout harus membersihkan session cookie dan redirect ke /login"""
    client = TestClient(app, follow_redirects=False)
    token = create_session_token("admin")
    client.cookies.set(SESSION_COOKIE_NAME, token)

    resp = client.get("/logout")
    assert resp.status_code == 303
    assert resp.headers["location"] == "/login"
    
    # Cookie expired/deleted
    cookie_header = resp.headers.get("set-cookie", "")
    assert SESSION_COOKIE_NAME in cookie_header
