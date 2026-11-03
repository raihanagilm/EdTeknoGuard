import unittest
from starlette.testclient import TestClient
from app.main import app

class TestAdminDomainModules(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_admin_domain_routes_protected(self):
        """Memastikan endpoint domain modul admin menolak request tanpa otentikasi admin NOC yang valid (HTTP 401)"""
        protected_admin_routes = [
            "/api/tiket",
            "/api/kuota",
            "/api/riwayat",
        ]
        for ep in protected_admin_routes:
            r = self.client.get(ep)
            self.assertEqual(
                r.status_code,
                401,
                f"Endpoint admin {ep} harus memproteksi akses dengan HTTP 401 Unauthorized"
            )

    def test_notifications_polling_format(self):
        """Memastikan endpoint /api/notifications/poll mengembalikan struktur data polling notifikasi yang valid"""
        r = self.client.get("/api/notifications/poll")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("total_unread", data)
        self.assertIn("notifications", data)
        self.assertIsInstance(data["notifications"], list)
        self.assertIn("notification_config", data)
        cfg = data["notification_config"]
        self.assertIn("vibration_enabled", cfg)
        self.assertIn("alert_waiting_interval_minutes", cfg)

if __name__ == "__main__":
    unittest.main()

