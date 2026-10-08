from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.kendala.controller import KendalaController

from fastapi.responses import JSONResponse
from portal_pelanggan.core.security import get_current_customer_optional
from portal_pelanggan.modules.kendala.service import KendalaService

router = APIRouter(prefix="/kendala", tags=["Lapor Kendala Pelanggan"])

@router.get("")
def list_tickets(request: Request, db: Session = Depends(get_db)):
    return KendalaController.render_tickets_page(request, db)

@router.get("/buat")
def create_ticket_page(request: Request, db: Session = Depends(get_db)):
    return KendalaController.render_create_page(request, db)

@router.post("/buat")
def submit_ticket(
    request: Request,
    kategori: str = Form(...),
    deskripsi: str = Form(...),
    no_wa: str = Form(...),
    db: Session = Depends(get_db)
):
    return KendalaController.submit_ticket(request, db, kategori, deskripsi, no_wa)

@router.post("/{id_tiket}/selesai")
def resolve_ticket(id_tiket: str, request: Request, db: Session = Depends(get_db)):
    return KendalaController.resolve_ticket(request, db, id_tiket)

@router.post("/{id_tiket}/hapus")
def delete_ticket(id_tiket: str, request: Request, db: Session = Depends(get_db)):
    return KendalaController.delete_ticket(request, db, id_tiket)

@router.get("/status-api")
@router.get("/api/ticket-status")
def get_customer_ticket_status(request: Request, db: Session = Depends(get_db)):
    """API endpoint untuk pengecekan status tiket pelanggan aktif"""
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"status": "unauthorized", "message": "Belum login"})
    tickets = KendalaService.get_customer_tickets(db, cust["id_pelanggan"])
    return {
        "status": "success",
        "id_pelanggan": cust["id_pelanggan"],
        "total": len(tickets),
        "tickets": [
            {
                "id_tiket": t.id_tiket,
                "kategori": t.kategori,
                "status": t.status,
                "deskripsi": t.deskripsi,
                "created_at": str(t.created_at) if t.created_at else None
            }
            for t in tickets
        ]
    }
