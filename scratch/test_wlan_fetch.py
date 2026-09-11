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
r_l = session.post(f"{BASE_URL}/", data=login_data, headers=headers, timeout=8)

# Simpan cookies sesi
print("Cookies after login:", session.cookies.get_dict())

# Sekarang buka template.gch dulu seperti browser
headers["Referer"] = f"{BASE_URL}/"
r_temp = session.get(f"{BASE_URL}/template.gch", headers=headers, timeout=6)
print("template.gch status:", r_temp.status_code)

headers["Referer"] = f"{BASE_URL}/template.gch"

# Coba ambil net_wlan_essid_t.gch
r_essid = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=net_wlan_essid_t.gch", headers=headers, timeout=6)
print(f"net_wlan_essid_t.gch status: {r_essid.status_code}, length: {len(r_essid.text)}")
with open("scratch/essid.html", "w", encoding="utf-8") as f:
    f.write(r_essid.text)

# Coba ambil net_wlan_secrity_t.gch
r_sec = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=net_wlan_secrity_t.gch", headers=headers, timeout=6)
print(f"net_wlan_secrity_t.gch status: {r_sec.status_code}, length: {len(r_sec.text)}")
with open("scratch/secrity.html", "w", encoding="utf-8") as f:
    f.write(r_sec.text)

# Coba ambil status_wlaninfo_t.gch
r_winfo = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=status_wlaninfo_t.gch", headers=headers, timeout=6)
print(f"status_wlaninfo_t.gch status: {r_winfo.status_code}, length: {len(r_winfo.text)}")
with open("scratch/wlaninfo.html", "w", encoding="utf-8") as f:
    f.write(r_winfo.text)

# Coba ambil net_11n_conf_t.gch
r_11n = session.get(f"{BASE_URL}/getpage.gch?pid=1002&nextpage=net_11n_conf_t.gch", headers=headers, timeout=6)
print(f"net_11n_conf_t.gch status: {r_11n.status_code}, length: {len(r_11n.text)}")
with open("scratch/11n.html", "w", encoding="utf-8") as f:
    f.write(r_11n.text)
