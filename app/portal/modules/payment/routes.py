"""
Rute REST tagihan & pembayaran Portal Pelanggan TeknoCust.

Seluruh pembacaan ke Network Bill lewat server (bukan dari browser warga):
token billing tidak boleh menyentuh frontend, dan batas 120 request per menit
berlaku untuk seluruh portal sehingga perlu satu pintu.
"""
from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.portal.core.security import get_current_customer_optional
from app.portal.services.customer_service import PortalCustomerService
from app.portal.modules.payment.service import PaymentService

router = APIRouter(prefix="/pembayaran", tags=["Portal Pembayaran"])


def _get_pelanggan(request: Request, db: Session):
    cust = get_current_customer_optional(request)
    if not cust:
        return None, None
    pel, _ = PortalCustomerService.get_customer_by_id(
        cust.get("id_pelanggan"), db=db, hint_kantor=cust.get("kantor")
    )
    return cust, pel


def _rate_limited(payload: dict) -> JSONResponse:
    """Meneruskan 429 beserta Retry-After agar portal berhenti membaca ulang."""
    headers = {}
    if payload.get("retry_after"):
        headers["Retry-After"] = str(payload["retry_after"])
    return JSONResponse(status_code=429, content=payload, headers=headers)


@router.get("")
@router.get("/")
def portal_tagihan(request: Request, db: Session = Depends(get_portal_db)):
    """Halaman Tagihan: daftar belum lunas, kartu bayar, dan kanal bank."""
    cust, pel = _get_pelanggan(request, db)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})

    data = PaymentService.build_billing_page(pel)
    if data.get("status") == 429:
        return _rate_limited(data)
    return data


@router.get("/riwayat")
def portal_riwayat_pembayaran(
    request: Request,
    limit: int = Query(24, ge=1, le=120),
    db: Session = Depends(get_portal_db),
):
    """Riwayat pembayaran yang sudah lunas, termasuk yang dibayar tunai ke petugas."""
    cust, pel = _get_pelanggan(request, db)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})

    data = PaymentService.build_history(pel, limit=limit)
    if data.get("status") == 429:
        return _rate_limited(data)
    return data


@router.get("/periksa")
def portal_periksa_pembayaran(
    request: Request,
    invoice_id: int = Query(..., description="invoice_id yang tadi ditampilkan di kartu bayar"),
    db: Session = Depends(get_portal_db),
):
    """
    Satu kali pemeriksaan sesudah pelanggan menekan "Saya sudah bayar".
    Frontend yang mengatur jeda 10 detik, batas 2 menit, dan berhenti saat 429.
    """
    cust, pel = _get_pelanggan(request, db)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})

    data = PaymentService.check_after_payment(pel, invoice_id)
    if data.get("status") == 429:
        return _rate_limited(data)
    return data
