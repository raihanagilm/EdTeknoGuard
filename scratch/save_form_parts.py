with open("scratch/essid.html", "r", encoding="utf-8") as f:
    txt = f.read()

# Ambil bagian form utama
start = txt.find("<form")
end = txt.rfind("</form>")

form_part = txt[start:end+7] if start != -1 and end != -1 else txt

with open("scratch/essid_form.txt", "w", encoding="utf-8") as f:
    f.write(form_part)

with open("scratch/secrity.html", "r", encoding="utf-8") as f:
    sec_txt = f.read()

sec_start = sec_txt.find("<form")
sec_end = sec_txt.rfind("</form>")

sec_form_part = sec_txt[sec_start:sec_end+7] if sec_start != -1 and sec_end != -1 else sec_txt

with open("scratch/secrity_form.txt", "w", encoding="utf-8") as f:
    f.write(sec_form_part)

print("Saved form parts successfully!")
