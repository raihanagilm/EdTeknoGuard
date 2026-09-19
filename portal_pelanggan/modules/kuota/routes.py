from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from portal_pelanggan.modules.kuota.controller import KuotaController

router = APIRouter(prefix="/kuota", tags=["Kuota & Pemakaian Data"])

@router.get("")
def kuota_page(request: Request, db: Session = Depends(get_db)):
    return KuotaController.render_kuota_page(request, db)
