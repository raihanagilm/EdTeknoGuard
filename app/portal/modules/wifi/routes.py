from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional, check_is_home_wifi
from app.portal.services.customer_service import PortalCustomerService

router = APIRouter(prefix="/wifi", tags=["Portal WiFi"])


@router.get("")
@router.get("/")
def portal_wifi_get(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    pelanggan, _ = PortalCustomerService.get_customer_by_id(cust.get("id_pelanggan"), db=db, hint_kantor=cust.get("kantor"))
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    is_home_wifi = check_is_home_wifi(request, pelanggan)

    # Sinkronisasi on-demand SSID dari modem jika di DB masih kosong / default
    if not pelanggan.nama_wifi and ip_target:
        try:
            from app.services.ont_scraper_service import ONTScraperService
            u_ont = pelanggan.user_admin or "admin"
            p_ont = pelanggan.pass_admin or "admin"
            dev_data = ONTScraperService.extract_device_and_wifi_data(None, f"http://{ip_target}", ip_target)
            if dev_data.get("nama_wifi"):
                pelanggan.nama_wifi = dev_data["nama_wifi"]
                if hasattr(pelanggan, "perangkat") and pelanggan.perangkat:
                    pelanggan.perangkat.nama_wifi = dev_data["nama_wifi"]
                db.commit()
                db.refresh(pelanggan)
        except Exception:
            pass

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


@router.post("/ganti")
async def portal_wifi_change(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    body = await request.json()
    nama_wifi = body.get("nama_wifi", "").strip()
    password_wifi = body.get("password_wifi", "").strip()
    konfirmasi = body.get("konfirmasi_password", "").strip()
    is_local_client_probe = body.get("is_local_client_probe", False)
    
    if len(nama_wifi) < 3:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Nama WiFi (SSID) minimal 3 karakter!"})
        
    if len(password_wifi) < 8:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Kata sandi WiFi minimal 8 karakter!"})
        
    if password_wifi != konfirmasi:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Konfirmasi kata sandi tidak cocok!"})
        
    pelanggan, _ = PortalCustomerService.get_customer_by_id(cust.get("id_pelanggan"), db=db, hint_kantor=cust.get("kantor"))
    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})
        
    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    
    is_home_wifi = check_is_home_wifi(request, pelanggan) or is_local_client_probe
            
    if not is_home_wifi:
        return JSONResponse(
            status_code=403,
            content={
                "ok": False,
                "is_connected_to_home_wifi": False,
                "message": "Gagal: Anda tidak terhubung ke WiFi rumah ini! Sambungkan HP/laptop Anda ke sinyal WiFi rumah terlebih dahulu untuk mengubah pengaturan."
            }
        )
        
    from app.services.ont_scraper_service import ONTScraperService
    
    target_modem_ips = []
    if ip_target:
        target_modem_ips.append(ip_target)
    if "192.168.1.1" not in target_modem_ips:
        target_modem_ips.append("192.168.1.1")

    user_ont = pelanggan.user_admin or "admin"
    pass_ont = pelanggan.pass_admin or "admin"
    
    modem_updated = False
    modem_error_msg = ""

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


@router.get("/perangkat-terhubung")
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


@router.post("/perangkat-terhubung/scan")
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


@router.post("/perangkat-terhubung/toggle-block")
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
