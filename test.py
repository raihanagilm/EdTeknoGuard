"""
test.py - Script Diagnostik & Pengecekan Lengkap Modem ONT ZTE GM220-S & XPON
Menguji pembacaan asli dari modem fisik:
1. Autentikasi Login Admin ONT
2. MAC Address Asli Perangkat ONT
3. Nama / SSID WiFi Asli Pelanggan
4. Password WiFi Asli Pelanggan
5. Nilai Redaman Optik Rx Power (dBm), Tx Power, Bias Current, dan Alarm LOS

Penggunaan:
  python test.py                (Default IP: 10.10.0.142)
  python test.py 10.10.12.18    (Uji ke IP modem lain)
"""

import html
import os
import re
import subprocess
import sys
import time
from typing import Dict, Any, Optional
import requests

# Penentuan Target Host (Bisa melalui argumen CLI atau default)
TARGET_HOST = "10.10.0.142"
if len(sys.argv) > 1 and sys.argv[1].replace(".", "").isdigit():
    TARGET_HOST = sys.argv[1].strip()

BASE_URL = f"http://{TARGET_HOST}"

# Daftar Kredensial Uji Modem ONT ZTE GM220-S
CREDENTIAL_CANDIDATES = [
    ("admin", "admin"),
    ("admin", "tekno2024"),
    ("tekno", "tekno2025"),
]

# Jalur Endpoint Web GUI ZTE GM220-S
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"
GPON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
WLAN_ESSID_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_essid_t.gch"
WLAN_SECURITY_PATH = "/getpage.gch?pid=1002&nextpage=net_wlan_secrity_t.gch"


