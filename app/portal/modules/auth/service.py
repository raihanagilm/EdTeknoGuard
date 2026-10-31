import re
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan
from app.portal.core.security import get_password_hash, verify_password, create_customer_session_token
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
            from app.db.models import PerangkatONT
            cust_by_ip = db.query(Pelanggan).join(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan).filter(
                (PerangkatONT.ip_router == ip_clean) | (PerangkatONT.ip_ont == ip_clean)
            ).first()
            if cust_by_ip:
                return cust_by_ip

        nama_clean = AuthService._clean_text(nama_raw)
        alamat_clean = AuthService._clean_text(alamat_raw)
        if not nama_clean:
            return None

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
    def _clean_phone(phone: Optional[str]) -> str:
        """Membersihkan string nomor HP menjadi deretan angka murni."""
        if not phone:
            return ""
        return re.sub(r"\D", "", str(phone))

    @staticmethod
    def _match_phone_customer(db: Session, clean_input: str) -> Optional[Pelanggan]:
        """Mencocokkan nomor WhatsApp input dengan database berdasarkan nomor murni atau akhiran nomor."""
        if not clean_input or len(clean_input) < 6:
            return None

        # Siapkan variasi format umum Indonesia (08..., 628..., 8...)
        core = clean_input
        if core.startswith("62"):
            core = core[2:]
        elif core.startswith("0"):
            core = core[1:]

        candidates = [clean_input, f"0{core}", f"62{core}", core]

        # 1. Coba pencocokan langsung di database
        for cand in candidates:
            cust = db.query(Pelanggan).filter(Pelanggan.no_hp == cand).first()
            if cust:
                return cust

        # 2. Coba pencocokan regex / akhiran nomor (minimal 8-9 digit terakhir untuk memastikan unik)
        suffix = core[-8:] if len(core) >= 8 else core
        all_pelanggan = db.query(Pelanggan).filter(Pelanggan.no_hp.isnot(None)).all()
        for c in all_pelanggan:
            c_clean = AuthService._clean_phone(c.no_hp)
            if not c_clean:
                continue
            if c_clean == clean_input or c_clean.endswith(suffix):
                return c

        return None

    @staticmethod
    def _is_matching_default_phone_password(cust: Pelanggan, pwd: str) -> bool:
        """
        Memeriksa apakah password yang dimasukkan sesuai dengan Nomor WhatsApp terdaftar pelanggan
        dalam berbagai variasi penulisan umum (misal format DB 628..., input user 08..., 8..., dsb).
        """
        if not cust.no_hp:
            return False
        clean_db_phone = AuthService._clean_phone(cust.no_hp)
        clean_pwd = AuthService._clean_phone(pwd)
        if not clean_db_phone or not clean_pwd:
            return False

        # Ambil digit inti nomor tanpa kode negara 62 atau 0 di depan
        core_db = clean_db_phone
        if core_db.startswith("62"):
            core_db = core_db[2:]
        elif core_db.startswith("0"):
            core_db = core_db[1:]

        core_pwd = clean_pwd
        if core_pwd.startswith("62"):
            core_pwd = core_pwd[2:]
        elif core_pwd.startswith("0"):
            core_pwd = core_pwd[1:]

        # Minimal 8 digit nomor inti agar tidak salah cocok
        if len(core_db) >= 8 and core_db == core_pwd:
            return True

        return False

    @staticmethod
    def authenticate(
        db: Session,
        identifier: str,
        password: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Autentikasi login portal khusus menggunakan Nomor WhatsApp terdaftar."""
        ident_raw = (identifier or "").strip()
        pwd = (password or "").strip()

        if not ident_raw:
            return False, "Mohon masukkan Nomor WhatsApp terdaftar Anda.", None

        if not pwd:
            return False, "Mohon masukkan kata sandi Anda.", None

        clean_phone_input = AuthService._clean_phone(ident_raw)
        if not clean_phone_input or len(clean_phone_input) < 6:
            return False, "Format Nomor WhatsApp tidak valid. Masukkan nomor WhatsApp yang terdaftar.", None

        # 1. Cari pelanggan berdasarkan Nomor WhatsApp di DB sesi saat ini
        cust = AuthService._match_phone_customer(db, clean_phone_input)

        # 2. Jika belum ketemu di DB awal, cari di seluruh tenant kantor cabang aktif
        active_session = db
        is_tenant_db_opened = False
        if not cust:
            from app.db.models import Kantor
            from app.core.tenant_database import TenantDatabaseManager
            from app.core.database import SessionLocal
            m_db = SessionLocal()
            try:
                kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
                for k in kantors:
                    if not k.kode:
                        continue
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        t_cust = AuthService._match_phone_customer(t_db, clean_phone_input)
                        if t_cust:
                            cust = t_cust
                            active_session = t_db
                            is_tenant_db_opened = True
                            break
                    except Exception:
                        t_db.close()
                    if not cust:
                        t_db.close()
            finally:
                m_db.close()

        if not cust:
            return False, "Nomor WhatsApp belum terdaftar di sistem. Mohon lengkapi atau hubungi kantor ISP Anda.", None

        if not cust.is_active:
            if is_tenant_db_opened:
                active_session.close()
            return False, "Layanan akun dinonaktifkan. Silakan hubungi admin kantor.", None

        # 3. Verifikasi kata sandi:
        # - Jika pelanggan sudah mengatur kata sandi kustom sendiri (password_hash terisi), cocokkan via bcrypt saja.
        # - Jika belum mengatur kata sandi kustom (password_hash kosong/None), default awal adalah Nomor WhatsApp terdaftar mereka (format 08/62).
        is_valid = False
        if cust.password_hash:
            is_valid = verify_password(pwd, cust.password_hash)
        elif AuthService._is_matching_default_phone_password(cust, pwd):
            # Login pertama kali dengan default Nomor WA
            is_valid = True

        if not is_valid:
            if is_tenant_db_opened:
                active_session.close()
            return False, "Kata sandi salah. Kata sandi awal adalah Nomor WhatsApp terdaftar Anda.", None

        # 4. Perbarui waktu login terakhir
        cust.last_login = get_now_wib()
        active_session.commit()

        kantor_cust = cust.kantor or ""
        status_verifikasi_cust = cust.status_verifikasi or ""

        # 4. Buat session token dengan identitas kantor
        token = create_customer_session_token(
            id_pelanggan=cust.id_pelanggan,
            nama=cust.nama,
            status_verifikasi=status_verifikasi_cust,
            kantor=kantor_cust
        )
        
        # Ambil IP dengan fallback ke ip_ont jika ip_router None/kosong
        ip_display = ""
        try:
            ip_display = cust.ip_router or cust.ip_ont or ""
        except Exception:
            ip_display = ""

        res_data = {
            "token": token,
            "id_pelanggan": cust.id_pelanggan,
            "nama": cust.nama,
            "status_verifikasi": status_verifikasi_cust,
            "kantor": kantor_cust,
            "no_hp": cust.no_hp or "",
            "alamat": cust.alamat or "",
            "paket": cust.paket or "",
            "ip_router": ip_display,
            "nama_wifi": cust.nama_wifi or "",
            "pop": cust.pop or ""
        }
        if is_tenant_db_opened:
            active_session.close()
        return True, "Login berhasil", res_data

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
