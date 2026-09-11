with open("scratch/essid.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines in essid.html: {len(lines)}")
# Cari baris-baris yang mengandung SSID atau text bermakna
meaningful = []
for i, l in enumerate(lines):
    l_s = l.strip()
    if any(k in l_s.lower() for k in ["ssid", "essid", "wlan", "hide", "broadcast"]):
        meaningful.append((i+1, l_s[:150]))

with open("scratch/essid_meaningful.txt", "w", encoding="utf-8") as f:
    for num, txt in meaningful:
        f.write(f"L{num}: {txt}\n")

print(f"Found {len(meaningful)} meaningful lines in essid.html")
