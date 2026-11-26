from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import logging

logger = logging.getLogger("portal_auth")

from app.core.database import get_portal_db
from app.core.tenant_database import TenantDatabaseManager
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

    # Cari alert pengingat tagihan terbaru yang dikirim admin NOC
    c_id = pelanggan.id_pelanggan if pelanggan else cust.get("id_pelanggan")
    latest_billing_alert = None
    if c_id:
        from app.db.models import AlertLog
        latest_billing_alert = db.query(AlertLog).filter(
            AlertLog.id_pelanggan == c_id,
            AlertLog.tipe_alert == "TAGIHAN_REMINDER"
        ).order_by(AlertLog.waktu_kirim.desc()).first()

    billing_reminder = None
    is_unpaid = bool(pelanggan and (pelanggan.status_pembayaran in ["BELUM_BAYAR", "OVERDUE", "ISOLIR"] or getattr(pelanggan, "is_overdue", False) or (getattr(pelanggan, "total_tagihan", None) and pelanggan.total_tagihan > 0)))
    if latest_billing_alert and is_unpaid:
        billing_reminder = {
            "id": f"billing-alert-{latest_billing_alert.id_alert}",
            "pesan": latest_billing_alert.pesan,
            "waktu": latest_billing_alert.waktu_kirim.strftime("%d/%m/%Y %H:%M"),
            "timestamp_iso": latest_billing_alert.waktu_kirim.isoformat()
        }

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
            "lokasi_gps": pelanggan.lokasi_gps if (pelanggan and pelanggan.lokasi_gps) else "",
            "is_connected_to_home_wifi": check_is_home_wifi(request, pelanggan),
            "status_pembayaran": pelanggan.status_pembayaran if (pelanggan and getattr(pelanggan, "status_pembayaran", None)) else "LUNAS",
            "billing_mode": getattr(pelanggan, "billing_mode", None) if pelanggan else None,
            "total_tagihan": float(pelanggan.total_tagihan or 0.0) if (pelanggan and getattr(pelanggan, "total_tagihan", None)) else 0.0,
            "is_overdue": bool(getattr(pelanggan, "is_overdue", False)) if pelanggan else False,
            "nomor_va": pelanggan.nomor_va if (pelanggan and getattr(pelanggan, "nomor_va", None)) else "-",
            "periode_tagihan": pelanggan.periode_tagihan if (pelanggan and getattr(pelanggan, "periode_tagihan", None)) else None,
            "billing_reminder": billing_reminder
        }
    }


