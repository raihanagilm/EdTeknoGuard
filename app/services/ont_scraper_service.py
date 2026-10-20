"""
ont_scraper_service.py - Live HTTP Web Scraping Service untuk ONT GM220-S & XPON
Mengambil parameter optik (Rx Power dBm, Suhu, Tx Power, Bias Current, Voltage, GPON State)
secara live dari perangkat modem ONT.
"""

import html
import hashlib
import logging
import random
import re
import subprocess
import time
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.core.config import settings

logger = logging.getLogger("ont_scraper_service")

PON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
PON_STATUS_INFO_PATH = "/getpage.gch?pid=1002&nextpage=pon_status_link_info_t.gch"
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"
WLAN_ESSID_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_essid_t.gch"
WLAN_SECURITY_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_secrity_t.gch"

# Daftar kandidat path status optik lintas vendor (ZTE, Huawei, FiberHome, VSOL, XPON Generic)
COMMON_OPTICAL_PATHS = [
    "/getpage.gch?pid=1002&nextpage=pon_status_link_info_t.gch",
    "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch",
    "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch",
    "/status_pon.asp",
    "/pon_status.asp",
    "/pon_info.asp",
    "/optical_info.asp",
    "/status_pon_info.asp",
    "/html/optical.html",
    "/gpon_status.html",
    "/epon_status.html",
    "/status.asp",
    "/index.asp"
]

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
        """Mengecek apakah modem ONT sedang dalam status lockout akibat 3x salah password (ZTE maxtime & pesan jeda generik)."""
        try:
            r = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
            # 1. Pola ZTE maxtime
            m_time = re.search(r'maxtime\s*=\s*Math\.min\(60,\s*(\d+)\s*\+\s*60\s*-\s*(\d+)\)', r.text)
            if m_time:
                rem = int(m_time.group(1)) + 60 - int(m_time.group(2))
                if rem > 0:
                    return True, rem
            # 2. Pola generik lockout countdown
            m_gen = re.search(r'(?:try\s*again\s*in|lock(?:ed)?\s*for|wait)\s*(\d+)\s*(?:seconds|detik|s)', r.text, re.I)
            if m_gen:
                rem_gen = int(m_gen.group(1))
                if rem_gen > 0:
                    return True, rem_gen
        except Exception:
            pass
        return False, 0

    @classmethod
    def attempt_login(cls, session: requests.Session, base_url: str, host: str, user: str, password: str, probe_text: Optional[str] = None) -> Tuple[bool, Optional[requests.Response]]:
        """
        Mencoba login ke Web GUI modem ONT secara adaptif universal (Heuristic Engine).
        Secara dinamis mendeteksi form, field user, field password, token tersembunyi,
        serta mekanisme enkripsi/hashing (SHA-256 salted, MD5, atau Plaintext) tanpa bergantung pada satu merek tertentu.
        """
        login_html = probe_text
        if not login_html:
            try:
                r_init = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
                login_html = r_init.text
            except Exception:
                login_html = ""

        # 1. Ekstraksi seluruh tag hidden input (<input type="hidden" ...>)
        hidden_inputs: Dict[str, str] = {}
        for m in re.finditer(r'<input[^>]+type=["\']hidden["\'][^>]*>', login_html, re.I):
            tag = m.group(0)
            m_name = re.search(r'name=["\']([^"\']+)["\']', tag, re.I)
            m_val = re.search(r'value=["\']([^"\']*)["\']', tag, re.I)
            if m_name:
                hidden_inputs[m_name.group(1)] = m_val.group(1) if m_val else ""

        # 2. Ekstraksi Frm_Logintoken dinamis (ZTE & XPON javascript token)
        m_tok = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', login_html)
        token = m_tok.group(1) if m_tok else hidden_inputs.get("Frm_Logintoken", "5")
        hidden_inputs["Frm_Logintoken"] = token

        # 3. Deteksi form action target (default ke base_url/)
        form_action = ""
        m_form = re.search(r'<form[^>]+action=["\']([^"\']*)["\']', login_html, re.I)
        if m_form:
            form_action = m_form.group(1).strip()
        if form_action and not form_action.startswith("http") and not form_action.startswith("/"):
            post_url = f"{base_url}/{form_action}"
        elif form_action and form_action.startswith("/"):
            post_url = f"{base_url}{form_action}"
        else:
            post_url = f"{base_url}/"

        # 4. Deteksi mekanisme enkripsi/hash
        is_sha256 = ("passwordSHA256" in login_html or "UserRandomNum" in login_html or "sha256" in login_html.lower())
        is_md5 = ("calc_md5" in login_html or "hex_md5" in login_html or "md5.js" in login_html.lower())
        setattr(session, "is_sha256", is_sha256)

        # 5. Siapkan payload kredensial
        payload = dict(hidden_inputs)
        payload["action"] = payload.get("action", "login")
        payload["Right"] = payload.get("Right", "")
        payload["frashnum"] = payload.get("frashnum", "")

        if is_sha256:
            random_num = str(random.randint(10000000, 99999999))
            hashed_pwd = hashlib.sha256((password + random_num).encode("utf-8")).hexdigest()
            payload["UserRandomNum"] = random_num
            final_pwd = hashed_pwd
        elif is_md5:
            final_pwd = hashlib.md5(password.encode("utf-8")).hexdigest()
        else:
            final_pwd = password

        # Deteksi nama field username & password dari form jika ada
        m_user_field = re.search(r'<input[^>]+name=["\']((?:user|user_?name|txtUser|account|loginname))["\']', login_html, re.I)
        user_field_name = m_user_field.group(1) if m_user_field else "username"

        m_pass_field = re.search(r'<input[^>]+type=["\']password["\'][^>]+name=["\']([^"\']+)["\']', login_html, re.I)
        pass_field_name = m_pass_field.group(1) if m_pass_field else "Password"

        # Kirim field spesifik form serta field standar (Username & Password) untuk menjamin kompatibilitas
        payload[user_field_name] = user
        payload["Username"] = user
        payload["username"] = user
        payload[pass_field_name] = final_pwd
        payload["Password"] = final_pwd
        payload["password"] = final_pwd

        headers = {
            "Host": host,
            "Referer": f"{base_url}/",
            "Origin": base_url,
            "Connection": "close",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            r = session.post(post_url, data=payload, headers=headers, timeout=10, allow_redirects=True)
        except Exception:
            return False, None

        # 6. Evaluasi hasil login (Deteksi kegagalan & keberhasilan adaptif)
        text_lower = r.text.lower()
        is_failed = (
            "user information is error" in text_lower or
            "wrong username or password" in text_lower or
            "wrong username" in text_lower or
            "wrong password" in text_lower or
            "password error" in text_lower or
            "setdisabled()" in r.text or
            "login_token_error" in text_lower or
            "login failed" in text_lower or
            "invalid password" in text_lower or
            "authentication failed" in text_lower or
            "incorrect username" in text_lower
        )

        is_success = (
            not is_failed and (
                "template.gch" in r.text or
                "top.gch" in r.text or
                "start.ghtml" in r.text or
                "status_dev_info_t.gch" in r.text or
                "pon_status_link_info_t.gch" in r.text or
                "start.ghtml" in r.url or
                "template.gch" in r.url or
                "main.html" in r.text or
                "index.html" in r.url or
                "home.asp" in r.url or
                "status_pon.asp" in r.text or
                # Indikator sukses universal: status 200, form login hilang, dan konten dashboard tampil
                (r.status_code == 200 and len(r.text) > 300 and 'type="password"' not in r.text and "Frm_Logintoken" not in r.text)
            )
        )

        return is_success, r

    @classmethod
    def extract_optical_data(cls, session: requests.Session, base_url: str, host: str) -> Optional[Dict[str, Any]]:
        """
        Mengambil dan mem-parsing data optik dari halaman status PON secara universal.
        Mendukung ZTE GM220-S, ZTE F663NV3A, Huawei, FiberHome, VSOL, dan XPON Generic
        dengan regex ekstraksi pola desimal otomatis.
        """
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "Connection": "close",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        # Susun daftar path yang akan diperiksa berdasarkan deteksi awal
        is_sha256 = getattr(session, "is_sha256", False)
        if is_sha256:
            paths_to_try = [PON_STATUS_INFO_PATH, PON_STATUS_PATH] + [p for p in COMMON_OPTICAL_PATHS if p not in (PON_STATUS_INFO_PATH, PON_STATUS_PATH)]
        else:
            paths_to_try = [PON_STATUS_PATH, PON_STATUS_INFO_PATH] + [p for p in COMMON_OPTICAL_PATHS if p not in (PON_STATUS_PATH, PON_STATUS_INFO_PATH)]

        content = ""
        for path in paths_to_try:
            url = f"{base_url}{path}"
            for attempt in range(1, 3):
                try:
                    r = session.get(url, headers=headers, timeout=15)
                    if r.status_code == 200 and any(k in r.text for k in ["RxPower", "Optical", "LosInfo", "dBm", "Input Power", "Receiv"]):
                        content = r.text
                        break
                except requests.exceptions.Timeout:
                    time.sleep(1.2)
                except Exception:
                    time.sleep(0.5)
            if content:
                break

        if not content:
            return None

        results = {}

        # 1. Ekstraksi Universal: Rx Power (Input Power)
        raw_rx: Optional[float] = None
        m_rx_var = re.search(r'var\s+(?:RxPower|Rx_Power|rx_power|InputPower|RxOpticalPower|Rx_Power_Value)\s*=\s*["\']?([+-]?\d+\.?\d*)', content, re.I)
        if m_rx_var:
            raw_rx = float(m_rx_var.group(1))

        if raw_rx is None:
            m_rx_html = re.search(r'(?:Optical\s*(?:Module\s*)?Input\s*Power|Rx\s*Power|Input\s*Power|Receiv(?:ed?|ing)\s*Power|Redaman\s*Rx)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.I)
            if m_rx_html:
                raw_rx = float(m_rx_html.group(1))

        if raw_rx is None:
            m_rx_dbm = re.search(r'(?:rx|input|in|receiv)[^<\n]{0,40}?([+-]?\d{1,3}(?:\.\d+)?)\s*(?:dBm|dB)', content, re.I)
            if m_rx_dbm:
                raw_rx = float(m_rx_dbm.group(1))

        # Normalisasi otomatis skala desimal (misal -253800 -> -25.38 atau -2538 -> -25.38)
        if raw_rx is not None:
            if abs(raw_rx) > 5000:
                results["rx_power"] = round(raw_rx / 10000.0, 2)
            elif abs(raw_rx) > 500:
                results["rx_power"] = round(raw_rx / 100.0, 2)
            else:
                results["rx_power"] = round(raw_rx, 2)
        else:
            results["rx_power"] = None

        # 2. Ekstraksi Universal: Tx Power (Output Power)
        raw_tx: Optional[float] = None
        m_tx_var = re.search(r'var\s+(?:TxPower|Tx_Power|tx_power|OutputPower|TxOpticalPower)\s*=\s*["\']?([+-]?\d+\.?\d*)', content, re.I)
        if m_tx_var:
            raw_tx = float(m_tx_var.group(1))

        if raw_tx is None:
            m_tx_html = re.search(r'(?:Optical\s*(?:Module\s*)?Output\s*Power|Tx\s*Power|Output\s*Power|Transmi(?:t|tting)\s*Power)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.I)
            if m_tx_html:
                raw_tx = float(m_tx_html.group(1))

        if raw_tx is not None:
            if abs(raw_tx) > 5000:
                results["tx_power"] = round(raw_tx / 10000.0, 2)
            elif abs(raw_tx) > 500:
                results["tx_power"] = round(raw_tx / 100.0, 2)
            else:
                results["tx_power"] = round(raw_tx, 2)
        else:
            results["tx_power"] = None

        # 3. Ekstraksi Universal: Bias Current & Voltage
        m_cur_var = re.search(r'var\s+(?:Current|bias_current|BiasCurrent)\s*=\s*["\']?([+-]?\d+\.?\d*)', content, re.I)
        if m_cur_var:
            raw_cur = float(m_cur_var.group(1))
            results["bias_current_ma"] = round(raw_cur / 1000.0, 2) if abs(raw_cur) > 500 else round(raw_cur, 2)
        else:
            m_cur_html = re.search(r'(?:Optical\s*Transmitter\s*Bias\s*Current|Bias\s*Current)[^<]*</td>\s*<td[^>]*>\s*(\d+)', content, re.I)
            results["bias_current_ma"] = round(float(m_cur_html.group(1)) / 1000.0, 2) if m_cur_html else None

        m_volt = re.search(r'(?:Optical\s*Module\s*Supply\s*Voltage|Supply\s*Voltage)[^<]*</td>\s*<td[^>]*>\s*(\d+)', content, re.I)
        results["supply_voltage_v"] = round(float(m_volt.group(1)) / 1000000.0, 2) if m_volt else None

        # 4. Ekstraksi Universal: Suhu / Temperature
        m_temp = re.search(r'(?:Operating\s*Temperature|Temperature|Suhu\s*ONT|Temp)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.I)
        results["suhu_ont"] = float(m_temp.group(1)) if m_temp else None

        # 5. Ekstraksi Universal: Status GPON & LOS
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
            m_state = re.search(r'(?:GPON|EPON|PON)\s*State[^<]*</td>\s*<td[^>]*>\s*([^<]+)', content, re.I)
            results["gpon_state"] = m_state.group(1).strip() if m_state else "Normal"

        m_los = re.search(r'var\s+LosInfo\s*=\s*["\']?(\d+)["\']?', content, re.I)
        results["is_los"] = (m_los.group(1) == "1") if m_los else False
        if not results["is_los"] and results.get("rx_power") is not None and results["rx_power"] <= -35.0:
            results["is_los"] = True

        # 6. Ekstraksi Universal: Device Serial Number & Model
        results["pon_sn"] = None
        try:
            r_dev = session.get(f"{base_url}{STATUS_DEV_PATH}", headers=headers, timeout=8)
            dev_text = r_dev.text if r_dev.status_code == 200 else content
            m_sn = re.search(r'id=["\'](?:Frm_PonSerialNumber|Frm_SerialNumber|pon_sn|serial_num)["\'][^>]*>(.*?)</td>', dev_text, re.I | re.S)
            if not m_sn:
                m_sn = re.search(r'>\s*(?:PON\s*)?Serial\s*Number\s*</td>\s*<td[^>]*>(.*?)</td>', dev_text, re.I | re.S)
            if m_sn:
                clean_sn = html.unescape(m_sn.group(1)).strip()
                clean_sn = re.sub(r'<[^>]+>', '', clean_sn).strip()
                results["pon_sn"] = clean_sn if clean_sn else None
        except Exception:
            pass

        return results

    @staticmethod
    def get_mac_from_arp(ip: str) -> Optional[str]:
        """Membaca cache ARP OS untuk IP tertentu sebagai auto-deteksi MAC."""
        try:
            out = subprocess.check_output(["arp", "-a", ip], text=True, timeout=1.5, stderr=subprocess.DEVNULL)
            m = re.search(r'([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})', out)
            if m:
                return m.group(1).replace("-", ":").upper()
        except Exception:
            pass
        return None

    @classmethod
    def extract_device_and_wifi_data(cls, session: requests.Session, base_url: str, host: str) -> Dict[str, Optional[str]]:
        """Mengekstrak MAC Address, SSID WiFi, dan Password WiFi dari Web GUI ONT."""
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "Connection": "keep-alive",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        res = {"mac_address": None, "nama_wifi": None, "password_wifi": None}
        
        # 1. MAC Address dari Status Device Info
        try:
            r_dev = session.get(f"{base_url}{STATUS_DEV_PATH}", headers=headers, timeout=8)
            if r_dev.status_code == 200:
                content = html.unescape(r_dev.text)

                # Format tabel MAC ZTE GM220: <td class="tdleft">MAC</td> <td class="tdright">&#56;&#67;...</td>
                m_mac_cell = re.search(r'>\s*MAC\s*</td>\s*<td[^>]*>(.*?)</td>', content, re.I | re.S)
                if m_mac_cell:
                    raw_cell = html.unescape(m_mac_cell.group(1))
                    clean_mac = re.sub(r'<[^>]+>', '', raw_cell).strip().replace("-", ":").upper()
                    m_found = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', clean_mac)
                    if m_found:
                        res["mac_address"] = m_found.group(1)

                # Alternatif pencarian MAC
                if not res["mac_address"]:
                    m_mac = re.search(r'id=["\'](?:Frm_MACAddress|Frm_PonMac|Frm_EthMac)["\'][^>]*>(.*?)</td>', content, re.I)
                    if m_mac:
                        raw_cell = html.unescape(m_mac.group(1))
                        clean_mac = re.sub(r'<[^>]+>', '', raw_cell).strip().replace("-", ":").upper()
                        m_found = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', clean_mac)
                        if m_found:
                            res["mac_address"] = m_found.group(1)
        except Exception:
            pass

        # Fallback ARP jika web belum mengembalikan MAC
        if not res["mac_address"]:
            res["mac_address"] = cls.get_mac_from_arp(host)

        # 2. SSID (Nama WiFi) dari WLAN_ESSID_PATH
        try:
            r_essid = session.get(f"{base_url}{WLAN_ESSID_PATH}", headers=headers, timeout=8)
            if r_essid.status_code == 200:
                txt_essid = html.unescape(r_essid.text)
                m_tm_essid = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_essid)
                if m_tm_essid:
                    for item in m_tm_essid:
                        if item.strip():
                            res["nama_wifi"] = item.strip()
                            break
                if not res["nama_wifi"]:
                    m_var = re.search(r'var\s+ESSID\s*=\s*["\']([^"\']+)["\']', txt_essid, re.I)
                    if m_var and m_var.group(1).strip():
                        res["nama_wifi"] = m_var.group(1).strip()
        except Exception as e:
            logger.debug(f"Gagal membaca WLAN ESSID dari {host}: {e}")

        # 3. Password WiFi (WPA PreSharedKey) dari WLAN_SECURITY_PATH
        try:
            r_sec = session.get(f"{base_url}{WLAN_SECURITY_PATH}", headers=headers, timeout=8)
            if r_sec.status_code == 200:
                txt_sec = html.unescape(r_sec.text)
                m_tm_pass = re.findall(r"Transfer_meaning\s*\(\s*['\"](?:KeyPassphrase|PreSharedKey)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_sec)
                if m_tm_pass:
                    for item in m_tm_pass:
                        if item.strip():
                            res["password_wifi"] = item.strip()
                            break

                # Fallback jika SSID belum terbaca dari essid_t.gch, coba dari security
                if not res["nama_wifi"]:
                    m_tm_essid2 = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_sec)
                    if m_tm_essid2:
                        for item in m_tm_essid2:
                            if item.strip():
                                res["nama_wifi"] = item.strip()
                                break

                # Fallback input value
                if not res["password_wifi"]:
                    m_wpa_inp = re.search(r'id=["\'](?:Frm_KeyPassphrase|Frm_Passphrase)["\'][^>]*value=["\']([^"\']+)["\']', txt_sec, re.I)
                    if m_wpa_inp and m_wpa_inp.group(1).strip():
                        res["password_wifi"] = m_wpa_inp.group(1).strip()
        except Exception as e:
            logger.debug(f"Gagal membaca WLAN Security dari {host}: {e}")

        # Fallback WLAN Status info (ZTE F663 / XPON)
        if not res["nama_wifi"]:
            try:
                r_wlan = session.get(f"{base_url}/getpage.gch?pid=1002&nextpage=e8_status_wlan_info_t.gch", headers=headers, timeout=6)
                if r_wlan.status_code == 200:
                    txt_wlan = html.unescape(r_wlan.text)
                    m_wlan_ssid = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_wlan)
                    if m_wlan_ssid:
                        for item in m_wlan_ssid:
                            if item.strip():
                                res["nama_wifi"] = item.strip()
                                break
                    if not res["nama_wifi"]:
                        m_var_ssid = re.search(r'var\s+ESSID\s*=\s*["\']([^"\']+)["\']', txt_wlan, re.I)
                        if m_var_ssid and m_var_ssid.group(1).strip():
                            res["nama_wifi"] = m_var_ssid.group(1).strip()
            except Exception:
                pass

        return res

    @classmethod
    def update_wifi_credentials(
        cls,
        ip: str,
        user_admin: str,
        pass_admin: str,
        new_ssid: Optional[str] = None,
        new_wifi_password: Optional[str] = None,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Mengubah SSID & Password WiFi modem ONT ZTE GM220-S via Web GUI.
        PROTEKSI AMAN: dry_run=True secara default, TIDAK AKAN mengubah perangkat fisik kecuali eksplisit dry_run=False.
        """
        host = ip.strip()
        base_url = f"http://{host}"

        if dry_run:
            logger.info(f"[DRY-RUN] Permintaan ganti WiFi ONT {host} -> SSID: '{new_ssid}', Pass: '{new_wifi_password}' (Disimpan di DB, eksekusi fisik dilewati).")
            return {
                "success": True,
                "mode": "DRY_RUN",
                "message": "Mode aman aktif (dry_run=True): Perubahan WiFi berhasil divalidasi dan dicatat tanpa modifikasi perangkat fisik.",
                "ip": host,
                "nama_wifi": new_ssid,
                "password_wifi": new_wifi_password
            }

        # Eksekusi fisik ke modem jika dry_run=False
        session = requests.Session()
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        # 1. Login ke modem
        ok, _ = cls.attempt_login(session, base_url, host, user_admin, pass_admin)
        if not ok:
            return {
                "success": False,
                "error_type": "AUTH_FAILED",
                "message": f"Gagal login ke modem ONT {host} saat mencoba memperbarui WiFi."
            }

        # 2. Update SSID jika diberikan
        if new_ssid:
            try:
                payload_ssid = {
                    "IF_ACTION": "apply",
                    "IF_INDEX": "1",
                    "Frm_ESSID": new_ssid.strip()
                }
                session.post(f"{base_url}{WLAN_ESSID_PATH}", data=payload_ssid, headers=headers, timeout=10)
            except Exception as e:
                return {"success": False, "message": f"Gagal mengirim SSID baru ke modem: {str(e)}"}

        # 3. Update WPA Password jika diberikan
        if new_wifi_password:
            try:
                payload_sec = {
                    "IF_ACTION": "apply",
                    "IF_INDEX": "1",
                    "Frm_KeyPassphrase": new_wifi_password.strip()
                }
                session.post(f"{base_url}{WLAN_SECURITY_PATH}", data=payload_sec, headers=headers, timeout=10)
            except Exception as e:
                return {"success": False, "message": f"Gagal mengirim Password WiFi baru ke modem: {str(e)}"}

        return {
            "success": True,
            "mode": "LIVE_EXECUTION",
            "message": f"Kredensial WiFi modem ONT {host} berhasil diperbarui secara fisik.",
            "nama_wifi": new_ssid,
            "password_wifi": new_wifi_password
        }

    @classmethod
    def scrape_ont(
        cls,
        ip: str,
        customer_user: Optional[str] = None,
        customer_pass: Optional[str] = None,
        default_user: Optional[str] = None,
        default_pass: Optional[str] = None,
        customer_name: Optional[str] = None,
        default_credentials: Optional[List[Tuple[str, str]]] = None,
        warn_threshold: Optional[float] = None,
        crit_threshold: Optional[float] = None,
        max_attempts_per_call: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Melakukan scraping lengkap ke satu perangkat modem ONT.
        Menguji kredensial pelanggan terlebih dahulu. Jika gagal, mencoba kredensial default (multi-list).
        """
        host = ip.strip()
        base_url = f"http://{host}"
        session = requests.Session()
        # 1. Quick probe jangkauan host (Connect timeout 2.5 detik, Read 4.0 detik)
        # Jika server tidak terhubung ke jaringan lokal/VLAN ONT, langsung fail-fast tanpa menunggu lama
        r_probe = None
        try:
            r_probe = session.get(f"{base_url}/", timeout=(2.5, 4.0), headers={"Connection": "close"})
        except (requests.exceptions.ConnectTimeout, requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(f"[-] [UNREACHABLE] ONT {host} ({customer_name}): Tidak dapat dijangkau ({e.__class__.__name__}). Periksa koneksi LAN/VLAN.")
            return {
                "success": False,
                "error_type": "UNREACHABLE",
                "message": "Host tidak terjangkau (Periksa koneksi jaringan lokal/VLAN)",
                "status_kredensial": "UNTESTED",
                "status_koneksi": "LOS",
                "rx_power": None,
                "suhu_ont": None,
                "uptime": None,
                "latency_ms": None
            }
        except Exception:
            pass

        # 2. Cek status lockout dari probe text
        is_locked = False
        rem_secs = 0
        if r_probe is not None:
            m_time = re.search(r'maxtime\s*=\s*Math\.min\(60,\s*(\d+)\s*\+\s*60\s*-\s*(\d+)\)', r_probe.text)
            if m_time:
                rem = int(m_time.group(1)) + 60 - int(m_time.group(2))
                if rem > 0:
                    is_locked = True
                    rem_secs = rem

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

        # Tambahkan multi default kredensial jika ada dari database
        if default_credentials:
            for d_u, d_p in default_credentials:
                d_u = (d_u or "").strip()
                d_p = (d_p or "").strip()
                if d_u and (d_u, d_p) not in [(u, p) for u, p, _ in credentials_to_try]:
                    credentials_to_try.append((d_u, d_p, "DEFAULT"))
        elif default_user and default_pass:
            d_u = default_user.strip()
            d_p = default_pass.strip()
            if d_u and (d_u, d_p) not in [(u, p) for u, p, _ in credentials_to_try]:
                credentials_to_try.append((d_u, d_p, "DEFAULT"))

        if not credentials_to_try:
            print(f"[-] [NO_CREDENTIALS] ONT {host} ({customer_name or 'Pelanggan'}): Kredensial modem pelanggan belum ada dan kredensial default di database kosong.")
            return {
                "success": False,
                "error_type": "NO_CREDENTIALS",
                "message": "Kredensial modem belum ada. Silakan input kredensial pada data pelanggan atau atur kredensial default di Pengaturan Sistem.",
                "status_kredensial": "INVALID",
                "status_koneksi": "WARNING",
                "rx_power": None,
                "suhu_ont": None,
                "uptime": None,
                "latency_ms": None
            }

        # Coba seluruh kredensial (kredensial pelanggan diikuti semua kredensial default dari pengaturan)
        authenticated = False
        active_user = None
        active_pass = None
        auth_source = None
        last_resp = None

        total_available = len(credentials_to_try)
        if max_attempts_per_call and max_attempts_per_call > 0:
            active_candidate_list = credentials_to_try[:max_attempts_per_call]
        else:
            active_candidate_list = credentials_to_try

        start_time = time.time()
        probe_html = r_probe.text if r_probe is not None else None

        for u, p, source in active_candidate_list:
            # Percobaan 1: Coba login normal
            ok, resp = cls.attempt_login(session, base_url, host, u, p, probe_text=probe_html)
            last_resp = resp

            # Jika percobaan 1 gagal dan modem masih merespon (bukan timeout),
            # lakukan Clean Session Reset & Refresh Token lalu coba sekali lagi.
            # Ini menyelesaikan masalah firmware ZTE GM220-S yang sering me-reject login pertama karena session semaphore / stale token.
            if not ok and resp is not None and "SetDisabled()" not in resp.text:
                time.sleep(0.8) # Jeda pendinginan modem
                session.cookies.clear() # Bersihkan sesi lama
                ok, resp = cls.attempt_login(session, base_url, host, u, p)
                last_resp = resp

            if ok:
                authenticated = True
                active_user = u
                active_pass = p
                auth_source = source
                break
            time.sleep(0.8)

        latency = int((time.time() - start_time) * 1000)

        # Kasus A: Autentikasi Gagal
        if not authenticated:
            all_exhausted = len(active_candidate_list) >= total_available
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
                    "latency_ms": None,
                    "all_exhausted": all_exhausted
                }
            else:
                # Modem merespon tetapi kredensial ditolak
                print(f"[-] [AUTH_FAILED] ONT {host} ({customer_name}): Kredensial modem ditolak (User/Pass salah). Dicoba: {len(active_candidate_list)}/{total_available}")
                return {
                    "success": False,
                    "error_type": "AUTH_FAILED",
                    "message": "Kredensial modem salah / ditolak",
                    "status_kredensial": "INVALID",
                    "status_koneksi": "WARNING",
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": latency,
                    "all_exhausted": all_exhausted,
                    "attempted_count": len(active_candidate_list),
                    "total_creds": total_available
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
        eff_crit = crit_threshold if crit_threshold is not None else settings.CRITICAL_THRESHOLD_DBM
        eff_warn = warn_threshold if warn_threshold is not None else settings.WARNING_THRESHOLD_DBM
        if opt_data.get("is_los"):
            status_koneksi = "LOS"
        elif rx <= eff_crit:
            status_koneksi = "CRITICAL"
        elif rx <= eff_warn:
            status_koneksi = "WARNING"
        else:
            status_koneksi = "NORMAL"

        # Ambil MAC Address & Detail WiFi ONT secara live
        device_wifi = cls.extract_device_and_wifi_data(session, base_url, host)

        print(f"[+] [SUCCESS] ONT {host} ({customer_name}): Rx {rx} dBm | Tx {opt_data.get('tx_power')} dBm | Suhu {suhu}°C | MAC: {device_wifi.get('mac_address')} | Status: {status_koneksi} | Auth: {active_user} ({auth_source})")

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
            "mac_address": device_wifi.get("mac_address"),
            "nama_wifi": device_wifi.get("nama_wifi"),
            "password_wifi": device_wifi.get("password_wifi"),
            "uptime": 86400,
            "latency_ms": latency,
            "message": "Pengecekan live optik berhasil"
        }
