"""
credential_chain.py - Manajemen Kredensial & Deteksi Lockout Modem ONT
Menangani rantai kredensial (customer vs default multi-list), penyaringan riwayat gagal (failed_credentials),
serta pendeteksian dan handling lockout/countdown sesi modem.
"""

import re
import html
import time
import logging
from typing import Dict, Any, Optional, Tuple, List

logger = logging.getLogger("credential_chain")

class CredentialChainManager:

    @staticmethod
    def detect_ont_vendor_behavior(probe_html: str) -> Dict[str, Any]:
        """
        Mendeteksi karakteristik vendor modem ONT dari respon awal (probe).
        Mengidentifikasi apakah modem berbasis ZTE GM220/XPON, Huawei, atau vendor lain
        serta menentukan perilaku lockout dan kebutuhan sesi HTTP keep-alive.
        """
        text_lower = (probe_html or "").lower()
        is_zte = any(k in text_lower for k in [
            "gpon_status", "frm_logintoken", "template.gch", "passwordsha256", "gm220", "f663", "f670", "f609", "zte"
        ])
        is_huawei = any(k in text_lower for k in [
            "huawei", "hg8245", "eg8145", "hg8546", "asp/login.asp"
        ])
        is_fiberhome = any(k in text_lower for k in [
            "fiberhome", "hg6243", "fh_login"
        ])

        if is_zte:
            return {
                "vendor": "ZTE",
                "default_lock_seconds": 60,
                "require_stay_connection": True,  # Sesi HTTP & TCP socket tidak boleh putus agar countdown tidak reset
                "supports_sha256": True
            }
        elif is_huawei:
            return {
                "vendor": "HUAWEI",
                "default_lock_seconds": 60,
                "require_stay_connection": False,
                "supports_sha256": False
            }
        elif is_fiberhome:
            return {
                "vendor": "FIBERHOME",
                "default_lock_seconds": 30,
                "require_stay_connection": False,
                "supports_sha256": False
            }
        return {
            "vendor": "GENERIC_XPON",
            "default_lock_seconds": 30,
            "require_stay_connection": False,
            "supports_sha256": False
        }

    @staticmethod
    def parse_lockout_info(html_content: str, default_wait: int = 60) -> Tuple[bool, int]:
        """
        Memeriksa apakah konten HTML atau respon login mengandung penanda lockout/countdown.
        Mengembalikan tuple (is_locked, remaining_seconds).
        """
        if not html_content:
            return False, 0

        # 1. Pola ZTE F477V2 / Unicom cu.html:
        m_cu_fail = re.search(r'if\s*\(\s*(\d+)\s*==\s*3', html_content)
        if m_cu_fail:
            fail_count = int(m_cu_fail.group(1))
            if fail_count >= 3:
                return True, default_wait

        # 2. Pola ZTE maxtime (SetDisabled dengan kalkulasi waktu Math.min(60, X + 60 - Y))
        has_zte_disabled = bool(re.search(r'(?<!function\s)SetDisabled\s*\(', html_content))
        m_time = re.search(r'maxtime\s*=\s*Math\.min\(\s*(\d+)\s*,\s*(\d+)\s*\+\s*60\s*-\s*(\d+)\)', html_content)
        if has_zte_disabled and m_time:
            cap = int(m_time.group(1))
            rem = int(m_time.group(2)) + 60 - int(m_time.group(3))
            rem_clamped = min(cap, max(0, rem))
            if rem_clamped > 0:
                return True, rem_clamped
        elif has_zte_disabled:
            m_sec = re.search(r'setTimeout\s*\(\s*["\']setEnable\(\)["\']\s*,\s*(\d+)\s*\)', html_content)
            if m_sec:
                sec_val = int(int(m_sec.group(1)) / 1000)
                return True, sec_val if sec_val > 0 else default_wait
            return True, default_wait

        # 3. Pola generik teks countdown / lockout
        patterns = [
            r'(?:try\s*again\s*in|lock(?:ed)?\s*for|wait)\s*(\d+)\s*(?:seconds|second|detik|s)',
            r'(?:countdown|remain(?:ing)?)\s*[:=]\s*(\d+)',
            r'wait(?:ing)?\s*time\s*[:=]\s*(\d+)'
        ]
        for pat in patterns:
            m_gen = re.search(pat, html_content, re.I)
            if m_gen:
                rem_gen = int(m_gen.group(1))
                if rem_gen > 0:
                    return True, rem_gen

        # 4. Kata kunci indikator terkunci eksplisit
        if "login locked" in html_content.lower() or "too many attempts" in html_content.lower():
            return True, default_wait

        return False, 0

    @classmethod
    def build_candidates_list(
        cls,
        customer_user: Optional[str] = None,
        customer_pass: Optional[str] = None,
        default_user: Optional[str] = None,
        default_pass: Optional[str] = None,
        default_credentials: Optional[List[Tuple[str, str]]] = None,
        failed_credentials_history: Optional[List[Tuple[str, str]]] = None,
        max_attempts_per_call: Optional[int] = None
    ) -> Tuple[List[Tuple[str, str, str]], int, List[Tuple[str, str, str]]]:
        """
        Menyusun daftar kandidat kredensial berurutan:
        1. Kredensial Pelanggan (jika ada)
        2. Kredensial Default dari Pengaturan Sistem
        Menyaring kredensial yang ada di riwayat gagal (failed_set).
        Mengembalikan: (active_candidate_list, total_available, all_candidates)
        """
        credentials_to_try = []
        c_u = customer_user.strip() if customer_user else None
        c_p = customer_pass.strip() if customer_pass else None

        if c_u and c_p:
            credentials_to_try.append((c_u, c_p, "CUSTOMER"))

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

        total_available = len(credentials_to_try)

        failed_set = set()
        if failed_credentials_history:
            for fu, fp in failed_credentials_history:
                failed_set.add((fu.strip(), fp.strip()))

        untested_candidates = [c for c in credentials_to_try if (c[0], c[1]) not in failed_set]

        if untested_candidates:
            active_list = untested_candidates
        else:
            active_list = credentials_to_try

        if max_attempts_per_call and max_attempts_per_call > 0:
            active_list = active_list[:max_attempts_per_call]

        return active_list, total_available, credentials_to_try

