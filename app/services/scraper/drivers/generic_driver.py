"""
generic_driver.py - Driver Fallback Universal untuk Modem XPON / Brand Baru
Mengimplementasikan BaseONTDriver dengan Universal Regex Parser.
Menjamin nilai redaman optik tetap terbaca walaupun model modem belum didaftarkan resmi.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry
from app.services.scraper.optical_parser import OpticalParser

logger = logging.getLogger("generic_driver")


@ONTDriverRegistry.register
class GenericXPONDriver(BaseONTDriver):
    """
    Driver Fallback Universal.
    Menangani modem XPON generik, VSOL, HIOSO, C-Data, dan model-model baru yang belum memiliki driver khusus.
    """

    driver_id: str = "generic"
    display_name: str = "Generic XPON / Auto-Detected"
    vendor: str = "Generic"
    priority: int = 99  # Prioritas terendah, bertindak sebagai safety net terakhir

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        # Selalu True agar menjadi penampung terakhir jika driver lain tidak cocok
        return True

    @classmethod
    def attempt_login(
        cls,
        session: requests.Session,
        base_url: str,
        host: str,
        username: str,
        password: str,
        probe_text: Optional[str] = None
    ) -> Tuple[bool, Optional[requests.Response]]:
        """Mencoba login via form standar POST ke / atau /login.cgi."""
        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        for endpoint in [f"{base_url}/login.cgi", f"{base_url}/", f"{base_url}/login.html"]:
            try:
                resp = session.post(
                    endpoint,
                    data={"username": username, "password": password, "user": username, "pass": password},
                    headers=headers,
                    timeout=5
                )
                if resp.status_code == 200:
                    t = resp.text.lower()
                    if "logout" in t or "status" in t or "index" in t:
                        return True, resp
            except Exception:
                pass
        return False, None

    @classmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """Menggunakan Universal OpticalParser (mencari pola regex -XX.XX dBm di seluruh jalur PON umum)."""
        return OpticalParser.extract_optical_data(session=session, base_url=base_url, host=host)

    @classmethod
    def extract_device_and_wifi_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Dict[str, Any]:
        return {
            "mac_address": None,
            "nama_wifi": None,
            "password_wifi": None,
            "jenis_modem": "Generic XPON"
        }

