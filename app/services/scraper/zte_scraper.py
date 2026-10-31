"""
zte_scraper.py - Modul Khusus Scraper & Konfigurasi ONT ZTE GM220-S & F6xx
Menangani login berbasis SHA-256 salted/Unicom CU, ekstraksi WiFi SSID/Key,
daftar perangkat terhubung (associated/DHCP), update WiFi, dan MAC Filtering fisik.
"""

import re
import html
import time
import random
import hashlib
import logging
import subprocess
from typing import Dict, Any, Optional, Tuple, List
import requests

logger = logging.getLogger("zte_scraper")

STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"
WLAN_ESSID_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_essid_t.gch"
WLAN_SECURITY_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_secrity_t.gch"
WLAN_ASSOCIATED_PATHS = [
    "/getpage.gch?pid=1002&nextpage=net_dhcp_dynamic_t.gch",
    "/getpage.gch?pid=1002&nextpage=net_wlan_assoc_t.gch",
    "/getpage.gch?pid=1002&nextpage=dhcp_client_list_t.gch",
    "/getpage.gch?pid=1002&nextpage=net_wlan_user_t.gch",
    "/getpage.gch?pid=1002&nextpage=e8_status_wlan_info_t.gch",
    "/getpage.gch?pid=1002&nextpage=status_wlan_info_t.gch"
]

