import io
import re
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import openpyxl

from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, PerangkatONT, KuotaPelanggan

class CustomerImporter:
    def read_csv_safely(file_content: bytes) -> pd.DataFrame:
        """
        Membaca file CSV dengan multi-encoding (utf-8-sig, utf-8, cp1252, latin-1)
        dan auto-detect delimiter (; , \\t |), serta membersihkan BOM header.
        """
        encodings_to_try = ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1', 'iso-8859-1']
        decoded_text = None
        for enc in encodings_to_try:
            try:
                decoded_text = file_content.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue
        if decoded_text is None:
            decoded_text = file_content.decode('utf-8', errors='ignore')

        # Deteksi delimiter terbaik berdasarkan baris pertama data
        sample = decoded_text[:8192]
        lines = [l for l in sample.splitlines() if l.strip()]
        first_line = lines[0] if lines else ""

        candidates = [';', ',', '\t', '|']
        counts = {c: first_line.count(c) for c in candidates}
        best_sep = max(counts, key=counts.get)
        if counts[best_sep] == 0:
            try:
                dialect = csv.Sniffer().sniff(sample)
                best_sep = dialect.delimiter
            except Exception:
                best_sep = ','

        df = pd.read_csv(io.StringIO(decoded_text), sep=best_sep, dtype=str)
        # Bersihkan BOM, spasi, dan quotes tersembunyi pada header
        df.columns = [str(c).replace('\ufeff', '').strip().strip('"').strip("'") for c in df.columns]
        return df

    @staticmethod
    def generate_structured_customer_id(existing_ids: Optional[set] = None) -> str:
        """
        Menghasilkan ID pelanggan terstruktur sesuai standar aturan DB-05 (antislop-vibecoding):
        Format: <prefix><YYYYMMDD><4 digit acak>
        Contoh: cust202610104821
        """
        import random
        now_str = datetime.now().strftime("%Y%m%d")
        for _ in range(100):
            rand_digits = f"{random.randint(1000, 9999)}"
            cand = f"cust{now_str}{rand_digits}"
            if not existing_ids or cand not in existing_ids:
                return cand
        return f"cust{now_str}{random.randint(10000, 99999)}"

    @staticmethod
    def generate_customer_id_from_ip(ip: str, sequence: int = 1) -> str:
        """Fallback generator ID pelanggan berbasis format DB-05"""
        return CustomerService.generate_structured_customer_id()

    @staticmethod
    def analyze_import_file(file_content: bytes, filename: str) -> dict:
        filename_lower = filename.lower()
        if filename_lower.endswith('.csv'):
            try:
                df = CustomerService.read_csv_safely(file_content)
                cols = [str(c).strip() for c in df.columns if str(c).strip() and not str(c).startswith('Unnamed:')]
                
                return {
                    "is_excel": False,
                    "sheets": [{
                        "name": "CSV Data",
                        "columns": cols,
                        "header_row": 0,
                        "row_count": len(df)
                    }]
                }
            except Exception as e:
                raise ValueError(f"Gagal membaca file CSV: {str(e)}")
        elif filename_lower.endswith(('.xls', '.xlsx')):
            try:
                excel = pd.ExcelFile(io.BytesIO(file_content))
                sheets_data = []
                for sheet in excel.sheet_names:
                    # Deteksi baris header secara cerdas (periksa 10 baris pertama)
                    df_raw = pd.read_excel(excel, sheet_name=sheet, header=None, nrows=10)
                    if df_raw.empty:
                        sheets_data.append({
                            "name": sheet,
                            "columns": [],
                            "header_row": 0,
                            "row_count": 0
                        })
                        continue

                    best_row = 0
                    max_non_null = 0
                    for r in range(min(len(df_raw), 8)):
                        row_vals = [
                            str(x).strip() for x in df_raw.iloc[r] 
                            if pd.notna(x) and str(x).strip() != '' and not str(x).startswith('Unnamed:')
                        ]
                        if len(row_vals) > max_non_null:
                            max_non_null = len(row_vals)
                            best_row = r

                    cols = [
                        str(x).strip() for x in df_raw.iloc[best_row] 
                        if pd.notna(x) and str(x).strip() != '' and not str(x).startswith('Unnamed:')
                    ]

                    # Hitung estimasi baris data
                    df_full = pd.read_excel(excel, sheet_name=sheet, header=best_row)
                    row_count = len(df_full)

                    sheets_data.append({
                        "name": sheet,
                        "columns": cols,
                        "header_row": best_row,
                        "row_count": row_count
                    })

                return {
                    "is_excel": True,
                    "sheets": sheets_data
                }
            except Exception as e:
                raise ValueError(f"Gagal membaca file Excel: {str(e)}")
        else:
            raise ValueError("Format file tidak didukung. Harap gunakan berkas .xlsx, .xls, atau .csv")

    @staticmethod
    def preview_import_file(file_content: bytes, filename: str, sheet_name: str, mapping: dict, db: Session) -> dict:
        import math
        from app.db.models import Pelanggan, PerangkatONT

        filename_lower = filename.lower()
        try:
            if filename_lower.endswith('.csv'):
                df = CustomerService.read_csv_safely(file_content)
            else:
                excel = pd.ExcelFile(io.BytesIO(file_content))
                target_sheet = sheet_name if sheet_name in excel.sheet_names else excel.sheet_names[0]
                df_raw = pd.read_excel(excel, sheet_name=target_sheet, header=None, nrows=10)
                best_row = 0
                max_non_null = 0
                for r in range(min(len(df_raw), 8)):
                    row_vals = [
                        str(x).strip() for x in df_raw.iloc[r] 
                        if pd.notna(x) and str(x).strip() != '' and not str(x).startswith('Unnamed:')
                    ]
                    if len(row_vals) > max_non_null:
                        max_non_null = len(row_vals)
                        best_row = r

                df = pd.read_excel(excel, sheet_name=target_sheet, header=best_row)

            # Normalisasi kolom
            df.columns = [str(c).strip() for c in df.columns]
            df = df.fillna("")

            # Query data existing di database untuk deteksi ID dan IP unik (join PerangkatONT)
            existing_customers = (
                db.query(
                    Pelanggan.id_pelanggan, 
                    PerangkatONT.ip_router, 
                    PerangkatONT.ip_ont,
                    Pelanggan.nama,
                    Pelanggan.no_hp,
                    Pelanggan.alamat,
                    Pelanggan.paket,
                    Pelanggan.pop,
                    Pelanggan.kantor,
                    PerangkatONT.nama_wifi,
                    PerangkatONT.password_wifi,
                    PerangkatONT.jenis_modem
                )
                .outerjoin(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
                .filter(Pelanggan.is_active == True)
                .all()
            )
            existing_ids = {row[0] for row in existing_customers if row[0]}
            existing_by_ip = {}
            for row in existing_customers:
                cust_info = {
                    "id_pelanggan": row[0],
                    "nama": row[3] or "",
                    "no_wa": row[4] or "",
                    "alamat": row[5] or "",
                    "paket": row[6] or "",
                    "pop": row[7] or "",
                    "kantor": row[8] or "",
                    "nama_wifi": row[9] or "",
                    "password_wifi": row[10] or "",
                    "jenis_modem": row[11] or None
                }
                ip_r = (row[1] or "").strip()
                ip_o = (row[2] or "").strip()
                if ip_r:
                    existing_by_ip[ip_r] = cust_info
                if ip_o:
                    existing_by_ip[ip_o] = cust_info

            seen_ips_in_batch = {}  # ip_router -> original_row
            mapped_data = []

            for index, row in df.iterrows():
                row_dict = row.to_dict()
                mapped_row = {}
                has_any_data = False

                for db_field, excel_col in mapping.items():
                    if excel_col and excel_col in row_dict:
                        val = row_dict[excel_col]
                        if isinstance(val, float) and math.isnan(val):
                            val = ""
                        val = str(val).strip()
                        if val.endswith('.0') and db_field in ['id_pelanggan', 'no_hp', 'no_wa', 'ip_router']:
                            val = val[:-2]
                        mapped_row[db_field] = val
                        if val:
                            has_any_data = True
                    else:
                        mapped_row[db_field] = ""

                # Lewati baris yang benar-benar kosong
                if not has_any_data:
                    continue

                ip_router = mapped_row.get('ip_router', '').strip()
                nama = mapped_row.get('nama', '').strip()

                _status = "valid"
                _action = "update"
                _message = ""
                old_data = None
                has_conflicts = False

                if not ip_router:
                    _status = "error"
                    _action = "skip"
                    _message = "IP Router wajib diisi sebagai kunci pencocokan"
                elif ip_router in seen_ips_in_batch:
                    _status = "error"
                    _action = "skip"
                    _message = f"IP Router '{ip_router}' duplikat di berkas ini (sama dengan baris {seen_ips_in_batch[ip_router]})"
                else:
                    seen_ips_in_batch[ip_router] = index + 1
                    
                    if ip_router in existing_by_ip:
                        # IP terdaftar di database (Target Update / Lengkapi Data)
                        old_data = existing_by_ip[ip_router]
                        mapped_row['id_pelanggan'] = old_data['id_pelanggan']
                        if not nama:
                            mapped_row['nama'] = old_data['nama']

                        # Cek apakah ada konflik field yang sudah ada isinya di DB
                        conflicts = []
                        new_wa = mapped_row.get('no_wa', '') or mapped_row.get('no_hp', '')
                        if old_data.get('no_wa') and new_wa and old_data['no_wa'] != new_wa:
                            conflicts.append("No. WA")
                        if old_data.get('alamat') and mapped_row.get('alamat') and old_data['alamat'] != mapped_row['alamat']:
                            conflicts.append("Alamat")
                        if old_data.get('nama_wifi') and mapped_row.get('nama_wifi') and old_data['nama_wifi'] != mapped_row['nama_wifi']:
                            conflicts.append("WiFi")

                        if conflicts:
                            has_conflicts = True
                            _status = "conflict"
                            _action = "update" # default gunakan yang baru atau pertahankan lama sesuai preferensi admin
                            _message = f"Ditemukan perbedaan data pada {', '.join(conflicts)}. Pilih data yang ingin digunakan."
                        else:
                            _status = "match"
                            _action = "update"
                            _message = f"Cocok dengan pelanggan {old_data['nama']} ({old_data['id_pelanggan']}). Siap melengkapi data."
                    else:
                        # IP belum ada di database
                        _status = "unregistered"
                        _action = "skip" # default skip, atau simpan baru offline jika admin memilih
                        _message = f"IP '{ip_router}' belum terdaftar dari MikroTik. Admin dapat melewati atau menyimpan sebagai baru (Offline)."
                        if not mapped_row.get('id_pelanggan'):
                            mapped_row['id_pelanggan'] = CustomerService.generate_structured_customer_id(existing_ids)

                mapped_data.append({
                    "original_row": index + 1,
                    "data": mapped_row,
                    "old_data": old_data,
                    "has_conflicts": has_conflicts,
                    "selected_version": "new", # "new" atau "old"
                    "_status": _status,
                    "_action": _action,
                    "_message": _message
                })

            match_count = sum(1 for r in mapped_data if r["_status"] in ("match", "conflict"))
            unreg_count = sum(1 for r in mapped_data if r["_status"] == "unregistered")
            conflict_count = sum(1 for r in mapped_data if r["_status"] == "conflict")
            err_count = sum(1 for r in mapped_data if r["_status"] == "error")

            return {
                "total_rows": len(mapped_data),
                "match_count": match_count,
                "unregistered_count": unreg_count,
                "conflict_count": conflict_count,
                "errors_count": err_count,
                "preview_data": mapped_data,
                "existing_ids": list(existing_ids),
                "existing_ips": list(existing_by_ip.keys())
            }
        except Exception as e:
            raise ValueError(f"Gagal memproses file untuk preview: {str(e)}")

    @staticmethod
    def execute_json_import(db: Session, data_list: list, default_kantor: Optional[str] = "cabang") -> dict:
        from app.db.models import Pelanggan, PerangkatONT, Paket

        # 1. Validasi Ketat: Tolak eksekusi jika terdapat duplikasi IP Router atau ID Pelanggan
        active_items = [item for item in data_list if item.get("_action") != "skip" and item.get("_status") != "error"]
        
        batch_ids = {}
        batch_ips = {}
        duplicate_reasons = []

        # Ambil IP yang sudah aktif di DB untuk verifikasi tabrakan IP (baik ip_router maupun ip_ont)
        db_ips = {}
        for row in db.query(PerangkatONT.ip_router, PerangkatONT.ip_ont, PerangkatONT.id_pelanggan).all():
            if row[0]:
                db_ips[row[0].strip()] = row[2]
            if row[1]:
                db_ips[row[1].strip()] = row[2]

        # Cache master referensi untuk validasi FK
        from app.db.models import Kantor
        valid_pakets = {pk.nama for pk in db.query(Paket).all()}
        valid_kantors = {k.kode.lower() for k in db.query(Kantor).all()}

        for idx, item in enumerate(active_items, start=1):
            row_data = item.get("data", item)
            action = item.get("_action", "update")
            id_pel = str(row_data.get("id_pelanggan", "")).strip()
            ip_r = str(row_data.get("ip_router", "")).strip()

            if ip_r:
                if ip_r in batch_ips:
                    duplicate_reasons.append(f"IP Router '{ip_r}' ganda di berkas (baris {batch_ips[ip_r]} dan {idx})")
                else:
                    batch_ips[ip_r] = idx

                # Hanya tolak jika action adalah insert (simpan baru) tapi IP sudah dipakai di DB
                if action == "insert" and ip_r in db_ips:
                    duplicate_reasons.append(f"IP Router '{ip_r}' sudah digunakan pelanggan lain di DB (ID: {db_ips[ip_r]})")

        if duplicate_reasons:
            reasons_summary = ", ".join(duplicate_reasons[:3])
            if len(duplicate_reasons) > 3:
                reasons_summary += f" ... dan {len(duplicate_reasons) - 3} lainnya"
            raise ValueError(f"Eksekusi Ditolak: Ditemukan duplikasi ({reasons_summary}). Harap perbaiki sebelum melanjutkan!")

        imported_count = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0
        errors = []

        for item in data_list:
            try:
                # Dukung format payload langsung maupun terbungkus {data: ...}
                row_data = item.get("data", item)
                action = item.get("_action", "insert")
                status = item.get("_status", "valid")

                if action == "skip" or status == "error":
                    skipped_count += 1
                    continue

                id_pel = str(row_data.get("id_pelanggan", "")).strip()
                nama = str(row_data.get("nama", "")).strip()
                ip_router = str(row_data.get("ip_router", "")).strip()

                if not id_pel or not nama or not ip_router:
                    failed_count += 1
                    errors.append(f"Baris tidak lengkap: ID='{id_pel}', Nama='{nama}', IP='{ip_router}'")
                    continue

                # Tentukan kantor untuk baris ini
                raw_kantor = str(row_data.get("kantor", "")).strip().lower()
                if raw_kantor in valid_kantors:
                    row_kantor = raw_kantor
                else:
                    pop_val = str(row_data.get("pop", "")).upper()
                    matched_kantor = None
                    for k_code in valid_kantors:
                        if k_code.upper() in pop_val:
                            matched_kantor = k_code
                            break
                    if matched_kantor:
                        row_kantor = matched_kantor
                    elif default_kantor and default_kantor.lower().strip() in valid_kantors:
                        row_kantor = default_kantor.lower().strip()
                    elif valid_kantors:
                        row_kantor = next(iter(valid_kantors))
                    else:
                        row_kantor = "cabang"

                # Cari pelanggan existing berdasarkan IP Router atau IP ONT atau ID Pelanggan
                from sqlalchemy import or_
                existing_ont = db.query(PerangkatONT).filter(
                    or_(PerangkatONT.ip_router == ip_router, PerangkatONT.ip_ont == ip_router)
                ).first()
                existing_pel = None
                if existing_ont:
                    existing_pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == existing_ont.id_pelanggan).first()
                elif id_pel:
                    existing_pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
                    if existing_pel:
                        existing_ont = db.query(PerangkatONT).filter(PerangkatONT.id_pelanggan == existing_pel.id_pelanggan).first()

                # Pilihan versi data jika terjadi konflik (default "new")
                selected_version = item.get("selected_version", "new")
                new_wa = str(row_data.get("no_wa", "") or row_data.get("no_hp", "")).strip()
                new_alamat = str(row_data.get("alamat", "")).strip()
                new_wifi_ssid = str(row_data.get("nama_wifi", "")).strip()
                new_wifi_pass = str(row_data.get("password_wifi", "")).strip()

                if existing_pel and existing_ont:
                    # MODE LENGKAPI DATA (Enrichment Update)
                    has_change = False

                    # 0. Update ID Pelanggan ke Kode Resmi API (misal: CUST-SLA-xxx -> PLG-0002)
                    target_id_pel = str(row_data.get("network_bill_code") or id_pel or "").strip()
                    if target_id_pel and existing_pel.id_pelanggan != target_id_pel:
                        # Cek apakah target ID baru belum dipakai pelanggan lain
                        conflict_pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == target_id_pel).first()
                        if not conflict_pel:
                            existing_pel.id_pelanggan = target_id_pel
                            has_change = True

                    # 1. Update No. WhatsApp
                    if new_wa:
                        if not existing_pel.no_hp:
                            # Jika kosong, langsung isi
                            existing_pel.no_hp = new_wa
                            has_change = True
                        elif selected_version == "new" and existing_pel.no_hp != new_wa:
                            # Jika ada konflik dan admin memilih 'new'
                            existing_pel.no_hp = new_wa
                            has_change = True

                    # 2. Update Alamat
                    if new_alamat:
                        if not existing_pel.alamat or existing_pel.alamat.startswith("Wilayah "):
                            existing_pel.alamat = new_alamat
                            has_change = True
                        elif selected_version == "new" and existing_pel.alamat != new_alamat:
                            existing_pel.alamat = new_alamat
                            has_change = True

                    # 3. Update Nama jika di database masih placeholder
                    if nama and existing_pel.nama in ("Pelanggan", "Customer", "") or (selected_version == "new" and nama and existing_pel.nama != nama):
                        existing_pel.nama = nama
                        has_change = True

                    # 4. Update WiFi SSID & Password
                    if new_wifi_ssid:
                        if not existing_ont.nama_wifi or selected_version == "new":
                            existing_ont.nama_wifi = new_wifi_ssid
                            has_change = True
                    if new_wifi_pass:
                        if not existing_ont.password_wifi or selected_version == "new":
                            existing_ont.password_wifi = new_wifi_pass
                            has_change = True

                    # 5. Update MAC Address
                    new_mac = str(row_data.get("mac_address", "")).strip()
                    if new_mac:
                        if not existing_ont.mac_address or selected_version == "new":
                            existing_ont.mac_address = new_mac
                            has_change = True

                    if has_change:
                        from app.core.timezone import get_now_wib
                        existing_pel.updated_at = get_now_wib()
                        updated_count += 1
                    else:
                        skipped_count += 1
                else:
                    # MODE SIMPAN BARU (OFFLINE)
                    if action != "insert":
                        skipped_count += 1
                        continue

                    redaman_baseline = None
                    if row_data.get("redaman_baseline"):
                        try:
                            redaman_baseline = float(row_data["redaman_baseline"])
                        except (ValueError, TypeError):
                            pass

                    raw_pop = str(row_data.get("pop", "")).strip() or "Server Cabang"

                    # Pastikan master referensi Paket ada
                    raw_paket = str(row_data.get("paket", "")).strip() or None
                    if raw_paket and raw_paket not in valid_pakets:
                        try:
                            new_pkt = Paket(nama=raw_paket)
                            db.add(new_pkt)
                            db.flush()
                            valid_pakets.add(raw_paket)
                        except Exception:
                            db.rollback()
                            raw_paket = None
                            
                    from app.core.security import get_password_hash, DEFAULT_CUSTOMER_PASSWORD
                    # Simpan sebagai pelanggan baru offline (tidak aktif dipantau dulu sampai bound di MikroTik)
                    new_pelanggan = Pelanggan(
                        id_pelanggan=id_pel,
                        nama=nama,
                        alamat=new_alamat or None,
                        no_hp=new_wa or None,
                        pop=raw_pop,
                        kantor=row_kantor,
                        paket=raw_paket,
                        is_monitored=False, # Sesuai Q5: jadikan offline
                        is_active=True,
                        status_lease="waiting",
                        password_hash=get_password_hash(DEFAULT_CUSTOMER_PASSWORD)
                    )
                    db.add(new_pelanggan)
                    db.flush()

                    new_ont = PerangkatONT(
                        id_pelanggan=id_pel,
                        ip_router=ip_router,
                        jenis_modem=str(row_data.get("jenis_modem", "")).strip() or None,
                        mac_address=str(row_data.get("mac_address", "")).strip() or None,
                        redaman_baseline=redaman_baseline,
                        nama_wifi=new_wifi_ssid or None,
                        password_wifi=new_wifi_pass or None,
                        user_admin=str(row_data.get("user_admin", "admin")).strip() or "admin",
                        pass_admin=str(row_data.get("pass_admin", "tekno2024")).strip() or "tekno2024",
                        status_kredensial="INVALID"
                    )
                    db.add(new_ont)
                    imported_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Gagal memproses IP {row_data.get('ip_router', 'Unknown')}: {str(e)}")

        db.commit()

        return {
            "total_processed": imported_count + updated_count + skipped_count + failed_count,
            "imported": imported_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "errors": errors[:5]
        }

    def import_customers_from_csv(db: Session, file_content: bytes) -> Dict[str, Any]:
        """
        Membaca dan memproses isi file CSV pelanggan dengan Smart Header Detection.
        Mendukung berbagai nama header sinonim tanpa mewajibkan template baku.
        Mendukung encoding utf-8, utf-8-sig, latin-1, dan cp1252.
        Mendukung delimiter koma (,), titik-koma (;), dan tab (\t).
        Melakukan upsert (tambah baru atau perbarui jika ID Pelanggan sudah ada).
        """
        # Deteksi encoding
        decoded_text = None
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                decoded_text = file_content.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if not decoded_text:
            raise ValueError("Format berkas CSV tidak dapat dibaca (encoding tidak didukung).")

        # Deteksi delimiter (koma, titik koma, atau tab)
        first_line = decoded_text.splitlines()[0] if decoded_text.splitlines() else ""
        if "\t" in first_line and first_line.count("\t") > first_line.count(",") and first_line.count("\t") > first_line.count(";"):
            delimiter = "\t"
        elif ";" in first_line and first_line.count(";") > first_line.count(","):
            delimiter = ";"
        else:
            delimiter = ","

        reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
        rows = list(reader)

        if not rows:
            raise ValueError("File CSV kosong.")

        # Ambil header dan normalisasi huruf kecil
        raw_headers = [h.strip().lower() for h in rows[0]]
        
        # Helper fungsi pemetaan kolom pintar (Exact & Substring matching)
        def get_col_index(candidates: List[str]) -> int:
            for idx, h in enumerate(raw_headers):
                clean_h = re.sub(r'[^a-z0-9]', '', h)
                for c in candidates:
                    clean_c = re.sub(r'[^a-z0-9]', '', c)
                    if clean_h == clean_c:
                        return idx
            for idx, h in enumerate(raw_headers):
                for c in candidates:
                    if c in h:
                        return idx
            return -1

        idx_id = get_col_index(["id pelanggan", "id_pelanggan", "id", "customer_id", "cid", "client_id", "no pelanggan"])
        idx_nama = get_col_index(["nama", "name", "nama pelanggan", "customer", "customer name", "client", "klien", "user", "member", "nama klien"])
        idx_alamat = get_col_index(["alamat", "address", "lokasi", "addr", "domisili", "tempat"])
        idx_hp = get_col_index(["no hp", "no_hp", "telepon", "whatsapp", "wa", "phone", "mobile", "kontak", "handphone"])
        idx_pop = get_col_index(["pop", "server", "olt", "wilayah", "area", "site", "lokasi server", "node"])
        idx_ip = get_col_index(["ip router", "ip_router", "ip ont", "ip modem", "ip address", "alamat ip", "ip", "host", "onu ip"])
        idx_paket = get_col_index(["paket", "bandwidth", "kecepatan", "profile", "speed", "plan", "service", "bw"])
        idx_mac = get_col_index(["mac", "mac address", "mac_address", "hardware", "mac ont"])
        idx_redaman = get_col_index(["redaman", "rx", "baseline", "rx power", "rx_power", "dbm", "sinyal", "optical power"])
        idx_wifi = get_col_index(["nama wifi", "ssid", "wifi", "wifi name"])
        idx_pass_wifi = get_col_index(["password wifi", "pass wifi", "wpa", "sandi wifi", "key wifi"])
        idx_modem = get_col_index(["jenis modem", "tipe modem", "modem", "ont", "tipe ont", "device", "model", "onu"])
        idx_user_admin = get_col_index(["user admin", "username admin", "user ont", "modem user", "username"])
        idx_pass_admin = get_col_index(["pass admin", "password admin", "pass ont", "modem pass", "password"])

        # Fallback Cerdas: Jika kolom IP belum terdeteksi dari header, scan nilai baris pertama untuk pola IPv4
        if idx_ip == -1 and len(rows) > 1:
            for r in rows[1:4]:
                for c_idx, cell in enumerate(r):
                    if re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', cell.strip()):
                        idx_ip = c_idx
                        break
                if idx_ip != -1:
                    break

        # Fallback Cerdas: Jika kolom Nama belum terdeteksi, ambil kolom teks pertama yang bukan IP/ID
        if idx_nama == -1:
            for c_idx, h in enumerate(raw_headers):
                if c_idx != idx_ip and c_idx != idx_id:
                    idx_nama = c_idx
                    break

        if idx_ip == -1:
            raise ValueError("Tidak dapat mendeteksi kolom 'IP Router/Modem' pada berkas CSV Anda. Pastikan terdapat kolom IP Address (contoh: 10.10.x.x).")

        imported_count = 0
        updated_count = 0
        failed_count = 0
        errors = []

        for row_idx, row in enumerate(rows[1:], start=2):
            if not row or all(not cell.strip() for cell in row):
                continue

            def get_val(idx: int) -> str:
                if 0 <= idx < len(row):
                    return row[idx].strip()
                return ""

            ip_router = get_val(idx_ip)
            nama = get_val(idx_nama) if idx_nama != -1 else ""

            if not ip_router:
                failed_count += 1
                errors.append(f"Baris {row_idx}: Alamat IP Router kosong")
                continue

            if not nama:
                nama = f"Pelanggan {ip_router}"

            # Parsing ID Pelanggan
            id_pelanggan = get_val(idx_id)
            if not id_pelanggan:
                id_pelanggan = f"CUST-{uuid.uuid4().hex[:8].upper()}"

            # Parsing Redaman Baseline
            raw_redaman = get_val(idx_redaman)
            redaman_baseline = None
            if raw_redaman:
                try:
                    cleaned_redaman = raw_redaman.replace(",", ".").replace("dBm", "").strip()
                    redaman_baseline = float(cleaned_redaman)
                except ValueError:
                    redaman_baseline = None

            pop = get_val(idx_pop) or "Server Cabang"
            pop_lower = pop.lower()
            from app.db.models import Kantor
            kantor_objs = db.query(Kantor).all()
            valid_kantors = [k.kode.lower() for k in kantor_objs]
            fallback_k = valid_kantors[0] if valid_kantors else "cabang"

            matched_k = None
            for k in kantor_objs:
                k_kode = k.kode.lower()
                k_nama = (k.nama or "").lower()
                if (k_kode and k_kode in pop_lower) or (k_nama and k_nama in pop_lower):
                    matched_k = k_kode
                    break

            row_kantor = matched_k if matched_k else fallback_k

            alamat = get_val(idx_alamat) or None
            no_hp = get_val(idx_hp) or None
            raw_pkt = get_val(idx_paket) or None
            # Validasi paket ke tabel pakets untuk mencegah Foreign Key violation
            paket = None
            if raw_pkt:
                from app.db.models import Paket
                matching_pkt = db.query(Paket).filter(Paket.nama == raw_pkt).first()
                if matching_pkt:
                    paket = matching_pkt.nama
            mac_address = get_val(idx_mac) or None
            nama_wifi = get_val(idx_wifi) or None
            password_wifi = get_val(idx_pass_wifi) or None
            jenis_modem = get_val(idx_modem) or None
            user_admin = get_val(idx_user_admin) or "admin"
            pass_admin = get_val(idx_pass_admin) or None

            # Cek apakah pelanggan sudah ada berdasarkan id_pelanggan atau ip_router
            existing = db.query(Pelanggan).filter(
                or_(Pelanggan.id_pelanggan == id_pelanggan, Pelanggan.ip_router == ip_router)
            ).first()

            if existing:
                existing.nama = nama
                if alamat: existing.alamat = alamat
                if no_hp: existing.no_hp = no_hp
                if pop: existing.pop = pop
                existing.kantor = row_kantor
                existing.ip_router = ip_router
                if paket: existing.paket = paket
                if jenis_modem: existing.jenis_modem = jenis_modem
                if mac_address: existing.mac_address = mac_address
                if redaman_baseline is not None: existing.redaman_baseline = redaman_baseline
                if nama_wifi: existing.nama_wifi = nama_wifi
                if password_wifi: existing.password_wifi = password_wifi
                if user_admin: existing.user_admin = user_admin
                if pass_admin: existing.pass_admin = pass_admin
                existing.is_active = True
                updated_count += 1
            else:
                new_cust = Pelanggan(
                    id_pelanggan=id_pelanggan,
                    nama=nama,
                    alamat=alamat,
                    no_hp=no_hp,
                    pop=pop,
                    kantor=row_kantor,
                    ip_router=ip_router,
                    paket=paket,
                    jenis_modem=jenis_modem,
                    mac_address=mac_address,
                    redaman_baseline=redaman_baseline,
                    nama_wifi=nama_wifi,
                    password_wifi=password_wifi,
                    user_admin=user_admin,
                    pass_admin=pass_admin,
                    snmp_community="public",
                    is_active=True
                )
                db.add(new_cust)
                imported_count += 1

        db.commit()

        return {
            "total_processed": imported_count + updated_count + failed_count,
            "imported": imported_count,
            "updated": updated_count,
            "failed": failed_count,
            "errors": errors[:5]
        }

