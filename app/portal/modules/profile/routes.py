import base64
import math
import re
import time
from pathlib import Path
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional, get_password_hash, check_is_home_wifi
from app.portal.services.customer_service import PortalCustomerService

router = APIRouter(prefix="/profil", tags=["Portal Profile"])


@router.post("/ganti-password")
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
    pelanggan.password_portal = password_baru
    target_db.commit()

    from app.portal.services.customer_activity_service import CustomerActivityService
    CustomerActivityService.record(
        db=target_db,
        id_pelanggan=id_pel,
        aksi="GANTI_PASSWORD",
        kategori="AUTH",
        keterangan="Pelanggan berhasil mengganti kata sandi login portal MyTekno mandiri",
        request=request
    )

    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Kata sandi akun portal Anda berhasil diubah!"
    }


@router.post("/update")
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
        
    old_nama = (pelanggan.nama or "").strip()
    old_no_hp = (pelanggan.no_hp or "").strip()
    old_alamat = (pelanggan.alamat or "").strip()

    changed_fields = []
    if nama and nama != old_nama:
        changed_fields.append(("nama", old_nama, nama))
        pelanggan.nama = nama
    if no_hp and no_hp != old_no_hp:
        changed_fields.append(("no_hp", old_no_hp, no_hp))
        pelanggan.no_hp = no_hp
    if alamat and alamat != old_alamat:
        changed_fields.append(("alamat", old_alamat, alamat))
        pelanggan.alamat = alamat

    target_db.commit()
    target_db.refresh(pelanggan)

    # Resolusi aksi audit spesifik (UBAH_ALAMAT, UBAH_NO_WA, UBAH_NAMA, atau UPDATE_PROFIL)
    aksi = "UPDATE_PROFIL"
    if len(changed_fields) == 1:
        field, old_v, new_v = changed_fields[0]
        if field == "alamat":
            aksi = "UBAH_ALAMAT"
            keterangan = f"Pelanggan mengubah alamat: '{old_v or '-'}' -> '{new_v}'"
        elif field == "no_hp":
            aksi = "UBAH_NO_WA"
            keterangan = f"Pelanggan mengubah nomor WhatsApp: '{old_v or '-'}' -> '{new_v}'"
        elif field == "nama":
            aksi = "UBAH_NAMA"
            keterangan = f"Pelanggan mengubah nama profil: '{old_v or '-'}' -> '{new_v}'"
        else:
            keterangan = f"Pelanggan memperbarui {field}: '{new_v}'"
    elif len(changed_fields) > 1:
        details = []
        for field, old_v, new_v in changed_fields:
            lbl = "Nama" if field == "nama" else ("No WA" if field == "no_hp" else "Alamat")
            details.append(f"{lbl}: '{new_v}'")
        keterangan = f"Pelanggan memperbarui profil ({', '.join(details)})"
    else:
        keterangan = "Pelanggan menyimpan profil tanpa perubahan data"

    from app.portal.services.customer_activity_service import CustomerActivityService
    CustomerActivityService.record(
        db=target_db,
        id_pelanggan=id_pel,
        aksi=aksi,
        kategori="PROFIL",
        keterangan=keterangan,
        request=request
    )

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


