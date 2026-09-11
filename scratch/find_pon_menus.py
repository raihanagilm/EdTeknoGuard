with open("scratch/menus.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== MENU PON & OPTIC DI MENUS.TXT ===")
for l in lines:
    if any(k in l.lower() for k in ["pon", "optic", "link", "gem", "fiber"]):
        print(l.strip())
