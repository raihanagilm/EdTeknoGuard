from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional
from app.portal.modules.quota.service import KuotaService

router = APIRouter(prefix="/kuota", tags=["Portal Quota"])


@router.get("")
@router.get("/")
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
