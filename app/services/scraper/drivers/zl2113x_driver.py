"""
zl2113x_driver.py - Driver Modem ONT XPON Seri ZL-2113X (Web Server Boa/0.94.13)
Mengimplementasikan BaseONTDriver untuk modem XPON ZL-2113X.
Mendukung autentikasi berbasis form /cgi-bin/index2.asp dan ekstraksi
parameter optik dari /cgi-bin/sta-network.asp serta /cgi-bin/get_node_foreach_info.json.
"""

import re
import math
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.services.scraper.base_driver import BaseONTDriver
from app.services.scraper.driver_registry import ONTDriverRegistry

logger = logging.getLogger("zl2113x_driver")


@ONTDriverRegistry.register
class ZL2113XDriver(BaseONTDriver):
    """
    Driver untuk modem ONT XPON ZL-2113X dengan web server Boa/0.94.13.
    """

    driver_id: str = "zl2113x"
    display_name: str = "ZL-2113X (XPON)"
    vendor: str = "XPON"
    priority: int = 25  # Diperiksa sebelum GenericXPONDriver

    FINGERPRINT_KEYWORDS = [
        "zl-2113x",
        "index2.asp"
    ]

    @classmethod
    def can_handle(cls, probe_html: str, headers: Optional[Dict[str, str]] = None) -> bool:
        """Fingerprint detection untuk ZL-2113X / Boa index2.asp."""
        t = (probe_html or "").lower()
        if any(k in t for k in cls.FINGERPRINT_KEYWORDS):
            return True
        if headers:
            server_hdr = str(headers.get("Server", "") or headers.get("server", "")).lower()
            if "boa" in server_hdr and ("index2" in t or "login" in t):
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
        Autentikasi ke /cgi-bin/index2.asp modem ZL-2113X.
        Wajib menyertakan cookie SESSIONID, UID, dan PSW.
        """
        login_url = f"{base_url}/cgi-bin/index2.asp"
        session_id = "boasid12345678"
        try:
            for cookie in session.cookies:
                if cookie.name == "SESSIONID" and cookie.value and "boasid" in cookie.value:
                    session_id = cookie.value
                    break
        except Exception:
            pass

        session.cookies.set("SESSIONID", session_id, domain=host, path="/")
        session.cookies.set("UID", username, domain=host, path="/")
        session.cookies.set("PSW", password, domain=host, path="/")

        data = {
            "Username": username,
            "Password": password,
            "Password1": password,
            "Password2": password,
            "Logoff": "0",
            "hLoginTimes": "0",
            "hLoginTimes_Zero": "0",
            "value_one": "1",
            "logintype": "usr",
            "Language_Flag": "0",
            "btnSubmit": "Login"
        }

        headers = {
            "Host": host,
            "Referer": login_url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            resp = session.post(login_url, data=data, headers=headers, timeout=5)
            if "gotomain_set();" in resp.text:
                # Validasi session frame dengan mengakses content.asp
                try:
                    session.get(f"{base_url}/cgi-bin/content.asp", headers=headers, timeout=4)
                except Exception:
                    pass
                return True, resp
            return False, resp
        except Exception as e:
            logger.debug(f"ZL2113X login error on {host}: {e}")
            return False, None

    @classmethod
    def extract_optical_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Optional[Dict[str, Any]]:
        """Mengekstrak parameter optik dari /cgi-bin/sta-network.asp."""
        try:
            url = f"{base_url}/cgi-bin/sta-network.asp"
            r = session.get(url, timeout=5)
            if r.status_code != 200:
                return None

            text = r.text
            rx_power = None
            tx_power = None
            suhu_ont = None
            voltase = None
            bias_current = None
            is_los = True

            # Regex RecvPower dBm
            m_rx = re.search(
                r'this\.RecvPower\s*=\s*\(Math\.round\(Math\.log\(\(Number\((\d+)\)\)/10000\)/\(Math\.log\(10\)\)\*100\)/10\)',
                text
            )
            if m_rx:
                raw_rx = float(m_rx.group(1))
                if raw_rx > 0:
                    rx_power = round(10.0 * math.log10(raw_rx / 10000.0), 2)
                    is_los = False

            # Regex SendPower (Tx) dBm
            m_tx = re.search(
                r'this\.SendPower\s*=\s*\(Math\.round\(Math\.log\(\(Number\((\d+)\)\)/10000\)/\(Math\.log\(10\)\)\*100\)/10\)',
                text
            )
            if m_tx:
                raw_tx = float(m_tx.group(1))
                if raw_tx > 0:
                    tx_power = round(10.0 * math.log10(raw_tx / 10000.0), 2)

            # Regex Suhu ONT
            m_temp = re.search(r'this\.WorkTemperature\s*=\s*transTemperature\((\d+)\)', text)
            if m_temp:
                suhu_ont = round(float(m_temp.group(1)) / 256.0, 1)

            # Regex Voltase
            m_volt = re.search(r'this\.WorkVoltage\s*=\s*\(Number\((\d+)\)/10\)', text)
            if m_volt:
                voltase = round(float(m_volt.group(1)) / 10000.0, 2)

            # Regex Bias Current
            m_cur = re.search(r'this\.WorkElectric\s*=\s*\(Number\((\d+)\)\*2/1000\)', text)
            if m_cur:
                bias_current = round(float(m_cur.group(1)) * 2.0 / 1000.0, 2)

            return {
                "rx_power": rx_power,
                "tx_power": tx_power,
                "suhu_ont": suhu_ont,
                "voltase": voltase,
                "bias_current": bias_current,
                "is_los": is_los
            }
        except Exception as e:
            logger.warning(f"Error extracting optical data on {host}: {e}")
            return None

    @classmethod
    def extract_device_and_wifi_data(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> Dict[str, Any]:
        """Mengekstrak MAC address, model, SSID, dan password WiFi."""
        mac_address = None
        jenis_modem = "ZL-2113X (XPON)"
        nama_wifi = None
        password_wifi = None

        # 1. Device Info JSON
        try:
            r_dev = session.get(
                f"{base_url}/cgi-bin/get_node_foreach_info.json?param1=deviceinfo_entry&param2=NULL",
                timeout=4
            )
            if r_dev.status_code == 200:
                dev_data = r_dev.json()
                mac_address = dev_data.get("onuMac")
                sw_ver = dev_data.get("SWVer")
                if sw_ver:
                    jenis_modem = f"ZL-2113X ({sw_ver})"
        except Exception:
            pass

        # 2. WiFi Settings
        try:
            r_wifi = session.get(f"{base_url}/cgi-bin/net-wlan.asp", timeout=4)
            if r_wifi.status_code == 200:
                w_text = r_wifi.text
                m_ssid = re.search(r'new\s+stWlan\([^,]+,[^,]+,"([^"]+)"', w_text)
                if m_ssid:
                    nama_wifi = m_ssid.group(1)
                m_pass = re.search(r'name=wlWpaPsk\s+value="([^"]+)"', w_text)
                if m_pass:
                    password_wifi = m_pass.group(1)
        except Exception:
            pass

        return {
            "mac_address": mac_address,
            "nama_wifi": nama_wifi,
            "password_wifi": password_wifi,
            "jenis_modem": jenis_modem
        }

    @classmethod
    def logout(
        cls,
        session: requests.Session,
        base_url: str,
        host: str
    ) -> bool:
        """Mengakhiri sesi login pada web modem ZL-2113X."""
        try:
            session.get(f"{base_url}/cgi-bin/logout.cgi", timeout=2)
            session.cookies.clear()
            return True
        except Exception:
            return False
