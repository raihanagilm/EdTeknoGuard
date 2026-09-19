import os
import sys

BASE_DIR = r"C:\Users\r\Documents\Magang\EdTeknoGuard_Pelanggan"

def write_file(rel_path, content):
    full_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Created: {rel_path}")

print("Building EdTeknoGuard_Pelanggan...")
