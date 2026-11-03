import unittest
from unittest.mock import patch, MagicMock
import requests
from app.services.scraper.credential_chain import CredentialChainManager
from app.services.scraper.optical_parser import OpticalParser
from app.services.scraper.zte_scraper import ZTEScraper
from app.services.ont_scraper_service import ONTScraperService

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

    @patch("requests.Session.get")
    def test_unreachable_preserves_valid_status_kredensial(self, mock_get):
        """Memastikan modem yang berstatus VALID tetap mempertahankan status_kredensial VALID saat tidak terjangkau (LOS)"""
        mock_get.side_effect = requests.exceptions.ConnectTimeout("Connection timed out")

        # Kasus 1: Modem yang sudah VALID
        res_valid = ONTScraperService.scrape_ont(
            ip="10.10.2.100",
            customer_user="admin",
            customer_pass="tekno2024",
            is_valid_modem=True
        )
        self.assertEqual(res_valid["status_koneksi"], "LOS")
        self.assertEqual(res_valid["status_kredensial"], "VALID")
        self.assertEqual(res_valid["error_type"], "UNREACHABLE")

        # Kasus 2: Modem baru / belum terverifikasi
        res_untested = ONTScraperService.scrape_ont(
            ip="10.10.2.100",
            customer_user="admin",
            customer_pass="tekno2024",
            is_valid_modem=False
        )
        self.assertEqual(res_untested["status_koneksi"], "LOS")
        self.assertEqual(res_untested["status_kredensial"], "UNTESTED")

    @patch("time.sleep", return_value=None)
    @patch("requests.Session.get")
    @patch("app.services.scraper.optical_parser.OpticalParser.extract_optical_data")
    @patch("app.services.scraper.zte_scraper.ZTEScraper.extract_device_and_wifi_data")
    @patch("app.services.scraper.zte_scraper.ZTEScraper.attempt_login")
    def test_adaptive_retry_on_valid_or_customer_credentials(self, mock_login, mock_device_wifi, mock_optical, mock_get, mock_sleep):
        """Memastikan percobaan login kedua berhasil ketika percobaan pertama ditolak sementara (ZTE reconnect lag)"""
        mock_resp_probe = MagicMock()
        mock_resp_probe.text = "<html><body>ZTE GM220</body></html>"
        mock_get.return_value = mock_resp_probe

        mock_fail_resp = MagicMock()
        mock_fail_resp.text = "<html><body>Login Failed</body></html>"
        mock_fail_resp.url = "http://10.10.2.100/"

        mock_success_resp = MagicMock()
        mock_success_resp.text = "<html><body>template.gch</body></html>"
        mock_success_resp.url = "http://10.10.2.100/template.gch"

        # Panggilan 1 gagal, Panggilan 2 sukses
        mock_login.side_effect = [
            (False, mock_fail_resp),
            (True, mock_success_resp)
        ]

        mock_optical.return_value = {
            "rx_power": -21.4,
            "tx_power": 2.1,
            "suhu_ont": 42.0,
            "is_los": False
        }
        mock_device_wifi.return_value = {
            "mac_address": "AA:BB:CC:DD:EE:FF"
        }

        res = ONTScraperService.scrape_ont(
            ip="10.10.2.100",
            customer_user="admin",
            customer_pass="admin",
            is_valid_modem=True
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["status_kredensial"], "VALID")
        self.assertEqual(res["status_koneksi"], "NORMAL")
        self.assertEqual(res["rx_power"], -21.4)
        # Login dicoba 2 kali (berhasil di percobaan kedua)
        self.assertEqual(mock_login.call_count, 2)

if __name__ == "__main__":
    unittest.main()
