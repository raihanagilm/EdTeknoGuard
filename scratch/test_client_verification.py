import sys
from pathlib import Path
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.main import app
from app.core.security import create_session_token, SESSION_COOKIE_NAME

def test_api():
    client = TestClient(app)
    token = create_session_token("admin", "super admin", "Agil Admin", ["cabang", "pusat", "banyumas"])
    client.cookies.set(SESSION_COOKIE_NAME, token)

    # 1. Test /pelanggan page renders properly
    res = client.get("/pelanggan")
    assert res.status_code == 200
    print("GET /pelanggan status:", res.status_code)

    # 2. Test /admin/tiket page renders properly
    res_tiket = client.get("/admin/tiket")
    assert res_tiket.status_code == 200
    print("GET /admin/tiket status:", res_tiket.status_code)

    # 3. Test POST /admin/api/tiket/TK-202609-3667/status with DICEK_ADMIN
    res_update = client.post(
        "/admin/api/tiket/TK-202609-3667/status",
        json={"new_status": "DICEK_ADMIN", "catatan": "Diuji via JSON endpoint"}
    )
    print("POST /admin/api/tiket/TK-202609-3667/status result:", res_update.json())
    assert res_update.json().get("status") == "success"

    print("ALL API ROUTE TESTS PASSED!")

if __name__ == "__main__":
    test_api()
