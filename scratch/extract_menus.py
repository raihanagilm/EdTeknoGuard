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

# Ambil template.gch
r_temp = session.get(f"{BASE_URL}/template.gch", headers=headers, timeout=8)
txt = r_temp.text

# Ekstrak semua definisi menu di Javascript
# menu_items['mmStatus']['smWanStatu'] ...
menus = []
for line in txt.splitlines():
    line_s = line.strip()
    if any(k in line_s for k in ["['page']", "['URL']", "['langName']"]):
        menus.append(line_s)

with open("scratch/menus.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(menus))

print(f"Total menu lines found: {len(menus)}")
for m in menus[:40]:
    print("  ", m)
