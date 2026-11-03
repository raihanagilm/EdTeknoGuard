import unittest
from unittest.mock import MagicMock
from starlette.testclient import TestClient
from app.main import app
from app.portal.core.security import (
    create_customer_session_token,
    verify_customer_session_token,
    create_password_reset_token,
    verify_password_reset_token,
    check_is_home_wifi,
)

class TestPortalApiModules(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_portal_speedtest_ping_endpoint(self):
        """Memastikan endpoint /portal/api/speedtest/ping merespons teks polos 'pong' berlatensi ultra rendah"""
        r = self.client.get("/portal/api/speedtest/ping")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.text, "pong")
        self.assertEqual(r.headers.get("content-type"), "text/plain; charset=utf-8")

    def test_portal_auth_me_unauthenticated(self):
        """Memastikan /portal/api/auth/me memberikan status unauthenticated saat diakses tanpa sesi"""
        r = self.client.get("/portal/api/auth/me")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertFalse(data.get("authenticated", True))
        self.assertIn("message", data)

    def test_portal_protected_endpoints_require_session(self):
        """Memastikan seluruh endpoint domain portal memblokir akses tanpa autentikasi cookie yang valid"""
        protected_endpoints = [
            "/portal/api/dashboard",
            "/portal/api/kuota",
            "/portal/api/kendala",
            "/portal/api/wifi",
        ]
        for ep in protected_endpoints:
            r = self.client.get(ep)
            self.assertEqual(
                r.status_code,
                401,
                f"Endpoint {ep} seharusnya mengembalikan HTTP 401 saat belum terautentikasi"
            )
            data = r.json()
            self.assertFalse(data.get("authenticated", True))

    def test_portal_customer_session_token_cryptography(self):
        """Memvalidasi pembuatan dan verifikasi token sesi pelanggan berbasis itsdangerous"""
        token = create_customer_session_token(
            id_pelanggan="cust202611030001",
            nama="Budi Santoso",
            status_verifikasi="TERVERIFIKASI",
            kantor="cabang",
            account_id=10
        )
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 20)

        # Verifikasi token valid
        decoded = verify_customer_session_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["id_pelanggan"], "cust202611030001")
        self.assertEqual(decoded["nama"], "Budi Santoso")
        self.assertEqual(decoded["kantor"], "cabang")

        # Verifikasi token yang dimanipulasi/rusak harus gagal (returns None)
        tampered_token = token[:-5] + "XXXXX"
        self.assertIsNone(verify_customer_session_token(tampered_token))
        self.assertIsNone(verify_customer_session_token(""))

    def test_password_reset_token_validation(self):
        """Memvalidasi token reset kata sandi mandiri berbatas waktu"""
        reset_token = create_password_reset_token(
            id_pelanggan="cust202611030002",
            no_hp="081234567890",
            kantor="pusat"
        )
        self.assertIsInstance(reset_token, str)

        decoded = verify_password_reset_token(reset_token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["id_pelanggan"], "cust202611030002")
        self.assertEqual(decoded["no_hp"], "081234567890")
        self.assertEqual(decoded["kantor"], "pusat")

        # Token palsu
        self.assertIsNone(verify_password_reset_token("invalid_token_12345"))

    def test_check_is_home_wifi_security_logic(self):
        """
        Memvalidasi logika keamanan akses WiFi rumah:
        - Jika client IP persis sama dengan IP target router -> True
        - Jika client IP berbeda (dari luar jaringan/internet) -> False
        - Jika pelanggan None -> False
        """
        mock_pelanggan = MagicMock()
        mock_pelanggan.ip_router = "192.168.1.1"
        mock_pelanggan.ip_ont = "192.168.1.1"
        mock_pelanggan.mac_address = "AA:BB:CC:DD:EE:FF"
        mock_pelanggan.nama_wifi = "MyHomeWiFi"
        mock_pelanggan.perangkat = None

        # 1. Matching IP persis
        mock_req_match = MagicMock()
        mock_req_match.headers = {"x-forwarded-for": "192.168.1.1"}
        mock_req_match.client = MagicMock(host="192.168.1.1")
        self.assertTrue(check_is_home_wifi(mock_req_match, mock_pelanggan))

        # 2. Mismatched IP (akses dari luar jaringan / seluler 4G)
        mock_req_outside = MagicMock()
        mock_req_outside.headers = {"x-forwarded-for": "103.150.20.55"}
        mock_req_outside.client = MagicMock(host="103.150.20.55")
        self.assertFalse(check_is_home_wifi(mock_req_outside, mock_pelanggan))

        # 3. Pelanggan None
        self.assertFalse(check_is_home_wifi(mock_req_match, None))

if __name__ == "__main__":
    unittest.main()

