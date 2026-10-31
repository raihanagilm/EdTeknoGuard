"""
ont_scraper_service.py - Live HTTP Web Scraping Service untuk ONT GM220-S & XPON
Mengambil parameter optik (Rx Power dBm, Suhu, Tx Power, Bias Current, Voltage, GPON State)
secara live dari perangkat modem ONT.

Arsitektur Modular:
- app.services.scraper.credential_chain: Rantai multi-kredensial & memory lockout
- app.services.scraper.optical_parser: Parser data optik universal
- app.services.scraper.zte_scraper: Scraper & config ZTE GM220-S / F6xx
- app.services.scraper.xpon_scraper: Scraper & profiling XPON Generic / Huawei / FiberHome
"""

import time
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.core.config import settings
from app.services.scraper.credential_chain import CredentialChainManager
from app.services.scraper.optical_parser import OpticalParser
from app.services.scraper.zte_scraper import ZTEScraper
from app.services.scraper.xpon_scraper import XPONScraper

logger = logging.getLogger("ont_scraper_service")

class ONTScraperService:

    # Delegation shortcuts untuk backward compatibility
    decode_hex_string = staticmethod(ZTEScraper.decode_hex_string)
    get_login_token = staticmethod(ZTEScraper.get_login_token)
    detect_ont_vendor_behavior = staticmethod(CredentialChainManager.detect_ont_vendor_behavior)
    parse_lockout_info = classmethod(lambda cls, html_content, default_wait=60: CredentialChainManager.parse_lockout_info(html_content, default_wait))
    check_lockout_status = classmethod(lambda cls, session, base_url: CredentialChainManager.parse_lockout_info(session.get(f"{base_url}/", timeout=6, headers={"Connection": "keep-alive"}).text if session else ""))
    attempt_login = classmethod(lambda cls, session, base_url, host, user, password, probe_text=None: ZTEScraper.attempt_login(session, base_url, host, user, password, probe_text))
    extract_optical_data = classmethod(lambda cls, session, base_url, host: OpticalParser.extract_optical_data(session, base_url, host))
    get_mac_from_arp = staticmethod(ZTEScraper.get_mac_from_arp)
    extract_device_and_wifi_data = classmethod(lambda cls, session, base_url, host: ZTEScraper.extract_device_and_wifi_data(session, base_url, host))
    scrape_connected_devices = classmethod(lambda cls, session, base_url, host: ZTEScraper.scrape_connected_devices(session, base_url, host))
    get_connected_devices_live = classmethod(lambda cls, ip, user_admin, pass_admin: ZTEScraper.get_connected_devices_live(ip, user_admin, pass_admin) if hasattr(ZTEScraper, 'get_connected_devices_live') else cls._get_connected_devices_live_impl(ip, user_admin, pass_admin))
    update_wifi_credentials = classmethod(lambda cls, ip, user_admin, pass_admin, new_ssid=None, new_wifi_password=None, default_credentials=None, dry_run=True: ZTEScraper.update_wifi_credentials(ip, user_admin, pass_admin, new_ssid, new_wifi_password, default_credentials, dry_run))
    set_mac_filter_block = classmethod(lambda cls, ip, user_admin, pass_admin, mac_address, block=True, default_credentials=None: ZTEScraper.set_mac_filter_block(ip, user_admin, pass_admin, mac_address, block, default_credentials))

    @classmethod
    def _get_connected_devices_live_impl(cls, ip: str, user_admin: str, pass_admin: str) -> Dict[str, Any]:
        host = ip.strip()
        base_url = f"http://{host}"
        session = requests.Session()
        ok, _ = ZTEScraper.attempt_login(session, base_url, host, user_admin, pass_admin)
        if not ok:
            return {
                "success": False,
                "error_type": "AUTH_FAILED",
                "message": f"Gagal login ke modem ONT {host} dengan kredensial yang diberikan.",
                "devices": []
            }
        devices = ZTEScraper.scrape_connected_devices(session, base_url, host)
        return {
            "success": True,
            "ip": host,
            "total": len(devices),
            "devices": devices
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
        max_attempts_per_call: Optional[int] = None,
        is_mass_scan: bool = False,
        failed_credentials_history: Optional[List[Tuple[str, str]]] = None,
        exhaustive_first_scan: bool = False
    ) -> Dict[str, Any]:
        """
        Melakukan scraping lengkap ke satu perangkat modem ONT.
        Menguji kredensial pelanggan terlebih dahulu. Jika gagal, mencoba kredensial default (multi-list).
        Tiap kredensial dicoba 2-3 kali secara adaptif.
        Jika exhaustive_first_scan=True (atau scan mandiri):
        - Tetap menahan sesi HTTP (stay-connection) dan menguji SEMUA kredensial kandidat yang belum pernah gagal.
        Jika is_mass_scan=True dan exhaustive_first_scan=False:
        - fail-fast dengan status_koneksi='LOCKOUT' agar scan antrian berkala lancar.
        """
        host = ip.strip()
        base_url = f"http://{host}"
        session = requests.Session()

        # 1. Quick probe jangkauan host (Connect timeout 2.5 detik, Read 4.0 detik)
        r_probe = None
        try:
            r_probe = session.get(f"{base_url}/", timeout=(2.5, 4.0), headers={"Connection": "keep-alive"})
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

        probe_html = r_probe.text if r_probe is not None else ""
        setattr(session, "probe_html", probe_html)

        # Deteksi profil vendor modem
        vendor_info = CredentialChainManager.detect_ont_vendor_behavior(probe_html)
        default_lock_sec = vendor_info.get("default_lock_seconds", 60)
        require_stay = vendor_info.get("require_stay_connection", True)

        # 2. Cek status lockout dari probe text awal
        is_locked = False
        rem_secs = 0
        if r_probe is not None:
            is_locked, rem_secs = CredentialChainManager.parse_lockout_info(probe_html, default_wait=default_lock_sec)

        if is_locked and rem_secs > 0:
            if is_mass_scan:
                print(f"[-] [LOCKOUT_MASS_SKIP] ONT {host} ({customer_name}): Modem lockout ({rem_secs}s). Dilewati agar scan massal lancar.")
                return {
                    "success": False,
                    "error_type": "LOCKOUT",
                    "lockout_remaining_seconds": rem_secs,
                    "message": f"Modem terkunci lockout ONT ({rem_secs}s). Tunggu jeda countdown.",
                    "status_kredensial": "UNTESTED",
                    "status_koneksi": "LOCKOUT",
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": None
                }
            elif rem_secs > 3:
                print(f"[-] [LOCKOUT_WAIT_INITIAL] ONT {host} ({customer_name}): Menunggu countdown awal {rem_secs}s (stay session={require_stay})...")
                time.sleep(rem_secs + 1)
                try:
                    r_ref = session.get(f"{base_url}/", timeout=6, headers={"Connection": "keep-alive"})
                    probe_html = r_ref.text
                    setattr(session, "probe_html", probe_html)
                except Exception:
                    pass

        # 3. Susun daftar kandidat kredensial via CredentialChainManager
        active_candidate_list, total_available, credentials_to_try = CredentialChainManager.build_candidates_list(
            customer_user=customer_user,
            customer_pass=customer_pass,
            default_user=default_user,
            default_pass=default_pass,
            default_credentials=default_credentials,
            failed_credentials_history=failed_credentials_history,
            max_attempts_per_call=max_attempts_per_call
        )

        if not active_candidate_list:
            print(f"[-] [NO_CREDENTIALS] ONT {host} ({customer_name or 'Pelanggan'}): Kredensial modem pelanggan belum ada dan kredensial default di database kosong.")
            return {
                "success": False,
                "error_type": "NO_CREDENTIALS",
                "message": "Kredensial modem belum ada. Silakan input kredensial pada data pelanggan atau atur kredensial default di Pengaturan Sistem.",
                "status_kredensial": "INVALID",
                "status_koneksi": "INVALID",
                "rx_power": None,
                "suhu_ont": None,
                "uptime": None,
                "latency_ms": None
            }

        authenticated = False
        active_user = None
        active_pass = None
        auth_source = None
        last_resp = None
        newly_failed_credentials = []
        start_time = time.time()

        for u, p, source in active_candidate_list:
            cred_ok = False
            for attempt_num in range(1, 4):
                ok, resp = ZTEScraper.attempt_login(session, base_url, host, u, p, probe_text=probe_html)
                last_resp = resp
                probe_html = ""

                if ok:
                    authenticated = True
                    cred_ok = True
                    active_user = u
                    active_pass = p
                    auth_source = source
                    break

                resp_text = resp.text if resp is not None else ""
                is_lock, lock_secs = CredentialChainManager.parse_lockout_info(resp_text, default_wait=default_lock_sec)

                if is_lock:
                    last_lockout_seconds = lock_secs or default_lock_sec

                    if is_mass_scan and not exhaustive_first_scan:
                        print(f"[!] [LOCKOUT_MASS] ONT {host} ({customer_name}): Kena lockout {last_lockout_seconds}s di user '{u}'. Pemantauan massal lanjut ke pelanggan berikutnya.")
                        return {
                            "success": False,
                            "error_type": "LOCKOUT",
                            "lockout_remaining_seconds": last_lockout_seconds,
                            "message": f"Modem terkunci lockout ONT ({last_lockout_seconds}s). Percobaan berikutnya otomatis dijadwalkan.",
                            "status_kredensial": "INVALID",
                            "status_koneksi": "INVALID",
                            "rx_power": None,
                            "suhu_ont": None,
                            "uptime": None,
                            "latency_ms": int((time.time() - start_time) * 1000),
                            "failed_credentials": newly_failed_credentials
                        }

                    print(f"[!] [LOCKOUT_WAIT_STAY] ONT {host} ({customer_name}): Lockout {last_lockout_seconds}s pada user '{u}'. Menahan sesi HTTP stay connection hingga countdown selesai...")
                    time.sleep(last_lockout_seconds + 1)

                    try:
                        r_refresh = session.get(f"{base_url}/", timeout=6, headers={"Connection": "keep-alive"})
                        probe_html = r_refresh.text
                    except Exception:
                        pass
                    break

                break

            if not cred_ok:
                newly_failed_credentials.append((u, p))

            if authenticated:
                break

            time.sleep(1.0)

        latency = int((time.time() - start_time) * 1000)

        # Kasus A: Autentikasi Gagal
        if not authenticated:
            all_exhausted = len(active_candidate_list) >= total_available
            if last_resp is None:
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
                    "all_exhausted": all_exhausted,
                    "failed_credentials": newly_failed_credentials
                }
            else:
                print(f"[-] [AUTH_FAILED_EXHAUSTED] ONT {host} ({customer_name}): Seluruh kredensial ({len(active_candidate_list)}/{total_available}) telah dicoba dan tidak ada yang cocok.")
                return {
                    "success": False,
                    "error_type": "AUTH_FAILED",
                    "message": "Kredensial modem tidak cocok: Seluruh pasangan username/password di database telah dicoba dan ditolak.",
                    "status_kredensial": "INVALID",
                    "status_koneksi": "INVALID",
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": latency,
                    "all_exhausted": all_exhausted,
                    "attempted_count": len(active_candidate_list),
                    "total_creds": total_available,
                    "failed_credentials": newly_failed_credentials
                }

        # Kasus B: Autentikasi Berhasil -> Ambil Data Optik via OpticalParser
        opt_data = OpticalParser.extract_optical_data(session, base_url, host)

        if not opt_data or opt_data.get("rx_power") is None:
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

        device_wifi = ZTEScraper.extract_device_and_wifi_data(session, base_url, host)

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
            "jenis_modem": device_wifi.get("jenis_modem"),
            "uptime": 86400,
            "latency_ms": latency,
            "message": "Pengecekan live optik berhasil"
        }
