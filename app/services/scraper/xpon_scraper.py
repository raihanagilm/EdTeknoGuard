"""
xpon_scraper.py - Modul Parser & Scraper untuk ONT XPON Generic, Huawei, dan FiberHome
Mendeteksi karakteristik respons, model perangkat, dan format ekstraksi non-ZTE.
"""

import re
import html
import logging
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger("xpon_scraper")

class XPONScraper:

    @staticmethod
    def identify_vendor_profile(text: str) -> str:
        """Mengidentifikasi merek modem non-ZTE berdasarkan keyword HTML"""
        t = (text or "").lower()
        if "hg8245" in t or "hg8546" in t or "eg8145" in t or "huawei" in t:
            return "Huawei"
        if "hg6243" in t or "fiberhome" in t or "fh_login" in t:
            return "FiberHome"
        if "vsol" in t:
            return "VSOL"
        return "XPON Generic"

    @classmethod
    def extract_device_info(cls, html_content: str) -> Dict[str, Optional[str]]:
        """Ekstraksi generic untuk serial number, hardware model, dan firmware version"""
        res = {"model": None, "sn": None, "firmware": None}
        if not html_content:
            return res

        m_mod = re.search(r'(?:Device\s*Model|Product\s*Name|Model\s*Name)[^<]*</td>\s*<td[^>]*>(.*?)</td>', html_content, re.I | re.S)
        if m_mod:
            res["model"] = re.sub(r'<[^>]+>', '', html.unescape(m_mod.group(1))).strip()

        m_sn = re.search(r'(?:GPON\s*SN|EPON\s*SN|Serial\s*Number)[^<]*</td>\s*<td[^>]*>(.*?)</td>', html_content, re.I | re.S)
        if m_sn:
            res["sn"] = re.sub(r'<[^>]+>', '', html.unescape(m_sn.group(1))).strip()

        return res