@router.post("/login")
async def portal_auth_login(request: Request, db: Session = Depends(get_portal_db)):
    body = await request.json()
    identifier = body.get("identifier", "").strip()
    password = body.get("password", "").strip()
    remember_me = body.get("remember_me", True)
    platform = str(body.get("platform") or "WEB").upper().strip()
    
    success, msg, data = AuthService.authenticate(db, identifier, password)
    if not success or not data:
        is_locked = bool(data and data.get("locked"))
        status_code = 423 if is_locked else 401
        return JSONResponse(
            status_code=status_code,
            content={
                "ok": False,
                "message": msg or "ID Pelanggan / No WhatsApp / IP atau Kata Sandi salah!",
                "locked": is_locked,
                "remaining_seconds": data.get("remaining_seconds", 0) if data else 0
            }
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
        "pop": data.get("pop", ""),
        "lokasi_gps": data.get("lokasi_gps", ""),
        "billing_mode": data.get("billing_mode")
    }

    # Audit Trail: Catat riwayat login pelanggan (dengan proteksi fail-safe)
    try:
        cust_kantor = data.get("kantor")
        t_db_log = TenantDatabaseManager.get_tenant_session(cust_kantor) if cust_kantor else db
        try:
            from app.portal.services.customer_activity_service import CustomerActivityService
            CustomerActivityService.record(
                db=t_db_log,
                id_pelanggan=data.get("id_pelanggan"),
                aksi="LOGIN_PORTAL",
                kategori="AUTH",
                keterangan=f"Pelanggan berhasil login ke portal MyTekno ({data.get('nama')}) [Platform: {platform}]",
                request=request
            )
        finally:
            if t_db_log != db:
                t_db_log.close()
    except Exception as e:
        logger.warning(f"Gagal mencatat log aktivitas login portal: {e}")

    # Notifikasi Keamanan ke HP Android jika login dilakukan dari Web Browser (Chrome/Edge)
    if platform == "WEB":
        try:
            cust_kantor = data.get("kantor")
            t_db_cust = TenantDatabaseManager.get_tenant_session(cust_kantor) if cust_kantor else db
            try:
                from app.db.models import Pelanggan
                from app.services.fcm_service import send_push_notification
                cust_obj = t_db_cust.query(Pelanggan).filter(Pelanggan.id_pelanggan == data.get("id_pelanggan")).first()
                if cust_obj and cust_obj.fcm_token and cust_obj.fcm_token.strip():
                    send_push_notification(
                        tokens=[cust_obj.fcm_token.strip()],
                        title="Pemberitahuan Keamanan MyTekno",
                        body=f"Halo {cust_obj.nama}, akun Anda baru saja login melalui Web Browser (Chrome/Windows).",
                        data={"type": "security_login", "platform": "WEB"},
                        channel_id="tekno_customer_channel",
                        sound="default"
                    )
            finally:
                if t_db_cust != db:
                    t_db_cust.close()
        except Exception as fcm_err:
            logger.warning(f"FCM: Gagal mengirimkan push notifikasi login web pelanggan: {fcm_err}")

    response = JSONResponse(
        content={
            "ok": True,
            "message": "Login berhasil!",
            "customer": payload
        }
    )
    from app.core.security import is_https_request
    cookie_max_age = MAX_SESSION_AGE if remember_me else 86400
    response.set_cookie(
        key=CUSTOMER_SESSION_COOKIE,
        value=token,
        max_age=cookie_max_age,
        httponly=True,
        samesite="lax",
        secure=is_https_request(request),
        path="/"
    )
    return response


