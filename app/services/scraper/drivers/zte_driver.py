"""
zte_driver.py - Driver Modem ONT Seri ZTE (GM220-S, F663, F609, F670L, XPON)
Mengimplementasikan BaseONTDriver untuk modem keluarga ZTE.
"""

import re
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry
from app.services.scraper.zte_scraper import ZTEScraper
from app.services.scraper.optical_parser import OpticalParser


@ONTDriverRegistry.register
class ZTEDriver(BaseONTDriver):
    """
    Driver untuk ONT ZTE GM220-S, F609, F660, F663NV3A, F670L, dan ZTE XPON.
    Mendukung login terenkripsi SHA-256 salted, cookie dosubmit, dan Unicom CU.
    """

    driver_id: str = "zte"
    display_name: str = "ZTE Series (GM220-S / F6xx)"
    vendor: str = "ZTE"
    priority: int = 10  # Prioritas tinggi karena merupakan modem utama ISP

    # Pola fingerprint spesifik ZTE pada respons web probe awal
    FINGERPRINT_KEYWORDS = [
        "template.gch",
        "frm_logintoken",
        "passwordsha256",
        "gpon_status",
        "gm220",
        "f609",
        "f660",
        "f663",
        "f670",
        "zte.com",
        "setdisabled",
        "status_dev_info_t.gch"
    ]

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        """Mendeteksi apakah antarmuka web adalah modem ZTE."""
        t = (probe_html or "").lower()
        if any(kw in t for kw in cls.FINGERPRINT_KEYWORDS):
            return True

        if headers:
            srv = headers.get("Server", "").lower()
            if "zte" in srv:
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
        """Mendelegasikan ke logika login teruji ZTEScraper."""
        return ZTEScraper.attempt_login(
            session=session,
            base_url=base_url,
            host=host,
            user=username,
            password=password,
            probe_text=probe_text
        )

    @classmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """Mengekstrak data redaman optik dari halaman PON ZTE."""
        return OpticalParser.extract_optical_data(session=session, base_url=base_url, host=host)

    @classmethod
    def extract_device_and_wifi_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Dict[str, Any]:
        """Mengekstrak MAC address, model spesifik (GM220-S, F663, dll.), SSID, dan key WiFi."""
        return ZTEScraper.extract_device_and_wifi_data(session=session, base_url=base_url, host=host)

    @classmethod
    def scrape_connected_devices(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> List[Dict[str, Any]]:
        """Mengekstrak daftar perangkat klien yang terhubung ke modem ZTE."""
        return ZTEScraper.scrape_connected_devices(session=session, base_url=base_url, host=host)

    @classmethod
    def update_wifi_credentials(
        cls,
        ip: str,
        user_admin: str,
        pass_admin: str,
        new_ssid: Optional[str] = None,
        new_wifi_password: Optional[str] = None,
        default_credentials: Optional[List[Tuple[str, str]]] = None,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """Memperbarui konfigurasi WiFi pada modem ZTE."""
        return ZTEScraper.update_wifi_credentials(
            ip=ip,
            user_admin=user_admin,
            pass_admin=pass_admin,
            new_ssid=new_ssid,
            new_wifi_password=new_wifi_password,
            default_credentials=default_credentials,
            dry_run=dry_run
        )

    @classmethod
    def set_mac_filter_block(
        cls,
        ip: str,
        user_admin: str,
        pass_admin: str,
        mac_address: str,
        block: bool = True,
        default_credentials: Optional[List[Tuple[str, str]]] = None
    ) -> Dict[str, Any]:
        """Blokir/unblock MAC address klien di modem ZTE."""
        return ZTEScraper.set_mac_filter_block(
            ip=ip,
            user_admin=user_admin,
            pass_admin=pass_admin,
            mac_address=mac_address,
            block=block,
            default_credentials=default_credentials
        )

    @classmethod
    def reboot_modem(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> bool:
        """Mengirimkan sinyal reboot ke ZTE ONT."""
        return ZTEScraper.reboot_modem(session=session, base_url=base_url, host=host)

    @classmethod
    def logout(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> bool:
        """Mengirimkan sinyal logout resmi ke ZTE ONT."""
        return ZTEScraper.logout(session=session, base_url=base_url, host=host)

