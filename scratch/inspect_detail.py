import requests
import re
import html

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

pages_to_check = [
    "status_optic_info_t.gch",
    "status_wlaninfo_t.gch",
    "net_wlan_essid_t.gch",
    "net_wlan_secrity_t.gch"
]

for pg in pages_to_check:
    url = f"{BASE_URL}/getpage.gch?pid=1002&nextpage={pg}"
    r = session.get(url, headers=headers, timeout=6)
    print(f"\n==================== {pg} (Status: {r.status_code}, Length: {len(r.text)}) ====================")
    txt = html.unescape(r.text)
    
    # 1. Cari tabel TD
    tds = re.findall(r'<td[^>]*>(.*?)</td>', txt, re.S)
    clean_tds = [re.sub(r'<[^>]+>', '', t).strip() for t in tds if re.sub(r'<[^>]+>', '', t).strip()]
    if clean_tds:
        print("  TD CONTENT:", clean_tds[:30])
        
    # 2. Cari semua input value
    inputs = re.findall(r'<input[^>]+(?:name|id)=["\']([^"\']+)["\'][^>]+value=["\']([^"\']*)["\']', txt, re.I)
    inputs += re.findall(r'<input[^>]+value=["\']([^"\']*)["\'][^>]+(?:name|id)=["\']([^"\']+)["\']', txt, re.I)
    if inputs:
        print("  INPUTS:", inputs[:15])
        
    # 3. Cari var Javascript yang mengandung data
    vars_found = re.findall(r'var\s+([a-zA-Z0-9_]+)\s*=\s*["\']([^"\']+)["\']', txt)
    important_vars = [v for v in vars_found if any(k in v[0].lower() for k in ["rx", "tx", "power", "ssid", "key", "pass", "wpa", "mac", "optic", "volt", "temp"])]
    if important_vars:
        print("  VARS:", important_vars)
