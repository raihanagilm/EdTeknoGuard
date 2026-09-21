import re
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan
from portal_pelanggan.core.security import get_password_hash, verify_password, create_customer_session_token
from app.core.timezone import get_now_wib

DEFAULT_CUSTOMER_PASSWORD = "123456"

class AuthService:

    @staticmethod
    def _clean_text(text: str) -> str:
        """Membersihkan teks dan tanda baca untuk pencocokan fleksibel."""
        if not text:
            return ""
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return " ".join(cleaned.split())

    @staticmethod
    def find_matching_customer(
        db: Session,
        nama: str,
        alamat: str = "",
        ip_router: Optional[str] = None
    ) -> Optional[Pelanggan]:
        """Algoritma pencocokan data pelanggan untuk verifikasi lupa password."""
        nama_raw = (nama or "").strip()
        alamat_raw = (alamat or "").strip()
        ip_clean = ip_router.strip() if ip_router else None

        # 1. Prioritas 1: Jika IP Router diisi, cocokkan langsung IP unik
        if ip_clean:
            cust_by_ip = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if cust_by_ip:
                return cust_by_ip

        nama_clean = AuthService._clean_text(nama_raw)
        alamat_clean = AuthService._clean_text(alamat_raw)
        nama_tokens = set(nama_clean.split())

        all_customers = db.query(Pelanggan).all()
        scored_matches = []

        for cust in all_customers:
            cust_nama_clean = AuthService._clean_text(cust.nama)
            cust_alamat_clean = AuthService._clean_text(cust.alamat or "")
            cust_tokens = set(cust_nama_clean.split())

            score = 0
            if nama_clean == cust_nama_clean:
                score += 100
            elif nama_clean in cust_nama_clean or cust_nama_clean in nama_clean:
                score += 70
            else:
                overlap = nama_tokens.intersection(cust_tokens)
                if overlap:
                    score += 40 * len(overlap)

            if score > 0:
                if alamat_clean and cust_alamat_clean:
                    alamat_tokens = set(alamat_clean.split())
                    cust_alamat_tokens = set(cust_alamat_clean.split())
                    addr_overlap = alamat_tokens.intersection(cust_alamat_tokens)
                    if addr_overlap:
                        score += 20 * len(addr_overlap)
                    elif alamat_clean in cust_alamat_clean or cust_alamat_clean in alamat_clean:
                        score += 25
                elif not cust.alamat:
                    score += 10

                scored_matches.append((score, cust))

        if scored_matches:
            scored_matches.sort(key=lambda x: x[0], reverse=True)
            best_score, best_cust = scored_matches[0]
            if best_score >= 35:
                return best_cust

        return None

    @staticmethod
    def authenticate(
        db: Session,
        identifier: str,
        password: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Autentikasi login portal langsung menggunakan tabel data master Pelanggan."""
        ident_raw = (identifier or "").strip()
        ident_lower = ident_raw.lower()
        pwd = (password or "").strip()

        if not ident_raw:
            return False, "Mohon masukkan Nama, ID Pelanggan, atau Nomor WhatsApp Anda.", None

        if not pwd:
            return False, "Mohon masukkan kata sandi Anda.", None

        # 1. Cari pelanggan berdasarkan ID Pelanggan, Nama, atau Nomor HP
        cust = db.query(Pelanggan).filter(
            (func.lower(Pelanggan.id_pelanggan) == ident_lower) |
            (func.lower(Pelanggan.nama) == ident_lower) |
            (Pelanggan.no_hp == ident_raw)
        ).first()

        # Jika belum cocok persis, cari substring nama
        if not cust:
            cust = db.query(Pelanggan).filter(
                func.lower(Pelanggan.nama).like(f"%{ident_lower}%")
            ).first()

        # Jika masih belum ketemu, coba cari dengan algoritma scoring
        if not cust:
            cust = AuthService.find_matching_customer(db=db, nama=ident_raw)

        if not cust:
            return False, "Akun tidak ditemukan. Pastikan Nama atau ID Pelanggan Anda sesuai dengan data langganan WiFi Anda di kantor.", None

        if not cust.is_active:
            return False, "Layanan akun dinonaktifkan. Silakan hubungi admin kantor.", None

        # 2. Verifikasi kata sandi
        is_valid = False
        if cust.password_hash:
            is_valid = verify_password(pwd, cust.password_hash)
        
        # Fallback ke kata sandi default 123456 jika belum pernah diganti atau password_hash masih None
        if not is_valid and pwd == DEFAULT_CUSTOMER_PASSWORD:
            cust.password_hash = get_password_hash(DEFAULT_CUSTOMER_PASSWORD)
            is_valid = True

        if not is_valid:
            return False, "Kata sandi salah. Kata sandi awal adalah: 123456.", None

        # 3. Perbarui waktu login terakhir
        cust.last_login = get_now_wib()
        db.commit()

        # 4. Buat session token
        token = create_customer_session_token(
            id_pelanggan=cust.id_pelanggan,
            nama=cust.nama,
            status_verifikasi=cust.status_verifikasi or "TERVERIFIKASI"
        )
        return True, "Login berhasil", {
            "token": token,
            "id_pelanggan": cust.id_pelanggan,
            "nama": cust.nama,
            "status_verifikasi": cust.status_verifikasi or "TERVERIFIKASI"
        }

    @staticmethod
    def reset_customer_password(
        db: Session,
        nama: str = "",
        no_hp: str = "",
        ip_router: Optional[str] = None,
        password_baru: str = "123456"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Mereset kata sandi akun pelanggan langsung pada tabel Pelanggan."""
        nama_raw = (nama or "").strip()
        no_hp_raw = (no_hp or "").strip()
        ip_clean = (ip_router or "").strip() if ip_router else None
        pwd_baru = (password_baru or "").strip() if password_baru else "123456"

        if not ip_clean and not nama_raw:
            return False, "Silakan masukkan IP Modem / Router Anda, atau masukkan Nama Terdaftar Anda.", None

        if len(pwd_baru) < 6:
            return False, "Kata sandi baru minimal 6 karakter.", None

        matched_cust = None

        # 1. Prioritas Utama: Verifikasi via IP Router / Modem
        if ip_clean:
            matched_cust = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if not matched_cust:
                return False, f"Modem dengan IP '{ip_clean}' tidak ditemukan di sistem. Pastikan IP sesuai dengan yang tertera pada stiker modem atau info sambungan WiFi HP Anda.", None

        # 2. Alternatif: Pencocokan Nama Terdaftar & No HP
        if not matched_cust and nama_raw:
            matched_cust = AuthService.find_matching_customer(
                db=db,
                nama=nama_raw
            )
            if not matched_cust:
                return False, "Data pelanggan dengan nama tersebut tidak ditemukan. Pastikan nama sesuai dengan yang didaftarkan saat pasang WiFi, atau gunakan IP Modem Anda.", None

            def clean_phone(p: str) -> str:
                return re.sub(r"\D", "", p or "")

            cust_hp = clean_phone(matched_cust.no_hp)
            input_hp = clean_phone(no_hp_raw)

            if cust_hp and input_hp:
                if cust_hp[-8:] != input_hp[-8:] and cust_hp != input_hp:
                    return False, "Nomor WhatsApp/HP tidak sesuai dengan data terdaftar.", None

        if not matched_cust:
            return False, "Data pelanggan tidak dapat diverifikasi.", None

        # 3. Simpan password baru langsung di tabel Pelanggan
        matched_cust.password_hash = get_password_hash(pwd_baru)
        if no_hp_raw and not matched_cust.no_hp:
            matched_cust.no_hp = no_hp_raw

        db.commit()

        return True, "Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.", {
            "id_pelanggan": matched_cust.id_pelanggan,
            "nama": matched_cust.nama
        }
