"""
optical_parser.py - Parser Data Optik dan Parameter PON Universal
Mengekstrak Rx Power dBm, Tx Power, Suhu ONT, Voltase, Bias Current, dan GPON State
dari respons web ONT (ZTE, Huawei, FiberHome, XPON Generic).
"""

import re
import html
import time
import logging
from typing import Dict, Any, Optional, List
import requests

logger = logging.getLogger("optical_parser")

PON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
PON_STATUS_INFO_PATH = "/getpage.gch?pid=1002&nextpage=pon_status_link_info_t.gch"
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"

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

class OpticalParser:

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

        is_sha256 = getattr(session, "is_sha256", False)
        is_unicom_cu = getattr(session, "is_unicom_cu", False)
        if is_sha256 or is_unicom_cu:
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
            if not m_cur_html:
                m_cur_html = re.search(r'id=["\']Frm_Current["\'][^>]*>\s*(\d+)', content, re.I)
            results["bias_current_ma"] = round(float(m_cur_html.group(1)) / 1000.0, 2) if m_cur_html else None

        m_volt = re.search(r'(?:Optical\s*Module\s*Supply\s*Voltage|Supply\s*Voltage)[^<]*</td>\s*<td[^>]*>\s*(\d+)', content, re.I)
        if not m_volt:
            m_volt = re.search(r'id=["\']Frm_Volt["\'][^>]*>\s*(\d+)', content, re.I)
        results["supply_voltage_v"] = round(float(m_volt.group(1)) / 1000000.0, 2) if m_volt else None

        # 4. Ekstraksi Universal: Suhu / Temperature
        m_temp = re.search(r'(?:Operating\s*Temperature|Temperature|Suhu\s*ONT|Temp)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', content, re.I)
        if not m_temp:
            m_temp = re.search(r'id=["\']Frm_Temp["\'][^>]*>\s*([+-]?\d+\.?\d*)', content, re.I)
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

        # 6. Ekstraksi Universal: Device Serial Number
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

