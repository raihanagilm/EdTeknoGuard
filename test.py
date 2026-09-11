"""
test.py - Script Diagnostik & Pengecekan Lengkap Modem ONT ZTE GM220-S & XPON
Menguji:
1. Autentikasi Login Admin ONT (Multi-Kredensial)
2. Redaman Optik (Rx Power dBm, Tx, Suhu, Status GPON, Alarm LOS)
3. Deteksi MAC Address Perangkat (Web GUI & Cache ARP)
4. Deteksi SSID / Nama WiFi Pelanggan
5. Deteksi Password WiFi Pelanggan (WPA Key / PreSharedKey)

Penggunaan:
  python test.py                (Default IP: 10.10.12.13)
  python test.py 10.10.0.142    (Uji ke IP spesifik)
"""

import html
import os
import re
import subprocess
import sys
import time
from typing import Dict, Any, Optional
import requests

# Penentuan Target Host (Bisa diisi argumen CLI atau default)
TARGET_HOST = "10.10.12.13"
if len(sys.argv) > 1 and sys.argv[1].replace(".", "").isdigit():
    TARGET_HOST = sys.argv[1].strip()

BASE_URL = f"http://{TARGET_HOST}"

# Daftar Kredensial Uji Modem ONT ZTE GM220-S
CREDENTIAL_CANDIDATES = [
    ("admin", "tekno2024"),
    ("admin", "admin"),
    ("tekno", "tekno2025"),
]

# Jalur Endpoint Web GUI ZTE GM220-S
PON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"

WLAN_PATHS = [
    ("/getpage.gch?pid=1002&nextpage=net_wlan_security_t.gch", "WLAN Security"),
    ("/getpage.gch?pid=1002&nextpage=net_wlan_basic_t.gch", "WLAN Basic"),
    ("/getpage.gch?pid=1002&nextpage=net_wlan_multi_ssid_t.gch", "WLAN Multi SSID"),
    ("/getpage.gch?pid=1002&nextpage=net_wlan_mssid_security_t.gch", "WLAN MSSID Security"),
    ("/getpage.gch?pid=1002&nextpage=wlan_security_t.gch", "WLAN Security Alt"),
    ("/getpage.gch?pid=1002&nextpage=wlan_basic_t.gch", "WLAN Basic Alt")
]


def check_and_wait_lockout(session: requests.Session) -> bool:
    """Mengecek apakah modem ONT sedang dalam status lockout (60 detik akibat 3x salah password)."""
    try:
        r = session.get(f"{BASE_URL}/", timeout=6, headers={"Connection": "close"})
        m_time = re.search(r'maxtime\s*=\s*Math\.min\(60,\s*(\d+)\s*\+\s*60\s*-\s*(\d+)\)', r.text)
        if m_time:
            rem = int(m_time.group(1)) + 60 - int(m_time.group(2))
            if rem > 0:
                print(f"[!] Modem ONT sedang lockout (keamanan anti-bruteforce).")
                print(f"    Sisa waktu penguncian: {rem} detik.")
                print("    Menunggu lockout terbuka secara otomatis...")
                for s in range(rem, 0, -5):
                    print(f"    ...sisa {s} detik")
                    time.sleep(min(5, s))
                time.sleep(2)
                print("    [+] Lockout selesai. Siap melanjutkan login.")
                return True
    except Exception as e:
        print(f"[-] Gagal mengecek status lockout: {e}")
    return False


def get_login_token(session: requests.Session) -> str:
    """Mengekstrak Frm_Logintoken dinamis yang diatur oleh fungsi dosubmit() di javascript."""
    try:
        r = session.get(f"{BASE_URL}/", timeout=6, headers={"Connection": "close"})
        m = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r.text)
        return m.group(1) if m else "5"
    except Exception:
        return "5"


