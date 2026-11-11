from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.services.customer_service import PortalCustomerService
from app.portal.core.security import (
    get_current_customer_optional,
    CUSTOMER_SESSION_COOKIE,
    MAX_SESSION_AGE,
    get_password_hash,
    check_is_home_wifi
)
from app.portal.modules.auth.service import AuthService
from app.db.models import Pelanggan

router = APIRouter(prefix="/auth", tags=["Portal Auth"])


@router.get("/me")
def portal_auth_me(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return {"authenticated": False, "message": "Belum login"}
    
    id_pel = cust.get("id_pelanggan")
    pelanggan, _ = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    
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


@router.post("/login")
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


@router.post("/logout")
@router.get("/logout")
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


@router.post("/minta-reset-password")
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

    cust_id = matched_cust.id_pelanggan
    cust_nama = matched_cust.nama
    cust_no_hp = matched_cust.no_hp or clean_phone
    cust_kantor = matched_cust.kantor or target_kantor or "cabang"

    random_password = f"{secrets.randbelow(900000) + 100000}"

    matched_cust.password_hash = get_password_hash(random_password)
    target_db.commit()

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


@router.post("/register-fcm")
async def register_portal_fcm_token(
    request: Request,
    db: Session = Depends(get_portal_db)
):
    """
    Mendaftarkan atau memperbarui token FCM perangkat Android
    ke data pelanggan yang sedang login di Portal MyTekno.
    """
    body = await request.json()
    token = body.get("fcm_token", "").strip()
    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Token FCM tidak boleh kosong."})

    customer_session = getattr(request.state, "portal_customer", None)
    if not customer_session:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Sesi pelanggan tidak ditemukan."})

    cust_id = customer_session.get("id_pelanggan")
    if cust_id:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cust_id).first()
        if cust:
            cust.fcm_token = token
            db.commit()
            return {"ok": True, "message": "Token FCM pelanggan berhasil didaftarkan."}

    return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan."})

