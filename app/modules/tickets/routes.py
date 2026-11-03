"""
app/modules/tickets/routes.py - Ticket Routes for NOC Admin
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_login, get_active_kantor
from app.modules.tickets.service import TicketService
from app.modules.activity_logs.service import ActivityLogService

router = APIRouter(tags=["tickets"])


@router.get("/api/tiket")
@router.get("/admin/api/tiket")
def get_tickets_json(request: Request, status: str = "SEMUA", db: Session = Depends(get_db)):
    user = require_login(request)
    kantor = get_active_kantor(request, user)
    
    ticket_items = TicketService.get_tickets(
        db,
        status_filter=status if status != "SEMUA" else None,
        kantor=kantor
    )
    
    serialized_tickets = []
    for item in ticket_items:
        t = item["tiket"]
        p = item["pelanggan"]
        serialized_tickets.append({
            "id_tiket": t.id_tiket,
            "created_at_str": t.created_at.strftime('%d/%m/%Y %H:%M') if t.created_at else '-',
            "created_at_iso": t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else '',
            "created_at_date": t.created_at.strftime('%Y-%m-%d') if t.created_at else '',
            "id_pelanggan": t.id_pelanggan or '',
            "nama_pelanggan": p.nama if p else (t.id_pelanggan or 'Tidak Terdaftar'),
            "alamat_pelanggan": p.alamat if (p and p.alamat) else '-',
            "no_wa": t.no_wa_pelapor or (p.no_hp if p else '') or '',
            "kategori": t.kategori or 'Lainnya',
            "deskripsi": t.deskripsi or '',
            "redaman_saat_lapor": float(t.redaman_saat_lapor) if t.redaman_saat_lapor is not None else None,
            "status_ont_saat_lapor": t.status_ont_saat_lapor or 'STATUS',
            "status": t.status or 'MENUNGGU',
            "catatan_teknisi": t.catatan_teknisi or '',
            "kantor": t.kantor or 'cabang'
        })
        
    return {
        "status": "success",
        "total": len(serialized_tickets),
        "tickets": serialized_tickets
    }


@router.post("/api/tiket/update-status")
@router.post("/admin/api/tiket/update-status")
def update_ticket_status(
    request: Request,
    id_tiket: str = Form(...),
    status: str = Form(...),
    catatan: str = Form(""),
    db: Session = Depends(get_db)
):
    user = require_login(request)
    res = TicketService.update_ticket_status(
        db=db,
        ticket_id=id_tiket,
        new_status=status,
        catatan=catatan
    )
    if res.get("status") == "success":
        ActivityLogService.log_from_request(
            db=db,
            request=request,
            action="UPDATE_TICKET_STATUS",
            status="SUCCESS",
            keterangan=f"Status tiket #{id_tiket} diubah ke {status}. Catatan: {catatan}",
            user=user
        )
    return res


@router.post("/api/tiket/{ticket_id}/status")
@router.post("/admin/api/tiket/{ticket_id}/status")
async def update_ticket_status_json(
    ticket_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_login(request)
    body = await request.json()
    new_status = body.get("status")
    catatan = body.get("catatan")
    
    if not new_status:
        return {"status": "error", "message": "Parameter status wajib disertakan."}
        
    res = TicketService.update_ticket_status(
        db=db,
        ticket_id=ticket_id,
        new_status=new_status,
        catatan=catatan
    )
    if res.get("status") == "success":
        ActivityLogService.log_from_request(
            db=db,
            request=request,
            action="UPDATE_TICKET_STATUS",
            status="SUCCESS",
            keterangan=f"Status tiket #{ticket_id} diubah ke {new_status}. Catatan: {catatan or '-'}",
            user=user
        )
    return res

