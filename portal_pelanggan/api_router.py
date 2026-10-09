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
        return JSONResponse(status_code=401, content={"authenticated": False, "message": "Belum login"})
    
    id_pel = cust.get("id_pelanggan")
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first() if id_pel else None
    
    return {
        "authenticated": True,
        "customer": {
            "id_pelanggan": cust.get("id_pelanggan"),
            "nama": pelanggan.nama if pelanggan else cust.get("nama"),
            "status_verifikasi": pelanggan.status_verifikasi if pelanggan else cust.get("status_verifikasi", "TERVERIFIKASI"),
            "ip_router": pelanggan.ip_router if pelanggan else "",
            "paket": pelanggan.paket if pelanggan else "",
            "alamat": pelanggan.alamat if pelanggan else "",
            "no_hp": pelanggan.no_hp if pelanggan else "",
            "nama_wifi": pelanggan.nama_wifi if pelanggan else ""
        }
    }

@api_router.post("/auth/login")
async def portal_auth_login(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    identifier = body.get("identifier", "").strip()
    password = body.get("password", "").strip()
    
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
        "status_verifikasi": data.get("status_verifikasi")
    }
    response = JSONResponse(
        content={
            "ok": True,
            "message": "Login berhasil!",
            "customer": payload
        }
    )
    response.set_cookie(
        key=CUSTOMER_SESSION_COOKIE,
        value=token,
        max_age=MAX_SESSION_AGE,
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
    
    return {
        "ok": True,
        "customer": {
            "id_pelanggan": pel.id_pelanggan if pel else cust.get("id_pelanggan"),
            "nama": pel.nama if pel else cust.get("nama"),
            "paket": pel.paket if pel else "20 Mbps Unlimited",
            "ip_router": pel.ip_router if pel else "-",
            "nama_wifi": pel.nama_wifi if pel else "-",
            "status_verifikasi": pel.status_verifikasi if pel else "TERVERIFIKASI"
        },
        "signal": {
            "rx_power": float(last_log.rx_power) if last_log and last_log.rx_power is not None else -21.4,
            "status_koneksi": last_log.status_koneksi if last_log else "NORMAL",
            "suhu_ont": float(last_log.suhu_ont) if last_log and last_log.suhu_ont is not None else 41.0,
            "latency_ms": last_log.latency_ms if last_log and last_log.latency_ms is not None else 18,
            "waktu_cek": str(last_log.waktu_cek) if last_log and last_log.waktu_cek else "Baru Saja"
        },
        "kuota": {
            "kuota_terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 84.5,
            "periode_bulan": kuota.periode_bulan if kuota else "2026-10",
            "kecepatan_paket": kuota.kecepatan_paket if kuota else "20 Mbps Unlimited"
        },
        "active_tickets_count": data.get("active_tickets_count", 0)
    }

@api_router.get("/kuota")
def portal_kuota_data(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    data = KuotaService.get_kuota_details(db, cust.get("id_pelanggan"))
    kuota = data.get("kuota")
    
    return {
        "ok": True,
        "kuota_terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
        "kecepatan_paket": kuota.kecepatan_paket if kuota else "20 Mbps Unlimited",
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

@api_router.post("/wifi/ganti")
async def portal_wifi_change(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    nama_wifi = body.get("nama_wifi", "").strip()
    password_wifi = body.get("password_wifi", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    
    if len(nama_wifi) < 3:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Nama WiFi (SSID) minimal 3 karakter!"})
        
    if len(password_wifi) < 8:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi WiFi minimal 8 karakter!"})
        
    if password_wifi != konfirmasi:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Konfirmasi kata sandi tidak cocok!"})
        
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    pelanggan.nama_wifi = nama_wifi
    pelanggan.password_wifi = password_wifi
    db.commit()
    
    return {
        "ok": True,
        "message": "Pengaturan nama dan kata sandi WiFi rumah berhasil diperbarui!"
    }

@api_router.post("/profil/ganti-password")
async def portal_profil_change_password(request: Request, db: Session = Depends(get_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    password_lama = body.get("password_lama", "").strip()
    password_baru = body.get("password_baru", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust.get("id_pelanggan")).first()
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    if not pelanggan.password_hash or not verify_password(password_lama, pelanggan.password_hash):
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi lama salah!"})
        
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
