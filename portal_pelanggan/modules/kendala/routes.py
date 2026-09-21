from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.kendala.controller import KendalaController

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
