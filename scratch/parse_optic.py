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
headers["Referer"] = f"{BASE_URL}/template.gch"

# Ambil status_optic_info_t.gch
r_opt = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=status_optic_info_t.gch", headers=headers, timeout=8)
with open("scratch/optic.html", "w", encoding="utf-8") as f:
    f.write(r_opt.text)

matches = re.findall(r"Transfer_meaning\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", r_opt.text)
print(f"Total Transfer_meaning in status_optic_info_t.gch: {len(matches)}")
for k, v in matches:
    print(f"  {k} = '{v}'")
