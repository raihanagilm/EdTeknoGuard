"""
huawei_driver.py - Driver Modem ONT Seri Huawei (HG8245, EG8145, HG8546)
Mengimplementasikan BaseONTDriver untuk modem keluarga Huawei EchoLife ONT.
"""

import re
import html
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry
from app.services.scraper.optical_parser import OpticalParser

logger = logging.getLogger("huawei_driver")


@ONTDriverRegistry.register
class HuaweiDriver(BaseONTDriver):
    """
    Driver untuk ONT Huawei EchoLife (HG8245H, HG8245A, EG8145V5, HG8546M).
    Umumnya menggunakan endpoint login berbasis asp/login.asp atau form post.
    """

    driver_id: str = "huawei"
    display_name: str = "Huawei EchoLife (HG8xxx / EG8xxx)"
    vendor: str = "Huawei"
    priority: int = 20

    FINGERPRINT_KEYWORDS = [
        "asp/login.asp",
        "huawei",
        "hg8245",
        "eg8145",
        "hg8546",
        "echolife",
        "ontinfo.asp",
        "status_pon.asp"
    ]

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        t = (probe_html or "").lower()
        if any(kw in t for kw in cls.FINGERPRINT_KEYWORDS):
            return True
        if headers:
            srv = headers.get("Server", "").lower()
            if "huawei" in srv or "micro_httpd" in srv:
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
        """
        Login ke antarmuka web Huawei (POST ke /login.cgi atau /asp/login.asp).
        """
        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        login_endpoints = [
            f"{base_url}/login.cgi",
            f"{base_url}/asp/login.asp",
            f"{base_url}/index.asp"
        ]

        payload = {
            "UserName": username,
            "PassWord": password,
            "x.X_HW_Token": "1"
        }

        last_resp = None
        for endpoint in login_endpoints:
            try:
                resp = session.post(endpoint, data=payload, headers=headers, timeout=6)
                last_resp = resp
                if resp.status_code == 200:
                    text_lower = resp.text.lower()
                    # Indikator login sukses Huawei: diarahkan ke mainframe/status
                    if any(k in text_lower for k in ["main.asp", "frame.asp", "logout", "ontinfo.asp", "status"]):
                        return True, resp
                    # Cek cookie sesi login
                    if session.cookies.get("Cookie") or session.cookies.get("SessionId"):
                        return True, resp
            except Exception as e:
                logger.debug(f"[HuaweiDriver] Gagal coba login ke {endpoint}: {e}")

        return False, last_resp

    @classmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """Mengekstrak redaman optik dari halaman status PON Huawei."""
        # Mencoba rute optik khusus Huawei sebelum fallback ke universal
        huawei_paths = [
            "/html/optic_info.html",
            "/status_pon.asp",
            "/pon_info.asp",
            "/optical_info.asp"
        ]
        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        for path in huawei_paths:
            try:
                r = session.get(f"{base_url}{path}", headers=headers, timeout=6)
                if r.status_code == 200 and ("dbm" in r.text.lower() or "rx" in r.text.lower()):
                    # Parsing regex dBm
                    m_rx = re.search(r'(-\d{1,2}(?:\.\d{1,2})?)\s*(?:dBm)?', r.text, re.I)
                    if m_rx:
                        rx_val = float(m_rx.group(1))
                        return {
                            "rx_power": rx_val,
                            "suhu_ont": None,
                            "is_los": rx_val <= -40.0
                        }
            except Exception:
                pass

        # Fallback ke OpticalParser universal
        return OpticalParser.extract_optical_data(session=session, base_url=base_url, host=host)

    @classmethod
    def extract_device_and_wifi_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Dict[str, Any]:
        """Ekstraksi model spesifik Huawei (misal HG8245H / EG8145V5)"""
        res = {
            "mac_address": None,
            "nama_wifi": None,
            "password_wifi": None,
            "jenis_modem": "Huawei ONT"
        }
        try:
            r = session.get(f"{base_url}/ontinfo.asp", timeout=6)
            if r.status_code == 200:
                t = r.text
                m_model = re.search(r'(?:Device\s*Type|Product\s*Name|Model)[^<]*</td>\s*<td[^>]*>(.*?)</td>', t, re.I)
                if m_model:
                    clean = re.sub(r'<[^>]+>', '', html.unescape(m_model.group(1))).strip()
                    if clean:
                        res["jenis_modem"] = f"Huawei {clean}"
        except Exception:
            pass
        return res

