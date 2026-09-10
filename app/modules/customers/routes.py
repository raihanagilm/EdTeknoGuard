from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.modules.customers.controller import CustomerController
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate, BulkDeleteSchema

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
    sort_by: Optional[str] = Query("id", description="Kolom urutan: id, nama, pop, ip_router, jenis_modem, redaman_baseline, status_kredensial"),
    sort_dir: str = Query("asc", description="Arah urutan: asc atau desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=5, le=200),
    db: Session = Depends(get_db)
):
    """Route untuk mendapatkan daftar pelanggan dengan filter, sorting, dan pagination"""
    return CustomerController.list_customers(
        db=db, q=q, pop=pop, status=status, sort_by=sort_by, sort_dir=sort_dir, page=page, limit=limit
    )

@router.get("/api/customers/template-csv")
def download_customers_template_csv(
    user: dict = Depends(require_admin)
):
    """Unduh format contoh berkas CSV data pelanggan"""
    return CustomerController.download_template()

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
    """Hapus pelanggan (Soft Delete)"""
    return CustomerController.delete_customer(db=db, id_pelanggan=id_pelanggan)

@router.post("/api/customers/bulk-delete")
def bulk_delete_customers(
    payload: BulkDeleteSchema,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Hapus massal pelanggan (Bulk Soft Delete)"""
    return CustomerController.bulk_delete(db=db, ids=payload.ids)

@router.post("/api/customers/import-csv")
async def import_customers_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Import data pelanggan via upload berkas CSV"""
    content = await file.read()
    return CustomerController.import_csv(db=db, file_content=content)

