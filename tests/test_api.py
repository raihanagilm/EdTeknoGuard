import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.security import create_session_token, SESSION_COOKIE_NAME

client = TestClient(app)
client.cookies.set(SESSION_COOKIE_NAME, create_session_token("admin"))

def test_homepage():
    response = client.get("/")
    assert response.status_code == 200
    assert "EdTekno" in response.text
    assert "Monitoring &amp; Deteksi Dini ONT" in response.text

def test_monitoring_status():
    response = client.get("/api/monitoring/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "interval_minutes" in data
    assert data["interval_minutes"] == 5

def test_kpi_endpoint():
    response = client.get("/api/monitoring/kpi")
    assert response.status_code == 200
    data = response.json()
    assert data["total_monitored"] >= 100
    assert data["warning_threshold"] == -26.0

def test_customer_list():
    response = client.get("/api/customers?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0
    first = data["data"][0]
    assert "id_pelanggan" in first
    assert "nama" in first
    assert "ip_router" in first

def test_chart_data():
    response = client.get("/api/monitoring/chart-data?range=today")
    assert response.status_code == 200
    data = response.json()
    assert "labels" in data
    assert "values" in data
    assert "threshold" in data
    assert data["threshold"] == -26.0

def test_toggle_scheduler():
    response = client.post("/api/monitoring/toggle-scheduler")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["scheduler_status"] in ["RUNNING", "STOPPED"]

    # Kembalikan ke status semula jika sempat berubah
    client.post("/api/monitoring/toggle-scheduler")
