import requests
import re
import html
import json

TARGET_HOST = "10.10.0.142"
BASE_URL = f"http://{TARGET_HOST}"

session = requests.Session()
r_init = session.get(f"{BASE_URL}/", timeout=5)
token = re.search(r'Frm_Logintoken.*?\.value\s*=\s*["\'](\w+)["\']', r_init.text).group(1)

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
session.post(f"{BASE_URL}/", data=login_data, headers=headers, timeout=8)
headers["Referer"] = f"{BASE_URL}/template.gch"

# 1. Inspect status_optic_info_t.gch
r_opt = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=status_optic_info_t.gch", headers=headers, timeout=8)
opt_text = html.unescape(r_opt.text)

# Cari semua ID form dan variabel di status_optic_info_t.gch
optic_vars = {}
for m in re.finditer(r'var\s+([a-zA-Z0-9_]+)\s*=\s*["\']?([^"\';\n]+)["\']?', opt_text):
    var_name, var_val = m.group(1), m.group(2)
    if any(k in var_name.lower() for k in ["power", "rx", "tx", "current", "volt", "temp", "status", "link", "optic"]):
        optic_vars[var_name] = var_val

print("OPTIC VARS FOUND:", optic_vars)

# Cari juga tabel HTML td dengan nilai angka di status_optic_info_t.gch
td_pairs = re.findall(r'<td[^>]*class=["\']tdleft["\'][^>]*>(.*?)</td>\s*<td[^>]*class=["\']tdright["\'][^>]*>(.*?)</td>', opt_text, re.S)
for left, right in td_pairs:
    l_clean = html.unescape(re.sub(r'<[^>]+>', '', left)).strip()
    r_clean = html.unescape(re.sub(r'<[^>]+>', '', right)).strip()
    print(f"  TABLE TD: {l_clean} -> {r_clean}")

# 2. Cari semua halaman yang ada di template.gch
r_template = session.get(f"{BASE_URL}/template.gch", headers=headers, timeout=8)
all_gch = set(re.findall(r'([a-zA-Z0-9_\-]+\.gch)', r_template.text + r_opt.text))
wlan_gch = [g for g in all_gch if any(k in g.lower() for k in ["wlan", "wifi", "wireless", "ssid", "sec", "net", "radio"])]
print("\nWLAN GCH CANDIDATES IN FIRMWARE:", wlan_gch)

# Test masing-masing WLAN gch
wlan_results = {}
for g in wlan_gch:
    url = f"{BASE_URL}/getpage.gch?pid=1002&nextpage={g}"
    r = session.get(url, headers=headers, timeout=4)
    if r.status_code == 200 and len(r.text) > 2000:
        wlan_results[g] = len(r.text)
        txt = html.unescape(r.text)
        print(f"\n---> SUCCESS PAGE: {g} (Length: {len(r.text)})")
        for left, right in re.findall(r'<td[^>]*class=["\']tdleft["\'][^>]*>(.*?)</td>\s*<td[^>]*class=["\']tdright["\'][^>]*>(.*?)</td>', txt, re.S):
            l_c = html.unescape(re.sub(r'<[^>]+>', '', left)).strip()
            r_c = html.unescape(re.sub(r'<[^>]+>', '', right)).strip()
            print(f"     {l_c} -> {r_c}")
        # Cari input value
        for inp in re.finditer(r'<input[^>]+name=["\']([^"\']+)["\'][^>]+value=["\']([^"\']*)["\']', txt):
            print(f"     INPUT: {inp.group(1)} = {inp.group(2)}")
        for inp in re.finditer(r'<input[^>]+value=["\']([^"\']*)["\'][^>]+name=["\']([^"\']+)["\']', txt):
            print(f"     INPUT2: {inp.group(2)} = {inp.group(1)}")