@router.post("/foto")
async def portal_profil_upload_foto(request: Request, db: Session = Depends(get_portal_db)):
    """
    Upload & Simpan Foto Profil Pelanggan yang telah dicompress ke format WebP di client.
    Mendukung payload JSON { "image_base64": "data:image/webp;base64,..." }
    File disimpan di static/uploads/profil/{id_pelanggan}.webp dan path-nya dicatat ke tabel pelanggan.
    """
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
        
    if "," in image_data:
        header, base64_str = image_data.split(",", 1)
    else:
        base64_str = image_data
        
    try:
        binary_data = base64.b64decode(base64_str)
    except Exception:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format gambar base64 tidak valid!"})
        
    if len(binary_data) > 1024 * 1024:
        return JSONResponse(status_code=400, content={"ok": False, "message": "Ukuran foto terlalu besar (maksimal 1 MB)!"})

    # Validasi magic bytes gambar (WebP, PNG, JPEG) agar file non-gambar ditolak
    is_webp = len(binary_data) >= 12 and binary_data[:4] == b"RIFF" and binary_data[8:12] == b"WEBP"
    is_png = binary_data.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = binary_data.startswith(b"\xff\xd8\xff")
    if not (is_webp or is_png or is_jpeg):
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format file foto tidak valid. Gunakan gambar WebP, PNG, atau JPEG."})
        
    upload_dir = Path("static/uploads/profil")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    safe_filename = re.sub(r"[^a-zA-Z0-9_\-]", "_", id_pel) + ".webp"
    file_path = upload_dir / safe_filename
    
    with open(file_path, "wb") as f:
        f.write(binary_data)
        
    timestamp = int(time.time())
    relative_url = f"/static/uploads/profil/{safe_filename}?v={timestamp}"
    
    pelanggan.foto_profil = relative_url
    target_db.commit()
    target_db.refresh(pelanggan)

    from app.portal.services.customer_activity_service import CustomerActivityService
    CustomerActivityService.record(
        db=target_db,
        id_pelanggan=id_pel,
        aksi="UBAH_FOTO_PROFIL",
        kategori="PROFIL",
        keterangan="Pelanggan memperbarui foto profil",
        request=request
    )

    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil diperbarui!",
        "foto_profil": relative_url
    }