def check_and_wait_lockout(session: requests.Session) -> bool:
    """Mengecek apakah modem ONT sedang dalam status lockout (60 detik akibat 3x salah password)."""
    try:
        r = session.get(f"{BASE_URL}/", timeout=6, headers={"Connection": "keep-alive"})
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
        r = session.get(f"{BASE_URL}/", timeout=6, headers={"Connection": "keep-alive"})
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
        "Connection": "keep-alive",
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

    # Handshake navigasi ke template.gch untuk menstabilkan sesi
    if is_success:
        try:
            headers["Referer"] = f"{BASE_URL}/"
            session.get(f"{BASE_URL}/template.gch", headers=headers, timeout=6)
        except Exception:
            pass

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
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    info = {
        "mac_address": None,
        "mac_source": None,
        "nama_wifi": None,
        "password_wifi": None,
        "pon_sn": None,
        "model_name": None,
        "software_version": None
    }

    # 1. MAC Address, Serial Number, Software Version dari status_dev_info_t.gch
    try:
        r_dev = session.get(f"{BASE_URL}{STATUS_DEV_PATH}", headers=headers, timeout=10)
        if r_dev.status_code == 200:
            content = html.unescape(r_dev.text)

            # A. PON Serial Number
            m_sn = re.search(r'id=["\'](?:Frm_PonSerialNumber|Frm_SN)["\'][^>]*>(.*?)</td>', content, re.I)
            if m_sn:
                info["pon_sn"] = re.sub(r'<[^>]+>', '', m_sn.group(1)).strip()

            # B. Versi Software
            m_ver = re.search(r'id=["\']Frm_SoftwareVer["\'][^>]*>(.*?)</td>', content, re.I)
            if m_ver:
                info["software_version"] = re.sub(r'<[^>]+>', '', m_ver.group(1)).strip()

            # C. Model
            m_mod = re.search(r'id=["\']Frm_ModelName["\'][^>]*>(.*?)</td>', content, re.I)
            if m_mod:
                info["model_name"] = re.sub(r'<[^>]+>', '', m_mod.group(1)).strip()

            # D. MAC Address (Mendeteksi format sel tabel MAC di firmware ZTE GM220)
            # Contoh: <td class="tdleft">MAC</td> <td class="tdright">&#56;&#67;...</td>
            m_mac_cell = re.search(r'>\s*MAC\s*</td>\s*<td[^>]*>(.*?)</td>', content, re.I | re.S)
            if m_mac_cell:
                raw_cell = html.unescape(m_mac_cell.group(1))
                clean_mac = re.sub(r'<[^>]+>', '', raw_cell).strip().replace("-", ":").upper()
                m_found = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', clean_mac)
                if m_found:
                    info["mac_address"] = m_found.group(1)
                    info["mac_source"] = "Web GUI (status_dev_info)"

            # Alternatif pencarian MAC dengan regex global
            if not info["mac_address"]:
                m_gen = re.search(r'([0-9A-F]{2}(?::[0-9A-F]{2}){5})', content, re.I)
                if m_gen and m_gen.group(1) != "00:00:00:00:00:00":
                    info["mac_address"] = m_gen.group(1).upper()
                    info["mac_source"] = "Web GUI"
    except Exception as e:
        print(f"    [-] Gagal membaca status dev info: {e}")

    # Fallback MAC dari cache ARP jika Web GUI tidak memuat MAC
    if not info["mac_address"]:
        arp_mac = get_mac_from_arp(TARGET_HOST)
        if arp_mac:
            info["mac_address"] = arp_mac
            info["mac_source"] = "OS ARP Table Cache"

    # 2. SSID (Nama WiFi) dari net_wlan_essid_t.gch
    try:
        r_essid = session.get(f"{BASE_URL}{WLAN_ESSID_PATH}", headers=headers, timeout=8)
        if r_essid.status_code == 200:
            txt_essid = html.unescape(r_essid.text)
            # Cari Transfer_meaning('ESSID', 'NamaWiFi')
            m_tm_essid = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_essid)
            if m_tm_essid:
                # Ambil ESSID non-kosong pertama
                for item in m_tm_essid:
                    if item.strip():
                        info["nama_wifi"] = item.strip()
                        break
            
            # Fallback input / var
            if not info["nama_wifi"]:
                m_var = re.search(r'var\s+ESSID\s*=\s*["\']([^"\']+)["\']', txt_essid, re.I)
                if m_var and m_var.group(1).strip():
                    info["nama_wifi"] = m_var.group(1).strip()
    except Exception as e:
        print(f"    [-] Gagal membaca WLAN ESSID: {e}")

    # 3. Password WiFi (WPA PreSharedKey) dari net_wlan_secrity_t.gch
    try:
        r_sec = session.get(f"{BASE_URL}{WLAN_SECURITY_PATH}", headers=headers, timeout=8)
        if r_sec.status_code == 200:
            txt_sec = html.unescape(r_sec.text)

            # Cari Transfer_meaning('KeyPassphrase', 'PasswordWiFi')
            m_tm_pass = re.findall(r"Transfer_meaning\s*\(\s*['\"](?:KeyPassphrase|PreSharedKey)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_sec)
            if m_tm_pass:
                for item in m_tm_pass:
                    if item.strip():
                        info["password_wifi"] = item.strip()
                        break

            # Jika SSID belum terbaca dari halaman essid, coba dari security
            if not info["nama_wifi"]:
                m_tm_essid2 = re.findall(r"Transfer_meaning\s*\(\s*['\"]ESSID['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", txt_sec)
                if m_tm_essid2:
                    for item in m_tm_essid2:
                        if item.strip():
                            info["nama_wifi"] = item.strip()
                            break

            # Fallback jika password diinput langsung
            if not info["password_wifi"]:
                m_wpa_inp = re.search(r'id=["\'](?:Frm_KeyPassphrase|Frm_Passphrase)["\'][^>]*value=["\']([^"\']+)["\']', txt_sec, re.I)
                if m_wpa_inp and m_wpa_inp.group(1).strip():
                    info["password_wifi"] = m_wpa_inp.group(1).strip()
    except Exception as e:
        print(f"    [-] Gagal membaca WLAN Security: {e}")

    return info


def extract_pon_data(session: requests.Session):
    """Mengambil halaman gpon_status_link_t.gch dan mengekstrak data optik lengkap."""
    url = f"{BASE_URL}{GPON_STATUS_PATH}"
    headers = {
        "Host": TARGET_HOST,
        "Referer": f"{BASE_URL}/template.gch",
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    r = None
    for attempt in range(1, 3):
        try:
            r = session.get(url, headers=headers, timeout=12)
            if r.status_code == 200 and len(r.text) > 1000:
                break
        except requests.exceptions.Timeout:
            time.sleep(1)
        except Exception:
            time.sleep(1)

    if not r or r.status_code != 200:
        return None

    page_content = r.text
    results = {}

    m_rx = re.search(r'var\s+RxPower\s*=\s*["\']?([+-]?\d+)["\']?', page_content)
    m_tx = re.search(r'var\s+TxPower\s*=\s*["\']?([+-]?\d+)["\']?', page_content)
    m_cur = re.search(r'var\s+Current\s*=\s*["\']?([+-]?\d+)["\']?', page_content)
    m_los = re.search(r'var\s+LosInfo\s*=\s*["\']?(\d+)["\']?', page_content)

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

    # LoidState / GPON State
    m_loid = re.search(r"Transfer_meaning\s*\(\s*['\"]LoidState['\"]\s*,\s*['\"](\d+)['\"]\s*\)", page_content)
    loid_map = {
        "0": "Init State",
        "1": "LOID is Right (Authentication Successful)",
        "2": "LOID is Wrong",
        "3": "Password is Wrong",
        "4": "Authentication Successful",
        "5": "Init State"
    }
    if m_loid and m_loid.group(1) in loid_map:
        results["gpon_state"] = loid_map[m_loid.group(1)]
    else:
        results["gpon_state"] = "Normal"

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
    mac_src = f"[{device_wifi.get('mac_source')}]" if device_wifi.get("mac_source") else ""
    ssid = device_wifi.get("nama_wifi") or "Tidak Terbaca (-)"
    wifipass = device_wifi.get("password_wifi") or "Tidak Terbaca (-)"
    sn = device_wifi.get("pon_sn") or "N/A"
    sw_ver = device_wifi.get("software_version") or "N/A"
    model = device_wifi.get("model_name") or "GM220-S XPON"

    print("--- [1. INFORMASI PERANGKAT & WIFI PELANGGAN] ---")
    print(f"  • Model ONT            : {model}")
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

        print(f"  • Rx Optical Power     : {rx} dBm  <=== [NILAI REDAMAN ASLI]")
        print(f"  • Tx Optical Power     : {tx} dBm")
        print(f"  • Bias Current         : {cur} mA")
        print(f"  • Status GPON State    : {state}")
        print(f"  • Status Alarm LOS     : {'LOSS OF SIGNAL (Alarm Aktif)' if los else 'Normal (Tidak Ada LOS)'}")
    else:
        print("  [-] Data redaman optik belum berhasil ditarik dari modul PON.")

    print("=" * 65)


if __name__ == "__main__":
    main()
