"""
fiberhome_driver.py - Driver Modem ONT Seri FiberHome (HG6243, AN5506)
Mengimplementasikan BaseONTDriver untuk modem keluarga FiberHome.
"""

import re
import html
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry
from app.services.scraper.optical_parser import OpticalParser

logger = logging.getLogger("fiberhome_driver")


@ONTDriverRegistry.register
class FiberHomeDriver(BaseONTDriver):
    """
    Driver untuk ONT FiberHome (HG6243C, AN5506-04, FH-Series).
    Umumnya menggunakan endpoint fh_login atau form post cgi.
    """

    driver_id: str = "fiberhome"
    display_name: str = "FiberHome (HG6243 / AN5506)"
    vendor: str = "FiberHome"
    priority: int = 30

    FINGERPRINT_KEYWORDS = [
        "fiberhome",
        "hg6243",
        "an5506",
        "fh_login",
        "fh_status",
        "fh_optic"
    ]

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        t = (probe_html or "").lower()
        if any(kw in t for kw in cls.FINGERPRINT_KEYWORDS):
            return True
        if headers:
            srv = headers.get("Server", "").lower()
            if "fiberhome" in srv:
                return True
        return False

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
        """Login ke antarmuka web FiberHome."""
        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        login_url = f"{base_url}/cgi-bin/login.cgi"
        payload = {"username": username, "password": password}

        try:
            resp = session.post(login_url, data=payload, headers=headers, timeout=6)
            if resp.status_code == 200:
                t = resp.text.lower()
                if "logout" in t or "status" in t or "device" in t:
                    return True, resp
            return False, resp
        except Exception as e:
            logger.debug(f"[FiberHomeDriver] Gagal login: {e}")
            return False, None

    @classmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """Mengekstrak data optik dari FiberHome."""
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
            "jenis_modem": "FiberHome ONT"
        }