@router.delete("/foto")
def portal_profil_delete_foto(request: Request, db: Session = Depends(get_portal_db)):
    """
    Hapus Foto Profil Pelanggan dan kembalikan ke avatar inisial nama default.
    """
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

    from app.portal.services.customer_activity_service import CustomerActivityService
    CustomerActivityService.record(
        db=target_db,
        id_pelanggan=id_pel,
        aksi="UBAH_FOTO_PROFIL",
        kategori="PROFIL",
        keterangan="Pelanggan menghapus foto profil dan kembali ke inisial nama",
        request=request
    )

    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil dihapus dan kembali ke inisial nama."
    }


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Menghitung jarak permukaan bumi (geodesi) dalam meter antara dua koordinat GPS
    menggunakan formula Haversine (Great-Circle Distance).
    """
    R = 6371000.0  # Radius rata-rata bumi dalam meter
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


@router.post("/lokasi-gps")
async def portal_profil_lock_gps_location(request: Request, db: Session = Depends(get_portal_db)):
    """
    Mengunci titik koordinat GPS lokasi rumah pelanggan (Latitude & Longitude)
    dengan syarat mutlak:
    1. Perangkat WAJIB terhubung ke sinyal WiFi modem rumah pelanggan.
    2. Akurasi sensor GPS satelit wajib memadai (accuracy <= 100 meter). Mencegah loncat ke BTS/data center.
    3. Pengecekan toleransi jarak Haversine (radius 100m) jika lokasi sudah pernah terkunci sebelumnya.
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False, "message": "Belum login"})

    id_pel = cust.get("id_pelanggan")
    pelanggan, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pelanggan:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Data pelanggan tidak ditemukan!"})

    # Lapisan 1: Perangkat klien wajib terhubung ke sinyal WiFi rumah pelanggan
    is_home_wifi = check_is_home_wifi(request, pelanggan)
    if not is_home_wifi:
        if target_db != db:
            target_db.close()
        return JSONResponse(
            status_code=403,
            content={
                "ok": False,
                "is_connected_to_home_wifi": False,
                "message": "Gagal: Penguncian titik lokasi GPS hanya dapat dilakukan saat perangkat terhubung langsung ke sinyal WiFi modem rumah Anda!"
            }
        )

    body = await request.json()
    raw_lat = body.get("latitude")
    raw_lng = body.get("longitude")
    accuracy = body.get("accuracy")

    # Lapisan 2: Filter Akurasi Satelit (Pencegah Lonjakan Jauh Akibat GPS Nonaktif)
    if accuracy is not None:
        try:
            acc_val = float(accuracy)
            if acc_val > 100.0:
                if target_db != db:
                    target_db.close()
                return JSONResponse(
                    status_code=422,
                    content={
                        "ok": False,
                        "accuracy_too_low": True,
                        "accuracy": acc_val,
                        "message": f"Akurasi lokasi tidak memadai (±{round(acc_val)}m). Mohon aktifkan sensor GPS / Lokasi Presisi Tinggi di smartphone Anda."
                    }
                )
        except (ValueError, TypeError):
            pass

    try:
        lat = float(raw_lat)
        lng = float(raw_lng)
    except (ValueError, TypeError):
        if target_db != db:
            target_db.close()
        return JSONResponse(status_code=400, content={"ok": False, "message": "Format koordinat latitude / longitude tidak valid!"})

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        if target_db != db:
            target_db.close()
        return JSONResponse(status_code=400, content={"ok": False, "message": "Rentang nilai koordinat GPS di luar batas bumi!"})

    # Lapisan 3: Toleransi Jarak Haversine (100 Meter) Jika Sudah Pernah Terkunci
    if pelanggan.lokasi_gps and pelanggan.lokasi_gps.strip():
        existing_loc = pelanggan.lokasi_gps.strip()
        try:
            parts = [p.strip() for p in existing_loc.split(",")]
            base_lat = float(parts[0])
            base_lng = float(parts[1])
            dist = haversine_distance_meters(base_lat, base_lng, lat, lng)
        except Exception:
            dist = 0.0

        from app.portal.services.customer_activity_service import CustomerActivityService

        # Jika pergeseran melebihi batas toleransi 100 meter -> Tolak & catat log anomali
        if dist > 100.0:
            CustomerActivityService.record(
                db=target_db,
                id_pelanggan=id_pel,
                aksi="ANOMALI_DRIFT_LOKASI",
                kategori="PROFIL",
                keterangan=f"Pembaruan lokasi ditolak karena terdeteksi menyimpang {round(dist)} meter dari titik awal ({existing_loc})",
                request=request
            )
            if target_db != db:
                target_db.close()
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "drift_detected": True,
                    "distance_meters": round(dist),
                    "message": f"Lokasi ditolak: Terdeteksi menyimpang {round(dist)} meter dari titik awal pemasangan modem (toleransi: 100m)."
                }
            )

        # Jika dalam batas toleransi <= 100 meter -> Lokasi konsisten dan cocok
        if target_db != db:
            target_db.close()
        return {
            "ok": True,
            "already_locked": True,
            "distance_meters": round(dist),
            "lokasi_gps": existing_loc,
            "message": f"Titik lokasi konsisten dan cocok (terpaut {round(dist)}m, dalam batas toleransi 100m)."
        }

    # Jika lokasi belum pernah terkunci: Kunci sebagai Titik Baseline Awal
    lokasi_str = f"{lat:.6f}, {lng:.6f}"
    pelanggan.lokasi_gps = lokasi_str
    target_db.commit()
    target_db.refresh(pelanggan)

    from app.portal.services.customer_activity_service import CustomerActivityService
    acc_info = f" (Akurasi: ±{round(float(accuracy))}m)" if accuracy else ""
    CustomerActivityService.record(
        db=target_db,
        id_pelanggan=id_pel,
        aksi="KUNCI_LOKASI_GPS",
        kategori="PROFIL",
        keterangan=f"Pelanggan mengunci titik lokasi GPS rumah: '{lokasi_str}' via WiFi ONT{acc_info}",
        request=request
    )

    if target_db != db:
        target_db.close()

    return {
        "ok": True,
        "already_locked": False,
        "lokasi_gps": lokasi_str,
        "message": "Titik lokasi GPS rumah Anda berhasil dikunci secara otomatis!"
    }
