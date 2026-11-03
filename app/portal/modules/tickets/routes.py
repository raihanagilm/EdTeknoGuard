from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional
from app.portal.modules.tickets.service import KendalaService

router = APIRouter(prefix="/kendala", tags=["Portal Tickets"])


@router.get("")
@router.get("/")
def portal_kendala_list(request: Request, db: Session = Depends(get_portal_db)):
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
                "created_at": str(t.created_at) if t.created_at else "",
                "updated_at": str(t.updated_at) if getattr(t, "updated_at", None) else str(t.created_at or "")
            }
            for t in tickets
        ]
    }


@router.post("/buat")
async def portal_kendala_create(request: Request, db: Session = Depends(get_portal_db)):
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


@router.delete("/{ticket_id}")
async def portal_kendala_delete(ticket_id: str, request: Request, db: Session = Depends(get_portal_db)):
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
