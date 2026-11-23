import unittest
from starlette.testclient import TestClient
from app.main import app

class TestSecurityHardening(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_security_headers_present(self):
        """Memastikan seluruh respons menyertakan header keamanan standar HTTP industri"""
        r = self.client.get("/portal/api/speedtest/ping")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(r.headers.get("x-frame-options"), "SAMEORIGIN")
        self.assertEqual(r.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin")

    def test_login_rate_limiting_triggers(self):
        """Memastikan proteksi rate limiting aktif membatasi percobaan login beruntun berlebihan"""
        test_ip = "192.0.2.99"
        # Kirim permintaan login gagal berkali-kali dari IP yang sama
        blocked = False
        for i in range(15):
            res = self.client.post(
                "/api/auth/login",
                json={"username": "attacker", "password": "wrongpassword"},
                headers={"X-Forwarded-For": test_ip}
            )
            if res.status_code == 429:
                blocked = True
                self.assertIn("Terlalu banyak percobaan", res.json().get("detail", ""))
                break

        self.assertTrue(blocked, "Rate limiter harus memblokir dengan status HTTP 429 jika melebihi batas percobaan.")
