"""
base_driver.py - Kontrak Standar (Abstract Base Class) Driver Modem ONT
Setiap jenis atau model modem ONT (ZTE, Huawei, FiberHome, VSOL, dll.)
wajib mengimplementasikan interface ini agar dapat terpasang secara plug-and-play.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple, List
import requests


class BaseONTDriver(ABC):
    """
    Interface abstrak untuk semua driver modem ONT di EdTeknoGuard.
    Memungkinkan penambahan merek dan seri modem baru tanpa mengubah core scraper.
    """

    driver_id: str = "base"
    display_name: str = "Base ONT Driver"
    vendor: str = "Generic"
    priority: int = 50  # Prioritas deteksi (angka lebih kecil = diperiksa lebih awal)

    @classmethod
    @abstractmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        """
        Memeriksa apakah fingerprint dari respons probe awal cocok dengan modem ini.
        Contoh: mengecek tag title, nama script JS, form token, atau Server header.
        """
        pass

    @classmethod
    @abstractmethod
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
        Melakukan proses autentikasi login ke antarmuka web modem ONT.
        Mengembalikan tuple: (is_success, last_response).
        """
        pass

    @classmethod
    @abstractmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """
        Mengekstrak parameter optik (Rx Power, Tx Power, Suhu ONT, Voltase, Bias Current).
        """
        pass

    @classmethod
    def extract_device_and_wifi_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Dict[str, Any]:
        """
        Mengekstrak metadata perangkat (MAC address, jenis_modem, SSID, password WiFi).
        Implementasi default mengembalikan dictionary kosong.
        """
        return {
            "mac_address": None,
            "nama_wifi": None,
            "password_wifi": None,
            "jenis_modem": cls.display_name
        }

    @classmethod
    def scrape_connected_devices(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> List[Dict[str, Any]]:
        """
        Mengekstrak daftar perangkat klien yang sedang terhubung ke WiFi/LAN modem.
        """
        return []

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
        """
        Mengubah SSID atau kata sandi WiFi modem ONT.
        """
        return {
            "success": False,
            "message": f"Fitur ubah WiFi belum didukung untuk driver {cls.display_name}"
        }

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
        """
        Memblokir atau mengizinkan MAC address klien di modem.
        """
        return {
            "success": False,
            "message": f"Fitur blokir MAC belum didukung untuk driver {cls.display_name}"
        }

    @classmethod
    def reboot_modem(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> bool:
        """
        Mengirimkan perintah restart/reboot fisik ke modem ONT.
        """
        return False

