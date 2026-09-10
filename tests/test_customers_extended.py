import io
import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chart_data_with_date_filter():
    """Menguji endpoint chart data dengan parameter tanggal spesifik"""
    res = client.get("/api/monitoring/chart-data?date=2026-09-10")
    assert res.status_code == 200
    data = res.json()
    assert "labels" in data
    assert "values" in data
    assert "threshold" in data
    assert "avg_dbm" in data
    assert data["date"] == "2026-09-10"

def test_download_template_csv_authenticated():
    """Menguji unduh berkas template CSV pelanggan dengan autentikasi admin"""
    # Login dulu dengan Form data ke /login
    login_res = client.post(
        "/login",
        data={"username": "admin", "password": "agiltampan"},
        follow_redirects=False
    )
    assert login_res.status_code == 303

    res = client.get("/api/customers/template-csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "ID Pelanggan,Nama,Alamat" in res.text

def test_import_csv_and_bulk_delete():
    """Menguji alur import CSV pelanggan baru lalu menghapusnya dengan bulk delete"""
    # 1. Login admin
    login_res = client.post(
        "/login",
        data={"username": "admin", "password": "agiltampan"},
        follow_redirects=False
    )
    assert login_res.status_code == 303

    # 2. Siapkan konten CSV test
    csv_content = (
        "ID Pelanggan,Nama,Alamat,No HP,POP,IP Router,Paket,MAC Address,Redaman,Nama Wifi,Password wifi,Jenis Modem,USER ADMIN,PASS ADMIN\n"
        "TEST-CUST-901,User Test Import 1,Jl Test 1,0812999901,Server Cabang,10.10.99.1,10MB CAB,AA:BB:CC:DD:EE:01,-21.5,WIFI-901,pass901,GM220-S,admin,admin123\n"
        "TEST-CUST-902,User Test Import 2,Jl Test 2,0812999902,Server Cabang,10.10.99.2,20MB CAB,AA:BB:CC:DD:EE:02,-22.0,WIFI-902,pass902,GM220-S,admin,admin123\n"
    ).encode("utf-8")

    files = {
        "file": ("test_import.csv", io.BytesIO(csv_content), "text/csv")
    }

    import_res = client.post("/api/customers/import-csv", files=files)
    assert import_res.status_code == 200
    import_data = import_res.json()
    assert import_data["status"] == "success"
    assert import_data["result"]["total_processed"] >= 2

    # 3. Verifikasi pelanggan ada di list
    detail_res1 = client.get("/api/customers/TEST-CUST-901")
    assert detail_res1.status_code == 200
    assert detail_res1.json()["customer"]["nama"] == "User Test Import 1"

    # 4. Bulk delete kedua pelanggan test
    bulk_res = client.post(
        "/api/customers/bulk-delete",
        json={"ids": ["TEST-CUST-901", "TEST-CUST-902"]}
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["status"] == "success"
    assert bulk_res.json()["deleted_count"] == 2

