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
    "Connection": "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
session.post(f"{BASE_URL}/", data=login_data, headers=headers, timeout=8)

# Handshake template.gch
headers["Referer"] = f"{BASE_URL}/template.gch"
session.get(f"{BASE_URL}/template.gch", headers=headers, timeout=6)

# Ambil gpon_status_link_t.gch
r_gpon = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=gpon_status_link_t.gch", headers=headers, timeout=15)
print(f"gpon_status_link_t.gch Status: {r_gpon.status_code}, Length: {len(r_gpon.text)}")
with open("scratch/gpon.html", "w", encoding="utf-8") as f:
    f.write(r_gpon.text)

matches = re.findall(r"Transfer_meaning\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", r_gpon.text)
print(f"Total Transfer_meaning in gpon.html: {len(matches)}")
for k, v in matches:
    print(f"  {k} = '{v}'")

# Cari variabel var RxPower, TxPower, dll
for m in re.finditer(r'var\s+([a-zA-Z0-9_]+)\s*=\s*["\']?([^"\';\n]+)["\']?', r_gpon.text):
    print(f"  VAR: {m.group(1)} = {m.group(2)}")
