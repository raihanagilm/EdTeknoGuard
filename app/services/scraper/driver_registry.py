"""
driver_registry.py - Registry & Dispatcher Terpusat Driver Modem ONT
Mengelola pendaftaran driver dan secara otomatis menentukan driver yang tepat
berdasarkan fingerprint respons awal perangkat modem ONT.
"""

import logging
from typing import List, Type, Optional, Dict, Any
from app.services.scraper.base_driver import BaseONTDriver

logger = logging.getLogger("driver_registry")


class ONTDriverRegistry:
    """
    Pusat registrasi driver modem ONT (Registry Pattern).
    Driver diurutkan berdasarkan priority terkecil (1 = tertinggi).
    """

    _registry: List[Type[BaseONTDriver]] = []

    @classmethod
    def register(cls, driver_cls: Type[BaseONTDriver]) -> Type[BaseONTDriver]:
        """
        Mendaftarkan class driver baru. Dapat digunakan sebagai decorator:
        @ONTDriverRegistry.register
        class MyNewModemDriver(BaseONTDriver):
            ...
        """
        if driver_cls not in cls._registry:
            cls._registry.append(driver_cls)
            # Urutkan berdasarkan priority (angka lebih kecil = prioritas lebih tinggi)
            cls._registry.sort(key=lambda d: getattr(d, "priority", 50))
            logger.info(
                f"[ONTDriverRegistry] Terdaftar driver: '{driver_cls.display_name}' "
                f"(ID: {driver_cls.driver_id}, Priority: {driver_cls.priority})"
            )
        return driver_cls

    @classmethod
    def resolve_driver(
        cls,
        probe_html: str = "",
        headers: Optional[Dict[str, str]] = None
    ) -> Type[BaseONTDriver]:
        """
        Menganalisis fingerprint probe HTML dan headers respons modem,
        kemudian mengembalikan Driver Class yang paling cocok.
        Jika tidak ada driver spesifik yang cocok, mengembalikan GenericXPONDriver.
        """
        # Pastikan driver bawaan sudah termuat
        cls._ensure_drivers_loaded()

        for driver in cls._registry:
            try:
                if driver.can_handle(probe_html, headers):
                    logger.debug(f"[ONTDriverRegistry] Modem terdeteksi cocok dengan driver: {driver.display_name}")
                    return driver
            except Exception as e:
                logger.warning(f"[ONTDriverRegistry] Error saat matching driver {driver.driver_id}: {e}")

        # Fallback ke driver generic
        fallback = cls.get_driver_by_id("generic")
        if fallback:
            return fallback

        # Jika bahkan generic belum ada, ambil driver terakhir di daftar
        return cls._registry[-1] if cls._registry else BaseONTDriver

    @classmethod
    def get_driver_by_id(cls, driver_id: str) -> Optional[Type[BaseONTDriver]]:
        """Mencari driver berdasarkan ID string unik."""
        cls._ensure_drivers_loaded()
        for driver in cls._registry:
            if driver.driver_id.lower() == driver_id.lower():
                return driver
        return None

    @classmethod
    def list_registered_drivers(cls) -> List[Dict[str, Any]]:
        """Mengambil daftar seluruh driver modem yang terpasang di sistem."""
        cls._ensure_drivers_loaded()
        return [
            {
                "driver_id": d.driver_id,
                "display_name": d.display_name,
                "vendor": d.vendor,
                "priority": d.priority
            }
            for d in cls._registry
        ]

    @classmethod
    def _ensure_drivers_loaded(cls):
        """Memuat modul drivers otomatis jika registry masih kosong."""
        if not cls._registry:
            try:
                import app.services.scraper.drivers  # noqa: F401
            except Exception as e:
                logger.error(f"[ONTDriverRegistry] Gagal memuat modul drivers: {e}")

