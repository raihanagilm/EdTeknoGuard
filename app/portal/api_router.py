from fastapi import APIRouter, Request, Response, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_portal_db
from app.db.models import Pelanggan
from app.db.models import TiketKendala
from app.portal.services.customer_service import PortalCustomerService
from app.portal.core.security import (
    get_current_customer_optional,
    create_customer_session_token,
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    verify_password,
    get_password_hash
)
from app.portal.modules.auth.service import AuthService
from app.portal.modules.dashboard.service import DashboardService
from app.portal.modules.quota.service import KuotaService
from app.portal.modules.tickets.service import KendalaService

api_router = APIRouter(prefix="/api", tags=["Portal Pelanggan REST API"])

@api_router.get("/auth/me")
def portal_auth_me(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return {"authenticated": False, "message": "Belum login"}
    
    id_pel = cust.get("id_pelanggan")
    pelanggan, _ = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    
    # Ambil IP dengan fallback ke ip_ont jika ip_router None/kosong
    ip_display = ""
    if pelanggan:
        try:
            ip_display = pelanggan.ip_router or pelanggan.ip_ont or ""
        except Exception:
            ip_display = ""

    return {
        "authenticated": True,
        "customer": {
            "id_pelanggan": pelanggan.id_pelanggan if pelanggan else cust.get("id_pelanggan", ""),
            "nama": pelanggan.nama if pelanggan else cust.get("nama", ""),
            "status_verifikasi": pelanggan.status_verifikasi if pelanggan else cust.get("status_verifikasi", ""),
            "ip_router": ip_display,
            "paket": pelanggan.paket if (pelanggan and pelanggan.paket) else "",
            "alamat": pelanggan.alamat if (pelanggan and pelanggan.alamat) else "",
            "no_hp": pelanggan.no_hp if (pelanggan and pelanggan.no_hp) else "",
            "nama_wifi": pelanggan.nama_wifi if (pelanggan and pelanggan.nama_wifi) else "",
            "kantor": pelanggan.kantor if (pelanggan and pelanggan.kantor) else cust.get("kantor", ""),
            "pop": pelanggan.pop if (pelanggan and pelanggan.pop) else "",
            "foto_profil": pelanggan.foto_profil if (pelanggan and pelanggan.foto_profil) else "",
            "is_connected_to_home_wifi": check_is_home_wifi(request, pelanggan)
        }
    }

@api_router.post("/auth/login")
async def portal_auth_login(request: Request, db: Session = Depends(get_portal_db)):
    body = await request.json()
    identifier = body.get("identifier", "").strip()
    password = body.get("password", "").strip()
    
    remember_me = body.get("remember_me", True)
    
    success, msg, data = AuthService.authenticate(db, identifier, password)
    if not success or not data:
        return JSONResponse(
            status_code=401,
            content={"ok": False, "message": msg or "ID Pelanggan / No WhatsApp / IP atau Kata Sandi salah!"}
        )
        
    token = data.get("token")
    payload = {
        "id_pelanggan": data.get("id_pelanggan"),
        "nama": data.get("nama"),
        "status_verifikasi": data.get("status_verifikasi"),
        "kantor": data.get("kantor"),
        "no_hp": data.get("no_hp", ""),
        "alamat": data.get("alamat", ""),
        "paket": data.get("paket", ""),
        "ip_router": data.get("ip_router", ""),
        "nama_wifi": data.get("nama_wifi", ""),
        "pop": data.get("pop", "")
    }
    response = JSONResponse(
        content={
            "ok": True,
            "message": "Login berhasil!",
            "customer": payload
        }
    )
    # Jika Ingat Saya dicentang, sesi aktif 60 hari (2 bulan = 5.184.000 detik). Jika tidak, sesi berakhir saat browser ditutup / 1 hari.
    cookie_max_age = MAX_SESSION_AGE if remember_me else 86400
    response.set_cookie(
        key=CUSTOMER_SESSION_COOKIE,
        value=token,
        max_age=cookie_max_age,
        httponly=True,
        samesite="lax",
        path="/"
    )
    return response

@api_router.post("/auth/logout")
@api_router.get("/auth/logout")
def portal_auth_logout():
    response = JSONResponse(content={"ok": True, "message": "Logout berhasil!"})
    response.delete_cookie(CUSTOMER_SESSION_COOKIE, path="/")
    response.set_cookie(
        key=CUSTOMER_SESSION_COOKIE,
        value="",
        max_age=0,
        expires=0,
        path="/",
        httponly=True,
        samesite="lax"
    )
    return response
@api_router.post("/auth/minta-reset-password")
async def portal_auth_minta_reset_password(request: Request, db: Session = Depends(get_portal_db)):
    """
    Pelanggan memasukkan Nomor WhatsApp terdaftar untuk meminta reset kata sandi:
    1. Sistem memverifikasi nomor WA pelanggan di database multi-tenant.
    2. Sistem secara otomatis men-generate kata sandi acak baru (6 digit angka).
    3. Password baru langsung di-hash dan disimpan ke database pelanggan.
    4. Sistem otomatis membuat Tiket Keluhan (kategori: RESET_PASSWORD, status: MENUNGGU) lengkap dengan password baru.
    5. Admin NOC menerima notifikasi di menu Tiket dan cukup 1-klik untuk mengirimkan password baru ke WhatsApp pelanggan.
    """
    import secrets
    from app.portal.modules.tickets.service import KendalaService
    from app.modules.activity_logs.service import ActivityLogService

    body = await request.json()
    no_hp_input = body.get("no_hp", "").strip()
    if not no_hp_input:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Mohon masukkan Nomor WhatsApp terdaftar Anda!"})

    clean_phone = AuthService._clean_phone(no_hp_input)
    if not clean_phone or len(clean_phone) < 6:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format Nomor WhatsApp tidak valid!"})

    matched_cust = AuthService._match_phone_customer(db, clean_phone)
    target_kantor = getattr(db, "_tenant_kantor", None)
    target_db = db

    if not matched_cust:
        from app.core.security import get_all_kantor_codes
        from app.core.tenant_database import TenantDatabaseManager
        for k_code in get_all_kantor_codes():
            try:
                t_db = TenantDatabaseManager.get_tenant_session(k_code)
                t_cust = AuthService._match_phone_customer(t_db, clean_phone)
                if t_cust:
                    matched_cust = t_cust
                    target_db = t_db
                    target_kantor = k_code
                    break
                else:
                    t_db.close()
            except Exception:
                pass

    if not matched_cust:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "message": "Nomor WhatsApp belum terdaftar di sistem. Mohon periksa kembali nomor Anda atau hubungi kantor ISP."}
        )

    # Simpan atribut penting sebelum session commit/close
    cust_id = matched_cust.id_pelanggan
    cust_nama = matched_cust.nama
    cust_no_hp = matched_cust.no_hp or clean_phone
    cust_kantor = matched_cust.kantor or target_kantor or "cabang"

    # 1. Generate 6 digit angka acak untuk kata sandi baru (100000 - 999999)
    random_password = f"{secrets.randbelow(900000) + 100000}"

    # 2. Update password_hash di database pelanggan
    matched_cust.password_hash = get_password_hash(random_password)
    target_db.commit()

    # 3. Buat Tiket Keluhan resmi ke antrean Admin NOC
    ticket_desc = (
        f"Permintaan Reset Kata Sandi TeknoCust untuk No. WA: {cust_no_hp}.\n"
        f"Kata Sandi Baru yang Dihasilkan: {random_password}"
    )
    new_ticket = KendalaService.create_ticket(
        db=target_db,
        id_pelanggan=cust_id,
        kategori="RESET_PASSWORD",
        deskripsi=ticket_desc,
        no_wa=cust_no_hp
    )
    id_tiket_created = new_ticket.id_tiket if new_ticket else "-"

    # 4. Catat aktivitas ke log sistem
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    ActivityLogService.log_activity(
        db=target_db,
        username=cust_id,
        nama_karyawan=f"Pelanggan: {cust_nama}",
        role="pelanggan",
        action="REQUEST_RESET_PASSWORD",
        ip_address=client_ip,
        user_agent=user_agent,
        status="SUCCESS",
        keterangan=f"Reset password mandiri berhasil digenerate ({random_password}) dan diteruskan ke Tiket #{id_tiket_created}"
    )

    if target_db != db:
        target_db.close()

    return {
        "ok": True,
        "message": f"Permintaan reset kata sandi telah diterima. Admin NOC TeknoIndonet akan segera mengirimkan kata sandi baru ke WhatsApp Anda ({cust_no_hp}).",
        "id_pelanggan": cust_id,
        "nama": cust_nama,
        "no_hp": cust_no_hp,
        "id_tiket": id_tiket_created
    }

