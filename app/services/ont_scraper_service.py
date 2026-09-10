"""
ont_scraper_service.py - Live HTTP Web Scraping Service untuk ONT GM220-S & XPON
Mengambil parameter optik (Rx Power dBm, Suhu, Tx Power, Bias Current, Voltage, GPON State)
secara live dari perangkat modem ONT.
"""

import html
import logging
import re
import time
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.core.config import settings

logger = logging.getLogger("ont_scraper_service")

PON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"

class ONTScraperService:

    @staticmethod
    def get_login_token(session: requests.Session, base_url: str) -> str:
        """Mengekstrak Frm_Logintoken dinamis yang diatur oleh fungsi dosubmit() di javascript."""
        try:
            r = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
            m = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r.text)
            return m.group(1) if m else "5"
        except Exception:
            return "5"

    @staticmethod
    def check_lockout_status(session: requests.Session, base_url: str) -> Tuple[bool, int]:
        """Mengecek apakah modem ONT sedang dalam status lockout akibat 3x salah password."""
        try:
            r = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
            m_time = re.search(r'maxtime\s*=\s*Math\.min\(60,\s*(\d+)\s*\+\s*60\s*-\s*(\d+)\)', r.text)
            if m_time:
                rem = int(m_time.group(1)) + 60 - int(m_time.group(2))
                if rem > 0:
                    return True, rem
        except Exception:
            pass
        return False, 0

    @classmethod
    def attempt_login(cls, session: requests.Session, base_url: str, host: str, user: str, password: str) -> Tuple[bool, Optional[requests.Response]]:
        """Mencoba login ke Web GUI modem ONT."""
        token = cls.get_login_token(session, base_url)
        payload = {
            "action": "login",
            "username": user,
            "Password": password,
            "Frm_Logintoken": token,
            "frashnum": ""
        }
        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "Origin": base_url,
            "Connection": "close",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            r = session.post(f"{base_url}/", data=payload, headers=headers, timeout=10, allow_redirects=True)
        except Exception as e:
            return False, None

        # Tanda kegagalan login
        is_failed = (
            "User information is error" in r.text or
            "wrong username or password" in r.text.lower() or
            "SetDisabled()" in r.text
        )

        is_success = (
            not is_failed and (
                "template.gch" in r.text or
                "top.gch" in r.text or
                "status_dev_info_t.gch" in r.text
            )
        )

        return is_success, r

    @classmethod
    def extract_optical_data(cls, session: requests.Session, base_url: str, host: str) -> Optional[Dict[str, Any]]:
        """Mengambil dan mem-parsing data optik dari halaman status PON."""
        url = f"{base_url}{PON_STATUS_PATH}"
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "Connection": "close",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        r = None
        for attempt in range(1, 3):
            try:
                r = session.get(url, headers=headers, timeout=25)
                if r.status_code == 200:
                    break
            except requests.exceptions.Timeout:
                time.sleep(2)
            except Exception:
                time.sleep(1)

        if not r or r.status_code != 200:
            return None

        content = r.text
        results = {}

        # 1. Ekstraksi Rx Power, Tx Power, Bias Current
        m_rx = re.search(r'var\s+RxPower\s*=\s*["\']([+-]?\d+)["\']', content)
        m_tx = re.search(r'var\s+TxPower\s*=\s*["\']([+-]?\d+)["\']', content)
        m_cur = re.search(r'var\s+Current\s*=\s*["\']([+-]?\d+)["\']', content)
        m_los = re.search(r'var\s+LosInfo\s*=\s*["\'](\d+)["\']', content)

        if m_rx:
            raw_rx = float(m_rx.group(1))
            results["rx_power"] = round(raw_rx / 10000.0, 2)
        else:
            m_rx_html = re.search(r'Optical\s*Module\s*Input\s*Power\(dBm\)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.IGNORECASE)
            results["rx_power"] = float(m_rx_html.group(1)) if m_rx_html else None

        if m_tx:
            raw_tx = float(m_tx.group(1))
            results["tx_power"] = round(raw_tx / 10000.0, 2)
        else:
            m_tx_html = re.search(r'Optical\s*Module\s*Output\s*Power\(dBm\)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.IGNORECASE)
            results["tx_power"] = float(m_tx_html.group(1)) if m_tx_html else None

        if m_cur:
            raw_cur = float(m_cur.group(1))
            results["bias_current_ma"] = round(raw_cur / 1000.0, 2)
        else:
            m_cur_html = re.search(r'Optical\s*Transmitter\s*Bias\s*Current\(uA\)[^<]*</td>\s*<td[^>]*>\s*(\d+)', content, re.IGNORECASE)
            results["bias_current_ma"] = round(float(m_cur_html.group(1)) / 1000.0, 2) if m_cur_html else None

        # 2. Voltage & Temperature
        m_volt = re.search(r'Optical\s*Module\s*Supply\s*Voltage\(uV\)[^<]*</td>\s*<td[^>]*>\s*(\d+)', content, re.IGNORECASE)
        results["supply_voltage_v"] = round(float(m_volt.group(1)) / 1000000.0, 2) if m_volt else None

        m_temp = re.search(r'Operating\s*Temperature[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.IGNORECASE)
        results["suhu_ont"] = float(m_temp.group(1)) if m_temp else None

        # 3. GPON State
        m_loid = re.search(r'id=["\']LoidState["\'][^>]*value=["\'](\d+)["\']', content)
        loid_map = {
            "0": "Init State",
            "1": "LOID is Right",
            "2": "LOID is Wrong",
            "3": "Password is Wrong",
            "4": "Authentication is Successful",
            "5": "Init State"
        }
        if m_loid and m_loid.group(1) in loid_map:
            results["gpon_state"] = loid_map[m_loid.group(1)]
        else:
            m_state = re.search(r'GPON\s*State[^<]*</td>\s*<td[^>]*>\s*([^<]+)', content, re.IGNORECASE)
            results["gpon_state"] = m_state.group(1).strip() if m_state else "Normal"

        results["is_los"] = (m_los.group(1) == "1") if m_los else False

        # 4. Device Serial Number
        try:
            r_dev = session.get(f"{base_url}{STATUS_DEV_PATH}", headers=headers, timeout=10)
            m_sn = re.search(r'id=["\']Frm_PonSerialNumber["\'][^>]*>(.*?)</td>', r_dev.text)
            if m_sn:
                results["pon_sn"] = html.unescape(m_sn.group(1).strip())
            else:
                results["pon_sn"] = None
        except Exception:
            results["pon_sn"] = None

        return results

    @classmethod
    def scrape_ont(
        cls,
        ip: str,
        customer_user: Optional[str],
        customer_pass: Optional[str],
        default_user: str = "admin",
        default_pass: str = "tekno2024",
        customer_name: str = "Pelanggan",
        default_credentials: Optional[List[Tuple[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Melakukan scraping lengkap ke satu perangkat modem ONT.
        Menguji kredensial pelanggan terlebih dahulu. Jika gagal, mencoba kredensial default (multi-list).
        """
        host = ip.strip()
        base_url = f"http://{host}"
        session = requests.Session()
        session.headers.update({"Connection": "close"})

        # Cek status lockout
        is_locked, rem_secs = cls.check_lockout_status(session, base_url)
        if is_locked and rem_secs > 10:
            print(f"[-] [LOCKOUT] ONT {host} ({customer_name}): Modem sedang lockout ({rem_secs}s).")
            return {
                "success": False,
                "error_type": "LOCKOUT",
                "message": f"Modem terkunci sementara ({rem_secs}s tersisa)",
                "status_kredensial": "UNTESTED",
                "status_koneksi": "LOS",
                "rx_power": None,
                "suhu_ont": None,
                "uptime": None,
                "latency_ms": None
            }
        elif is_locked and rem_secs <= 10:
            time.sleep(rem_secs + 1)

        # Kredensial yang akan dicoba berurutan
        credentials_to_try = []
        c_u = customer_user.strip() if customer_user else None
        c_p = customer_pass.strip() if customer_pass else None

        if c_u and c_p:
            credentials_to_try.append((c_u, c_p, "CUSTOMER"))

        # Tambahkan multi default kredensial jika ada
        if default_credentials:
            for d_u, d_p in default_credentials:
                d_u = (d_u or "").strip()
                d_p = (d_p or "").strip()
                if d_u and (d_u, d_p) not in [(u, p) for u, p, _ in credentials_to_try]:
                    credentials_to_try.append((d_u, d_p, "DEFAULT"))
        else:
            d_u = default_user.strip() if default_user else "admin"
            d_p = default_pass.strip() if default_pass else "tekno2024"
            if (d_u, d_p) not in [(u, p) for u, p, _ in credentials_to_try]:
                credentials_to_try.append((d_u, d_p, "DEFAULT"))

        # Cadangan tambahan umum GM220-S
        fallback_common = [("admin", "tekno2024"), ("admin", "admin"), ("tekno", "tekno2025")]
        for u, p in fallback_common:
            if (u, p) not in [(x, y) for x, y, _ in credentials_to_try]:
                credentials_to_try.append((u, p, "COMMON_FALLBACK"))

        authenticated = False
        active_user = None
        active_pass = None
        auth_source = None
        last_resp = None

        start_time = time.time()

        for u, p, source in credentials_to_try:
            ok, resp = cls.attempt_login(session, base_url, host, u, p)
            last_resp = resp
            if ok:
                authenticated = True
                active_user = u
                active_pass = p
                auth_source = source
                break
            time.sleep(1)

        latency = int((time.time() - start_time) * 1000)

        # Kasus A: Autentikasi Gagal
        if not authenticated:
            if last_resp is None:
                # Modem tidak dapat dihubungi sama sekali (Host unreachable / timeout)
                print(f"[-] [TIMEOUT/LOS] ONT {host} ({customer_name}): Gagal terhubung (Host unreachable / Timeout).")
                return {
                    "success": False,
                    "error_type": "UNREACHABLE",
                    "message": "Host unreachable / Request timeout",
                    "status_kredensial": "UNTESTED",
                    "status_koneksi": "LOS",
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": None
                }
            else:
                # Modem merespon tetapi kredensial ditolak
                print(f"[-] [AUTH_FAILED] ONT {host} ({customer_name}): Kredensial modem ditolak (User/Pass salah).")
                return {
                    "success": False,
                    "error_type": "AUTH_FAILED",
                    "message": "Kredensial modem salah / ditolak",
                    "status_kredensial": "INVALID",
                    "status_koneksi": "WARNING",
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": latency
                }

        # Kasus B: Autentikasi Berhasil -> Ambil Data Optik
        opt_data = cls.extract_optical_data(session, base_url, host)

        if not opt_data or opt_data.get("rx_power") is None:
            # Login sukses tetapi modul optik tidak merespon / LOS
            print(f"[!] [OPTICAL_FAILED] ONT {host} ({customer_name}): Login OK, namun parameter optik kosong.")
            return {
                "success": True,
                "status_kredensial": "VALID",
                "updated_user": active_user if auth_source != "CUSTOMER" else None,
                "updated_pass": active_pass if auth_source != "CUSTOMER" else None,
                "status_koneksi": "LOS",
                "rx_power": None,
                "suhu_ont": opt_data.get("suhu_ont") if opt_data else None,
                "uptime": None,
                "latency_ms": latency,
                "message": "Login berhasil, optik LOS / tidak terbaca"
            }

        rx = opt_data["rx_power"]
        suhu = opt_data.get("suhu_ont")

        # Tentukan status koneksi berdasarkan ambang batas
        if opt_data.get("is_los"):
            status_koneksi = "LOS"
        elif rx <= settings.CRITICAL_THRESHOLD_DBM:
            status_koneksi = "CRITICAL"
        elif rx <= settings.WARNING_THRESHOLD_DBM:
            status_koneksi = "WARNING"
        else:
            status_koneksi = "NORMAL"

        print(f"[+] [SUCCESS] ONT {host} ({customer_name}): Rx {rx} dBm | Tx {opt_data.get('tx_power')} dBm | Suhu {suhu}°C | Status: {status_koneksi} | Auth: {active_user} ({auth_source})")

        return {
            "success": True,
            "status_kredensial": "VALID",
            "updated_user": active_user if auth_source != "CUSTOMER" else None,
            "updated_pass": active_pass if auth_source != "CUSTOMER" else None,
            "status_koneksi": status_koneksi,
            "rx_power": rx,
            "tx_power": opt_data.get("tx_power"),
            "suhu_ont": suhu,
            "supply_voltage_v": opt_data.get("supply_voltage_v"),
            "bias_current_ma": opt_data.get("bias_current_ma"),
            "gpon_state": opt_data.get("gpon_state"),
            "pon_sn": opt_data.get("pon_sn"),
            "uptime": 86400,
            "latency_ms": latency,
            "message": "Pengecekan live optik berhasil"
        }
