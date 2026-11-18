import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Pelanggan, LogAktivitasPelanggan
from app.portal.core.security import create_customer_session_token, CUSTOMER_SESSION_COOKIE


@pytest.fixture
def tengaran_customer():
    db = TenantDatabaseManager.get_tenant_session("tengaran")
    cust = db.query(Pelanggan).first()
    if not cust:
        cust = Pelanggan(
            id_pelanggan="PLG-TEST-GPS-01",
            nama="Uji GPS Pelanggan",
            kantor="tengaran",
            is_active=True
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

    c_id = cust.id_pelanggan
    kantor = cust.kantor
    nama = cust.nama
    token = create_customer_session_token(
        id_pelanggan=c_id,
        nama=nama,
        status_verifikasi="TERVERIFIKASI",
        kantor=kantor
    )
    yield cust, token, db
    db.close()


def test_lock_gps_unauthenticated():
    client = TestClient(app)
    res = client.post("/portal/api/profil/lokasi-gps", json={"latitude": -7.123, "longitude": 110.456})
    assert res.status_code == 401


def test_lock_gps_forbidden_when_not_home_wifi(tengaran_customer):
    cust, token, db = tengaran_customer
    client = TestClient(app)
    client.cookies.set(CUSTOMER_SESSION_COOKIE, token)

    # Mock check_is_home_wifi agar mengembalikan False
    with patch("app.portal.modules.profile.routes.check_is_home_wifi", return_value=False):
        res = client.post("/portal/api/profil/lokasi-gps", json={"latitude": -7.123, "longitude": 110.456})
        assert res.status_code == 403
        data = res.json()
        assert data["ok"] is False
        assert data["is_connected_to_home_wifi"] is False
        assert "WiFi modem rumah" in data["message"]


def test_lock_gps_success_and_one_time_policy(tengaran_customer):
    cust, token, db = tengaran_customer
    client = TestClient(app)
    client.cookies.set(CUSTOMER_SESSION_COOKIE, token)

    # Reset lokasi_gps awal
    cust.lokasi_gps = None
    db.commit()

    # Mock check_is_home_wifi agar mengembalikan True
    with patch("app.portal.modules.profile.routes.check_is_home_wifi", return_value=True):
        # 1. Kunci pertama kali
        res1 = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.412345,
            "longitude": 110.512345,
            "accuracy": 8.5
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["ok"] is True
        assert data1["already_locked"] is False
        assert "-7.412345, 110.512345" in data1["lokasi_gps"]

        # Cek di database
        db.refresh(cust)
        assert cust.lokasi_gps == "-7.412345, 110.512345"

        # 2. Percobaan kedua (one-time lock): harus mengembalikan already_locked = True
        res2 = client.post("/portal/api/profil/lokasi-gps", json={
            "latitude": -7.999999,
            "longitude": 110.999999
        })
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["ok"] is True
        assert data2["already_locked"] is True
        assert data2["lokasi_gps"] == "-7.412345, 110.512345"

        # Nilai di database tidak berubah
        db.refresh(cust)
        assert cust.lokasi_gps == "-7.412345, 110.512345"

        # Cleanup log uji
        db.query(LogAktivitasPelanggan).filter(
            LogAktivitasPelanggan.id_pelanggan == cust.id_pelanggan,
            LogAktivitasPelanggan.aksi == "KUNCI_LOKASI_GPS"
        ).delete()
        db.commit()
