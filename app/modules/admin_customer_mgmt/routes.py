from fastapi import APIRouter, Depends, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.admin_customer_mgmt.controller import AdminCustomerMgmtController
from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService

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

@router.get("/api/tiket")
def get_tickets_json(request: Request, status: str = "SEMUA", db: Session = Depends(get_db)):
    from app.core.security import require_login, get_active_kantor
    from app.core.timezone import get_now_wib
    user = require_login(request)
    kantor = get_active_kantor(request, user)
    
    ticket_items = AdminCustomerMgmtService.get_tickets(
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
        "tickets": serialized_tickets,
        "active_kantor": kantor,
        "today_date": get_now_wib().strftime("%Y-%m-%d")
    }

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

@router.get("/api/kuota")
def get_quota_json(request: Request, db: Session = Depends(get_db)):
    from app.core.security import require_login, get_active_kantor
    from app.core.timezone import get_now_wib
    user = require_login(request)
    kantor = get_active_kantor(request, user)
    quota_items = AdminCustomerMgmtService.get_quota_overview(db, kantor=kantor)

    serialized_quota = []
    paket_list = []
    for item in quota_items:
        p = item["pelanggan"]
        paket_name = item["paket"] or "20 Mbps Unlimited"
        if paket_name not in paket_list:
            paket_list.append(paket_name)
        serialized_quota.append({
            "id_pelanggan": p.id_pelanggan,
            "nama": p.nama,
            "alamat": p.alamat or '-',
            "paket": paket_name,
            "terpakai_gb": float(item["terpakai_gb"]) if item["terpakai_gb"] is not None else 0.0,
            "periode": item["periode"],
            "kantor": p.kantor or "cabang",
            "ip_router": p.ip_router or "-"
        })

    return {
        "status": "success",
        "quota": serialized_quota,
        "paket_options": sorted(paket_list),
        "active_kantor": kantor,
        "current_period": get_now_wib().strftime("%Y-%m")
    }

@router.get("/api/notifications/poll")
def poll_realtime_notifications(request: Request, db: Session = Depends(get_db)):
    from app.core.security import get_current_user_optional, get_active_kantor
    from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
    user = get_current_user_optional(request)
    kantor = get_active_kantor(request, user) if user else "all"
    return AdminCustomerMgmtService.get_realtime_notifications(db=db, kantor=kantor, user=user)

@router.post("/api/monitoring/snooze-pause-reminder")
def snooze_pause_reminder(request: Request, db: Session = Depends(get_db)):
    from app.core.security import get_current_user_optional
    from app.services.scheduler_service import ont_scheduler
    from fastapi import HTTPException
    user = get_current_user_optional(request)
    if not user or user.get("role") != "super admin":
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    ont_scheduler.snooze_paused_reminder(db)
    return {"status": "success", "message": "Pengingat jeda ditunda 1 jam."}
