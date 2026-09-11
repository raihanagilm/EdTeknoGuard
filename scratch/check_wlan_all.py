import sys
import os
sys.path.insert(0, os.path.abspath("."))
import requests
import re

TARGET_HOST = "10.10.0.142"
BASE_URL = f"http://{TARGET_HOST}"

s = requests.Session()

# 1. Login
payload = {
    "action": "login",
    "username": "admin",
    "Password": "admin",
    "Frm_Logintoken": "5",
    "frashnum": ""
}
headers = {
    "Host": TARGET_HOST,
    "Referer": f"{BASE_URL}/",
    "Origin": BASE_URL,
    "Connection": "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded"
}
s.post(f"{BASE_URL}/", data=payload, headers=headers)
s.get(f"{BASE_URL}/template.gch", headers={"Referer": f"{BASE_URL}/", "Connection": "keep-alive"})

# 2. Check template.gch for pages
r_tmpl = s.get(f"{BASE_URL}/template.gch", headers={"Connection": "keep-alive"})
pages = sorted(list(set(re.findall(r'nextpage=([^&"\'\>]+)', r_tmpl.text))))

print("Halaman terkait WLAN / WiFi / Status di template.gch:")
for p in pages:
    if any(k in p.lower() for k in ["wlan", "wifi", "status", "radio"]):
        print("  -", p)

# 3. Sekarang cek semua halaman wlan tersebut dan print jika ada kata kunci SSID atau Pass
print("\nMengecek isi halaman-halaman WLAN...")
for p in pages:
    if "wlan" in p.lower():
        url = f"{BASE_URL}/getpage.gch?pid=1002&nextpage={p}"
        r = s.get(url, headers={"Referer": f"{BASE_URL}/template.gch", "Connection": "keep-alive"})
        print(f"\n--- Halaman: {p} (status: {r.status_code}, length: {len(r.text)}) ---")
        tms = re.findall(r"Transfer_meaning\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", r.text)
        for k, v in tms:
            if any(term in k.lower() for term in ["ssid", "pass", "key", "wpa", "auth", "radio", "enable"]):
                print(f"    {k} = {v}")