def check_is_home_wifi(request: Request, pelanggan) -> bool:
    """
    Validasi ketat apakah perangkat klien saat ini benar-benar terhubung ke WiFi modem pelanggan:
    1. Jika akses via IP publik/WAN router (client_ip == ip_target), cocok 100%.
    2. Jika akses dari localhost / development:
       - Memeriksa SSID aktif yang terhubung pada adaptor WiFi (misal via netsh di Windows).
       - Jika SSID aktif cocok dengan nama_wifi pelanggan -> True.
       - Jika SSID aktif adalah WiFi lain (misal 'RUANG BEDAH' vs 'Tekno PSB') -> False!
       - Memeriksa MAC Gateway lokal (192.168.1.1) via ARP. Jika cocok dengan MAC modem pelanggan -> True, jika beda -> False.
    3. Jika klien di belakang NAT/LAN tapi subnet berbeda atau bukan modem pelanggan -> False.
    """
    if not pelanggan:
        return False

    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""

    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    cust_mac = (pelanggan.mac_address or (pelanggan.perangkat.mac_address if pelanggan.perangkat else "") or "").strip().upper()
    cust_ssid = (pelanggan.nama_wifi or "").strip().lower()

    # 1. Kecocokan IP WAN/Router persis
    if ip_target and client_ip and client_ip == ip_target:
        return True

    # 2. Pengecekan perangkat lokal (Localhost / Development)
    if client_ip in ["127.0.0.1", "::1", "localhost"]:
        import subprocess, re
        
        # A. Cocokkan SSID aktif adaptor Wi-Fi
        try:
            out_wlan = subprocess.check_output("netsh wlan show interfaces", text=True, timeout=2)
            m_ssid = re.search(r"^\s*SSID\s*:\s*(.+)$", out_wlan, re.MULTILINE)
            if m_ssid:
                active_ssid = m_ssid.group(1).strip().lower()
                if cust_ssid:
                    if active_ssid == cust_ssid:
                        return True
                    else:
                        # Terhubung ke SSID lain (misal 'RUANG BEDAH' padahal modem adalah 'Tekno PSB')
                        return False
        except Exception:
            pass

        # B. Cocokkan Physical Address / MAC Gateway Modem Default
        try:
            out_arp = subprocess.check_output("arp -a 192.168.1.1", text=True, timeout=2)
            m_mac = re.search(r"([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})", out_arp)
            if m_mac and cust_mac:
                active_gateway_mac = m_mac.group(1).replace("-", ":").upper()
                if active_gateway_mac == cust_mac:
                    return True
                else:
                    return False
        except Exception:
            pass

    return False

