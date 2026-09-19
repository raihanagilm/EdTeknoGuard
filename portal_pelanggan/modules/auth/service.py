import re
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan, AkunPelanggan
from portal_pelanggan.core.security import get_password_hash, verify_password, create_customer_session_token
from app.core.timezone import get_now_wib

DEFAULT_CUSTOMER_PASSWORD = "123456"

class AuthService:

    @staticmethod
    def _clean_text(text: str) -> str:
        """Membersihkan teks dan tanda baca untuk pencocokan fleksibel."""
        if not text:
            return ""
        # Hilangkan simbol non-alfanumerik kecuali spasi
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return " ".join(cleaned.split())

    @staticmethod
    def find_matching_customer(
        db: Session,
        nama: str,
        alamat: str = "",
        ip_router: Optional[str] = None
    ) -> Optional[Pelanggan]:
        """Algoritma pencocokan data pelanggan yang sangat fleksibel & toleran untuk warga desa."""
        nama_raw = nama.strip()
        alamat_raw = alamat.strip()
        ip_clean = ip_router.strip() if ip_router else None

        # 1. Prioritas 1: Jika IP Router diisi, cocokkan langsung IP unik
        if ip_clean:
            cust_by_ip = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if cust_by_ip:
                return cust_by_ip

        nama_clean = AuthService._clean_text(nama_raw)
        alamat_clean = AuthService._clean_text(alamat_raw)
        nama_tokens = set(nama_clean.split())

        # Ambil semua pelanggan di database
        all_customers: List[Pelanggan] = db.query(Pelanggan).all()

        scored_matches = []

        for cust in all_customers:
            cust_nama_clean = AuthService._clean_text(cust.nama)
            cust_alamat_clean = AuthService._clean_text(cust.alamat or "")
            cust_tokens = set(cust_nama_clean.split())

            score = 0

            # Cocok persis nama
            if nama_clean == cust_nama_clean:
                score += 100
            # Substring nama
            elif nama_clean in cust_nama_clean or cust_nama_clean in nama_clean:
                score += 70
            else:
                # Token overlap (misal "Sugiarti" di "Sugiarti / Kardi")
                overlap = nama_tokens.intersection(cust_tokens)
                if overlap:
                    score += 40 * len(overlap)

            # Jika ada kemiripan nama, nilai juga kesamaan alamatnya
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
                    # Jika di DB alamat belum ada, beri bonus kecocokan
                    score += 10

                scored_matches.append((score, cust))

        if scored_matches:
            scored_matches.sort(key=lambda x: x[0], reverse=True)
            best_score, best_cust = scored_matches[0]
            if best_score >= 35:
                return best_cust

        return None

    @staticmethod
    def register_or_activate(
        db: Session,
        nama: str,
        alamat: str = "",
        no_hp: str = "",
        ip_router: Optional[str] = None,
        lokasi_gps: Optional[str] = None,
        password: str = DEFAULT_CUSTOMER_PASSWORD
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Aktivasi akun pelanggan baru/lama dengan password default 123456 dan GPS."""
        nama_raw = nama.strip()
        alamat_raw = alamat.strip()
        ip_clean = ip_router.strip() if ip_router else None
        gps_clean = lokasi_gps.strip() if lokasi_gps else None
        pwd_to_use = password.strip() if password else DEFAULT_CUSTOMER_PASSWORD

        if not nama_raw:
            return False, "Mohon masukkan nama Anda yang terdaftar pada layanan WiFi.", None

        # 1. Cari data pelanggan yang sudah terdaftar di database
        matched_cust = AuthService.find_matching_customer(
            db=db,
            nama=nama_raw,
            alamat=alamat_raw,
            ip_router=ip_clean
        )

        if not matched_cust:
            return False, (
                "Data pelanggan dengan nama tersebut tidak ditemukan. "
                "Pastikan ejaan nama sesuai dengan yang didaftarkan saat pemasangan WiFi, "
                "atau masukkan IP Router jika Anda mengetahuinya."
            ), None

        # 2. Perbarui data alamat dan GPS di tabel Pelanggan jika diisi
        full_alamat = alamat_raw
        if gps_clean:
            if full_alamat:
                if gps_clean not in full_alamat:
                    full_alamat = f"{full_alamat} [GPS: {gps_clean}]"
            else:
                full_alamat = f"[GPS: {gps_clean}]"

        if full_alamat and (not matched_cust.alamat or len(matched_cust.alamat.strip()) < len(full_alamat)):
            matched_cust.alamat = full_alamat

        if no_hp and not matched_cust.no_hp:
            matched_cust.no_hp = no_hp.strip()

        matched_cust.is_active = True

        # 3. Periksa akun di tabel akun_pelanggan
        existing_account = db.query(AkunPelanggan).filter(
            AkunPelanggan.id_pelanggan == matched_cust.id_pelanggan
        ).first()

        pwd_hash = get_password_hash(pwd_to_use)

        if existing_account:
            # Akun sudah ada: setel ulang password ke default 123456 dan perbarui info
            existing_account.password_hash = pwd_hash
            if no_hp:
                existing_account.no_hp = no_hp.strip()
            existing_account.is_active = True
            existing_account.last_login = get_now_wib()
            db.commit()
            db.refresh(existing_account)
            token = create_customer_session_token(matched_cust.id_pelanggan, matched_cust.nama)
            return True, "Akun berhasil diaktifkan!", {
                "token": token,
                "id_pelanggan": matched_cust.id_pelanggan,
                "nama": matched_cust.nama
            }

        # 4. Buat akun baru di tabel akun_pelanggan dengan password default 123456
        new_account = AkunPelanggan(
            id_pelanggan=matched_cust.id_pelanggan,
            username=matched_cust.nama,
            password_hash=pwd_hash,
            no_hp=no_hp.strip() if no_hp else matched_cust.no_hp,
            is_active=True,
            last_login=get_now_wib()
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)

        token = create_customer_session_token(matched_cust.id_pelanggan, matched_cust.nama)
        return True, "Akun berhasil didaftarkan dan diaktifkan!", {
            "token": token,
            "id_pelanggan": matched_cust.id_pelanggan,
            "nama": matched_cust.nama
        }

    @staticmethod
    def authenticate(
        db: Session,
        identifier: str,
        password: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Autentikasi login dengan dukungan auto-provisioning untuk password default 123456."""
        ident_raw = identifier.strip()
        ident_lower = ident_raw.lower()
        pwd = password.strip()

        # 1. Cari akun yang sudah ada
        akun = db.query(AkunPelanggan).filter(
            (func.lower(AkunPelanggan.id_pelanggan) == ident_lower) |
            (func.lower(AkunPelanggan.username) == ident_lower) |
            (AkunPelanggan.no_hp == ident_raw)
        ).first()

        # Jika belum cocok persis di akun_pelanggan, cari kemiripan username di akun_pelanggan
        if not akun:
            akun = db.query(AkunPelanggan).filter(
                func.lower(AkunPelanggan.username).like(f"%{ident_lower}%")
            ).first()

        # 2. Jika akun belum pernah dibuat, tapi pelanggan ada di tabel Pelanggan
        if not akun:
            cust = AuthService.find_matching_customer(db=db, nama=ident_raw)
            if cust:
                # Cek lagi apakah ID pelanggan ini sudah punya akun
                akun = db.query(AkunPelanggan).filter(AkunPelanggan.id_pelanggan == cust.id_pelanggan).first()
                if not akun and pwd == DEFAULT_CUSTOMER_PASSWORD:
                    # Auto-provision akun baru langsung dengan password 123456
                    new_acc = AkunPelanggan(
                        id_pelanggan=cust.id_pelanggan,
                        username=cust.nama,
                        password_hash=get_password_hash(DEFAULT_CUSTOMER_PASSWORD),
                        no_hp=cust.no_hp,
                        is_active=True,
                        last_login=get_now_wib()
                    )
                    db.add(new_acc)
                    db.commit()
                    db.refresh(new_acc)
                    akun = new_acc

        if not akun:
            return False, "Nama atau nomor HP tidak ditemukan. Silakan lakukan pendaftaran terlebih dahulu.", None

        if not akun.is_active:
            return False, "Akun dinonaktifkan. Silakan hubungi teknisi kami.", None

        # Verifikasi password: bisa dengan hash tersimpan, atau fallback ke 123456
        is_valid = verify_password(pwd, akun.password_hash)
        if not is_valid and pwd == DEFAULT_CUSTOMER_PASSWORD:
            # Update password hash jika user memasukkan password default 123456
            akun.password_hash = get_password_hash(DEFAULT_CUSTOMER_PASSWORD)
            is_valid = True

        if not is_valid:
            return False, "Password salah. Password sementara untuk semua pelanggan adalah 123456.", None

        akun.last_login = get_now_wib()
        db.commit()

        token = create_customer_session_token(akun.id_pelanggan, akun.username)
        return True, "Login berhasil", {
            "token": token,
            "id_pelanggan": akun.id_pelanggan,
            "nama": akun.username
        }

    @staticmethod
    def reset_customer_password(
        db: Session,
        nama: str = "",
        no_hp: str = "",
        ip_router: Optional[str] = None,
        password_baru: str = "123456"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Mereset kata sandi akun pelanggan dengan verifikasi IP Modem/Router atau Nama/No HP."""
        nama_raw = (nama or "").strip()
        no_hp_raw = (no_hp or "").strip()
        ip_clean = (ip_router or "").strip() if ip_router else None
        pwd_baru = (password_baru or "").strip() if password_baru else "123456"

        if not ip_clean and not nama_raw:
            return False, "Silakan masukkan IP Modem / Router Anda, atau masukkan Nama Terdaftar Anda.", None

        if len(pwd_baru) < 6:
            return False, "Kata sandi baru minimal 6 karakter.", None

        matched_cust = None

        # 1. Prioritas Utama: Verifikasi via IP Router / Modem (Kunci Unik Fisik Pelanggan)
        if ip_clean:
            matched_cust = db.query(Pelanggan).filter(Pelanggan.ip_router == ip_clean).first()
            if not matched_cust:
                return False, f"Modem dengan IP '{ip_clean}' tidak ditemukan di sistem. Pastikan IP sesuai dengan yang tertera pada stiker modem atau info sambungan WiFi HP Anda.", None

        # 2. Alternatif: Jika IP tidak diisi, gunakan pencocokan Nama Terdaftar & No HP
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

        # 3. Cari atau buat AkunPelanggan
        akun = db.query(AkunPelanggan).filter(
            AkunPelanggan.id_pelanggan == matched_cust.id_pelanggan
        ).first()

        if not akun:
            akun = AkunPelanggan(
                id_pelanggan=matched_cust.id_pelanggan,
                username=matched_cust.nama,
                password_hash=get_password_hash(pwd_baru),
                no_hp=matched_cust.no_hp or no_hp_raw,
                is_active=True,
                last_login=get_now_wib()
            )
            db.add(akun)
        else:
            akun.password_hash = get_password_hash(pwd_baru)
            if no_hp_raw and not akun.no_hp:
                akun.no_hp = no_hp_raw

        # Simpan pembaruan no_hp ke Pelanggan jika diisi dan sebelumnya belum tercatat
        if no_hp_raw and not matched_cust.no_hp:
            matched_cust.no_hp = no_hp_raw

        db.commit()

        # Kirim notifikasi audit ke Telegram Teknisi
        try:
            from app.services.telegram_service import telegram_service
            msg = (
                f"🔑 <b>RESET KATA SANDI PORTAL MANDIRI</b>\n\n"
                f"👤 <b>Pelanggan:</b> {matched_cust.nama} (<code>{matched_cust.id_pelanggan}</code>)\n"
                f"🌐 <b>IP Modem:</b> <code>{matched_cust.ip_router or '-'}</code>\n"
                f"📍 <b>Alamat:</b> {matched_cust.alamat or '-'}\n"
                f"ℹ️ <i>Kata sandi akun portal telah berhasil direset oleh pelanggan.</i>"
            )
            telegram_service.send_alert(msg)
        except Exception:
            pass

        return True, "Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.", {
            "id_pelanggan": matched_cust.id_pelanggan,
            "nama": matched_cust.nama
        }
