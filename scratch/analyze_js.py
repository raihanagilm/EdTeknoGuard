import re
import html

with open("scratch/essid.html", "r", encoding="utf-8") as f:
    essid_txt = f.read()

# Cari fungsi JavaScript di essid.html yang mengisi field form (biasanya page_init atau sejenisnya)
print("=== ESSID.HTML JAVASCRIPT FUNCTIONS ===")
funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{', essid_txt)
print("Functions in essid.html:", funcs[:25])

# Cari semua teks yang ada di dalam elemen <input>
inputs = re.findall(r'<input[^>]+>', essid_txt)
print("\nInputs count:", len(inputs))
for i in inputs[:15]:
    print(" ", i)

# Cari variabel yang memiliki nilai string tidak kosong
for line in essid_txt.splitlines():
    if "setValue" in line or "getValue" in line or "Transfer_Str" in line or "Frm_" in line:
        if not line.strip().startswith("//"):
            print("  CODE:", line.strip()[:140])
