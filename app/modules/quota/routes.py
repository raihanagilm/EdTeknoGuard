"""
app/modules/quota/routes.py - Quota Routes for NOC Admin
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_login, get_active_kantor
from app.core.timezone import get_now_wib
from app.modules.quota.service import QuotaService

router = APIRouter(tags=["quota"])


@router.get("/api/kuota")
@router.get("/admin/api/kuota")
def get_quota_json(request: Request, db: Session = Depends(get_db)):
    user = require_login(request)
    kantor = get_active_kantor(request, user)
    
    quota_items = QuotaService.get_quota_overview(db, kantor=kantor)
    serialized = []
    paket_set = set()
    total_gb = 0.0
    for item in quota_items:
        p = item["pelanggan"]
        gb = item["terpakai_gb"]
        total_gb += gb
        paket_name = item["paket"] or "-"
        if paket_name and paket_name != "-":
            paket_set.add(paket_name)
        ip_val = p.ip_router or p.ip_ont or (p.perangkat.ip_ont if p.perangkat else None)
        serialized.append({
            "id_pelanggan": p.id_pelanggan,
            "nama": p.nama,
            "alamat": p.alamat or "-",
            "ip_router": ip_val or "-",
            "ip_ont": p.ip_ont or "-",
            "ip": ip_val or "-",
            "paket": paket_name,
            "periode": item["periode"],
            "terpakai_gb": gb,
            "kuota_terpakai_gb": gb,
            "kantor": p.kantor or "cabang"
        })
        
    avg_gb = round(total_gb / len(serialized), 2) if serialized else 0.0
    now = get_now_wib()
    current_period = now.strftime("%Y-%m")
    
    return {
        "status": "success",
        "total_pelanggan": len(serialized),
        "total_kuota_gb": round(total_gb, 2),
        "rata_rata_gb": avg_gb,
        "quota": serialized,
        "data": serialized,
        "paket_options": sorted(list(paket_set)),
        "current_period": current_period,
        "active_kantor": kantor
    }