@api_router.get("/dashboard")
def portal_dashboard_data(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    data = DashboardService.get_dashboard_data(db, cust.get("id_pelanggan"))
    pel = data.get("pelanggan")
    last_log = data.get("last_log")
    kuota = data.get("kuota")
    
    # Deteksi apakah klien sedang terhubung langsung ke modem ONT pelanggan
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
    ip_target = (pel.ip_router or pel.ip_ont or "").strip() if pel else ""
    
    is_home_wifi = check_is_home_wifi(request, pel)
    
    # Status pembayaran riil dari DB: jika status_isolir == True maka BELUM_BAYAR (terisolir), jika False maka LUNAS
    status_bayar = "BELUM_BAYAR" if (pel and getattr(pel, "status_isolir", False)) else "LUNAS"
    harga_paket = float(pel.paket_ref.harga) if (pel and pel.paket_ref and pel.paket_ref.harga is not None) else None
    
    # Format nama bulan Indonesia (misal: "Oktober 2026")
    from app.core.timezone import get_now_wib
    now_wib = get_now_wib()
    bulan_indo = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    periode_teks = f"{bulan_indo[now_wib.month - 1]} {now_wib.year}"

    return {
        "ok": True,
        "customer": {
            "id_pelanggan": pel.id_pelanggan if pel else cust.get("id_pelanggan", ""),
            "nama": pel.nama if pel else cust.get("nama", ""),
            "paket": pel.paket if (pel and pel.paket) else "-",
            "harga_paket": harga_paket,
            "ip_router": pel.ip_router if (pel and pel.ip_router) else "-",
            "nama_wifi": pel.nama_wifi if (pel and pel.nama_wifi) else "",
            "kantor": pel.kantor if (pel and pel.kantor) else cust.get("kantor", ""),
            "pop": pel.pop if (pel and pel.pop) else "",
            "is_active": pel.is_active if pel else True,
            "status_pembayaran": status_bayar,
            "status_isolir": bool(getattr(pel, "status_isolir", False)),
            "periode_tagihan": periode_teks,
            "status_verifikasi": pel.status_verifikasi if (pel and pel.status_verifikasi) else cust.get("status_verifikasi", ""),
            "foto_profil": pel.foto_profil if (pel and pel.foto_profil) else "",
            "is_connected_to_home_wifi": is_home_wifi,
            "last_speed_test": {
                "download": float(pel.last_speed_download) if (pel and pel.last_speed_download is not None) else None,
                "upload": float(pel.last_speed_upload) if (pel and pel.last_speed_upload is not None) else None,
                "ping": pel.last_speed_ping if pel else None,
                "jitter": pel.last_speed_jitter if pel else None,
                "tested_at": pel.last_speed_test_at.strftime("%d/%m %H:%M") if (pel and pel.last_speed_test_at) else None
            }
        },
        "signal": {
            "rx_power": float(last_log.rx_power) if last_log and last_log.rx_power is not None else None,
            "status_koneksi": last_log.status_koneksi if last_log else "NORMAL",
            "suhu_ont": float(last_log.suhu_ont) if last_log and last_log.suhu_ont is not None else None,
            "latency_ms": last_log.latency_ms if last_log and last_log.latency_ms is not None else None,
            "waktu_cek": str(last_log.waktu_cek) if last_log and last_log.waktu_cek else "-"
        },
        "kuota": {
            "kuota_terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
            "kuota_hari_ini_gb": float(data.get("kuota_hari_ini_gb", 0.0)),
            "periode_bulan": kuota.periode_bulan if kuota else now_wib.strftime("%Y-%m"),
            "periode_label": periode_teks,
            "kecepatan_paket": kuota.kecepatan_paket if (kuota and kuota.kecepatan_paket) else (pel.paket if (pel and pel.paket) else "-")
        },
        "active_tickets_count": data.get("active_tickets_count", 0),
        "latest_ticket": data.get("latest_ticket")
    }

@api_router.get("/kuota")
def portal_kuota_data(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    data = KuotaService.get_kuota_details(db, cust.get("id_pelanggan"))
    kuota = data.get("kuota")
    pel = data.get("pelanggan")
    
    # Ambil paket dari kuota, jika kosong fallback ke paket di profil pelanggan
    paket_nama = (kuota.kecepatan_paket if (kuota and kuota.kecepatan_paket) else "") or (pel.paket if (pel and pel.paket) else "") or "-"
    
    return {
        "ok": True,
        "kuota_terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
        "kecepatan_paket": paket_nama,
        "periode_bulan": kuota.periode_bulan if kuota else "",
        "usage_history": data.get("usage_history", [])
    }

@api_router.get("/kendala")
def portal_kendala_list(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    tickets = KendalaService.get_customer_tickets(db, cust.get("id_pelanggan"))
    return {
        "ok": True,
        "tickets": [
            {
                "id_tiket": t.id_tiket,
                "kategori": t.kategori,
                "deskripsi": t.deskripsi,
                "status": t.status,
                "no_wa_pelapor": t.no_wa_pelapor,
                "redaman_saat_lapor": float(t.redaman_saat_lapor) if t.redaman_saat_lapor is not None else None,
                "created_at": str(t.created_at) if t.created_at else ""
            }
            for t in tickets
        ]
    }

@api_router.post("/kendala/buat")
async def portal_kendala_create(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    kategori = body.get("kategori", "").strip()
    deskripsi = body.get("deskripsi", "").strip()
    no_wa = body.get("no_wa", "").strip()
    
    if not kategori or not deskripsi or not no_wa:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Semua bidang formulir wajib diisi!"})
        
    ticket = KendalaService.create_ticket(
        db=db,
        id_pelanggan=cust.get("id_pelanggan"),
        kategori=kategori,
        deskripsi=deskripsi,
        no_wa=no_wa
    )
    
    return {
        "ok": True,
        "message": "Tiket keluhan berhasil dikirim ke tim teknisi NOC!",
        "id_tiket": ticket.id_tiket
    }

@api_router.delete("/kendala/{ticket_id}")
async def portal_kendala_delete(ticket_id: str, request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    success = KendalaService.delete_customer_ticket(
        db=db,
        id_tiket=ticket_id,
        id_pelanggan=cust.get("id_pelanggan")
    )
    if not success:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Tiket tidak ditemukan atau sudah dihapus!"})
        
    return {
        "ok": True,
        "message": f"Tiket keluhan '{ticket_id}' berhasil dihapus."
    }

@api_router.get("/wifi")
def portal_wifi_get(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    pelanggan, _ = PortalCustomerService.get_customer_by_id(cust.get("id_pelanggan"), db=db, hint_kantor=cust.get("kantor"))
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    # Ambil IP Pengguna dari Request (support reverse proxy X-Forwarded-For)
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    is_home_wifi = check_is_home_wifi(request, pelanggan)

    default_ssid = f"WiFi-{pelanggan.nama.replace(' ', '')}" if pelanggan.nama else "WiFi-Rumah"
    current_ssid = pelanggan.nama_wifi or default_ssid
    current_password = pelanggan.password_wifi or "Belum Disetel"
    
    return {
        "ok": True,
        "nama_wifi": current_ssid,
        "password_wifi": current_password,
        "is_connected_to_home_wifi": is_home_wifi,
        "client_ip": client_ip,
        "ip_router": ip_target
    }

@api_router.post("/wifi/ganti")
async def portal_wifi_change(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    nama_wifi = body.get("nama_wifi", "").strip()
    password_wifi = body.get("password_wifi", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    is_local_client_probe = body.get("is_local_client_probe", False) # Konfirmasi probe langsung dari browser client ke modem ONT
    
    if len(nama_wifi) < 3:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Nama WiFi (SSID) minimal 3 karakter!"})
        
    if len(password_wifi) < 8:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi WiFi minimal 8 karakter!"})
        
    if password_wifi != konfirmasi:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Konfirmasi kata sandi tidak cocok!"})
        
    pelanggan, _ = PortalCustomerService.get_customer_by_id(cust.get("id_pelanggan"), db=db, hint_kantor=cust.get("kantor"))
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    # Deteksi jaringan IP klien
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    is_home_wifi = check_is_home_wifi(request, pelanggan) or is_local_client_probe
            
    # KEBIJAKAN STRICT: WAJIB TERSAMBUNG KE MODEM WIFI RUMAH
    if not is_home_wifi:
        return JSONResponse(
            status_code=403,
            content={
                "ok": False,
                "is_connected_to_home_wifi": False,
                "message": "Gagal: Anda tidak terhubung ke WiFi rumah ini! Sambungkan HP/laptop Anda ke sinyal WiFi rumah terlebih dahulu untuk mengubah pengaturan."
            }
        )
        
    # Eksekusi sinkronisasi fisik ke modem ONT riil (bukan hanya database)
    from app.services.ont_scraper_service import ONTScraperService
    
    # Prioritaskan IP gateway lokal 192.168.1.1 jika pelanggan tersambung di WiFi rumahnya sendiri
    target_modem_ips = []
    if ip_target:
        target_modem_ips.append(ip_target)
    if "192.168.1.1" not in target_modem_ips:
        target_modem_ips.append("192.168.1.1")

    user_ont = pelanggan.user_admin or "admin"
    pass_ont = pelanggan.pass_admin or "admin"
    
    modem_updated = False
    modem_error_msg = ""

    # Ambil default modem credentials dari database sebagai fallback
    default_creds_tuples = PortalCustomerService.get_default_modem_credentials(db)

    for m_ip in target_modem_ips:
        try:
            update_res = ONTScraperService.update_wifi_credentials(
                ip=m_ip,
                user_admin=user_ont,
                pass_admin=pass_ont,
                new_ssid=nama_wifi,
                new_wifi_password=password_wifi,
                default_credentials=default_creds_tuples,
                dry_run=False
            )
            if update_res.get("success"):
                modem_updated = True
                break
            else:
                modem_error_msg = update_res.get("message", "")
        except Exception as ex:
            modem_error_msg = str(ex)

    # Simpan ke database terpusat
    pelanggan.nama_wifi = nama_wifi
    pelanggan.password_wifi = password_wifi
    if hasattr(pelanggan, "perangkat") and pelanggan.perangkat:
        pelanggan.perangkat.nama_wifi = nama_wifi
        pelanggan.perangkat.password_wifi = password_wifi

    db.commit()
    db.refresh(pelanggan)

    pesan_sukses = "Nama WiFi (SSID) dan Kata Sandi baru berhasil diperbarui langsung ke modem router dan database!"
    if not modem_updated and modem_error_msg:
        pesan_sukses = f"Tersimpan di database. Catatan modem: {modem_error_msg}"

    return {
        "ok": True,
        "modem_updated": modem_updated,
        "message": pesan_sukses,
        "nama_wifi": nama_wifi,
        "password_wifi": password_wifi
    }

@api_router.post("/profil/ganti-password")
async def portal_profil_change_password(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    password_baru = body.get("password_baru", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    
    if len(password_baru) < 6:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi baru minimal 6 karakter!"})
        
    if password_baru != konfirmasi:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Konfirmasi kata sandi tidak cocok!"})
        
    id_pel = cust.get("id_pelanggan")
    pelanggan, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    pelanggan.password_hash = get_password_hash(password_baru)
    target_db.commit()
    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Kata sandi akun portal Anda berhasil diubah!"
    }

@api_router.post("/profil/update")
async def portal_profil_update(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    nama = body.get("nama", "").strip()
    no_hp = body.get("no_hp", "").strip()
    alamat = body.get("alamat", "").strip()
    
    id_pel = cust.get("id_pelanggan")
    pelanggan, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    if nama:
        pelanggan.nama = nama
    if no_hp:
        pelanggan.no_hp = no_hp
    if alamat:
        pelanggan.alamat = alamat
        
    target_db.commit()
    target_db.refresh(pelanggan)
    cust_res = {
        "id_pelanggan": pelanggan.id_pelanggan,
        "nama": pelanggan.nama,
        "no_hp": pelanggan.no_hp or "",
        "alamat": pelanggan.alamat or "",
        "paket": pelanggan.paket or "",
        "ip_router": pelanggan.ip_router or "",
        "kantor": pelanggan.kantor or "",
        "status_verifikasi": pelanggan.status_verifikasi or "",
        "foto_profil": pelanggan.foto_profil or ""
    }
    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Data diri (Alamat & No. Kontak) berhasil diperbarui!",
        "customer": cust_res
    }

@api_router.post("/profil/foto")
async def portal_profil_upload_foto(request: Request, db: Session = Depends(get_portal_db)):
    """
    Upload & Simpan Foto Profil Pelanggan yang telah dicompress ke format WebP di client.
    Mendukung payload JSON { "image_base64": "data:image/webp;base64,..." }
    File disimpan di static/uploads/profil/{id_pelanggan}.webp dan path-nya dicatat ke tabel pelanggan.
    """
    import base64
    import re
    from pathlib import Path
    
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    id_pel = cust.get("id_pelanggan")
    pelanggan, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    body = await request.json()
    image_data = body.get("image_base64", "").strip()
    if not image_data:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Data foto tidak ditemukan!"})
        
    # Ekstrak data base64 (hapus prefix data:image/...;base64,)
    if "," in image_data:
        header, base64_str = image_data.split(",", 1)
    else:
        base64_str = image_data
        
    try:
        binary_data = base64.b64decode(base64_str)
    except Exception:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format gambar base64 tidak valid!"})
        
    # Batasi ukuran maksimal 1MB setelah compress (biasanya webp hanya 20-50KB)
    if len(binary_data) > 1024 * 1024:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Ukuran foto terlalu besar (maksimal 1 MB)!"})
        
    # Pastikan direktori static/uploads/profil ada
    upload_dir = Path("static/uploads/profil")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Sanitasi nama file menggunakan id_pelanggan yang aman
    safe_filename = re.sub(r"[^a-zA-Z0-9_\-]", "_", id_pel) + ".webp"
    file_path = upload_dir / safe_filename
    
    # Tulis file biner webp ke disk server
    with open(file_path, "wb") as f:
        f.write(binary_data)
        
    # Simpan URL path relatif dengan query timestamp untuk cache-busting saat di-update
    import time
    timestamp = int(time.time())
    relative_url = f"/static/uploads/profil/{safe_filename}?v={timestamp}"
    
    pelanggan.foto_profil = relative_url
    target_db.commit()
    target_db.refresh(pelanggan)
    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil diperbarui!",
        "foto_profil": relative_url
    }

@api_router.delete("/profil/foto")
def portal_profil_delete_foto(request: Request, db: Session = Depends(get_portal_db)):
    """
    Hapus Foto Profil Pelanggan dan kembalikan ke avatar inisial nama default.
    """
    import re
    from pathlib import Path
    
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    id_pel = cust.get("id_pelanggan")
    pelanggan, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    safe_filename = re.sub(r"[^a-zA-Z0-9_\-]", "_", id_pel) + ".webp"
    file_path = Path("static/uploads/profil") / safe_filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass
            
    pelanggan.foto_profil = None
    target_db.commit()
    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil dihapus dan kembali ke inisial nama."
    }

@api_router.get("/wifi/perangkat-terhubung")
def portal_get_connected_devices(request: Request, db: Session = Depends(get_portal_db)):
    """
    Mendapatkan riwayat perangkat terhubung milik pelanggan yang sedang login di TeknoCust.
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Belum login"})
    
    id_pel = cust.get("id_pelanggan")
    pel, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    from app.services.connected_device_service import ConnectedDeviceService
    try:
        devices = ConnectedDeviceService.get_connected_devices(db=target_db, id_pelanggan=id_pel)
    finally:
        if target_db is not db:
            try:
                target_db.close()
            except Exception:
                pass

    return {
        "ok": True,
        "id_pelanggan": id_pel,
        "total": len(devices),
        "devices": devices
    }

@api_router.post("/wifi/perangkat-terhubung/scan")
def portal_scan_connected_devices(request: Request, db: Session = Depends(get_portal_db)):
    """
    Live scanning mandiri perangkat terhubung langsung ke modem ONT dari aplikasi TeknoCust.
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Belum login"})
    
    id_pel = cust.get("id_pelanggan")
    pel, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    from app.services.connected_device_service import ConnectedDeviceService
    try:
        res = ConnectedDeviceService.scan_and_sync_ont_devices(db=target_db, id_pelanggan=id_pel)
    finally:
        if target_db is not db:
            try:
                target_db.close()
            except Exception:
                pass

    return {
        "ok": res.get("success", False),
        "message": res.get("message", ""),
        "total": res.get("total", 0),
        "devices": res.get("devices", [])
    }

@api_router.post("/wifi/perangkat-terhubung/toggle-block")
async def portal_toggle_block_device(request: Request, db: Session = Depends(get_portal_db)):
    """
    Blokir atau Buka Blokir (Unblock) perangkat WiFi/LAN yang terhubung ke modem.
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Belum login"})

    id_pel = cust.get("id_pelanggan")
    body = await request.json()
    mac = body.get("mac_address", "").strip()
    block = body.get("block", None)

    if not mac:
        return JSONResponse(status_code=400, content={"ok": False, "message": "MAC Address perangkat wajib disertakan."})

    pel, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    from app.services.connected_device_service import ConnectedDeviceService
    try:
        res = ConnectedDeviceService.toggle_block_device(db=target_db, id_pelanggan=id_pel, mac_address=mac, block=block)
    finally:
        if target_db is not db:
            try:
                target_db.close()
            except Exception:
                pass

    return {
        "ok": res.get("success", False),
        "message": res.get("message", ""),
        "is_blocked": res.get("is_blocked"),
        "device": res.get("device")
    }

@api_router.post("/dashboard/live-probe")
def portal_live_probe_signal(request: Request, db: Session = Depends(get_portal_db)):
    """
    Live on-demand probe langsung ke modem ONT pelanggan saat menekan tombol uji kecepatan / maskot.
    Mengambil data riil redaman optik (Rx Power dBm), suhu ONT (°C), dan latensi (ms).
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Belum login"})
    
    id_pel = cust.get("id_pelanggan")
    from app.db.models import Pelanggan, LogPerformaONT, SystemSetting
    import json
    from app.services.ont_scraper_service import ONTScraperService
    from app.core.timezone import get_now_wib

    pel, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pel:
        # Graceful response agar tidak memicu 404 pada frontend console
        return JSONResponse(
            status_code=200,
            content={"ok": False, "message": "Data pelanggan tidak ditemukan", "signal": None}
        )

    if not pel.ip_router:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "message": "IP Router modem belum disetel", "signal": None}
        )

    # Ambil default modem credentials via service layer
    creds_tuples = PortalCustomerService.get_default_modem_credentials(target_db)

    try:
        scrape_res = ONTScraperService.scrape_ont(
            ip=pel.ip_router,
            customer_user=pel.user_admin,
            customer_pass=pel.pass_admin,
            customer_name=pel.nama,
            default_credentials=creds_tuples,
            is_mass_scan=False,
            exhaustive_first_scan=False
        )
    except Exception as scrape_err:
        scrape_res = {"success": False, "error": str(scrape_err)}

    now = get_now_wib()
    if scrape_res.get("success"):
        rx_val = scrape_res.get("rx_power")
        suhu_val = scrape_res.get("suhu_ont")
        latency_val = scrape_res.get("latency_ms")
        status_koneksi = scrape_res.get("status_koneksi", "NORMAL")

        # Catat ke LogPerformaONT agar sinkron time-series
        log_entry = LogPerformaONT(
            id_pelanggan=pel.id_pelanggan,
            ip_router=pel.ip_router,
            rx_power=rx_val,
            suhu_ont=suhu_val,
            latency_ms=latency_val,
            status_koneksi=status_koneksi,
            waktu_cek=now
        )
        target_db.add(log_entry)

        # Update kredensial valid jika baru ditemukan
        if scrape_res.get("used_user"):
            pel.user_admin = scrape_res.get("used_user")
            pel.pass_admin = scrape_res.get("used_pass")
            pel.status_kredensial = "VALID"
        pel.last_probe_at = now
        target_db.commit()

        return {
            "ok": True,
            "signal": {
                "rx_power": float(rx_val) if rx_val is not None else None,
                "suhu_ont": float(suhu_val) if suhu_val is not None else None,
                "latency_ms": latency_val,
                "status_koneksi": status_koneksi,
                "waktu_cek": now.strftime("%H:%M:%S") + " WIB"
            }
        }
    else:
        # Jika modem offline / tidak dapat diakses langsung, ambil data terakhir dari database
        last_log = PortalCustomerService.get_latest_signal_log(target_db, id_pel)

        return {
            "ok": True,
            "message": "Menggunakan data performa tersimpan terkini",
            "signal": {
                "rx_power": float(last_log.rx_power) if (last_log and last_log.rx_power is not None) else None,
                "suhu_ont": float(last_log.suhu_ont) if (last_log and last_log.suhu_ont is not None) else None,
                "latency_ms": last_log.latency_ms if (last_log and last_log.latency_ms is not None) else None,
                "status_koneksi": last_log.status_koneksi if last_log else "NORMAL",
                "waktu_cek": str(last_log.waktu_cek) if last_log and last_log.waktu_cek else "-"
            }
        }





# ══════════════════════════════════════════════════════════════════
# SPEED TEST RIIL (LIBRESPEED & OPENSPEEDTEST COMPATIBLE ENDPOINTS)
# ══════════════════════════════════════════════════════════════════
import os
from fastapi.responses import StreamingResponse

def _generate_speedtest_bytes(total_bytes: int):
    chunk_size = 65536  # 64 KB
    sent = 0
    while sent < total_bytes:
        size = min(chunk_size, total_bytes - sent)
        yield os.urandom(size)
        sent += size

@api_router.get("/speedtest/ping")
def speedtest_ping():
    """Endpoint Ping RTT super ringan untuk menghitung latensi & jitter riil."""
    return Response(
        content="pong",
        media_type="text/plain",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )

@api_router.get("/speedtest/download")
def speedtest_download(bytes: int = 15728640):
    """Endpoint Download mengalirkan bytes acak (incompressible) untuk mengukur throughput riil."""
    safe_size = max(1048576, min(bytes, 52428800))  # 1MB - 50MB
    headers = {
        "Content-Type": "application/octet-stream",
        "Content-Length": str(safe_size),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache"
    }
    return StreamingResponse(_generate_speedtest_bytes(safe_size), headers=headers)

@api_router.post("/speedtest/upload")
async def speedtest_upload(request: Request):
    """Endpoint Upload menerima binary payload dan menghitung throughput upload riil."""
    total_bytes = 0
    async for chunk in request.stream():
        total_bytes += len(chunk)
    return Response(
        content=f'{{"ok":true,"received_bytes":{total_bytes}}}',
        media_type="application/json",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )


@api_router.post("/speedtest/save")
async def speedtest_save_result(request: Request, db: Session = Depends(get_portal_db)):
    """Simpan hasil speed test pelanggan ke database agar persisten."""
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Unauthorized"})

    id_pelanggan = cust.get("id_pelanggan")
    id_pelanggan = cust.get("id_pelanggan")
    try:
        body = await request.json()
        download = body.get("download")
        upload = body.get("upload")
        ping = body.get("ping")
        jitter = body.get("jitter")
        pel = PortalCustomerService.save_speedtest_results(
            db=db,
            id_pelanggan=id_pelanggan,
            download=download,
            upload=upload,
            ping=ping,
            jitter=jitter
        )
        if not pel:
            return JSONResponse(status_code=404, content={"ok": False, "message": "Pelanggan tidak ditemukan"})
        db.commit()
        db.refresh(pel)

        return {
            "ok": True,
            "message": "Hasil pengujian berhasil disimpan",
            "data": {
                "download": float(pel.last_speed_download) if pel.last_speed_download is not None else None,
                "upload": float(pel.last_speed_upload) if pel.last_speed_upload is not None else None,
                "ping": pel.last_speed_ping,
                "jitter": pel.last_speed_jitter,
                "tested_at": pel.last_speed_test_at.strftime("%Y-%m-%d %H:%M:%S") if pel.last_speed_test_at else None
            }
        }
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"ok": False, "message": str(e)})
