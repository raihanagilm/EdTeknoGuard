from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.admin_customer_mgmt.controller import AdminCustomerMgmtController

router = APIRouter(prefix="/admin", tags=["admin_customer_mgmt"])

@router.get("/verifikasi-pelanggan")
def render_verification_page(request: Request, db: Session = Depends(get_db)):
    return AdminCustomerMgmtController.render_verification_page(request=request, db=db)

@router.post("/api/verifikasi-pelanggan/approve")
def approve_registration(
    request: Request,
    account_id: int = Form(...),
    id_pelanggan: str = Form(...),
    db: Session = Depends(get_db)
):
    return AdminCustomerMgmtController.approve_registration(
        request=request,
        db=db,
        account_id=account_id,
        id_pelanggan=id_pelanggan
    )

@router.post("/api/verifikasi-pelanggan/reject")
def reject_registration(
    request: Request,
    account_id: int = Form(...),
    alasan: str = Form(""),
    db: Session = Depends(get_db)
):
    return AdminCustomerMgmtController.reject_registration(
        request=request,
        db=db,
        account_id=account_id,
        alasan=alasan
    )

@router.get("/tiket")
def render_tickets_page(request: Request, status: str = "SEMUA", db: Session = Depends(get_db)):
    return AdminCustomerMgmtController.render_tickets_page(request=request, db=db, status_filter=status)

@router.post("/api/tiket/update-status")
def update_ticket_status(
    request: Request,
    ticket_id: str = Form(...),
    new_status: str = Form(...),
    catatan: str = Form(""),
    db: Session = Depends(get_db)
):
    return AdminCustomerMgmtController.update_ticket_status(
        request=request,
        db=db,
        ticket_id=ticket_id,
        new_status=new_status,
        catatan=catatan
    )

@router.post("/api/tiket/{ticket_id}/status")
async def update_ticket_status_json(
    request: Request,
    ticket_id: str,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        new_status = data.get("new_status")
        catatan = data.get("catatan", "")
    except Exception:
        new_status = None
        catatan = ""

    if not new_status:
        return {"status": "error", "message": "Status baru wajib dipilih."}

    return AdminCustomerMgmtController.update_ticket_status(
        request=request,
        db=db,
        ticket_id=ticket_id,
        new_status=new_status,
        catatan=catatan
    )

@router.get("/kuota")
def render_quota_page(request: Request, db: Session = Depends(get_db)):
    return AdminCustomerMgmtController.render_quota_page(request=request, db=db)

@router.get("/api/notifications/poll")
def poll_realtime_notifications(request: Request, db: Session = Depends(get_db)):
    from app.core.security import get_current_user_optional, get_active_kantor
    from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
    user = get_current_user_optional(request)
    kantor = get_active_kantor(request, user) if user else "all"
    return AdminCustomerMgmtService.get_realtime_notifications(db=db, kantor=kantor)
