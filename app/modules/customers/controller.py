from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Request, Response
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.modules.customers.service import CustomerService
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate
from app.core.config import settings

templates = Jinja2Templates(directory="templates")

class CustomerController:

    @staticmethod
    def render_customers_page(request: Request, db: Session):
        """Render antarmuka manajemen pelanggan (templates/customers/index.html)"""
        pops = CustomerService.get_pop_list(db)
        stats = CustomerService.get_customer_stats(db)
        return templates.TemplateResponse(
            request=request,
            name="customers/index.html",
            context={
                "app_name": settings.APP_NAME,
                "pops": pops,
                "stats": stats,
                "warning_threshold": settings.WARNING_THRESHOLD_DBM,
                "request": request
            }
        )

    @staticmethod
    def list_customers(
        db: Session,
        q: Optional[str] = None,
        pop: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = "id",
        sort_dir: str = "asc",
        page: int = 1,
        limit: int = 25
    ) -> Dict[str, Any]:
        total, data = CustomerService.get_customers(
            db=db, q=q, pop=pop, status=status, sort_by=sort_by, sort_dir=sort_dir, page=page, limit=limit
        )
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data
        }

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Dict[str, Any]:
        result = CustomerService.get_customer_detail(db=db, id_pelanggan=id_pelanggan)
        if not result:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")

        cust, logs = result
        return {
            "customer": {
                "id_pelanggan": cust.id_pelanggan,
                "nama": cust.nama,
                "alamat": cust.alamat,
                "no_hp": cust.no_hp,
                "pop": cust.pop,
                "ip_router": cust.ip_router,
                "paket": cust.paket,
                "jenis_modem": cust.jenis_modem,
                "mac_address": cust.mac_address,
                "redaman_baseline": float(cust.redaman_baseline) if cust.redaman_baseline else None,
                "nama_wifi": cust.nama_wifi,
                "user_admin": cust.user_admin,
                "snmp_community": cust.snmp_community
            },
            "recent_logs": [
                {
                    "waktu_cek": l.waktu_cek.strftime("%Y-%m-%d %H:%M:%S"),
                    "rx_power": float(l.rx_power) if l.rx_power is not None else None,
                    "suhu_ont": float(l.suhu_ont) if l.suhu_ont is not None else None,
                    "uptime": l.uptime,
                    "status_koneksi": l.status_koneksi,
                    "latency_ms": l.latency_ms
                } for l in logs
            ]
        }

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate) -> Dict[str, Any]:
        try:
            new_cust = CustomerService.create_customer(db=db, data=data)
            return {
                "status": "success",
                "message": f"Pelanggan '{new_cust.nama}' berhasil ditambahkan",
                "id_pelanggan": new_cust.id_pelanggan
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menambahkan pelanggan: {e}")

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate) -> Dict[str, Any]:
        cust = CustomerService.update_customer(db=db, id_pelanggan=id_pelanggan, data=data)
        if not cust:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
        return {
            "status": "success",
            "message": f"Data pelanggan '{cust.nama}' berhasil diperbarui",
            "id_pelanggan": cust.id_pelanggan
        }

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str) -> Dict[str, Any]:
        success = CustomerService.delete_customer(db=db, id_pelanggan=id_pelanggan)
        if not success:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
        return {
            "status": "success",
            "message": f"Pelanggan dengan ID '{id_pelanggan}' berhasil dihapus."
        }

    @staticmethod
    def bulk_delete(db: Session, ids: List[str]) -> Dict[str, Any]:
        affected = CustomerService.bulk_delete_customers(db=db, id_list=ids)
        return {
            "status": "success",
            "message": f"{affected} pelanggan berhasil dihapus.",
            "deleted_count": affected
        }

    @staticmethod
    def import_csv(db: Session, file_content: bytes) -> Dict[str, Any]:
        try:
            res = CustomerService.import_customers_from_csv(db=db, file_content=file_content)
            return {
                "status": "success",
                "message": f"Berhasil memproses {res['total_processed']} baris ({res['imported']} baru, {res['updated']} diperbarui, {res['failed']} gagal).",
                "result": res
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal memproses import CSV: {e}")

    @staticmethod
    def download_template() -> Response:
        content = CustomerService.generate_csv_template()
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=template_pelanggan_edteknoguard.csv"}
        )

    @staticmethod
    def export_excel(db: Session) -> Response:
        excel_bytes = CustomerService.generate_excel_export(db=db)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=data_pelanggan_edteknoguard.xlsx"}
        )

