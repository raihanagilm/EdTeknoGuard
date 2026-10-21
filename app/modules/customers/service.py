import uuid
import csv
import io
import re
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case

import openpyxl
import pandas as pd
import json

from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.timezone import get_now_wib, get_current_period
from app.db.models import Pelanggan, LogPerformaONT, PerangkatONT, KuotaPelanggan
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate

class CustomerService:

    @staticmethod
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
            existing_by_ip = {
                row[1]: {
                    "id_pelanggan": row[0],
                    "nama": row[2] or "",
                    "no_wa": row[3] or "",
                    "alamat": row[4] or "",
                    "paket": row[5] or "",
                    "pop": row[6] or "",
                    "kantor": row[7] or "",
                    "nama_wifi": row[8] or "",
                    "password_wifi": row[9] or "",
                    "jenis_modem": row[10] or None
                }
                for row in existing_customers if row[1]
            }

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

        # Ambil IP yang sudah aktif di DB untuk verifikasi tabrakan IP
        db_ips = {
            row[0]: row[1] 
            for row in db.query(PerangkatONT.ip_router, PerangkatONT.id_pelanggan).all() 
            if row[0]
        }

        # Cache master referensi untuk validasi FK
        valid_pakets = {pk.nama for pk in db.query(Paket).all()}

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
                if raw_kantor in ["cabang", "pusat", "banyumas"]:
                    row_kantor = raw_kantor
                else:
                    pop_val = str(row_data.get("pop", "")).upper()
                    if "PUSAT" in pop_val:
                        row_kantor = "pusat"
                    elif "BMS" in pop_val or "BANYUMAS" in pop_val:
                        row_kantor = "banyumas"
                    elif default_kantor and default_kantor.lower().strip() in ["cabang", "pusat", "banyumas"]:
                        row_kantor = default_kantor.lower().strip()
                    else:
                        row_kantor = "cabang"

                # Cari pelanggan existing berdasarkan IP Router atau ID Pelanggan
                existing_ont = db.query(PerangkatONT).filter(PerangkatONT.ip_router == ip_router).first()
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
                        status_lease="waiting"
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
                        status_kredensial="UNTESTED"
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

    @staticmethod
    def get_customers(
        db: Session,
        q: Optional[str] = None,
        pop: Optional[str] = None,
        status: Optional[str] = None,
        monitoring: Optional[str] = None,
        range_type: Optional[str] = "all",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sort_by: Optional[str] = "id",
        sort_dir: str = "asc",
        page: int = 1,
        limit: int = 15,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        # Subquery ID log terbaru per id_pelanggan
        subq = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.id).label('max_log_id')
            )
            .group_by(LogPerformaONT.id_pelanggan)
            .subquery()
        )

        current_period = get_current_period()

        query = (
            db.query(Pelanggan, LogPerformaONT, KuotaPelanggan)
            .outerjoin(PerangkatONT, PerangkatONT.id_pelanggan == Pelanggan.id_pelanggan)
            .outerjoin(subq, subq.c.id_pelanggan == Pelanggan.id_pelanggan)
            .outerjoin(LogPerformaONT, LogPerformaONT.id == subq.c.max_log_id)
            .outerjoin(
                KuotaPelanggan,
                (KuotaPelanggan.id_pelanggan == Pelanggan.id_pelanggan) & 
                (KuotaPelanggan.periode_bulan == current_period)
            )
            .filter(Pelanggan.is_active == True)
        )

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Pelanggan.nama.ilike(search_pattern),
                    Pelanggan.id_pelanggan.ilike(search_pattern),
                    Pelanggan.alamat.ilike(search_pattern),
                    PerangkatONT.ip_router.ilike(search_pattern),
                    PerangkatONT.ip_ont.ilike(search_pattern),
                    PerangkatONT.mac_address.ilike(search_pattern),
                    PerangkatONT.nama_wifi.ilike(search_pattern)
                )
            )

        if pop and pop != "Semua POP" and pop != "ALL":
            query = query.filter(Pelanggan.pop == pop)

        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            query = query.filter(Pelanggan.kantor.in_(allowed_kantor))

        if status and status != "Semua Status" and status != "ALL":
            if status == "NORMAL":
                query = query.filter(or_(LogPerformaONT.status_koneksi == "NORMAL", LogPerformaONT.status_koneksi == None))
            elif status == "WARNING":
                query = query.filter(LogPerformaONT.status_koneksi == "WARNING")
            elif status == "CRITICAL":
                query = query.filter(LogPerformaONT.status_koneksi == "CRITICAL")
            elif status == "LOS":
                query = query.filter(LogPerformaONT.status_koneksi == "LOS")
            elif status in ("NONAKTIF", "OFF"):
                query = query.filter(Pelanggan.is_monitored == False)
            else:
                query = query.filter(LogPerformaONT.status_koneksi == status)

        if monitoring and monitoring != "all":
            if monitoring in ("active", "true", "1"):
                query = query.filter(Pelanggan.is_monitored == True)
            elif monitoring in ("inactive", "false", "0"):
                query = query.filter(Pelanggan.is_monitored == False)

        # Filter Rentang Waktu Tanggal (Berdasarkan waktu cek log terakhir atau tanggal terdaftar)
        now = get_now_wib()
        date_col = func.coalesce(LogPerformaONT.waktu_cek, Pelanggan.created_at)
        if range_type == "today":
            cutoff = datetime(now.year, now.month, now.day)
            query = query.filter(date_col >= cutoff)
        elif range_type == "7d":
            cutoff = now - timedelta(days=7)
            query = query.filter(date_col >= cutoff)
        elif range_type == "30d":
            cutoff = now - timedelta(days=30)
            query = query.filter(date_col >= cutoff)
        elif range_type == "custom" and start_date and end_date:
            try:
                s_dt = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                e_dt = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                query = query.filter(date_col >= s_dt, date_col < e_dt)
            except ValueError:
                pass

        total_count = query.count()

        # Dynamic sorting yang aman dan sesuai kolom tabel
        effective_ip = func.coalesce(PerangkatONT.ip_ont, PerangkatONT.ip_router)
        effective_status = case(
            (Pelanggan.status_lease == "waiting", "OFFLINE"),
            (LogPerformaONT.status_koneksi.isnot(None), LogPerformaONT.status_koneksi),
            else_="NORMAL"
        )
        col_map = {
            "id": Pelanggan.id,
            "id_pelanggan": Pelanggan.id_pelanggan,
            "nama": Pelanggan.nama,
            "pop": Pelanggan.pop,
            "ip_router": effective_ip,
            "ip_ont": effective_ip,
            "ip": effective_ip,
            "paket": Pelanggan.paket,
            "jenis_modem": PerangkatONT.jenis_modem,
            "redaman_baseline": PerangkatONT.redaman_baseline,
            "status_kredensial": PerangkatONT.status_kredensial,
            "redaman_current": LogPerformaONT.rx_power,
            "rx_power": LogPerformaONT.rx_power,
            "status": effective_status,
            "status_koneksi": effective_status,
            "kuota": KuotaPelanggan.kuota_terpakai_gb,
            "kuota_terpakai_gb": KuotaPelanggan.kuota_terpakai_gb,
            "terpakai_gb": KuotaPelanggan.kuota_terpakai_gb,
            "is_monitored": Pelanggan.is_monitored,
            "waktu_cek": LogPerformaONT.waktu_cek,
            "created_at": Pelanggan.created_at
        }
        target_col = col_map.get(sort_by, Pelanggan.id)
        if sort_dir.lower() == "desc":
            query = query.order_by(target_col.is_(None), target_col.desc())
        else:
            query = query.order_by(target_col.is_(None), target_col.asc())

        offset = (page - 1) * limit
        rows = query.offset(offset).limit(limit).all()

        result = []
        for c, latest_log, kuota_rec in rows:
            current_status = latest_log.status_koneksi if latest_log else "NORMAL"
            current_rx = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else (float(c.redaman_baseline) if c.redaman_baseline else None)
            last_check = latest_log.waktu_cek.strftime("%d/%m %H:%M") if (latest_log and latest_log.waktu_cek) else "-"
            waktu_terakhir_iso = latest_log.waktu_cek.isoformat() if (latest_log and latest_log.waktu_cek) else None

            kuota_gb = float(kuota_rec.kuota_terpakai_gb) if kuota_rec and kuota_rec.kuota_terpakai_gb is not None else 0.0
            up_bytes = int(kuota_rec.upload_bytes) if kuota_rec and kuota_rec.upload_bytes else 0
            dl_bytes = int(kuota_rec.download_bytes) if kuota_rec and kuota_rec.download_bytes else 0
            last_sync_str = kuota_rec.last_sync_mikrotik.strftime("%d/%m %H:%M") if kuota_rec and kuota_rec.last_sync_mikrotik else None

            result.append({
                "id_pelanggan": c.id_pelanggan,
                "nama": c.nama,
                "alamat": c.alamat or "-",
                "no_hp": c.no_hp or "-",
                "pop": c.pop,
                "ip_router": c.ip_router,
                "ip_ont": getattr(c, "ip_ont", None),
                "paket": c.paket or "-",
                "jenis_modem": c.jenis_modem,
                "mac_address": c.mac_address or "-",
                "redaman_baseline": float(c.redaman_baseline) if c.redaman_baseline else None,
                "rx_power": current_rx,
                "rx": current_rx,
                "redaman_current": current_rx,
                "redaman_terakhir": current_rx,
                "status": current_status,
                "status_koneksi": current_status,
                "status_terakhir": current_status,
                "last_check": last_check,
                "waktu_terakhir": waktu_terakhir_iso,
                "waktu_cek": last_check,
                "suhu_ont": float(latest_log.suhu_ont) if (latest_log and latest_log.suhu_ont is not None) else None,
                "latency_ms": int(latest_log.latency_ms) if (latest_log and latest_log.latency_ms is not None) else None,
                "lokasi_gps": c.lokasi_gps or None,
                "nama_wifi": c.nama_wifi or "-",
                "password_wifi": c.password_wifi or "-",
                "user_admin": c.user_admin or "-",
                "pass_admin": c.pass_admin or "-",
                "status_kredensial": getattr(c, "status_kredensial", "UNTESTED") or "UNTESTED",
                "is_monitored": bool(getattr(c, "is_monitored", True)),
                "status_lease": getattr(c, "status_lease", "bound") or "bound",
                "kantor": getattr(c, "kantor", "cabang") or "cabang",
                "status_isolir": bool(getattr(c, "status_isolir", False)),
                "queue_name": getattr(c, "queue_name", None) or c.nama,
                "kuota_terpakai_gb": kuota_gb,
                "upload_bytes": up_bytes,
                "download_bytes": dl_bytes,
                "last_sync_mikrotik": last_sync_str
            })

        return total_count, result

    @staticmethod
    def toggle_monitoring(db: Session, id_pelanggan: str, is_monitored: Optional[bool] = None) -> Optional[Pelanggan]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None
        if is_monitored is not None:
            cust.is_monitored = bool(is_monitored)
        else:
            cust.is_monitored = not bool(getattr(cust, "is_monitored", True))
        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Optional[Tuple[Pelanggan, List[LogPerformaONT]]]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        logs = (
            db.query(LogPerformaONT)
            .filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            .order_by(LogPerformaONT.waktu_cek.desc())
            .limit(50)
            .all()
        )
        return cust, logs

    @staticmethod
    def get_min_date(db: Session) -> str:
        earliest_log = db.query(func.min(LogPerformaONT.waktu_cek)).scalar()
        earliest_cust = db.query(func.min(Pelanggan.created_at)).scalar()
        dates = [d for d in [earliest_log, earliest_cust] if d is not None]
        if dates:
            return min(dates).strftime("%Y-%m-%d")
        return "2026-09-01"

    @staticmethod
    def get_pop_list(
        db: Session, 
        kantor: Optional[str] = None, 
        allowed_kantor: Optional[List[str]] = None
    ) -> List[str]:
        q = db.query(Pelanggan.pop).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            q = q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q = q.filter(Pelanggan.kantor.in_(allowed_kantor))
        rows = q.distinct().all()
        return [r[0] for r in rows if r[0]]

    @staticmethod
    def get_customer_stats(
        db: Session,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Menghitung agregasi KPI status pelanggan untuk kartu analitik dashboard"""
        base_q = db.query(Pelanggan).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            base_q = base_q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            base_q = base_q.filter(Pelanggan.kantor.in_(allowed_kantor))

        monitored_active = base_q.filter(Pelanggan.is_monitored == True).count()
        monitored_inactive = base_q.filter(Pelanggan.is_monitored == False).count()
        total_all = base_q.count()

        total_pelanggan = total_all  # Nilai total harus sesuai dengan jumlah data pelanggan aktual di database

        pop_q = (
            db.query(Pelanggan.pop, func.count(Pelanggan.id))
            .filter(
                Pelanggan.is_active == True
            )
        )
        if kantor and kantor != "all":
            pop_q = pop_q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            pop_q = pop_q.filter(Pelanggan.kantor.in_(allowed_kantor))
        pop_counts = pop_q.group_by(Pelanggan.pop).all()

        subq_builder = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.id).label('max_log_id')
            )
            .join(Pelanggan, Pelanggan.id_pelanggan == LogPerformaONT.id_pelanggan)
            .filter(
                Pelanggan.is_active == True
            )
        )
        if kantor and kantor != "all":
            subq_builder = subq_builder.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            subq_builder = subq_builder.filter(Pelanggan.kantor.in_(allowed_kantor))
        subq = subq_builder.group_by(LogPerformaONT.id_pelanggan).subquery()

        status_counts = (
            db.query(
                LogPerformaONT.status_koneksi,
                func.count(Pelanggan.id)
            )
            .join(subq, subq.c.id_pelanggan == Pelanggan.id_pelanggan)
            .join(LogPerformaONT, LogPerformaONT.id == subq.c.max_log_id)
            .filter(
                Pelanggan.is_active == True
            )
            .group_by(LogPerformaONT.status_koneksi)
            .all()
        )
        status_dict = {s[0]: s[1] for s in status_counts}
        normal_count = status_dict.get("NORMAL", 0)
        warning_count = status_dict.get("WARNING", 0)
        critical_count = status_dict.get("CRITICAL", 0)
        los_count = status_dict.get("LOS", 0)

        total_with_logs = sum(status_dict.values())
        if total_pelanggan > total_with_logs:
            normal_count += (total_pelanggan - total_with_logs)

        return {
            "total": total_pelanggan,
            "total_all": total_all,
            "normal": normal_count,
            "warning": warning_count,
            "critical": critical_count,
            "los": los_count,
            "critical_los": critical_count + los_count,
            "monitored_active": monitored_active,
            "monitored_inactive": monitored_inactive,
            "pop_distribution": [{"pop": p[0], "count": p[1]} for p in pop_counts]
        }

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate) -> Pelanggan:
        from app.db.models import PerangkatONT

        if not data.id_pelanggan or not str(data.id_pelanggan).strip():
            # Cari urutan sequence untuk IP router terkait jika sudah ada di DB
            clean_ip = "".join(filter(str.isdigit, str(data.ip_router or "0")))
            existing_count = db.query(Pelanggan).filter(Pelanggan.id_pelanggan.like(f"P{clean_ip}%")).count()
            data.id_pelanggan = CustomerService.generate_customer_id_from_ip(data.ip_router or "10.10.0.1", existing_count + 1)

        # Validasi duplikasi ID Pelanggan
        existing_id = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == data.id_pelanggan).first()
        if existing_id:
            raise ValueError(f"ID Pelanggan '{data.id_pelanggan}' sudah terdaftar")

        # Validasi duplikasi IP Router aktif (join PerangkatONT)
        existing_ip = (
            db.query(PerangkatONT)
            .join(Pelanggan, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
            .filter(
                PerangkatONT.ip_router == data.ip_router,
                Pelanggan.is_active == True
            )
            .first()
        )
        if existing_ip:
            pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == existing_ip.id_pelanggan).first()
            pel_name = pel.nama if pel else existing_ip.id_pelanggan
            raise ValueError(f"IP Router '{data.ip_router}' sudah digunakan oleh pelanggan '{pel_name}'")

        new_cust = Pelanggan(
            id_pelanggan=data.id_pelanggan,
            nama=data.nama,
            alamat=data.alamat,
            no_hp=data.no_hp,
            pop=data.pop,
            kantor=getattr(data, "kantor", "cabang") or "cabang",
            paket=data.paket,
            is_monitored=getattr(data, "is_monitored", True) if getattr(data, "is_monitored", None) is not None else True,
            is_active=True
        )
        db.add(new_cust)
        db.flush()

        new_ont = PerangkatONT(
            id_pelanggan=data.id_pelanggan,
            ip_router=data.ip_router,
            jenis_modem=data.jenis_modem or None,
            mac_address=data.mac_address,
            redaman_baseline=data.redaman_baseline,
            nama_wifi=data.nama_wifi,
            password_wifi=data.password_wifi,
            user_admin=data.user_admin or "admin",
            pass_admin=data.pass_admin or "tekno2024",
            snmp_community=data.snmp_community or "public",
            status_kredensial="UNTESTED"
        )
        db.add(new_ont)
        db.commit()
        db.refresh(new_cust)
        return new_cust

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate) -> Optional[Pelanggan]:
        from app.db.models import PerangkatONT

        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        update_dict = data.dict(exclude_unset=True)

        if "ip_router" in update_dict and update_dict["ip_router"]:
            new_ip = str(update_dict["ip_router"]).strip()
            # Periksa apakah IP sudah digunakan oleh pelanggan aktif lain
            existing_ip = (
                db.query(PerangkatONT)
                .join(Pelanggan, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
                .filter(
                    PerangkatONT.ip_router == new_ip,
                    Pelanggan.is_active == True,
                    Pelanggan.id_pelanggan != id_pelanggan
                )
                .first()
            )
            if existing_ip:
                pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == existing_ip.id_pelanggan).first()
                pel_name = pel.nama if pel else existing_ip.id_pelanggan
                raise ValueError(f"IP Router '{new_ip}' sudah digunakan oleh pelanggan '{pel_name}' (ID: {existing_ip.id_pelanggan})")

        if "no_wa" in update_dict and update_dict["no_wa"] is not None:
            cust.no_hp = str(update_dict["no_wa"]).strip()

        for field, val in update_dict.items():
            if hasattr(cust, field) and val is not None:
                setattr(cust, field, val)

        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str) -> bool:
        """Hapus permanen data utama pelanggan beserta seluruh data anakannya (CASCADE)."""
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return False

        # Hard delete memicu foreign key ON DELETE CASCADE dan SQLAlchemy cascade
        db.delete(cust)
        db.commit()
        return True

    @staticmethod
    def bulk_delete_customers(db: Session, id_list: List[str]) -> int:
        """Hapus permanen banyak pelanggan sekaligus beserta seluruh data anakannya (CASCADE)."""
        if not id_list:
            return 0

        customers = db.query(Pelanggan).filter(Pelanggan.id_pelanggan.in_(id_list)).all()
        affected = len(customers)
        for cust in customers:
            db.delete(cust)
        db.commit()
        return affected

    @staticmethod
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
            pop_upper = pop.upper()
            from app.core.security import get_all_kantor_codes
            valid_kantors = get_all_kantor_codes(db=db)
            fallback_k = valid_kantors[0] if valid_kantors else "pusat"

            if "PUSAT" in pop_upper and "pusat" in valid_kantors:
                row_kantor = "pusat"
            elif ("BMS" in pop_upper or "BANYUMAS" in pop_upper) and "banyumas" in valid_kantors:
                row_kantor = "banyumas"
            elif "cabang" in valid_kantors:
                row_kantor = "cabang"
            else:
                row_kantor = fallback_k

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

    @staticmethod
    def generate_excel_export(
        db: Session,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> bytes:
        """
        Menghasilkan file Excel (.xlsx) data seluruh pelanggan aktif
        lengkap dengan status performa dan redaman terakhir menggunakan styling profesional.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Data Pelanggan ONT"
        ws.views.sheetView[0].showGridLines = True

        # Palet Warna Styling
        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid") # Dark Indigo
        header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        
        # Border tipis
        thin_side = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=thin_side, left=thin_side, right=thin_side, bottom=thin_side)

        headers = [
            "Kantor", "ID Pelanggan (Wajib)", "Nama Pelanggan (Wajib)", "Alamat", "No. HP",
            "POP / OLT", "IP Router / ONT (Wajib)", "Paket Bandwidth", "Tipe Modem",
            "MAC Address", "Redaman Baseline (dBm)", "Nama WiFi", "Password WiFi",
            "User Admin", "Pass Admin",
            "Status Kredensial", "Rx Power Terakhir (dBm)", "Status Koneksi", "Pengecekan Terakhir"
        ]

        # Tulis Header
        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = cell_border
            # Adjust column width
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 25
        ws.row_dimensions[1].height = 28

        # Query Seluruh Data Pelanggan Aktif
        q_cust = db.query(Pelanggan).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            q_cust = q_cust.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q_cust = q_cust.filter(Pelanggan.kantor.in_(allowed_kantor))
        customers = q_cust.order_by(Pelanggan.id.asc()).all()

        for idx, c in enumerate(customers, start=1):
            latest_log = (
                db.query(LogPerformaONT)
                .filter(LogPerformaONT.id_pelanggan == c.id_pelanggan)
                .order_by(LogPerformaONT.waktu_cek.desc())
                .first()
            )
            rx_val = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else (float(c.redaman_baseline) if c.redaman_baseline else "-")
            status_val = latest_log.status_koneksi if latest_log else "NORMAL"
            last_check = latest_log.waktu_cek.strftime("%d/%m/%Y %H:%M") if latest_log else "-"

            row_data = [
                (c.kantor or "cabang").upper(),
                c.id_pelanggan,
                c.nama,
                c.alamat or "-",
                c.no_hp or "-",
                c.pop or "-",
                c.ip_router,
                c.paket or "-",
                c.jenis_modem or "-",
                c.mac_address or "-",
                float(c.redaman_baseline) if c.redaman_baseline else "-",
                c.nama_wifi or "-",
                c.password_wifi or "-",
                c.user_admin or "-",
                c.pass_admin or "-",
                c.status_kredensial or "UNTESTED",
                rx_val,
                status_val,
                last_check
            ]

            row_idx = idx + 1
            ws.append(row_data)
            row_fill = zebra_fill if idx % 2 == 0 else white_fill

            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_num)
                cell.fill = row_fill
                cell.font = Font(name="Arial", size=9)
                cell.border = cell_border

                # Center align untuk kolom tertentu
                if col_num in [1, 2, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16]:
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")

            ws.row_dimensions[row_idx].height = 20

        # Auto adjust lebar kolom
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or '')
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @staticmethod
    def generate_excel_template() -> bytes:
        """
        Menghasilkan file template Excel (.xlsx) kosong dengan format kolom standar.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Import Pelanggan"
        ws.views.sheetView[0].showGridLines = True

        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
        header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        thin_side = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=thin_side, left=thin_side, right=thin_side, bottom=thin_side)

        headers = [
            "ID Pelanggan (Wajib)", "Nama Pelanggan (Wajib)", "Kantor (Cabang/Pusat/Banyumas)", "Alamat", "No. HP",
            "POP / OLT", "IP Router / ONT (Wajib)", "Paket Bandwidth", "Tipe Modem",
            "MAC Address", "Redaman Baseline (dBm)", "Nama WiFi", "Password WiFi",
            "User Admin", "Pass Admin"
        ]

        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = cell_border
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 25
        ws.row_dimensions[1].height = 28

        # Tambahkan satu baris sampel sebagai contoh
        sample_row = [
            "P-001", "Budi Santoso", "Cabang", "Jl. Merdeka No 1", "081234567890",
            "Server Pusat", "192.168.1.100", "20Mbps", "GM220-S",
            "AA:BB:CC:DD:EE:FF", "-23.5", "Budi_WiFi", "password123",
            "admin", "admin123"
        ]
        ws.append(sample_row)

        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @staticmethod
    def generate_csv_template() -> str:
        """Menghasilkan isi file template CSV untuk diunduh pengguna"""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID Pelanggan", "Nama", "Kantor", "Alamat", "No HP", "POP", "IP Router",
            "Paket", "MAC Address", "Redaman", "Nama Wifi", "Password wifi",
            "Jenis Modem", "USER ADMIN", "PASS ADMIN"
        ])
        writer.writerow([
            "CUST-001", "Contoh Pelanggan 1", "Cabang", "Jl. Merdeka No. 10", "08123456789",
            "Server Cabang", "10.10.2.71", "10MB CAB", "44:22:95:6B:4B:C0",
            "-21.5", "WIFI-CUST01", "rahasia123", "GM220-S", "admin", "admin123"
        ])
        writer.writerow([
            "CUST-002", "Contoh Pelanggan 2", "Pusat", "Klero Rt 02", "08571234567",
            "Mini Klero", "10.10.2.15", "30MB Residential", "FC:8E:5B:28:4D:21",
            "-22.0", "WIFI-CUST02", "sandiwifi", "GM220-S XPON", "admin", "admin123"
        ])
        return output.getvalue()