def attempt_login(session: requests.Session, username: str, password: str):
    """Melakukan submit login ke modem ONT ZTE GM220-S."""
    token = get_login_token(session)

    payload = {
        "action": "login",
        "username": username,
        "Password": password,
        "Frm_Logintoken": token,
        "frashnum": ""
    }

    headers = {
        "Host": TARGET_HOST,
        "Referer": f"{BASE_URL}/",
        "Origin": BASE_URL,
        "Connection": "close",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        r = session.post(f"{BASE_URL}/", data=payload, headers=headers, timeout=10, allow_redirects=True)
    except Exception as e:
        print(f"    [-] Gagal mengirimkan request login: {e}")
        return False, None

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


def get_mac_from_arp(ip: str) -> Optional[str]:
    """Membaca cache ARP OS lokal untuk IP target sebagai alternatif MAC address."""
    try:
        out = subprocess.check_output(["arp", "-a", ip], text=True, timeout=2, stderr=subprocess.DEVNULL)
        m = re.search(r'([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})', out)
        if m:
            return m.group(1).replace("-", ":").upper()
    except Exception:
        pass
    return None


def extract_device_and_wifi(session: requests.Session) -> Dict[str, Any]:
    """
    Mengambil data MAC Address, Nama WiFi (SSID), dan Password WiFi
    langsung dari Web GUI modem ZTE GM220-S.
    """
    headers = {
        "Host": TARGET_HOST,
        "Referer": f"{BASE_URL}/template.gch",
        "Connection": "close",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    info = {
        "mac_address": None,
        "mac_source": None,
        "nama_wifi": None,
        "password_wifi": None,
        "pon_sn": None,
        "hardware_version": None,
        "software_version": None
    }

    # 1. Ambil MAC Address & Device Version dari status_dev_info_t.gch
    try:
        r_dev = session.get(f"{BASE_URL}{STATUS_DEV_PATH}", headers=headers, timeout=10)
        if r_dev.status_code == 200:
            content = r_dev.text

            # Serial Number PON
            m_sn = re.search(r'id=["\'](?:Frm_PonSerialNumber|Frm_SN)["\'][^>]*>(.*?)</td>', content, re.I)
            if m_sn:
                info["pon_sn"] = html.unescape(m_sn.group(1).strip())

            # MAC Address
            m_mac = re.search(r'id=["\'](?:Frm_MACAddress|Frm_PonMac|Frm_EthMac|Frm_Bssid)["\'][^>]*>(.*?)</td>', content, re.I)
            if not m_mac:
                m_mac = re.search(r'MAC\s*Address[^<]*</td>\s*<td[^>]*>\s*([0-9a-fA-F:]{17}|[0-9a-fA-F-]{17})', content, re.I)
            if m_mac:
                raw_mac = m_mac.group(1).strip()
                # Bersihkan tag html jika ada
                clean_mac = re.sub(r'<[^>]+>', '', raw_mac).replace("-", ":").upper()
                if len(clean_mac) == 17:
                    info["mac_address"] = clean_mac
                    info["mac_source"] = "Web GUI (status_dev_info)"

            # Versi Software / Firmware
            m_ver = re.search(r'id=["\']Frm_SoftwareVer["\'][^>]*>(.*?)</td>', content, re.I)
            if m_ver:
                info["software_version"] = html.unescape(m_ver.group(1).strip())
    except Exception as e:
        print(f"    [-] Gagal membaca status dev info: {e}")

    # Fallback MAC dari cache ARP jika Web GUI tidak menampilkan teks MAC
    if not info["mac_address"]:
        arp_mac = get_mac_from_arp(TARGET_HOST)
        if arp_mac:
            info["mac_address"] = arp_mac
            info["mac_source"] = "OS ARP Table Cache"

    # 2. Ambil SSID & Password WiFi dari halaman WLAN
    for path, desc in WLAN_PATHS:
        try:
            r_w = session.get(f"{BASE_URL}{path}", headers=headers, timeout=8)
            if r_w.status_code == 200:
                txt = r_w.text

                # A. Cari SSID (Nama WiFi)
                if not info["nama_wifi"]:
                    m_ssid = re.search(r'id=["\'](?:Frm_Essid|Frm_SSID|Frm_WlanSsid|Frm_SsidName)["\'][^>]*value=["\']([^"\']+)["\']', txt, re.I)
                    if not m_ssid:
                        m_ssid = re.search(r'var\s+(?:Essid|ESSID|WlanSsid|SSID1)\s*=\s*["\']([^"\']+)["\']', txt, re.I)
                    if not m_ssid:
                        m_ssid = re.search(r'name=["\'](?:Essid|SSID)["\'][^>]*value=["\']([^"\']+)["\']', txt, re.I)

                    if m_ssid:
                        val = m_ssid.group(1).strip()
                        if val and val != "undefined" and val != "null":
                            info["nama_wifi"] = html.unescape(val)

                # B. Cari Password WiFi (WPA PreSharedKey / KeyPassphrase)
                if not info["password_wifi"]:
                    m_pass = re.search(r'id=["\'](?:Frm_KeyPassphrase|Frm_Passphrase|Frm_Key1Str|Frm_WpaKey|Frm_PresharedKey)["\'][^>]*value=["\']([^"\']+)["\']', txt, re.I)
                    if not m_pass:
                        m_pass = re.search(r'var\s+(?:WpaPsk|KeyPassphrase|Key1Str|PreSharedKey|WpaKey)\s*=\s*["\']([^"\']+)["\']', txt, re.I)
                    if not m_pass:
                        m_pass = re.search(r'name=["\'](?:KeyPassphrase|Passphrase|Key1Str)["\'][^>]*value=["\']([^"\']+)["\']', txt, re.I)

                    if m_pass:
                        pval = m_pass.group(1).strip()
                        if pval and pval != "undefined" and pval != "null":
                            info["password_wifi"] = html.unescape(pval)

            if info["nama_wifi"] and info["password_wifi"]:
                break
        except Exception:
            continue

    return info


def extract_pon_data(session: requests.Session):
    """Mengambil halaman gpon_status_link_t.gch dan mengekstrak data optik lengkap."""
    url = f"{BASE_URL}{PON_STATUS_PATH}"
    headers = {
        "Host": TARGET_HOST,
        "Referer": f"{BASE_URL}/template.gch",
        "Connection": "close",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    r = None
    for attempt in range(1, 3):
        try:
            print(f"    (Menghubungi modul optik modem... percobaan {attempt}/2, timeout 25s)")
            r = session.get(url, headers=headers, timeout=25)
            if r.status_code == 200:
                break
        except requests.exceptions.Timeout:
            print("    [!] Modem membutuhkan waktu lebih lama untuk membaca sensor optik (timeout). Mengulang...")
            time.sleep(2)
        except Exception as e:
            print(f"[-] Gagal menghubungi {url}: {e}")
            time.sleep(1)

    if not r or r.status_code != 200:
        print(f"[-] Tidak mendapat respon valid dari {url}")
        return None

    page_content = r.text
    results = {}

    m_rx = re.search(r'var\s+RxPower\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_tx = re.search(r'var\s+TxPower\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_cur = re.search(r'var\s+Current\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_los = re.search(r'var\s+LosInfo\s*=\s*["\'](\d+)["\']', page_content)

    if m_rx:
        raw_rx = float(m_rx.group(1))
        results["rx_power_dbm"] = round(raw_rx / 10000.0, 2)
    else:
        m_rx_html = re.search(r'Optical\s*Module\s*Input\s*Power\(dBm\)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', page_content, re.IGNORECASE)
        results["rx_power_dbm"] = float(m_rx_html.group(1)) if m_rx_html else None

    if m_tx:
        raw_tx = float(m_tx.group(1))
        results["tx_power_dbm"] = round(raw_tx / 10000.0, 2)
    else:
        m_tx_html = re.search(r'Optical\s*Module\s*Output\s*Power\(dBm\)[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', page_content, re.IGNORECASE)
        results["tx_power_dbm"] = float(m_tx_html.group(1)) if m_tx_html else None

    if m_cur:
        raw_cur = float(m_cur.group(1))
        results["bias_current_ma"] = round(raw_cur / 1000.0, 2)
    else:
        m_cur_html = re.search(r'Optical\s*Transmitter\s*Bias\s*Current\(uA\)[^<]*</td>\s*<td[^>]*>\s*(\d+)', page_content, re.IGNORECASE)
        results["bias_current_ma"] = round(float(m_cur_html.group(1)) / 1000.0, 2) if m_cur_html else None

    m_volt = re.search(r'Optical\s*Module\s*Supply\s*Voltage\(uV\)[^<]*</td>\s*<td[^>]*>\s*(\d+)', page_content, re.IGNORECASE)
    results["supply_voltage_v"] = round(float(m_volt.group(1)) / 1000000.0, 2) if m_volt else None

    m_temp = re.search(r'Operating\s*Temperature[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', page_content, re.IGNORECASE)
    results["temperature_c"] = float(m_temp.group(1)) if m_temp else None

    m_loid = re.search(r'id=["\']LoidState["\'][^>]*value=["\'](\d+)["\']', page_content)
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
        m_state = re.search(r'GPON\s*State[^<]*</td>\s*<td[^>]*>\s*([^<]+)', page_content, re.IGNORECASE)
        results["gpon_state"] = m_state.group(1).strip() if m_state else "Normal"

    results["los_alarm"] = (m_los.group(1) == "1") if m_los else False

    return results


def main():
    print("=" * 65)
    print(f"   [TEST] DIAGNOSTIK LENGKAP ONT ZTE GM220-S / XPON")
    print(f"   Target URL : {BASE_URL}")
    print("=" * 65)

    session = requests.Session()

    # 1. Cek proteksi lockout awal
    check_and_wait_lockout(session)

    # 2. Percobaan login dengan kandidat kredensial
    authenticated_user = None
    authenticated_pass = None

    for username, password in CREDENTIAL_CANDIDATES:
        print(f"\n[1] Mencoba Login: user='{username}', pass='{password}' ...")
        check_and_wait_lockout(session)

        success, resp = attempt_login(session, username, password)

        if success:
            print(f"    [+] SUKSES! Terautentikasi sebagai '{username}'.")
            authenticated_user = username
            authenticated_pass = password
            break
        else:
            print(f"    [-] Gagal login dengan user='{username}'.")
            if resp and ("SetDisabled" in resp.text or "three times" in resp.text):
                print("    [!] Terdeteksi proteksi lockout 60 detik.")
                check_and_wait_lockout(session)
            time.sleep(1)

    if not authenticated_user:
        print("\n" + "!" * 65)
        print("[-] Gagal autentikasi dengan seluruh kredensial.")
        print("    Periksa apakah password modem telah diubah atau sedang terkunci.")
        print("!" * 65)
        sys.exit(1)

    # 3. Ambil data MAC Address, SSID WiFi, dan Password WiFi
    print("\n[2] Membaca Informasi Perangkat & Konfigurasi WiFi...")
    device_wifi = extract_device_and_wifi(session)

    # 4. Ambil data Optik PON
    print("\n[3] Membaca Sensor Optik PON (Rx/Tx Power)...")
    pon_data = extract_pon_data(session)

    # 5. Tampilkan Seluruh Hasil Pembacaan Asli dari Modem
    print("\n" + "=" * 65)
    print("         HASIL PEMBACAAN ASLI DARI MODEM ONT FISIK")
    print("=" * 65)

    # Bagian A: Identitas & WiFi
    mac = device_wifi.get("mac_address") or "Tidak Terbaca (-)"
    mac_src = f"({device_wifi.get('mac_source')})" if device_wifi.get("mac_source") else ""
    ssid = device_wifi.get("nama_wifi") or "Tidak Terbaca (-)"
    wifipass = device_wifi.get("password_wifi") or "Tidak Terbaca (-)"
    sn = device_wifi.get("pon_sn") or "N/A"
    sw_ver = device_wifi.get("software_version") or "N/A"

    print("--- [1. INFORMASI PERANGKAT & WIFI PELANGGAN] ---")
    print(f"  • Kredensial Login OK  : {authenticated_user} / {authenticated_pass}")
    print(f"  • MAC Address ONT      : {mac} {mac_src}")
    print(f"  • Nama / SSID WiFi     : {ssid}")
    print(f"  • Password WiFi        : {wifipass}")
    print(f"  • PON Serial Number    : {sn}")
    if sw_ver != "N/A":
        print(f"  • Software Version     : {sw_ver}")
    print("-" * 65)

    # Bagian B: Parameter Optik
    print("--- [2. SENSOR OPTIK & REDAMAN KONEKSI] ---")
    if pon_data and pon_data.get("rx_power_dbm") is not None:
        rx = pon_data["rx_power_dbm"]
        tx = pon_data.get("tx_power_dbm")
        cur = pon_data.get("bias_current_ma")
        los = pon_data.get("los_alarm")
        state = pon_data.get("gpon_state")
        volt = pon_data.get("supply_voltage_v")
        temp = pon_data.get("temperature_c")

        print(f"  • Rx Optical Power     : {rx} dBm  <=== [NILAI REDAMAN ASLI]")
        print(f"  • Tx Optical Power     : {tx} dBm")
        print(f"  • Bias Current         : {cur} mA")
        if volt is not None:
            print(f"  • Supply Voltage       : {volt} V")
        if temp is not None:
            print(f"  • Suhu Modem ONT       : {temp} °C")
        print(f"  • Status GPON State    : {state}")
        print(f"  • Status Alarm LOS     : {'LOSS OF SIGNAL (Alarm Aktif)' if los else 'Normal (Tidak Ada LOS)'}")
    else:
        print("  [-] Data redaman optik belum berhasil ditarik dari modul PON.")

    print("=" * 65)


if __name__ == "__main__":
    main()