@router.post("/logout")
@router.get("/logout")
async def portal_auth_logout(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    platform = "WEB"
    fcm_token = None
    try:
        body = await request.json()
        if isinstance(body, dict):
            platform = str(body.get("platform") or "WEB").upper().strip()
            fcm_token = (body.get("fcm_token") or "").strip() or None
    except Exception:
        pass

    if cust and cust.get("id_pelanggan"):
        # Audit Trail: Catat riwayat logout pelanggan (dengan proteksi fail-safe)
        try:
            k = cust.get("kantor")
            t_db_out = TenantDatabaseManager.get_tenant_session(k) if k else db
            try:
                from app.portal.services.customer_activity_service import CustomerActivityService
                CustomerActivityService.record(
                    db=t_db_out,
                    id_pelanggan=cust.get("id_pelanggan"),
                    aksi="LOGOUT_PORTAL",
                    kategori="AUTH",
                    keterangan="Pelanggan logout dari sesi portal MyTekno",
                    request=request
                )
            finally:
                if t_db_out != db:
                    t_db_out.close()
        except Exception as e:
            logger.warning(f"Gagal mencatat log aktivitas logout portal: {e}")

        # Lepas ikatan FCM token hanya jika logout dari aplikasi Android atau menyertakan token perangkat
        try:
            PortalCustomerService.clear_fcm_token_on_logout(
                cust_id=cust.get("id_pelanggan"),
                platform=platform,
                fcm_token=fcm_token,
                db=db,
                hint_kantor=cust.get("kantor")
            )
        except Exception as e:
            logger.warning(f"FCM: Gagal membersihkan token saat logout pelanggan {cust.get('id_pelanggan')}: {e}")

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
    1. Sistem mencari nomor WA pelanggan secara internal di database multi-tenant.
    2. Sistem membuat Tiket Keluhan (kategori: RESET_PASSWORD, status: MENUNGGU) tanpa langsung menimpa
       kata sandi aktif (mencegah DoS/penguncian akun sepihak oleh pihak tak dikenal).
    3. Kata sandi baru baru akan diaktifkan saat Admin NOC menyetujui dan mengirimkannya via WhatsApp.
    4. Response bersifat generik (anti-enumerasi nomor HP & nama pelanggan).
    """
    import secrets
    from app.portal.modules.tickets.service import KendalaService
    from app.db.models import TiketKendala

    body = await request.json()
    no_hp_input = (body.get("no_hp") or "").strip()
    if not no_hp_input:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Mohon masukkan Nomor WhatsApp terdaftar Anda!"})

    clean_phone = AuthService._clean_phone(no_hp_input)
    if not clean_phone or len(clean_phone) < 6:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format Nomor WhatsApp tidak valid!"})

    matched_cust = AuthService._match_phone_customer(db, clean_phone)
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
                    break
                else:
                    t_db.close()
            except Exception:
                pass

    if matched_cust:
        try:
            cust_id = matched_cust.id_pelanggan
            cust_no_hp = matched_cust.no_hp or clean_phone

            # Cegah spam pembuatan tiket ganda jika masih ada tiket RESET_PASSWORD yang MENUNGGU
            existing_open = target_db.query(TiketKendala).filter(
                TiketKendala.id_pelanggan == cust_id,
                TiketKendala.kategori == "RESET_PASSWORD",
                TiketKendala.status == "MENUNGGU"
            ).first()

            if not existing_open:
                random_password = f"{secrets.randbelow(900000) + 100000}"
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

                from app.portal.services.customer_activity_service import CustomerActivityService
                CustomerActivityService.record(
                    db=target_db,
                    id_pelanggan=cust_id,
                    aksi="RESET_PASSWORD",
                    kategori="AUTH",
                    keterangan=f"Permintaan reset kata sandi mandiri diajukan ke Tiket #{id_tiket_created} (menunggu konfirmasi Admin NOC)",
                    request=request
                )
        finally:
            if target_db != db:
                target_db.close()

    return {
        "ok": True,
        "message": "Jika Nomor WhatsApp terdaftar di sistem, permintaan reset kata sandi telah diteruskan ke Admin NOC TeknoIndonet."
    }


@router.post("/register-fcm")
async def register_portal_fcm_token(
    request: Request,
    db: Session = Depends(get_portal_db)
):
    """
    Mendaftarkan atau memperbarui token FCM perangkat Android
    ke data pelanggan yang sedang login di Portal MyTekno.
    Wajib menyertakan cookie sesi pelanggan yang sah (anti-IDOR).
    """
    customer_session = get_current_customer_optional(request)
    if not customer_session or not customer_session.get("id_pelanggan"):
        return JSONResponse(status_code=401, content={"ok": False, "message": "Sesi login pelanggan tidak valid atau telah berakhir."})

    body = await request.json()
    token = (body.get("fcm_token") or "").strip()
    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Token FCM tidak boleh kosong."})

    cust_id = customer_session.get("id_pelanggan")
    hint_kantor = (customer_session.get("kantor") or "").strip()

    try:
        saved, cust_name, cust_kantor = PortalCustomerService.reassign_fcm_token(
            cust_id=cust_id,
            token=token,
            db=db,
            hint_kantor=hint_kantor
        )
        if saved:
            logger.info(f"FCM: Token pelanggan {cust_id} ({cust_name}) berhasil didaftarkan di kantor {cust_kantor}.")
            return {"ok": True, "message": "Token FCM pelanggan berhasil didaftarkan."}
    except Exception as e:
        logger.error(f"FCM: Gagal mendaftarkan token pelanggan {cust_id}: {e}")
        return JSONResponse(status_code=500, content={"ok": False, "message": "Gagal menyimpan token ke database."})

    return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan."})

