import unittest
from starlette.testclient import TestClient
from app.main import app
from app.core.security import create_session_token

class TestAdminDomainModules(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_admin_domain_routes_protected(self):
        """Memastikan endpoint domain modul admin menolak request tanpa otentikasi admin NOC yang valid (HTTP 401)"""
        # Bersihkan cookie sesi sebelum test proteksi
        self.client.cookies.clear()
        protected_admin_routes = [
            "/api/tiket",
            "/api/kuota",
            "/api/riwayat",
            "/api/notifications/poll",
            "/admin/api/notifications/poll",
        ]
        for ep in protected_admin_routes:
            r = self.client.get(ep)
            self.assertEqual(
                r.status_code,
                401,
                f"Endpoint admin {ep} harus memproteksi akses dengan HTTP 401 Unauthorized"
            )

    def test_notifications_polling_format(self):
        """Memastikan endpoint /api/notifications/poll mengembalikan struktur data polling notifikasi yang valid bagi pengguna yang sudah login"""
        token = create_session_token("admin", role="super admin")
        self.client.cookies.set("edteknoguard_session", token)
        self.client.cookies.set("active_kantor", "tengaran")

        r = self.client.get("/api/notifications/poll?kantor=tengaran")
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

    def test_quota_endpoint_authenticated_structure(self):
        """Memastikan endpoint /api/kuota mengembalikan struktur kuota lengkap dengan quota, paket_options, dan ringkasan trafik"""
        token = create_session_token("admin", role="super admin")
        self.client.cookies.set("edteknoguard_session", token)
        self.client.cookies.set("active_kantor", "tengaran")

        r = self.client.get("/api/kuota?kantor=tengaran")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("quota", data)
        self.assertIn("data", data)
        self.assertIn("paket_options", data)
        self.assertIn("total_pelanggan", data)
        self.assertIn("total_kuota_gb", data)
        self.assertIn("rata_rata_gb", data)
        self.assertIn("current_period", data)
        self.assertIn("active_kantor", data)
        if data["quota"]:
            first = data["quota"][0]
            self.assertIn("id_pelanggan", first)
            self.assertIn("nama", first)
            self.assertIn("paket", first)
            self.assertIn("terpakai_gb", first)
            self.assertIn("ip_router", first)

if __name__ == "__main__":
    unittest.main()
