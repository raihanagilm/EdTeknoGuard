"""
app/modules/billing/routes.py - Routing REST API Pemantauan Pembayaran Admin NOC
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_login
from app.modules.billing.controller import BillingController
from app.modules.billing.schemas import BillingBulkReminderRequest

router = APIRouter(prefix="/api/pembayaran", tags=["billing"])


@router.get("")
def get_billing_overview(
    request: Request,
    kantor: Optional[str] = Query(None, description="Kode kantor target"),
    q: Optional[str] = Query(None, description="Kata kunci pencarian"),
    status: Optional[str] = Query(None, description="Filter status: ALL, LUNAS, BELUM_BAYAR, OVERDUE, ISOLIR"),
    sort_by: Optional[str] = Query(None, description="Kolom pengurutan: nama, no_wa, total_tagihan, status_pembayaran, jatuh_tempo, nomor_va"),
    sort_dir: Optional[str] = Query("asc", description="Arah pengurutan: asc atau desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Mengambil rekapitulasi pembayaran pelanggan per kantor (KPI, tabel, pagination, sorting)."""
    require_login(request)
    return BillingController.get_overview(
        request=request,
        db=db,
        kantor=kantor,
        q=q,
        status=status,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit
    )


@router.post("/sync-single/{id_pelanggan}")
def sync_single_customer_billing(
    id_pelanggan: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Sinkronisasi live tagihan & VA untuk satu pelanggan tertentu dari Network Bill."""
    user = require_login(request)
    return BillingController.sync_single(
        request=request,
        id_pelanggan=id_pelanggan,
        db=db,
        user=user
    )


@router.post("/sync-all")
def sync_all_customers_billing(
    request: Request,
    kantor: Optional[str] = Query(None, description="Kode kantor target"),
    db: Session = Depends(get_db)
):
    """Sinkronisasi live seluruh tagihan pelanggan kantor dari Network Bill."""
    user = require_login(request)
    return BillingController.sync_all(
        request=request,
        kantor=kantor,
        db=db,
        user=user
    )


@router.post("/kirim-pengingat")
def send_bulk_billing_reminders(
    payload: BillingBulkReminderRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Mengirim pengingat tagihan massal via Push Notifikasi FCM (MyTekno) & generate tautan WhatsApp."""
    user = require_login(request)
    return BillingController.send_reminders(
        request=request,
        payload=payload,
        db=db,
        user=user
    )
