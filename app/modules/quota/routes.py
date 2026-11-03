"""
app/modules/quota/routes.py - Quota Routes for NOC Admin
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_login, get_active_kantor
from app.modules.quota.service import QuotaService

router = APIRouter(tags=["quota"])


@router.get("/api/kuota")
@router.get("/admin/api/kuota")
def get_quota_json(request: Request, db: Session = Depends(get_db)):
    user = require_login(request)
    kantor = get_active_kantor(request, user)
    
    quota_items = QuotaService.get_quota_overview(db, kantor=kantor)
    serialized = []
    total_gb = 0.0
    for item in quota_items:
        p = item["pelanggan"]
        gb = item["terpakai_gb"]
        total_gb += gb
        serialized.append({
            "id_pelanggan": p.id_pelanggan,
            "nama": p.nama,
            "ip_router": p.ip_router or "-",
            "paket": item["paket"],
            "periode": item["periode"],
            "kuota_terpakai_gb": gb,
            "kantor": p.kantor or "cabang"
        })
        
    avg_gb = round(total_gb / len(serialized), 2) if serialized else 0.0
    return {
        "status": "success",
        "total_pelanggan": len(serialized),
        "total_kuota_gb": round(total_gb, 2),
        "rata_rata_gb": avg_gb,
        "data": serialized
    }

