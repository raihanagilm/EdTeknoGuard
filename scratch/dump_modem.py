import requests
import re
import html

TARGET_HOST = "10.10.0.142"
BASE_URL = f"http://{TARGET_HOST}"

session = requests.Session()
# 1. Ambil login token
r_init = session.get(f"{BASE_URL}/", timeout=5)
token = "5"
m = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r_init.text)
if m:
    token = m.group(1)

# 2. Login
login_data = {
    "action": "login",
    "username": "admin",
    "Password": "admin",
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

r_login = session.post(f"{BASE_URL}/", data=login_data, headers=headers, timeout=8)
print("Login status text contains template.gch:", "template.gch" in r_login.text)

# 3. Dump menu / navigation / frames
headers["Referer"] = f"{BASE_URL}/template.gch"
for p in ["/template.gch", "/menu.gch", "/top.gch"]:
    try:
        r = session.get(f"{BASE_URL}{p}", headers=headers, timeout=5)
        print(f"\n=== PAGE: {p} (Status: {r.status_code}, Length: {len(r.text)}) ===")
        # Cari semua link getpage.gch
        links = re.findall(r'nextpage=([a-zA-Z0-9_\-\.]+)', r.text)
        if links:
            print("Found links:", list(set(links)))
    except Exception as e:
        print(f"Error {p}: {e}")

# 4. Dump status_dev_info_t.gch
r_dev = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=status_dev_info_t.gch", headers=headers, timeout=8)
print("\n=== STATUS DEV INFO HTML SNIPPET ===")
for line in r_dev.text.splitlines():
    if any(k in line.lower() for k in ["mac", "serial", "pon", "version", "model", "hardware"]):
        print(line.strip())

# 5. Cek halaman-halaman yang mungkin memuat WiFi & MAC & Optik
test_pages = [
    "status_dev_info_t.gch",
    "status_optic_info_t.gch",
    "status_pon_info_t.gch",
    "status_pon_optical_t.gch",
    "gpon_status_link_t.gch",
    "pon_status_link_t.gch",
    "net_wlan_basic_t.gch",
    "net_wlan_security_t.gch",
    "net_wlan_multi_ssid_t.gch",
    "net_wlan_mssid_security_t.gch",
    "wlan_basic_t.gch",
    "wlan_security_t.gch",
    "wlan_advance_t.gch",
    "net_wlan_t.gch"
]

print("\n=== PROBING PAGES ===")
for pg in test_pages:
    url = f"{BASE_URL}/getpage.gch?pid=1002&nextpage={pg}"
    try:
        r = session.get(url, headers=headers, timeout=4)
        print(f"{pg:30} -> Status: {r.status_code}, Length: {len(r.text)}")
        if r.status_code == 200 and len(r.text) > 500:
            # Cari ssid / mac / key
            matches = []
            for kw in ["ssid", "passphrase", "psk", "key", "mac", "rxpower", "txpower"]:
                if kw in r.text.lower():
                    matches.append(kw)
            if matches:
                print(f"   [!] MATCH KEYWORDS in {pg}: {matches}")
    except Exception as e:
        print(f"{pg:30} -> Error: {e}")
