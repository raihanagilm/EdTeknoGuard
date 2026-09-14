import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.security import create_session_token, SESSION_COOKIE_NAME

client = TestClient(app)
client.cookies.set(SESSION_COOKIE_NAME, create_session_token("admin"))

def test_audit_logs_workflow():
    # 1. Toggle scheduler -> Jeda / Mulai
    res = client.post("/api/monitoring/toggle-scheduler")
    assert res.status_code == 200
    st1 = res.json()["scheduler_status"]

    # Toggle balik
    res2 = client.post("/api/monitoring/toggle-scheduler")
    assert res2.status_code == 200

    # 2. Cek apakah tercatat di activity logs
    res_logs = client.get("/api/activity-logs?limit=10")
    assert res_logs.status_code == 200
    data = res_logs.json()["data"]
    actions = [l["action"] for l in data]
    assert "START_MONITORING" in actions or "PAUSE_MONITORING" in actions

    # 3. Create customer -> Tambah Pelanggan
    cust_data = {
        "nama": "Test Audit User",
        "alamat": "Jl. Audit No. 1",
        "no_hp": "081299998888",
        "pop": "POP-01",
        "ip_router": "10.10.99.99",
        "paket": "20 Mbps",
        "jenis_modem": "ZTE GM220-S",
        "mac_address": "AA:BB:CC:DD:EE:99",
        "redaman_baseline": -21.5,
        "snmp_community": "public",
        "user_admin": "admin",
        "pass_admin": "admin"
    }
    # Clean up if exists first
    client.delete("/api/customers/P1010999900001")

    res_create = client.post("/api/customers", json=cust_data)
    if res_create.status_code == 200:
        created_id = res_create.json()["id_pelanggan"]

        # Edit customer
        res_edit = client.put(f"/api/customers/{created_id}", json={"nama": "Test Audit User Updated"})
        assert res_edit.status_code == 200

        # Delete customer
        res_del = client.delete(f"/api/customers/{created_id}")
        assert res_del.status_code == 200

    # 4. Settings update
    res_settings = client.post("/api/settings", json={
        "polling_interval_minutes": 5,
        "warning_threshold_dbm": -26.0,
        "critical_threshold_dbm": -27.0,
        "scheduler_status": "RUNNING",
        "default_modem_user": "admin",
        "default_modem_pass": "admin",
        "default_modem_credentials": [{"username": "admin", "password": "admin"}],
        "apply_to_invalid_customers": False
    })
    assert res_settings.status_code == 200

    # 5. Check all new actions in logs
    res_final = client.get("/api/activity-logs?limit=20")
    assert res_final.status_code == 200
    final_actions = [l["action"] for l in res_final.json()["data"]]
    print("Logged Actions:", set(final_actions))
    assert "UPDATE_SETTINGS" in final_actions

def test_render_user_logs_page():
    res = client.get("/user-logs")
    assert res.status_code == 200
    html = res.text
    # Pastikan judul & elemen utama ada
    assert "Audit Log Aktivitas Karyawan / User" in html
    # Pastikan opsi filter aksi baru tersedia
    assert "START_MONITORING" in html
    assert "PAUSE_MONITORING" in html
    assert "IMPORT_PELANGGAN" in html
    assert "TAMBAH_PELANGGAN" in html
    assert "EDIT_PELANGGAN" in html
    assert "HAPUS_PELANGGAN" in html
    assert "HAPUS_PELANGGAN_MASSAL" in html
    assert "UPDATE_SETTINGS" in html

