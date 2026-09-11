with open("scratch/secrity.html", "r", encoding="utf-8") as f:
    sec_txt = f.read()

import re

# Cari semua pemanggilan Transfer_meaning
matches = re.findall(r"Transfer_meaning\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)", sec_txt)
print(f"Total Transfer_meaning in secrity.html: {len(matches)}")
for k, v in matches:
    print(f"  {k} = '{v}'")
