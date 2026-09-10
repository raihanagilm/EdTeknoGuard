"""
test.py - Script Diagnostik & Pengecekan Redaman Modem ONT GM220-S
Target IP: http://10.10.0.142/
Kredensial Uji: admin / admin atau tekno / tekno2025
"""

import html
import re
import sys
import time
import requests

TARGET_HOST = "10.10.12.13"
BASE_URL = f"http://{TARGET_HOST}"

# Kredensial yang diuji sesuai permintaan
CREDENTIAL_CANDIDATES = [
    ("admin", "tekno2024"),
    ("admin", "admin"),
    ("tekno", "tekno2025"),
]

PON_STATUS_PATH = "/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch"
STATUS_DEV_PATH = "/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch"


def check_and_wait_lockout(session: requests.Session) -> bool:
    """Mengecek apakah modem ONT sedang dalam status lockout (60 detik akibat 3x salah password)."""
    try:
        r = session.get(f"{BASE_URL}/", timeout=6)
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
        r = session.get(f"{BASE_URL}/", timeout=6)
        m = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r.text)
        return m.group(1) if m else "5"
    except Exception:
        return "5"


def attempt_login(session: requests.Session, username: str, password: str):
    """Melakukan submit login ke modem ONT GM220-S."""
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
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
    }

    try:
        r = session.post(f"{BASE_URL}/", data=payload, headers=headers, timeout=8, allow_redirects=True)
    except Exception as e:
        print(f"    [-] Gagal mengirimkan request login: {e}")
        return False, None

    # Tanda kegagalan login ZTE:
    is_failed = (
        "User information is error" in r.text or
        "wrong username or password" in r.text.lower() or
        "SetDisabled()" in r.text
    )

    # Tanda sukses: respon memuat template.gch atau top.gch
    is_success = (
        not is_failed and (
            "template.gch" in r.text or
            "top.gch" in r.text or
            "status_dev_info_t.gch" in r.text
        )
    )

    return is_success, r


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
    # Coba hingga 2 kali jika modem sedang lambat merespon sensor hardware optik
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

    # 1. Ekstraksi RxPower & TxPower dari variabel JavaScript doRxTxPowerShow()
    m_rx = re.search(r'var\s+RxPower\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_tx = re.search(r'var\s+TxPower\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_cur = re.search(r'var\s+Current\s*=\s*["\']([+-]?\d+)["\']', page_content)
    m_los = re.search(r'var\s+LosInfo\s*=\s*["\'](\d+)["\']', page_content)

    if m_rx:
        raw_rx = float(m_rx.group(1))
        results["rx_power_dbm"] = round(raw_rx / 10000.0, 2)
    else:
        # Fallback: cari dari tabel HTML langsung jika sudah dirender server
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

    # Voltage & Temperature
    m_volt = re.search(r'Optical\s*Module\s*Supply\s*Voltage\(uV\)[^<]*</td>\s*<td[^>]*>\s*(\d+)', page_content, re.IGNORECASE)
    results["supply_voltage_v"] = round(float(m_volt.group(1)) / 1000000.0, 2) if m_volt else None

    m_temp = re.search(r'Operating\s*Temperature[^<]*</td>\s*<td[^>]*>\s*([+-]?\d+\.?\d*)', page_content, re.IGNORECASE)
    results["temperature_c"] = float(m_temp.group(1)) if m_temp else None

    # GPON State
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

    # Coba ambil Serial Number dari template/status_dev
    try:
        r_dev = session.get(f"{BASE_URL}{STATUS_DEV_PATH}", headers=headers, timeout=10)
        m_sn = re.search(r'id=["\']Frm_PonSerialNumber["\'][^>]*>(.*?)</td>', r_dev.text)
        if m_sn:
            raw_sn = m_sn.group(1).strip()
            results["pon_sn"] = html.unescape(raw_sn)
        else:
            results["pon_sn"] = "N/A"
    except Exception:
        results["pon_sn"] = "N/A"

    return results


def main():
    print("=" * 60)
    print(f"   [TEST] PENGECEKAN REDAMAN OPTIK MODEM ONT GM220-S")
    print(f"   Target URL : {BASE_URL}")
    print("=" * 60)

    session = requests.Session()

    # 1. Cek proteksi lockout awal
    check_and_wait_lockout(session)

    # 2. Percobaan login dengan opsi kredensial
    authenticated_user = None
    for username, password in CREDENTIAL_CANDIDATES:
        print(f"\n[1] Mencoba Login Kredensial: user='{username}', pass='{password}' ...")
        
        # Antisipasi jika lockout muncul di tengah pengujian
        check_and_wait_lockout(session)

        success, resp = attempt_login(session, username, password)

        if success:
            print(f"    [+] SUKSES! Berhasil terautentikasi sebagai '{username}'.")
            authenticated_user = username
            break
        else:
            print(f"    [-] Gagal login dengan user='{username}'.")
            if resp and ("SetDisabled" in resp.text or "three times" in resp.text):
                print("    [!] Terdeteksi proteksi lockout 60 detik.")
                check_and_wait_lockout(session)
            time.sleep(1)

    if not authenticated_user:
        print("\n" + "!" * 60)
        print("[-] Gagal melakukan autentikasi dengan seluruh kredensial.")
        print("    Pastikan kredensial modem telah sesuai (admin:admin / tekno:tekno2025).")
        print("!" * 60)
        sys.exit(1)

    # 3. Ekstraksi Data Redaman Optik
    print("\n[2] Mengambil parameter optik dari modem...")
    pon_data = extract_pon_data(session)

    print("\n" + "=" * 60)
    print("                 HASIL DIAGNOSTIK MODEM ONT")
    print("=" * 60)
    if pon_data and pon_data.get("rx_power_dbm") is not None:
        rx = pon_data["rx_power_dbm"]
        tx = pon_data.get("tx_power_dbm")
        cur = pon_data.get("bias_current_ma")
        sn = pon_data.get("pon_sn")
        los = pon_data.get("los_alarm")

        state = pon_data.get("gpon_state")
        volt = pon_data.get("supply_voltage_v")
        temp = pon_data.get("temperature_c")

        print(f"  • GPON State           : {state}")
        print(f"  • PON Serial Number    : {sn}")
        print(f"  • Rx Optical Power     : {rx} dBm  <--- (NILAI REDAMAN)")
        print(f"  • Tx Optical Power     : {tx} dBm")
        print(f"  • Bias Current         : {cur} mA")
        if volt is not None:
            print(f"  • Supply Voltage       : {volt} V")
        if temp is not None:
            print(f"  • Operating Temp       : {temp} °C")
        print(f"  • Status Alarm LOS     : {'LOSS OF SIGNAL (Kabel Putus/Redup)' if los else 'Normal (Tidak Ada Alarm)'}")
        print("-" * 60)

        # Evaluasi Status Redaman berdasarkan standar FTTH/GPON
        if rx > -24.0:
            status = "SANGAT BAGUS (Optimal)"
            catatan = "Sinyal sangat kuat dan stabil."
        elif rx >= -27.0:
            status = "NORMAL (Standar Operasional)"
            catatan = "Sinyal dalam rentang batas wajar operasional internet."
        elif rx >= -30.0:
            status = "WARNING (Redaman Melemah)"
            catatan = "Perlu pengecekan konektor optik / kabel patch cord."
        else:
            status = "KRITIS / DROP (Rentan Putus)"
            catatan = "Redaman terlalu tinggi, berisiko sering RTO atau Loss of Signal."

        print(f"  Status Kualitas Sinyal : {status}")
        print(f"  Catatan Teknis         : {catatan}")
    else:
        print("[-] Gagal mengekstrak parameter optik dari halaman modem.")
        print("    Silakan periksa apakah modul PON aktif atau sedang LOS.")
    print("=" * 60)


if __name__ == "__main__":
    main()
