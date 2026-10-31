from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_portal_db
from app.portal.modules.quota.controller import KuotaController

router = APIRouter(prefix="/kuota", tags=["Kuota & Pemakaian Data"])

@router.get("")
def kuota_page(request: Request, db: Session = Depends(get_portal_db)):
    return KuotaController.render_kuota_page(request, db)
