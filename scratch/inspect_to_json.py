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

pages_to_check = [
    "status_optic_info_t.gch",
    "status_wlaninfo_t.gch",
    "net_wlan_essid_t.gch",
    "net_wlan_secrity_t.gch"
]

out = {}

for pg in pages_to_check:
    url = f"{BASE_URL}/getpage.gch?pid=1002&nextpage={pg}"
    r = session.get(url, headers=headers, timeout=6)
    txt = html.unescape(r.text)
    
    # Cari semua elemen id dan value
    id_vals = re.findall(r'id=["\']([^"\']+)["\'][^>]*>(.*?)</td>', txt, re.S)
    clean_id_vals = {i.strip(): re.sub(r'<[^>]+>', '', v).strip() for i, v in id_vals if v.strip()}
    
    # Cari semua inputs
    inp_list = []
    for inp in re.finditer(r'<input[^>]+>', txt):
        inp_list.append(inp.group(0))
        
    # Cari tabel baris
    tr_list = []
    for tr in re.finditer(r'<tr[^>]*>(.*?)</tr>', txt, re.S):
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', tr.group(1), re.S)]
        cells = [c for c in cells if c]
        if cells:
            tr_list.append(cells)
            
    out[pg] = {
        "status": r.status_code,
        "length": len(r.text),
        "id_vals": clean_id_vals,
        "inputs": inp_list,
        "table_rows": tr_list[:25]
    }

with open("scratch/dump_result.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print("Saved to scratch/dump_result.json successfully!")
