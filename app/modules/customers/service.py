import uuid
import csv
import io
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.models import Pelanggan, LogPerformaONT
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate

class CustomerService:

    @staticmethod
    def get_customers(
        db: Session,
        q: Optional[str] = None,
        pop: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = "id",
        sort_dir: str = "asc",
        page: int = 1,
        limit: int = 25
    ) -> Tuple[int, List[Dict[str, Any]]]:
        query = db.query(Pelanggan).filter(Pelanggan.is_active == True)

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Pelanggan.nama.ilike(search_pattern),
                    Pelanggan.ip_router.ilike(search_pattern),
                    Pelanggan.mac_address.ilike(search_pattern),
                    Pelanggan.id_pelanggan.ilike(search_pattern)
                )
            )

        if pop and pop != "Semua POP":
            query = query.filter(Pelanggan.pop == pop)

        total_count = query.count()

        # Dynamic sorting
        col_map = {
            "id_pelanggan": Pelanggan.id_pelanggan,
            "nama": Pelanggan.nama,
            "pop": Pelanggan.pop,
            "ip_router": Pelanggan.ip_router,
            "paket": Pelanggan.paket,
            "jenis_modem": Pelanggan.jenis_modem,
            "redaman_baseline": Pelanggan.redaman_baseline,
            "status_kredensial": Pelanggan.status_kredensial,
            "id": Pelanggan.id
        }
        target_col = col_map.get(sort_by, Pelanggan.id)
        if sort_dir.lower() == "desc":
            query = query.order_by(target_col.desc())
        else:
            query = query.order_by(target_col.asc())

        offset = (page - 1) * limit
        customers = query.offset(offset).limit(limit).all()

        result = []
        for c in customers:
            latest_log = (
                db.query(LogPerformaONT)
                .filter(LogPerformaONT.id_pelanggan == c.id_pelanggan)
                .order_by(LogPerformaONT.waktu_cek.desc())
                .first()
            )
            
            current_status = latest_log.status_koneksi if latest_log else "NORMAL"
            current_rx = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else (float(c.redaman_baseline) if c.redaman_baseline else None)
            last_check = latest_log.waktu_cek.strftime("%d/%m %H:%M") if latest_log else "-"

            if status and status != "Semua Status":
                if current_status != status:
                    continue

            result.append({
                "id_pelanggan": c.id_pelanggan,
                "nama": c.nama,
                "alamat": c.alamat or "-",
                "no_hp": c.no_hp or "-",
                "pop": c.pop,
                "ip_router": c.ip_router,
                "paket": c.paket or "-",
                "jenis_modem": c.jenis_modem,
                "mac_address": c.mac_address or "-",
                "redaman_baseline": float(c.redaman_baseline) if c.redaman_baseline else None,
                "redaman_current": current_rx,
                "status": current_status,
                "last_check": last_check,
                "nama_wifi": c.nama_wifi or "-",
                "user_admin": c.user_admin or "-",
                "status_kredensial": getattr(c, "status_kredensial", "UNTESTED") or "UNTESTED"
            })

        return total_count, result

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Optional[Tuple[Pelanggan, List[LogPerformaONT]]]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        logs = (
            db.query(LogPerformaONT)
            .filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            .order_by(LogPerformaONT.waktu_cek.desc())
            .limit(20)
            .all()
        )
        return cust, logs

    @staticmethod
    def get_pop_list(db: Session) -> List[str]:
        rows = db.query(Pelanggan.pop).filter(Pelanggan.is_active == True).distinct().all()
        return [r[0] for r in rows if r[0]]

    @staticmethod
    def get_customer_stats(db: Session) -> Dict[str, Any]:
        total_pelanggan = db.query(Pelanggan).filter(Pelanggan.is_active == True).count()
        pop_counts = (
            db.query(Pelanggan.pop, func.count(Pelanggan.id))
            .filter(Pelanggan.is_active == True)
            .group_by(Pelanggan.pop)
            .all()
        )
        return {
            "total": total_pelanggan,
            "pop_distribution": [{"pop": p[0], "count": p[1]} for p in pop_counts]
        }

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate) -> Pelanggan:
        # Generate id_pelanggan jika tidak ada
        cid = data.id_pelanggan
        if not cid or not cid.strip():
            cid = f"CUST-{uuid.uuid4().hex[:8].upper()}"

        existing = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cid).first()
        if existing:
            raise ValueError(f"ID Pelanggan '{cid}' sudah digunakan.")

        new_cust = Pelanggan(
            id_pelanggan=cid,
            nama=data.nama,
            alamat=data.alamat,
            no_hp=data.no_hp,
            pop=data.pop,
            ip_router=data.ip_router,
            paket=data.paket,
            jenis_modem=data.jenis_modem,
            mac_address=data.mac_address,
            redaman_baseline=data.redaman_baseline,
            nama_wifi=data.nama_wifi,
            password_wifi=data.password_wifi,
            user_admin=data.user_admin,
            pass_admin=data.pass_admin,
            snmp_community=data.snmp_community or "public",
            is_active=True
        )
        db.add(new_cust)
        db.commit()
        db.refresh(new_cust)
        return new_cust

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate) -> Optional[Pelanggan]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        update_dict = data.dict(exclude_unset=True)
        for field, val in update_dict.items():
            if hasattr(cust, field) and val is not None:
                setattr(cust, field, val)

        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str) -> bool:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return False

        # Soft delete
        cust.is_active = False
        db.commit()
        return True

    @staticmethod
    def bulk_delete_customers(db: Session, id_list: List[str]) -> int:
        """Soft delete banyak pelanggan sekaligus berdasarkan list id_pelanggan"""
        if not id_list:
            return 0

        affected = (
            db.query(Pelanggan)
            .filter(Pelanggan.id_pelanggan.in_(id_list))
            .update({Pelanggan.is_active: False}, synchronize_session=False)
        )
        db.commit()
        return affected

    @staticmethod
    def import_customers_from_csv(db: Session, file_content: bytes) -> Dict[str, Any]:
        """
        Membaca dan memproses isi file CSV pelanggan.
        Mendukung encoding utf-8, utf-8-sig, dan latin-1.
        Mendukung delimiter koma (,) dan titik-koma (;).
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

        # Deteksi delimiter (koma atau titik koma)
        first_line = decoded_text.splitlines()[0] if decoded_text.splitlines() else ""
        delimiter = ";" if ";" in first_line and first_line.count(";") > first_line.count(",") else ","

        reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
        rows = list(reader)

        if not rows:
            raise ValueError("File CSV kosong.")

        # Ambil header dan normalisasi huruf kecil
        raw_headers = [h.strip().lower() for h in rows[0]]
        
        # Mapping kolom umum EdTeknoGuard
        def get_col_index(candidates: List[str]) -> int:
            for idx, h in enumerate(raw_headers):
                for c in candidates:
                    if c in h:
                        return idx
            return -1

        idx_id = get_col_index(["id pelanggan", "id_pelanggan", "id"])
        idx_nama = get_col_index(["nama", "name"])
        idx_alamat = get_col_index(["alamat", "address"])
        idx_hp = get_col_index(["no hp", "no_hp", "telepon", "whatsapp", "phone"])
        idx_pop = get_col_index(["pop", "server"])
        idx_ip = get_col_index(["ip router", "ip_router", "ip"])
        idx_paket = get_col_index(["paket", "profile", "speed"])
        idx_mac = get_col_index(["mac", "mac address"])
        idx_redaman = get_col_index(["redaman", "rx", "baseline"])
        idx_wifi = get_col_index(["nama wifi", "ssid", "wifi"])
        idx_pass_wifi = get_col_index(["password wifi", "pass wifi"])
        idx_modem = get_col_index(["jenis modem", "tipe modem", "modem"])
        idx_user_admin = get_col_index(["user admin", "username"])
        idx_pass_admin = get_col_index(["pass admin", "password admin"])

        if idx_nama == -1 or idx_ip == -1:
            raise ValueError("Kolom wajib 'Nama' dan 'IP Router' tidak ditemukan pada header CSV.")

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

            nama = get_val(idx_nama)
            ip_router = get_val(idx_ip)

            if not nama or not ip_router:
                failed_count += 1
                errors.append(f"Baris {row_idx}: Nama atau IP Router kosong")
                continue

            # Parsing ID Pelanggan
            id_pelanggan = get_val(idx_id)
            if not id_pelanggan:
                id_pelanggan = f"CUST-{uuid.uuid4().hex[:8].upper()}"

            # Parsing Redaman Baseline
            raw_redaman = get_val(idx_redaman)
            redaman_baseline = None
            if raw_redaman:
                try:
                    # Ganti koma dengan titik (misal '-25,1' jadi '-25.1')
                    cleaned_redaman = raw_redaman.replace(",", ".").replace("dBm", "").strip()
                    redaman_baseline = float(cleaned_redaman)
                except ValueError:
                    redaman_baseline = None

            pop = get_val(idx_pop) or "Server Cabang"
            alamat = get_val(idx_alamat) or None
            no_hp = get_val(idx_hp) or None
            paket = get_val(idx_paket) or None
            mac_address = get_val(idx_mac) or None
            nama_wifi = get_val(idx_wifi) or None
            password_wifi = get_val(idx_pass_wifi) or None
            jenis_modem = get_val(idx_modem) or "GM220-S"
            user_admin = get_val(idx_user_admin) or "admin"
            pass_admin = get_val(idx_pass_admin) or None

            # Cek apakah pelanggan sudah ada
            existing = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
            if existing:
                existing.nama = nama
                existing.ip_router = ip_router
                existing.pop = pop
                if alamat: existing.alamat = alamat
                if no_hp: existing.no_hp = no_hp
                if paket: existing.paket = paket
                if mac_address: existing.mac_address = mac_address
                if redaman_baseline is not None: existing.redaman_baseline = redaman_baseline
                if nama_wifi: existing.nama_wifi = nama_wifi
                if password_wifi: existing.password_wifi = password_wifi
                if jenis_modem: existing.jenis_modem = jenis_modem
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
            "errors": errors[:5]  # Batasi error report agar rapi
        }

    @staticmethod
    def generate_csv_template() -> str:
        """Menghasilkan isi file template CSV untuk diunduh pengguna"""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID Pelanggan", "Nama", "Alamat", "No HP", "POP", "IP Router",
            "Paket", "MAC Address", "Redaman", "Nama Wifi", "Password wifi",
            "Jenis Modem", "USER ADMIN", "PASS ADMIN"
        ])
        writer.writerow([
            "CUST-001", "Contoh Pelanggan 1", "Jl. Merdeka No. 10", "08123456789",
            "Server Cabang", "10.10.2.71", "10MB CAB", "44:22:95:6B:4B:C0",
            "-21.5", "WIFI-CUST01", "rahasia123", "GM220-S", "admin", "admin123"
        ])
        writer.writerow([
            "CUST-002", "Contoh Pelanggan 2", "Klero Rt 02", "08571234567",
            "Mini Klero", "10.10.2.15", "30MB Residential", "FC:8E:5B:28:4D:21",
            "-22.0", "WIFI-CUST02", "sandiwifi", "GM220-S XPON", "admin", "admin123"
        ])
        return output.getvalue()

