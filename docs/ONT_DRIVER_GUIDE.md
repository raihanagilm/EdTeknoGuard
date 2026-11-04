# Panduan Menambahkan Driver Modem ONT Baru (Plug-and-Play)

Dokumen ini menjelaskan cara menambahkan dukungan modem ONT merek/tipe baru ke dalam sistem **EdTeknoGuard** tanpa mengubah kode engine scraper utama.

---

## 1. Arsitektur ONT Driver Registry

Sistem scraper EdTeknoGuard menggunakan pola arsitektur **Driver / Adapter Pattern**. Engine pemantau (`ONTScraperService`) tidak terikat pada satu merek modem tertentu. Saat mengakses IP modem pelanggan, sistem secara otomatis mencocokkan *fingerprint* respons awal dengan driver yang terdaftar di `ONTDriverRegistry`.

```text
app/services/scraper/
├── base_driver.py              # Interface kontrak abstrak (BaseONTDriver)
├── driver_registry.py          # Registri pusat & auto-resolver driver
└── drivers/                    # Direktori seluruh driver modem
    ├── __init__.py             # Auto-load seluruh driver
    ├── zte_driver.py           # Driver ZTE GM220-S & seri F6xx (Priority 10)
    ├── huawei_driver.py        # Driver Huawei EchoLife HG8xxx / EG8xxx (Priority 20)
    ├── fiberhome_driver.py     # Driver FiberHome HG6243 / AN5506 (Priority 30)
    └── generic_driver.py       # Driver Fallback Universal Regex (Priority 99)
```

---

## 2. Cara Menambahkan Modem Merek Baru

Untuk menambahkan modem merek baru (misalnya **VSOL V2801** atau **C-Data**), Anda cukup membuat **1 file baru** di dalam folder `app/services/scraper/drivers/`:

Contoh berkas: `app/services/scraper/drivers/vsol_driver.py`

```python
from typing import Dict, Any, Optional, Tuple
import requests
from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry
from app.services.scraper.optical_parser import OpticalParser

@ONTDriverRegistry.register
class VSOLDriver(BaseONTDriver):
    driver_id = "vsol"
    display_name = "VSOL GPON/EPON ONT"
    vendor = "VSOL"
    priority = 25  # Angka 1-90 (sebelum Generic 99)

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        """Cek apakah respons web awal mengandung penanda khas VSOL"""
        t = (probe_html or "").lower()
        return "vsol" in t or "v2801" in t

    @classmethod
    def attempt_login(cls, session: requests.Session, base_url: str, host: str, username: str, password: str, probe_text: Optional[str] = None) -> Tuple[bool, Optional[requests.Response]]:
        """Logika autentikasi login khusus VSOL"""
        resp = session.post(f"{base_url}/login.cgi", data={"user": username, "pass": password}, timeout=6)
        if resp.status_code == 200 and "status" in resp.text.lower():
            return True, resp
        return False, resp

    @classmethod
    def extract_optical_data(cls, session: requests.Session, base_url: str, host: str) -> Optional[Dict[str, Any]]:
        """Mengekstrak Rx Power dBm (dapat memanfaatkan OpticalParser universal)"""
        return OpticalParser.extract_optical_data(session=session, base_url=base_url, host=host)

    @classmethod
    def extract_device_and_wifi_data(cls, session: requests.Session, base_url: str, host: str) -> Dict[str, Any]:
        """Ekstraksi model spesifik, SSID, dan kata sandi WiFi"""
        return {
            "mac_address": None,
            "nama_wifi": None,
            "password_wifi": None,
            "jenis_modem": "VSOL V2801"
        }
```

Kemudian, daftarkan impor file tersebut di `app/services/scraper/drivers/__init__.py`:
```python
from app.services.scraper.drivers.vsol_driver import VSOLDriver
```

Selesai! Sistem akan otomatis mendeteksi modem VSOL saat pemindaian berkala maupun live probe.

---

## 3. Cara Menambahkan Seri Baru dari Merek yang Sama (Pewarisan)

Jika modem baru berasal dari merek yang sama (misalnya ZTE mengeluarkan seri **F670L** atau **GM220 versi baru**), Anda cukup **mewarisi driver lama** dan hanya mengubah bagian yang berbeda:

```python
from app.services.scraper.drivers.zte_driver import ZTEDriver
from app.services.scraper.driver_registry import ONTDriverRegistry

@ONTDriverRegistry.register
class ZTEF670Driver(ZTEDriver):
    driver_id = "zte_f670"
    display_name = "ZTE F670L Dual-Band"
    priority = 8  # Diuji sebelum driver ZTE umum

    @classmethod
    def can_handle(cls, probe_html: str, headers=None) -> bool:
        t = (probe_html or "").lower()
        return "f670" in t and super().can_handle(probe_html, headers)
```

---

## 4. Jaring Pengaman Universal (Safety Net)

Jika di lapangan terdapat modem model baru yang **belum sempat dibuatkan driver-nya**:
- Sistem akan otomatis masuk ke **`GenericXPONDriver`** (Priority 99).
- Nilai redaman optik (**Rx Power dBm**) tetap berhasil diambil melalui pemindaian pola numerik desimal universal.
- Pemantauan redaman drop, peringatan dini (-26.0 dBm), dan notifikasi kritis (-27.0 dBm / LOS) tetap berfungsi 100% normal.

