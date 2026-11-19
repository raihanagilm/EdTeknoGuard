import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Pelanggan, LogAktivitasPelanggan
from app.portal.core.security import create_customer_session_token, CUSTOMER_SESSION_COOKIE


@pytest.fixture
def isolated_test_customer():
    db = TenantDatabaseManager.get_tenant_session("tengaran")
    test_id = "PLG-TEST-GPS-ISOLATED"
    # Pastikan bersih sebelum uji
    db.query(LogAktivitasPelanggan).filter(LogAktivitasPelanggan.id_pelanggan == test_id).delete()
    db.query(Pelanggan).filter(Pelanggan.id_pelanggan == test_id).delete()
    db.commit()

    cust = Pelanggan(
        id_pelanggan=test_id,
        nama="Dummy Test GPS Customer",
        kantor="tengaran",
        is_active=True,
        lokasi_gps=None
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)

    token = create_customer_session_token(
        id_pelanggan=test_id,
        nama=cust.nama,
        status_verifikasi="TERVERIFIKASI",
        kantor=cust.kantor
    )

    yield cust, token, db

    # Teardown: Bersihkan 100% tanpa menyentuh pelanggan nyata
    try:
        db.query(LogAktivitasPelanggan).filter(LogAktivitasPelanggan.id_pelanggan == test_id).delete()
        db.query(Pelanggan).filter(Pelanggan.id_pelanggan == test_id).delete()
        db.commit()
    finally:
        db.close()


def test_lock_gps_unauthenticated():
    client = TestClient(app)
    res = client.post("/portal/api/profil/lokasi-gps", json={"latitude": -7.123, "longitude": 110.456})
    assert res.status_code == 401


def test_lock_gps_forbidden_when_not_home_wifi(isolated_test_customer):
    cust, token, db = isolated_test_customer
    client = TestClient(app)
    client.cookies.set(CUSTOMER_SESSION_COOKIE, token)

    # Mock check_is_home_wifi -> False
    with patch("app.portal.modules.profile.routes.check_is_home_wifi", return_value=False):
        res = client.post("/portal/api/profil/lokasi-gps", json={"latitude": -7.123, "longitude": 110.456})
        assert res.status_code == 403
        data = res.json()
        assert data["ok"] is False
        assert data["is_connected_to_home_wifi"] is False
        assert "WiFi modem rumah" in data["message"]


def test_lock_gps_rejects_low_accuracy_when_gps_off(isolated_test_customer):
    cust, token, db = isolated_test_customer
    client = TestClient(app)
    client.cookies.set(CUSTOMER_SESSION_COOKIE, token)

    with patch("app.portal.modules.profile.routes.check_is_home_wifi", return_value=True):
        # Akurasi 1.200 meter (GPS satelit mati, hanya mengandalkan BTS/IP publik)
        res = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.412345,
            "longitude": 110.512345,
            "accuracy": 1200.0
        })
        assert res.status_code == 422
        data = res.json()
        assert data["ok"] is False
        assert data["accuracy_too_low"] is True
        assert "Akurasi lokasi tidak memadai" in data["message"]


def test_lock_gps_initial_and_haversine_tolerance(isolated_test_customer):
    cust, token, db = isolated_test_customer
    client = TestClient(app)
    client.cookies.set(CUSTOMER_SESSION_COOKIE, token)

    with patch("app.portal.modules.profile.routes.check_is_home_wifi", return_value=True):
        # 1. Kunci pertama kali (Akurasi baik: 8.5 meter)
        res1 = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.412345,
            "longitude": 110.512345,
            "accuracy": 8.5
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["ok"] is True
        assert data1["already_locked"] is False
        assert data1["lokasi_gps"] == "-7.412345, 110.512345"

        # Cek di database (commit/expire snapshot agar melihat commit sesi API)
        db.commit()
        db.refresh(cust)
        assert cust.lokasi_gps == "-7.412345, 110.512345"

        # 2. Pengambilan berikutnya masih dalam toleransi (< 100m, misal bergeser ~15 meter)
        res2 = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.412445,
            "longitude": 110.512345,
            "accuracy": 12.0
        })
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["ok"] is True
        assert data2["already_locked"] is True
        assert data2["distance_meters"] <= 100
        assert "konsisten dan cocok" in data2["message"]

        # 3. Pengambilan berikutnya di luar toleransi (> 100m, misal bergeser ~330 meter)
        res3 = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.415345,
            "longitude": 110.512345,
            "accuracy": 15.0
        })
        assert res3.status_code == 400
        data3 = res3.json()
        assert data3["ok"] is False
        assert data3["drift_detected"] is True
        assert data3["distance_meters"] > 100
        assert "menyimpang" in data3["message"]
