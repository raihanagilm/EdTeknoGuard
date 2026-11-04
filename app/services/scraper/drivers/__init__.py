"""
Inisialisasi paket drivers modem ONT.
Mengimpor seluruh modul driver agar otomatis terdaftar ke ONTDriverRegistry saat aplikasi dimuat.
"""

from app.services.scraper.drivers.zte_driver import ZTEDriver
from app.services.scraper.drivers.huawei_driver import HuaweiDriver
from app.services.scraper.drivers.fiberhome_driver import FiberHomeDriver
from app.services.scraper.drivers.generic_driver import GenericXPONDriver

__all__ = [
    "ZTEDriver",
    "HuaweiDriver",
    "FiberHomeDriver",
    "GenericXPONDriver"
]

