from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.customers.controller import CustomerController
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate

router = APIRouter(tags=["customers"])

# ----------------- HTML PAGE ROUTE -----------------
@router.get("/pelanggan")
def render_customers_page(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Halaman Manajemen & Daftar Pelanggan (Protected NOC Admin)"""
    return CustomerController.render_customers_page(request=request, db=db)


# ----------------- REST API ROUTES -----------------
@router.get("/api/customers")
def list_customers(
    q: Optional[str] = Query(None, description="Pencarian nama, IP, MAC, atau ID"),
    pop: Optional[str] = Query(None, description="Filter POP"),
    status: Optional[str] = Query(None, description="Filter status NORMAL, WARNING, CRITICAL, LOS"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=5, le=200),
    db: Session = Depends(get_db)
):
    """Route untuk mendapatkan daftar pelanggan dengan filter dan pagination"""
    return CustomerController.list_customers(
        db=db, q=q, pop=pop, status=status, page=page, limit=limit
    )

@router.get("/api/customers/{id_pelanggan}")
def get_customer_detail(
    id_pelanggan: str,
    db: Session = Depends(get_db)
):
    """Route untuk mendapatkan data detail pelanggan beserta riwayat log ONT"""
    return CustomerController.get_customer_detail(
        db=db, id_pelanggan=id_pelanggan
    )

@router.post("/api/customers")
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Tambah data pelanggan baru"""
    return CustomerController.create_customer(db=db, data=data)

@router.put("/api/customers/{id_pelanggan}")
def update_customer(
    id_pelanggan: str,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Update data informasi pelanggan"""
    return CustomerController.update_customer(db=db, id_pelanggan=id_pelanggan, data=data)

@router.delete("/api/customers/{id_pelanggan}")
def delete_customer(
    id_pelanggan: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Nonaktifkan pelanggan (Soft Delete)"""
    return CustomerController.delete_customer(db=db, id_pelanggan=id_pelanggan)