class ZTEScraper:

    @staticmethod
    def decode_hex_string(val: Optional[str]) -> Optional[str]:
        """Mendekode karakter hex escape ZTE seperti \\x20 (spasi), \\x2d (-), \\x2e (.), dll."""
        if not val:
            return val
        def replace_hex(m):
            try:
                return chr(int(m.group(1), 16))
            except Exception:
                return m.group(0)
        return re.sub(r'\\x([0-9a-fA-F]{2})', replace_hex, str(val)).strip()

    @staticmethod
    def get_login_token(session: requests.Session, base_url: str) -> str:
        """Mengekstrak Frm_Logintoken dinamis yang diatur oleh fungsi dosubmit() di javascript."""
        try:
            r = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
            m = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r.text)
            return m.group(1) if m else "5"
        except Exception:
            return "5"

    @classmethod
    def attempt_login(
        cls,
        session: requests.Session,
        base_url: str,
        host: str,
        user: str,
        password: str,
        probe_text: Optional[str] = None
    ) -> Tuple[bool, Optional[requests.Response]]:
        """
        Mencoba login ke Web GUI modem ONT secara adaptif universal (Heuristic Engine).
        Secara dinamis mendeteksi form, field user, field password, token tersembunyi,
        serta mekanisme enkripsi/hashing (SHA-256 salted, MD5, atau Plaintext).
        """
        login_html = probe_text
        if not login_html:
            try:
                r_init = session.get(f"{base_url}/", timeout=6, headers={"Connection": "close"})
                login_html = r_init.text
            except Exception:
                login_html = ""

        # 1. Ekstraksi tag hidden input
        hidden_inputs: Dict[str, str] = {}
        for m in re.finditer(r'<input[^>]+type=["\']hidden["\'][^>]*>', login_html, re.I):
            tag = m.group(0)
            m_name = re.search(r'name=["\']([^"\']+)["\']', tag, re.I)
            m_val = re.search(r'value=["\']([^"\']*)["\']', tag, re.I)
            if m_name:
                hidden_inputs[m_name.group(1)] = m_val.group(1) if m_val else ""

        # 2. Ekstraksi Frm_Logintoken
        m_tok = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', login_html)
        token = m_tok.group(1) if m_tok else hidden_inputs.get("Frm_Logintoken", "5")
        hidden_inputs["Frm_Logintoken"] = token

        # 3. Deteksi form action target
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

        # 5. Siapkan payload
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

        # Deteksi Unicom / F477V2
        is_unicom_cu = ("_cu_url" in login_html or "welcome-imgadm" in login_html or "menu_cu.css" in login_html or "admShow" in login_html)
        if is_unicom_cu:
            payload["_cu_url"] = "1"
            if "user" in user.lower() and "admin" not in user.lower():
                payload["Right"] = "2"
            else:
                payload["Right"] = "1"
            setattr(session, "is_unicom_cu", True)

        m_user_field = re.search(r'<input[^>]+name=["\']((?:user|user_?name|txtUser|account|loginname))["\']', login_html, re.I)
        user_field_name = m_user_field.group(1) if m_user_field else "username"

        m_pass_field = re.search(r'<input[^>]+type=["\']password["\'][^>]+name=["\']([^"\']+)["\']', login_html, re.I)
        pass_field_name = m_pass_field.group(1) if m_pass_field else "Password"

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
            "Connection": "keep-alive",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            r = session.post(post_url, data=payload, headers=headers, timeout=10, allow_redirects=True)
        except Exception:
            return False, None

        text_lower = r.text.lower()
        is_failed = (
            "user information is error" in text_lower or
            "wrong username or password" in text_lower or
            "wrong username" in text_lower or
            "wrong password" in text_lower or
            "password error" in text_lower or
            "setdisabled()" in r.text or
            "setdisable()" in r.text.lower() or
            "three consecutive login failures" in text_lower or
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
                "menu_cu.css" in r.text or
                "unicom.html" in r.text or
                "unicom.html" in r.url or
                (r.status_code == 200 and len(r.text) > 300 and 'type="password"' not in r.text and "Frm_Logintoken" not in r.text)
            )
        )

        return is_success, r

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
        res = {"mac_address": None, "nama_wifi": None, "password_wifi": None, "jenis_modem": None}
        dev_content = ""

        # 1. MAC Address & Model Modem dari Status Device Info
        try:
            r_dev = session.get(f"{base_url}{STATUS_DEV_PATH}", headers=headers, timeout=8)
            if r_dev.status_code == 200:
                dev_content = html.unescape(r_dev.text)
                content = dev_content

                m_mac_cell = re.search(r'>\s*MAC\s*</td>\s*<td[^>]*>(.*?)</td>', content, re.I | re.S)
                if m_mac_cell:
                    raw_cell = html.unescape(m_mac_cell.group(1))
                    clean_mac = re.sub(r'<[^>]+>', '', raw_cell).strip().replace("-", ":").upper()
                    m_found = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', clean_mac)
                    if m_found:
                        res["mac_address"] = m_found.group(1)

                if not res["mac_address"]:
                    m_mac = re.search(r'id=["\'](?:Frm_MACAddress|Frm_PonMac|Frm_EthMac)["\'][^>]*>(.*?)</td>', content, re.I)
                    if m_mac:
                        raw_cell = html.unescape(m_mac.group(1))
                        clean_mac = re.sub(r'<[^>]+>', '', raw_cell).strip().replace("-", ":").upper()
                        m_found = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', clean_mac)
                        if m_found:
                            res["mac_address"] = m_found.group(1)

                m_model = re.search(r'id=["\'](?:Frm_ModelName|Frm_ProductName|Frm_DeviceType|Frm_DevType|model_name)["\'][^>]*>(.*?)</td>', content, re.I | re.S)
                if not m_model:
                    m_model = re.search(r'>\s*(?:Model\s*(?:Name)?|Product\s*Name|Device\s*Type|Tipe\s*Perangkat)\s*</td>\s*<td[^>]*>(.*?)</td>', content, re.I | re.S)
                if m_model:
                    raw_model = html.unescape(m_model.group(1))
                    clean_model = re.sub(r'<[^>]+>', '', raw_model).strip()
                    if clean_model and len(clean_model) <= 40:
                        res["jenis_modem"] = clean_model
        except Exception:
            pass

        if not res["mac_address"]:
            res["mac_address"] = cls.get_mac_from_arp(host)

        # 2. SSID dari WLAN_ESSID_PATH
        if not res["nama_wifi"]:
            try:
                r_essid = session.get(f"{base_url}{WLAN_ESSID_PATH}", headers=headers, timeout=8)
                if r_essid.status_code == 200 and "logout_from" not in r_essid.text:
                    txt_essid = html.unescape(r_essid.text)
                    m_tm_essid = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", txt_essid)
                    non_empty_essid = [x.strip() for x in m_tm_essid if x.strip()]
                    if non_empty_essid:
                        res["nama_wifi"] = non_empty_essid[-1]
                    if not res["nama_wifi"]:
                        m_var = re.search(r'var\s+ESSID\s*=\s*["\']([^"\']+)["\']', txt_essid, re.I)
                        if m_var and m_var.group(1).strip():
                            res["nama_wifi"] = m_var.group(1).strip()
            except Exception as e:
                logger.debug(f"Gagal membaca WLAN ESSID dari {host}: {e}")

        # 3. Password WiFi dari WLAN_SECURITY_PATH
        if not res["password_wifi"]:
            try:
                r_sec = session.get(f"{base_url}{WLAN_SECURITY_PATH}", headers=headers, timeout=8)
                if r_sec.status_code == 200 and "logout_from" not in r_sec.text:
                    txt_sec = html.unescape(r_sec.text)
                    m_tm_pass = re.findall(r"Transfer_meaning\s*\(\s*['\"](?:KeyPassphrase|PreSharedKey)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", txt_sec)
                    non_empty_pass = [x.strip() for x in m_tm_pass if x.strip()]
                    if non_empty_pass:
                        res["password_wifi"] = non_empty_pass[-1]
                    if not res["nama_wifi"]:
                        m_tm_essid2 = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", txt_sec)
                        non_empty_essid2 = [x.strip() for x in m_tm_essid2 if x.strip()]
                        if non_empty_essid2:
                            res["nama_wifi"] = non_empty_essid2[-1]
                    if not res["password_wifi"]:
                        m_wpa_inp = re.search(r'id=["\'](?:Frm_KeyPassphrase|Frm_Passphrase)["\'][^>]*value=["\']([^"\']+)["\']', txt_sec, re.I)
                        if m_wpa_inp and m_wpa_inp.group(1).strip():
                            res["password_wifi"] = m_wpa_inp.group(1).strip()
            except Exception as e:
                logger.debug(f"Gagal membaca WLAN Security dari {host}: {e}")

        # 4. Fallback SSID & Password dari pon_net_wlan_conf1_t.gch (ZTE F663/F670)
        if not res["nama_wifi"] or not res["password_wifi"]:
            try:
                r_f663 = session.get(f"{base_url}/getpage.gch?pid=1002&nextpage=pon_net_wlan_conf1_t.gch", headers=headers, timeout=8)
                if r_f663.status_code == 200 and "logout_from" not in r_f663.text:
                    txt_f663 = html.unescape(r_f663.text)
                    if not res["nama_wifi"]:
                        m_f663_essid = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", txt_f663)
                        non_empty_essid = [x.strip() for x in m_f663_essid if x.strip()]
                        if non_empty_essid:
                            res["nama_wifi"] = non_empty_essid[-1]

                    if not res["password_wifi"]:
                        m_f663_pass = re.findall(r"Transfer_meaning\s*\(\s*['\"](?:KeyPassphrase|PreSharedKey)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", txt_f663)
                        non_empty_pass = [x.strip() for x in m_f663_pass if x.strip()]
                        if non_empty_pass:
                            res["password_wifi"] = non_empty_pass[-1]
            except Exception as e:
                logger.debug(f"Gagal membaca pon_net_wlan_conf1 dari {host}: {e}")

        if res["nama_wifi"]:
            res["nama_wifi"] = cls.decode_hex_string(res["nama_wifi"])
        if res["password_wifi"]:
            res["password_wifi"] = cls.decode_hex_string(res["password_wifi"])

        # Fallback Heuristik Model
        if not res["jenis_modem"]:
            combined_probe = (dev_content + " " + getattr(session, "probe_html", "")).lower()
            if "gm220-s" in combined_probe or "gm220" in combined_probe:
                res["jenis_modem"] = "GM220-S"
            elif "f663" in combined_probe:
                res["jenis_modem"] = "ZTE F663"
            elif "f609" in combined_probe:
                res["jenis_modem"] = "ZTE F609"
            elif "f670" in combined_probe:
                res["jenis_modem"] = "ZTE F670L"
            elif "zte" in combined_probe or "zte.com" in combined_probe or "template.gch" in combined_probe:
                res["jenis_modem"] = "ZTE XPON"

        return res

    @classmethod
    def scrape_connected_devices(cls, session: requests.Session, base_url: str, host: str) -> List[Dict[str, Any]]:
        """Mengekstrak daftar perangkat yang sedang terhubung ke modem ONT (WiFi / LAN)."""
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "Connection": "keep-alive",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        devices = []
        seen_macs = set()

        for path in WLAN_ASSOCIATED_PATHS:
            try:
                r = session.get(f"{base_url}{path}", headers=headers, timeout=6)
                if r.status_code != 200 or "logout_from" in r.text or len(r.text) < 100:
                    continue

                html_text = html.unescape(r.text)

                tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', html_text, re.I | re.S)
                for tr in tr_matches:
                    mac_found = re.search(r'([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})', tr)
                    if mac_found:
                        mac_clean = mac_found.group(1).replace("-", ":").upper()
                        if mac_clean in seen_macs:
                            continue

                        ip_found = re.search(r'\b(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)\b', tr)
                        ip_str = ip_found.group(1) if ip_found else None

                        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.I | re.S)
                        hostname = None
                        rssi = None
                        for td in tds:
                            clean_td = re.sub(r'<[^>]+>', '', td).strip()
                            if not clean_td or clean_td == mac_clean or (ip_str and clean_td == ip_str):
                                continue
                            m_rssi = re.search(r'([+-]?\d+)\s*(?:dBm|%|db)?', clean_td, re.I)
                            if m_rssi and ("dbm" in clean_td.lower() or abs(int(m_rssi.group(1))) > 20):
                                try:
                                    rssi = int(m_rssi.group(1))
                                    continue
                                except Exception:
                                    pass
                            if not hostname and len(clean_td) >= 2 and not clean_td.isdigit():
                                hostname = clean_td[:60]

                        seen_macs.add(mac_clean)
                        devices.append({
                            "mac_address": mac_clean,
                            "ip_address": ip_str,
                            "hostname": hostname,
                            "tipe_koneksi": "WIFI" if "wlan" in path.lower() else "LAN",
                            "rssi": rssi,
                            "status": "ONLINE"
                        })

                zte_calls = re.findall(r"Transfer_meaning\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", html_text)
                if zte_calls:
                    zte_items = {}
                    for k, v in zte_calls:
                        decoded_v = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), v).strip()
                        m_idx = re.match(r'([A-Za-z]+)(\d+)', k)
                        if m_idx:
                            field_name, item_idx = m_idx.group(1), int(m_idx.group(2))
                            zte_items.setdefault(item_idx, {})[field_name] = decoded_v

                    for _, item_data in sorted(zte_items.items()):
                        mac_raw = item_data.get("MACAddr") or item_data.get("MacAddr")
                        if not mac_raw:
                            continue
                        m_mac = re.search(r'([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})', mac_raw)
                        if not m_mac:
                            continue
                        clean_mac = m_mac.group(1).replace("-", ":").upper()
                        if clean_mac in seen_macs or clean_mac == "00:00:00:00:00:00" or clean_mac == "FF:FF:FF:FF:FF:FF":
                            continue

                        ip_val = item_data.get("IPAddr") or item_data.get("IpAddr")
                        host_val = item_data.get("HostName") or item_data.get("Hostname")
                        phy_port = item_data.get("PhyPortName") or ""
                        is_wifi = "SSID" in phy_port.upper() or "WLAN" in path.lower() or "WIFI" in phy_port.upper()

                        seen_macs.add(clean_mac)
                        devices.append({
                            "mac_address": clean_mac,
                            "ip_address": ip_val if ip_val and ip_val != "0.0.0.0" else None,
                            "hostname": host_val if host_val else None,
                            "tipe_koneksi": "WIFI" if is_wifi else "LAN",
                            "rssi": None,
                            "status": "ONLINE"
                        })
            except Exception as e:
                logger.debug(f"Pengecekan associated devices di {path} untuk {host} gagal: {e}")
                continue

        return devices

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
        """Mengubah SSID & Password WiFi modem ONT ZTE GM220-S via Web GUI."""
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

        session = requests.Session()
        headers = {
            "Host": host,
            "Referer": f"{base_url}/template.gch",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        candidates = []
        if user_admin and pass_admin:
            candidates.append((user_admin.strip(), pass_admin.strip()))
        if default_credentials:
            for item in default_credentials:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    c_pair = (item[0].strip(), item[1].strip())
                    if c_pair not in candidates:
                        candidates.append(c_pair)

        ok = False
        for cand_user, cand_pass in candidates:
            ok, _ = cls.attempt_login(session, base_url, host, cand_user, cand_pass)
            if ok:
                break

        if not ok:
            return {
                "success": False,
                "error_type": "AUTH_FAILED",
                "message": f"Gagal login ke modem ONT {host} saat mencoba memperbarui WiFi. Periksa kredensial admin modem."
            }

        if new_ssid:
            try:
                r_essid = session.get(f"{base_url}{WLAN_ESSID_PATH}", headers=headers, timeout=8)
                token_match = re.search(r'session_token\s*=\s*[\'"](\d+)[\'"]', r_essid.text)
                session_token = token_match.group(1) if token_match else ""

                payload_ssid = {
                    "IF_ACTION": "apply",
                    "IF_CONFIGTAG": "Y",
                    "IF_VIEWID": "IGD.LD1.WLAN1",
                    "Enable": "1",
                    "ESSID": new_ssid.strip(),
                    "ESSIDHideEnable": "0",
                    "MaxUserNum": "32",
                    "_SESSION_TOKEN": session_token
                }
                session.post(f"{base_url}{WLAN_ESSID_PATH}", data=payload_ssid, headers=headers, timeout=12)
            except Exception as e:
                return {"success": False, "message": f"Gagal mengirim SSID baru ke modem: {str(e)}"}

        if new_wifi_password:
            try:
                r_sec = session.get(f"{base_url}{WLAN_SECURITY_PATH}", headers=headers, timeout=8)
                token_match_sec = re.search(r'session_token\s*=\s*[\'"](\d+)[\'"]', r_sec.text)
                session_token_sec = token_match_sec.group(1) if token_match_sec else ""

                payload_sec = {
                    "IF_ACTION": "apply",
                    "IF_CONFIGTAG": "Y",
                    "IF_PSKTAG": "Y",
                    "IF_VIEWID": "IGD.LD1.WLAN1",
                    "BeaconType": "WPAand11i",
                    "WPAAuthMode": "PSKAuthentication",
                    "11iAuthMode": "PSKAuthentication",
                    "WPAEncryptType": "TKIPandAESEncryption",
                    "11iEncryptType": "TKIPandAESEncryption",
                    "KeyPassphrase": new_wifi_password.strip(),
                    "WPAGroupRekey": "0",
                    "_SESSION_TOKEN": session_token_sec
                }
                session.post(f"{base_url}{WLAN_SECURITY_PATH}", data=payload_sec, headers=headers, timeout=12)
            except Exception as e:
                return {"success": False, "message": f"Gagal mengirim Password WiFi baru ke modem: {str(e)}"}

        return {
            "success": True,
            "mode": "LIVE_EXECUTION",
            "message": f"Kredensial WiFi modem ONT {host} berhasil diperbarui langsung ke perangkat modem.",
            "nama_wifi": new_ssid,
            "password_wifi": new_wifi_password
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
        """Menerapkan blokir / buka blokir MAC address fisik langsung pada hardware modem ONT ZTE GM220-S."""
        host = ip.strip()
        base_url = f"http://{host}"
        mac_clean = mac_address.strip().lower()

        session = requests.Session()
        headers = {
            "Host": host,
            "Referer": f"{base_url}/getpage.gch?pid=1002&nextpage=sec_macfilter_conf_t.gch",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        candidates = []
        if user_admin and pass_admin:
            candidates.append((user_admin.strip(), pass_admin.strip()))
        if default_credentials:
            for item in default_credentials:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    c_pair = (item[0].strip(), item[1].strip())
                    if c_pair not in candidates:
                        candidates.append(c_pair)

        ok = False
        for cand_user, cand_pass in candidates:
            ok, _ = cls.attempt_login(session, base_url, host, cand_user, cand_pass)
            if ok:
                break

        if not ok:
            return {"success": False, "message": f"Gagal login ke modem ONT {host} saat mengatur filter MAC."}

        try:
            r_page = session.get(f"{base_url}/getpage.gch?pid=1002&nextpage=sec_macfilter_conf_t.gch", headers=headers, timeout=8)
            token_match = re.search(r'session_token\s*=\s*[\'"](\d+)[\'"]', r_page.text)
            session_token = token_match.group(1) if token_match else ""

            existing_macs = re.findall(
                r'Transfer_meaning\s*\(\s*[\'"]SrcMacAddr([0-9]*)[\'"]\s*,\s*[\'"]([^\'"]+)[\'"]\s*\)',
                r_page.text
            )

            normalized_existing = {}
            for idx_str, raw_m in existing_macs:
                norm = raw_m.replace(r"\x3a", ":").replace(r"\x3A", ":").lower()
                real_idx = int(idx_str) if idx_str else 0
                normalized_existing[norm] = real_idx

            if block:
                if mac_clean in normalized_existing:
                    return {"success": True, "message": f"MAC {mac_address} sudah aktif diblokir pada modem."}

                payload_enable = {
                    "IF_ACTION": "basic_apply",
                    "MacFilterEnable": "1",
                    "MacFilterTarget": "Discard",
                    "_SESSION_TOKEN": session_token
                }
                session.post(f"{base_url}/getpage.gch?pid=1002&nextpage=sec_macfilter_conf_t.gch", data=payload_enable, headers=headers, timeout=10)

                payload_rule = {
                    "IF_ACTION": "new",
                    "IF_INDEX": "-1",
                    "Enable": "1",
                    "Type": "Bridge+Route",
                    "Protocol": "ALL",
                    "SrcMacAddr": mac_clean,
                    "DstMacAddr": "00:00:00:00:00:00",
                    "MacFilterTarget": "Discard",
                    "MacFilterEnable": "1",
                    "_SESSION_TOKEN": session_token
                }
                session.post(f"{base_url}/getpage.gch?pid=1002&nextpage=sec_macfilter_conf_t.gch", data=payload_rule, headers=headers, timeout=10)
                return {"success": True, "message": f"Perangkat MAC {mac_address} berhasil diblokir secara fisik di modem ONT."}
            else:
                if mac_clean not in normalized_existing:
                    return {"success": True, "message": f"MAC {mac_address} tidak ditemukan dalam daftar blokir modem."}

                del_idx = normalized_existing[mac_clean]
                payload_del = {
                    "IF_ACTION": "delete",
                    "IF_INDEX": str(del_idx),
                    "_SESSION_TOKEN": session_token
                }
                session.post(f"{base_url}/getpage.gch?pid=1002&nextpage=sec_macfilter_conf_t.gch", data=payload_del, headers=headers, timeout=10)
                return {"success": True, "message": f"Blokir perangkat MAC {mac_address} berhasil dibuka pada modem ONT."}

        except Exception as e:
            return {"success": False, "message": f"Gagal mengeksekusi filter MAC modem: {str(e)}"}

