import unittest
from app.services.scraper.credential_chain import CredentialChainManager
from app.services.scraper.optical_parser import OpticalParser
from app.services.scraper.zte_scraper import ZTEScraper

class TestScraperModules(unittest.TestCase):

    def test_vendor_detection(self):
        """Memastikan pendeteksian karakteristik vendor akurat"""
        zte_html = "<html><head><title>ZTE GPON_STATUS</title></head><body>Frm_Logintoken</body></html>"
        res_zte = CredentialChainManager.detect_ont_vendor_behavior(zte_html)
        self.assertEqual(res_zte["vendor"], "ZTE")
        self.assertTrue(res_zte["require_stay_connection"])
        self.assertTrue(res_zte["supports_sha256"])

        huawei_html = "<html><head><title>HG8245</title></head></html>"
        res_huawei = CredentialChainManager.detect_ont_vendor_behavior(huawei_html)
        self.assertEqual(res_huawei["vendor"], "HUAWEI")

    def test_lockout_parsing(self):
        """Memvalidasi parsing lockout countdown"""
        html_cu_locked = "if (3 == 3) { SetDisable(); }"
        is_locked, wait_sec = CredentialChainManager.parse_lockout_info(html_cu_locked, default_wait=60)
        self.assertTrue(is_locked)
        self.assertEqual(wait_sec, 60)

        html_cu_unlocked = "if (1 == 3) { SetDisable(); }"
        is_locked, _ = CredentialChainManager.parse_lockout_info(html_cu_unlocked)
        self.assertFalse(is_locked)

        html_generic = "Please try again in 45 seconds"
        is_locked, wait_sec = CredentialChainManager.parse_lockout_info(html_generic)
        self.assertTrue(is_locked)
        self.assertEqual(wait_sec, 45)

    def test_credential_candidates_filtering(self):
        """Memvalidasi urutan kandidat kredensial dan eliminasi failed history"""
        customer_u, customer_p = "admin", "pass123"
        default_creds = [("admin", "admin"), ("tekno", "tekno2025")]
        failed_history = [("admin", "pass123")]

        active_list, total, all_creds = CredentialChainManager.build_candidates_list(
            customer_user=customer_u,
            customer_pass=customer_p,
            default_credentials=default_creds,
            failed_credentials_history=failed_history
        )

        self.assertEqual(total, 3)
        # Kredensial yang sudah gagal tidak boleh ada di active_list jika masih ada kandidat lain
        self.assertNotIn(("admin", "pass123", "CUSTOMER"), active_list)
        self.assertEqual(len(active_list), 2)
        self.assertEqual(active_list[0][0], "admin")
        self.assertEqual(active_list[0][1], "admin")

    def test_hex_decode_zte(self):
        """Memvalidasi dekode string escape hex ZTE"""
        raw_ssid = r"My\x20WiFi\x2dHome"
        clean = ZTEScraper.decode_hex_string(raw_ssid)
        self.assertEqual(clean, "My WiFi-Home")

if __name__ == "__main__":
    unittest.main()

