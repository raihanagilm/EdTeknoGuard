import unittest
from starlette.testclient import TestClient
from app.main import app
from app.core.account_lockout import account_lockout_manager, AccountLockoutManager


class TestAccountLockout(unittest.TestCase):

    def setUp(self):
        # Bersihkan seluruh state lockout sebelum setiap pengujian
        account_lockout_manager.reset_all()

    def tearDown(self):
        account_lockout_manager.reset_all()

    def test_normalize_identifier(self):
        """Memastikan variasi penulisan nomor WhatsApp dinormalisasi ke satu key identik."""
        variations = [
            "081234567890",
            "6281234567890",
            "+62 812-3456-7890",
            "81234567890",
            "0812-3456-7890"
        ]
        keys = {AccountLockoutManager.normalize_identifier(v) for v in variations}
        self.assertEqual(len(keys), 1, "Seluruh format nomor HP harus menghasilkan key kanonikal tunggal.")
        self.assertEqual(list(keys)[0], "tel:81234567890")

        # Username teks non-telepon
        self.assertEqual(AccountLockoutManager.normalize_identifier("AdminNOC"), "user:adminnoc")

    def test_lockout_after_five_failures(self):
        """Memastikan akun dikunci setelah 5 kali gagal berturut-turut."""
        phone = "081299998888"
        self.assertFalse(account_lockout_manager.is_locked(phone)[0])

        for i in range(1, 5):
            locked, count, rem = account_lockout_manager.record_failure(phone)
            self.assertFalse(locked)
            self.assertEqual(count, i)
            self.assertEqual(rem, 5 - i)

        # Percobaan ke-5 harus langsung memicu lockout
        locked, count, rem = account_lockout_manager.record_failure(phone)
        self.assertTrue(locked)
        self.assertEqual(count, 5)
        self.assertGreater(rem, 0)

        # Pemeriksaan status terkunci
        is_locked, remaining_sec = account_lockout_manager.is_locked(phone)
        self.assertTrue(is_locked)
        self.assertGreater(remaining_sec, 800)

    def test_cross_format_lockout_enforcement(self):
        """Penyerang yang merotasi awalan 08, 62, dan +62 harus tetap terkunci pada nomor yang sama."""
        test_attempts = [
            "081277776666",
            "6281277776666",
            "+62 812-7777-6666",
            "81277776666",
            "081277776666"
        ]
        last_locked = False
        for num in test_attempts:
            last_locked, _, _ = account_lockout_manager.record_failure(num)

        self.assertTrue(last_locked, "Percobaan ke-5 lintas format harus memicu lockout.")
        # Cek dengan format lain tetap terkunci
        self.assertTrue(account_lockout_manager.is_locked("+6281277776666")[0])

    def test_success_resets_failure_count(self):
        """Login sukses harus mereset counter kegagalan menjadi nol."""
        phone = "081255554444"
        for _ in range(3):
            account_lockout_manager.record_failure(phone)

        # Simulasikan login sukses
        account_lockout_manager.record_success(phone)

        # Cek status: tidak terkunci
        self.assertFalse(account_lockout_manager.is_locked(phone)[0])

        # Gagal 1x lagi harus mulai dari percobaan ke-1
        _, count, rem = account_lockout_manager.record_failure(phone)
        self.assertEqual(count, 1)
        self.assertEqual(rem, 4)

    def test_unlock_explicit(self):
        """Fungsi unlock harus segera membebaskan akun yang terkunci."""
        phone = "081211112222"
        for _ in range(5):
            account_lockout_manager.record_failure(phone)

        self.assertTrue(account_lockout_manager.is_locked(phone)[0])
        account_lockout_manager.unlock(phone)
        self.assertFalse(account_lockout_manager.is_locked(phone)[0])

    def test_portal_login_api_lockout_response(self):
        """Memastikan API /portal/api/auth/login merespons dengan status terkunci dan pesan informatif."""
        client = TestClient(app)
        target_phone = "089876543210"

        # Kirim 5x login gagal dengan password salah
        for i in range(4):
            client.post(
                "/portal/api/auth/login",
                json={"identifier": target_phone, "password": "wrongpassword123"},
                headers={"X-Forwarded-For": f"10.0.0.{i+1}"}
            )

        # Percobaan ke-5
        res5 = client.post(
            "/portal/api/auth/login",
            json={"identifier": target_phone, "password": "wrongpassword123"},
            headers={"X-Forwarded-For": "10.0.0.5"}
        )
        self.assertEqual(res5.status_code, 423)
        data5 = res5.json()
        self.assertFalse(data5.get("ok"))
        self.assertTrue(data5.get("locked"))
        self.assertIn("dikunci sementara", data5.get("message", ""))

        # Percobaan ke-6 (sudah dalam status terkunci dari IP berbeda)
        res6 = client.post(
            "/portal/api/auth/login",
            json={"identifier": target_phone, "password": "anypassword"},
            headers={"X-Forwarded-For": "10.0.0.99"}
        )
        self.assertEqual(res6.status_code, 423)
        data6 = res6.json()
        self.assertTrue(data6.get("locked"))
        self.assertIn("terkunci sementara", data6.get("message", ""))
