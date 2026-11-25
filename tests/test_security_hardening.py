import unittest
from starlette.testclient import TestClient
from app.main import app

class TestSecurityHardening(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        self.client.cookies.clear()

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

    def test_mytekno_auth_rate_limiting(self):
        """Memastikan rate limiting juga melindungi login dan reset password portal MyTekno"""
        test_ip = "192.0.2.100"
        blocked = False
        for i in range(15):
            res = self.client.post(
                "/portal/api/auth/minta-reset-password",
                json={"no_hp": "081234567890"},
                headers={"X-Forwarded-For": test_ip}
            )
            if res.status_code == 429:
                blocked = True
                break
        self.assertTrue(blocked, "Rate limiter harus memblokir flooding reset password MyTekno dengan HTTP 429.")

    def test_protected_admin_endpoints_require_authentication(self):
        """Memastikan endpoint admin & monitoring sensitif menolak request anonim dengan HTTP 401"""
        protected_gets = [
            "/api/kantor/list",
            "/api/customers",
            "/api/pelanggan",
            "/api/customers/CUST001",
            "/api/customers/CUST001/billing",
            "/api/monitoring/status",
            "/api/monitoring/kpi",
            "/api/monitoring/chart-data",
            "/api/monitoring/available-dates",
        ]
        for ep in protected_gets:
            r = self.client.get(ep)
            self.assertEqual(r.status_code, 401, f"Endpoint {ep} wajib menolak akses anonim dengan HTTP 401")

    def test_portal_register_fcm_rejects_unauthenticated_idor(self):
        """Memastikan /portal/api/auth/register-fcm menolak payload id_pelanggan tanpa cookie sesi"""
        r = self.client.post(
            "/portal/api/auth/register-fcm",
            json={"fcm_token": "fake_token_1234567890", "id_pelanggan": "CUST001", "kantor": "pusat"}
        )
        self.assertEqual(r.status_code, 401)

    def test_portal_reset_password_anti_enumeration(self):
        """Memastikan /portal/api/auth/minta-reset-password mengembalikan respons generik tanpa membocorkan nama/ID"""
        r = self.client.post(
            "/portal/api/auth/minta-reset-password",
            json={"no_hp": "089999999999"},
            headers={"X-Forwarded-For": "198.51.100.77"}
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data.get("ok"))
        self.assertNotIn("nama", data)
        self.assertNotIn("id_pelanggan", data)

    def test_production_rejects_weak_secret_key(self):
        """Memastikan mode production menolak SECRET_KEY bawaan atau terlalu pendek"""
        from app.core.config import Settings
        with self.assertRaises(ValueError):
            Settings(APP_ENV="production", SECRET_KEY="edteknoguard-secret-key")
        with self.assertRaises(ValueError):
            Settings(APP_ENV="production", SECRET_KEY="terlalu-pendek")
        prod = Settings(APP_ENV="production", SECRET_KEY="a" * 48)
        self.assertEqual(len(prod.SECRET_KEY), 48)

    def test_trusted_client_ip_and_https_helpers(self):
        """Memastikan ekstraksi IP klien tahan terhadap spoofing dari non-proxy peer"""
        from unittest.mock import MagicMock
        from app.core.security import get_trusted_client_ip, is_https_request

        # Peer langsung dari IP publik tidak boleh dipercaya header X-Forwarded-For-nya
        req_direct = MagicMock()
        req_direct.client = MagicMock(host="203.0.113.50")
        req_direct.headers = {"x-forwarded-for": "127.0.0.1", "cf-connecting-ip": "192.168.1.1"}
        self.assertEqual(get_trusted_client_ip(req_direct), "203.0.113.50")

        # Peer dari Nginx lokal boleh meneruskan CF-Connecting-IP
        req_proxy = MagicMock()
        req_proxy.client = MagicMock(host="127.0.0.1")
        req_proxy.headers = {"x-forwarded-for": "1.1.1.1, 203.0.113.88", "cf-connecting-ip": "203.0.113.88", "x-forwarded-proto": "https"}
        req_proxy.url = MagicMock(scheme="http")
        self.assertEqual(get_trusted_client_ip(req_proxy), "203.0.113.88")
        self.assertTrue(is_https_request(req_proxy))

    def test_cross_role_token_confusion_blocked(self):
        """Memastikan token pelanggan tidak dapat dipakai untuk menembus endpoint Admin NOC, dan sebaliknya"""
        from app.core.security import create_session_token, verify_session_token
        from app.portal.core.security import (
            create_customer_session_token,
            verify_customer_session_token,
            create_password_reset_token,
        )

        cust_token = create_customer_session_token(
            id_pelanggan="CUST-CONF-01",
            nama="Pelanggan Uji",
            status_verifikasi="TERVERIFIKASI",
            kantor="pusat"
        )
        admin_token = create_session_token("admin", role="super admin")
        reset_token = create_password_reset_token("CUST-CONF-01", "081234567890", "pusat")

        # Token pelanggan harus ditolak verify_session_token dan endpoint admin
        self.assertIsNone(verify_session_token(cust_token))
        r_admin = self.client.get("/api/customers", headers={"Authorization": f"Bearer {cust_token}"})
        self.assertEqual(r_admin.status_code, 401)
        self.client.cookies.set("edteknoguard_session", cust_token)
        r_kantor = self.client.get("/api/kantor/list")
        self.assertEqual(r_kantor.status_code, 401)
        self.client.cookies.clear()

        # Token admin & reset password harus ditolak verify_customer_session_token
        self.assertIsNone(verify_customer_session_token(admin_token))
        self.assertIsNone(verify_customer_session_token(reset_token))
        self.assertIsNone(verify_session_token(reset_token))

    def test_cross_office_access_denied_for_non_super_admin(self):
        """Memastikan teknisi/admin cabang tidak dapat mengakses log atau notifikasi kantor lain"""
        from app.core.security import create_session_token, get_all_kantor_codes
        all_k = get_all_kantor_codes()
        if len(all_k) < 2:
            self.skipTest("Membutuhkan minimal 2 kantor aktif di database")
        allowed_office = all_k[0]
        forbidden_office = all_k[1]
        tek_token = create_session_token("teknisi_cabang", role="teknisi", allowed_kantor=[allowed_office])

        r_log = self.client.get(
            f"/api/activity-logs/customers?kantor={forbidden_office}",
            headers={"Authorization": f"Bearer {tek_token}"}
        )
        self.assertEqual(r_log.status_code, 403)

        r_notif = self.client.post(
            "/api/notifications/read",
            json={"type": "ticket", "reference_id": "1", "kantor": forbidden_office},
            headers={"Authorization": f"Bearer {tek_token}"}
        )
        self.assertEqual(r_notif.status_code, 403)

    def test_speedtest_download_upload_require_auth_and_cap_size(self):
        """Memastikan /speedtest/download & /upload mewajibkan login pelanggan dan membatasi ukuran upload"""
        from app.portal.core.security import create_customer_session_token, CUSTOMER_SESSION_COOKIE

        self.client.cookies.clear()
        self.assertEqual(self.client.get("/portal/api/speedtest/download?bytes=1048576").status_code, 401)
        self.assertEqual(self.client.post("/portal/api/speedtest/upload", content=b"hello").status_code, 401)

        cust_token = create_customer_session_token(
            id_pelanggan="CUST-ST-01",
            nama="Speedtest User",
            status_verifikasi="TERVERIFIKASI",
            kantor="pusat"
        )
        self.client.cookies.set(CUSTOMER_SESSION_COOKIE, cust_token)

        # Upload kecil berhasil
        r_ok = self.client.post("/portal/api/speedtest/upload", content=b"x" * 1024)
        self.assertEqual(r_ok.status_code, 200)
        self.assertTrue(r_ok.json().get("ok"))

        # Upload > 10 MB ditolak 413
        r_too_big = self.client.post("/portal/api/speedtest/upload", content=b"x" * (10 * 1024 * 1024 + 1024))
        self.assertEqual(r_too_big.status_code, 413)
