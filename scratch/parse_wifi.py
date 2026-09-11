import html
import re

with open("scratch/essid.html", "r", encoding="utf-8") as f:
    essid_txt = html.unescape(f.read())

with open("scratch/secrity.html", "r", encoding="utf-8") as f:
    sec_txt = html.unescape(f.read())

print("=== PARSING ESSID (SSID) ===")
# Cari input text atau hidden atau td
for inp in re.finditer(r'<input[^>]+(?:name|id)=["\']([^"\']+)["\'][^>]+value=["\']([^"\']*)["\']', essid_txt, re.I):
    name, val = inp.group(1), inp.group(2)
    if any(k in name.lower() for k in ["essid", "ssid", "name"]):
        print(f"  Input: {name} = '{val}'")

for m in re.finditer(r'var\s+([a-zA-Z0-9_]+)\s*=\s*["\']([^"\']+)["\']', essid_txt):
    vname, val = m.group(1), m.group(2)
    if any(k in vname.lower() for k in ["essid", "ssid", "name"]):
        print(f"  Var: {vname} = '{val}'")

# Cari di tabel HTML td
for m in re.finditer(r'<td[^>]*class=["\']tdleft["\'][^>]*>(.*?)</td>\s*<td[^>]*class=["\']tdright["\'][^>]*>(.*?)</td>', essid_txt, re.S):
    left = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    right = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if any(k in left.lower() for k in ["ssid", "name", "wlan"]):
        print(f"  Table: {left} = '{right}'")

print("\n=== PARSING SECURITY (WIFI PASSWORD) ===")
for inp in re.finditer(r'<input[^>]+(?:name|id)=["\']([^"\']+)["\'][^>]+value=["\']([^"\']*)["\']', sec_txt, re.I):
    name, val = inp.group(1), inp.group(2)
    if any(k in name.lower() for k in ["pass", "key", "psk", "wpa", "pwd"]):
        print(f"  Input: {name} = '{val}'")

for m in re.finditer(r'var\s+([a-zA-Z0-9_]+)\s*=\s*["\']([^"\']+)["\']', sec_txt):
    vname, val = m.group(1), m.group(2)
    if any(k in vname.lower() for k in ["pass", "key", "psk", "wpa", "pwd"]):
        print(f"  Var: {vname} = '{val}'")

for m in re.finditer(r'<td[^>]*class=["\']tdleft["\'][^>]*>(.*?)</td>\s*<td[^>]*class=["\']tdright["\'][^>]*>(.*?)</td>', sec_txt, re.S):
    left = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    right = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if any(k in left.lower() for k in ["pass", "key", "wpa", "security"]):
        print(f"  Table: {left} = '{right}'")
