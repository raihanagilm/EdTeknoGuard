import base64
import re
import time
from pathlib import Path
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional, get_password_hash
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
    target_db.commit()
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
    if target_db != db:
        target_db.close()
    
    return {
        "ok": True,
        "message": "Foto profil berhasil dihapus dan kembali ke inisial nama."
    }
