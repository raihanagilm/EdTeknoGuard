from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import Pelanggan, TiketKendala
from portal_pelanggan.core.security import (
    get_current_customer_optional,
    create_customer_session_token,
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    verify_password,
    get_password_hash
)
from portal_pelanggan.modules.auth.service import AuthService
from portal_pelanggan.modules.dashboard.service import DashboardService
from portal_pelanggan.modules.kuota.service import KuotaService
from portal_pelanggan.modules.kendala.service import KendalaService

api_router = APIRouter(prefix="/api", tags=["Portal Pelanggan REST API"])

@api_router.get("/auth/me")
def portal_auth_me(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return {"authenticated": False, "message": "Belum login"}
    
    id_pel = cust.get("id_pelanggan")
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first() if id_pel else None
    
    # Fallback jika session DB belum mengarah ke tenant kantor pelanggan yang benar
    if not pelanggan and id_pel:
        c_kantor = cust.get("kantor")
        from app.core.tenant_database import TenantDatabaseManager
        if c_kantor:
            try:
                t_db = TenantDatabaseManager.get_tenant_session(c_kantor)
                pelanggan = t_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
                t_db.close()
            except Exception:
                pass
        if not pelanggan:
            from app.core.security import get_all_kantor_codes
            for k_code in get_all_kantor_codes():
                try:
                    k_db = TenantDatabaseManager.get_tenant_session(k_code)
                    p_found = k_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
                    k_db.close()
                    if p_found:
                        pelanggan = p_found
                        break
                except Exception:
                    pass
    
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
            "foto_profil": pelanggan.foto_profil if (pelanggan and pelanggan.foto_profil) else ""
        }
    }

@api_router.post("/auth/login")
async def portal_auth_login(request: Request, db: Session = Depends(get_db)):
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

@api_router.post("/auth/lupa-password")
async def portal_auth_lupa_password(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    ip_router = body.get("ip_router", "").strip()
    nama = body.get("nama", "").strip()
    no_hp = body.get("no_hp", "").strip()
    password_baru = body.get("password_baru", "123456").strip()
    
    if len(password_baru) < 6:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi baru minimal 6 karakter!"})
        
    matched_cust = AuthService.find_matching_customer(db, nama=nama, ip_router=ip_router)
    if not matched_cust:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "message": "Data verifikasi tidak cocok dengan data pelanggan mana pun!"}
        )
        
    matched_cust.password_hash = get_password_hash(password_baru)
    db.commit()
    
    return {
        "ok": True,
        "message": f"Kata sandi untuk ID Pelanggan {matched_cust.id_pelanggan} ({matched_cust.nama}) berhasil diubah!"
    }

@api_router.get("/dashboard")
def portal_dashboard_data(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    data = DashboardService.get_dashboard_data(db, cust.get("id_pelanggan"))
    pel = data.get("pelanggan")
    last_log = data.get("last_log")
    kuota = data.get("kuota")
    
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
            "foto_profil": pel.foto_profil if (pel and pel.foto_profil) else ""
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
def portal_kuota_data(request: Request, db: Session = Depends(get_db)):
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
def portal_kendala_list(request: Request, db: Session = Depends(get_db)):
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
async def portal_kendala_create(request: Request, db: Session = Depends(get_db)):
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
async def portal_kendala_delete(ticket_id: str, request: Request, db: Session = Depends(get_db)):
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
def portal_wifi_get(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    # Ambil IP Pengguna dari Request (support reverse proxy X-Forwarded-For)
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    # Deteksi apakah klien sedang terhubung langsung ke modem ONT pelanggan
    # Catatan: Tidak boleh menggunakan subnet /24 karena berisiko false-positive pada jaringan dengan subnet sama
    is_home_wifi = False
    if ip_target and client_ip:
        if client_ip == ip_target:
            is_home_wifi = True

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
async def portal_wifi_change(request: Request, db: Session = Depends(get_db)):
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
        
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    # Deteksi jaringan IP klien
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    # Syarat Wajib: Harus terhubung langsung ke modem WiFi rumah
    is_home_wifi = False
    if ip_target and client_ip and client_ip == ip_target:
        is_home_wifi = True
    elif is_local_client_probe:
        # Client membuktikan telah terhubung secara lokal melalui browser probe ke gateway modem
        is_home_wifi = True
            
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
        
    pelanggan.nama_wifi = nama_wifi
    pelanggan.password_wifi = password_wifi
    db.commit()
    
    return {
        "ok": True,
        "message": "Pengaturan nama dan kata sandi WiFi rumah berhasil diperbarui!",
        "nama_wifi": nama_wifi,
        "password_wifi": password_wifi
    }

@api_router.post("/profil/ganti-password")
async def portal_profil_change_password(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    password_baru = body.get("password_baru", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    if len(password_baru) < 6:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi baru minimal 6 karakter!"})
        
    if password_baru != konfirmasi:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Konfirmasi kata sandi tidak cocok!"})
        
    pelanggan.password_hash = get_password_hash(password_baru)
    db.commit()
    
    return {
        "ok": True,
        "message": "Kata sandi akun portal Anda berhasil diubah!"
    }

@api_router.post("/profil/update")
async def portal_profil_update(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    nama = body.get("nama", "").strip()
    no_hp = body.get("no_hp", "").strip()
    alamat = body.get("alamat", "").strip()
    
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    if nama:
        pelanggan.nama = nama
    if no_hp:
        pelanggan.no_hp = no_hp
    if alamat:
        pelanggan.alamat = alamat
        
    db.commit()
    db.refresh(pelanggan)
    
    return {
        "ok": True,
        "message": "Data diri (Alamat & No. Kontak) berhasil diperbarui!",
        "customer": {
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
    }

@api_router.post("/profil/foto")
async def portal_profil_upload_foto(request: Request, db: Session = Depends(get_db)):
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
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
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
    db.commit()
    db.refresh(pelanggan)
    
    return {
        "ok": True,
        "message": "Foto profil berhasil diperbarui!",
        "foto_profil": relative_url
    }

@api_router.delete("/profil/foto")
def portal_profil_delete_foto(request: Request, db: Session = Depends(get_db)):
    """
    Hapus Foto Profil Pelanggan dan kembalikan ke avatar inisial nama default.
    """
    import re
    from pathlib import Path
    
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    id_pel = cust.get("id_pelanggan")
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
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
    db.commit()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil dihapus dan kembali ke inisial nama."
    }


