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
        active_kantor = getattr(request.state, "active_kantor", "cabang")
        allowed_kantor = getattr(request.state, "allowed_kantor", ["cabang"])
        pops = CustomerService.get_pop_list(db, kantor=active_kantor, allowed_kantor=allowed_kantor)
        stats = CustomerService.get_customer_stats(db, kantor=active_kantor, allowed_kantor=allowed_kantor)
        min_date = CustomerService.get_min_date(db)
        return templates.TemplateResponse(
            request=request,
            name="customers/index.html",
            context={
                "app_name": settings.APP_NAME,
                "pops": pops,
                "stats": stats,
                "min_date": min_date,
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
        monitoring: Optional[str] = None,
        range_type: Optional[str] = "all",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sort_by: Optional[str] = "id",
        sort_dir: str = "asc",
        page: int = 1,
        limit: int = 15,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        total, data = CustomerService.get_customers(
            db=db, q=q, pop=pop, status=status, monitoring=monitoring,
            range_type=range_type, start_date=start_date, end_date=end_date,
            sort_by=sort_by, sort_dir=sort_dir, page=page, limit=limit,
            kantor=kantor, allowed_kantor=allowed_kantor
        )
        stats = CustomerService.get_customer_stats(db, kantor=kantor, allowed_kantor=allowed_kantor)
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data,
            "stats": stats
        }

    @staticmethod
    def toggle_customer_monitoring(db: Session, id_pelanggan: str, user: dict, request: Request) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan mengubah status pemantauan")
        
        from app.modules.activity_logs.service import ActivityLogService
        cust = CustomerService.toggle_monitoring(db=db, id_pelanggan=id_pelanggan)
        if not cust:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")

        action = "AKTIFKAN_PEMANTAUAN" if cust.is_monitored else "NONAKTIFKAN_PEMANTAUAN"
        ket = f"Pemantauan pelanggan '{cust.nama}' (IP: {cust.ip_router}) diubah menjadi {'AKTIF (Discan)' if cust.is_monitored else 'NONAKTIF (Tidak Discan/Abaikan)'}"
        
        try:
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action=action,
                status="SUCCESS",
                keterangan=ket,
                user=user
            )
        except Exception:
            pass

        stats = CustomerService.get_customer_stats(db)

        return {
            "status": "success",
            "id_pelanggan": cust.id_pelanggan,
            "nama": cust.nama,
            "is_monitored": cust.is_monitored,
            "stats": stats,
            "message": f"Pemantauan {cust.nama} berhasil {'diaktifkan kembali' if cust.is_monitored else 'dinonaktifkan (tidak discan & tidak kirim notifikasi Telegram)'}"
        }

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Dict[str, Any]:
        result = CustomerService.get_customer_detail(db=db, id_pelanggan=id_pelanggan)
        if not result:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")

        cust, logs = result
        lokasi_gps = cust.lokasi_gps
        alamat_final = cust.alamat or "-"
        no_hp_final = cust.no_hp or "-"

        return {
            "customer": {
                "id_pelanggan": cust.id_pelanggan,
                "nama": cust.nama,
                "alamat": alamat_final,
                "no_hp": no_hp_final,
                "lokasi_gps": lokasi_gps,
                "pop": cust.pop,
                "ip_router": cust.ip_router,
                "paket": cust.paket,
                "jenis_modem": cust.jenis_modem,
                "mac_address": cust.mac_address,
                "redaman_baseline": float(cust.redaman_baseline) if cust.redaman_baseline else None,
                "nama_wifi": cust.nama_wifi or "-",
                "password_wifi": cust.password_wifi or "-",
                "user_admin": cust.user_admin or "-",
                "pass_admin": cust.pass_admin or "-",
                "status_kredensial": getattr(cust, "status_kredensial", "UNTESTED") or "UNTESTED",
                "is_monitored": bool(getattr(cust, "is_monitored", True)),
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
    def create_customer(db: Session, data: CustomerCreate, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan menambahkan pelanggan")
            
        from app.modules.activity_logs.service import ActivityLogService
        try:
            new_cust = CustomerService.create_customer(db=db, data=data)
            if request:
                ActivityLogService.log_from_request(
                    db=db,
                    request=request,
                    action="TAMBAH_PELANGGAN",
                    status="SUCCESS",
                    keterangan=f"Menambahkan pelanggan baru: {new_cust.nama} (ID: {new_cust.id_pelanggan}, IP: {new_cust.ip_router}, POP: {new_cust.pop})",
                    user=user
                )
            return {
                "status": "success",
                "message": f"Pelanggan '{new_cust.nama}' berhasil ditambahkan",
                "id_pelanggan": new_cust.id_pelanggan
            }
        except ValueError as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="TAMBAH_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal tambah pelanggan: {str(e)}", user=user
                )
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="TAMBAH_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal tambah pelanggan: {str(e)}", user=user
                )
            raise HTTPException(status_code=500, detail=f"Gagal menambahkan pelanggan: {e}")

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan mengubah profil pelanggan")

        from app.modules.activity_logs.service import ActivityLogService
        try:
            cust = CustomerService.update_customer(db=db, id_pelanggan=id_pelanggan, data=data)
            if not cust:
                raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
            if request:
                ActivityLogService.log_from_request(
                    db=db,
                    request=request,
                    action="EDIT_PELANGGAN",
                    status="SUCCESS",
                    keterangan=f"Memperbarui data pelanggan: {cust.nama} (ID: {cust.id_pelanggan}, IP: {cust.ip_router}, Paket: {cust.paket})",
                    user=user
                )
            return {
                "status": "success",
                "message": f"Data pelanggan '{cust.nama}' berhasil diperbarui",
                "id_pelanggan": cust.id_pelanggan
            }
        except ValueError as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="EDIT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal update pelanggan {id_pelanggan}: {str(e)}", user=user
                )
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="EDIT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal update pelanggan {id_pelanggan}: {str(e)}", user=user
                )
            raise HTTPException(status_code=500, detail=f"Gagal memperbarui pelanggan: {e}")

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan menghapus data pelanggan")
        
        from app.modules.activity_logs.service import ActivityLogService
        detail = CustomerService.get_customer_detail(db=db, id_pelanggan=id_pelanggan)
        cust_name = detail[0].nama if detail and detail[0] else id_pelanggan
        success = CustomerService.delete_customer(db=db, id_pelanggan=id_pelanggan)
        if not success:
            raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
        if request:
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="HAPUS_PELANGGAN",
                status="SUCCESS",
                keterangan=f"Menghapus data pelanggan {cust_name} (ID: {id_pelanggan}) beserta seluruh data anakannya (CASCADE)",
                user=user
            )
        return {
            "status": "success",
            "message": f"Pelanggan '{cust_name}' (ID: {id_pelanggan}) beserta seluruh data anakannya berhasil dihapus."
        }

    @staticmethod
    def bulk_delete(db: Session, ids: List[str], request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan menghapus data pelanggan")
        
        from app.modules.activity_logs.service import ActivityLogService
        affected = CustomerService.bulk_delete_customers(db=db, id_list=ids)
        if request:
            sample_ids = ", ".join(ids[:5])
            if len(ids) > 5:
                sample_ids += f" (+{len(ids)-5} lainnya)"
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="HAPUS_PELANGGAN_MASSAL",
                status="SUCCESS",
                keterangan=f"Menghapus massal {affected} data pelanggan beserta seluruh anakannya (CASCADE) (Daftar ID: {sample_ids})",
                user=user
            )
        return {
            "status": "success",
            "message": f"{affected} pelanggan beserta seluruh data anakannya berhasil dihapus.",
            "deleted_count": affected
        }

    @staticmethod
    def import_csv(db: Session, file_content: bytes, filename: str = "pelanggan.csv", request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") == "operator":
            raise HTTPException(status_code=403, detail="Akses ditolak: Operator tidak diizinkan melakukan import pelanggan")
            
        from app.modules.activity_logs.service import ActivityLogService
        try:
            res = CustomerService.import_customers_from_csv(db=db, file_content=file_content)
            if request:
                ActivityLogService.log_from_request(
                    db=db,
                    request=request,
                    action="IMPORT_PELANGGAN",
                    status="SUCCESS",
                    keterangan=f"Import CSV berhasil ({filename}): {res['imported']} baru, {res['updated']} diperbarui dari total {res['total_processed']} baris",
                    user=user
                )
            return {
                "status": "success",
                "message": f"Berhasil memproses {res['total_processed']} baris ({res['imported']} baru, {res['updated']} diperbarui, {res['failed']} gagal).",
                "result": res
            }
        except ValueError as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="IMPORT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal import CSV ({filename}): {str(e)}", user=user
                )
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="IMPORT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal import CSV ({filename}): {str(e)}", user=user
                )
            raise HTTPException(status_code=500, detail=f"Gagal memproses import CSV: {e}")

    @staticmethod
    def download_template_excel() -> Response:
        content = CustomerService.generate_excel_template()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=template_import_pelanggan.xlsx"}
        )

    @staticmethod
    def export_excel(db: Session, request: Optional[Request] = None) -> Response:
        active_kantor = getattr(request.state, "active_kantor", "cabang") if request else "cabang"
        allowed_kantor = getattr(request.state, "allowed_kantor", ["cabang"]) if request else None
        excel_bytes = CustomerService.generate_excel_export(db=db, kantor=active_kantor, allowed_kantor=allowed_kantor)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=data_pelanggan_edteknoguard.xlsx"}
        )

    @staticmethod
    def analyze_import(file_content: bytes, filename: str) -> Dict[str, Any]:
        try:
            res = CustomerService.analyze_import_file(file_content=file_content, filename=filename)
            return {
                "status": "success",
                "result": res
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menganalisis file: {e}")

    @staticmethod
    def preview_import(db: Session, file_content: bytes, filename: str, sheet_name: str, mapping: dict) -> Dict[str, Any]:
        try:
            res = CustomerService.preview_import_file(
                file_content=file_content, 
                filename=filename, 
                sheet_name=sheet_name, 
                mapping=mapping, 
                db=db
            )
            return {
                "status": "success",
                "result": res
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal memproses preview: {e}")

    @staticmethod
    def execute_import(db: Session, data_list: list, target_kantor: Optional[str] = None, request: Optional[Request] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if user and user.get("role") in ("operator", "teknisi", "karyawan"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Teknisi tidak diizinkan mengeksekusi import pelanggan")
            
        from app.modules.activity_logs.service import ActivityLogService
        try:
            # Tentukan default kantor berdasarkan hak akses user dan target_kantor
            user_allowed = user.get("allowed_kantor", ["cabang"]) if user else ["cabang"]
            is_super_admin = user and user.get("role") == "super admin"
            
            effective_kantor = "cabang"
            if target_kantor and target_kantor.lower().strip() in ["cabang", "pusat", "banyumas"]:
                if is_super_admin or target_kantor.lower().strip() in user_allowed:
                    effective_kantor = target_kantor.lower().strip()
                else:
                    effective_kantor = user_allowed[0] if user_allowed else "cabang"
            else:
                active_kantor = getattr(request.state, "active_kantor", "cabang") if request else "cabang"
                if active_kantor in ["cabang", "pusat", "banyumas"]:
                    effective_kantor = active_kantor
                elif user_allowed:
                    effective_kantor = user_allowed[0]
                else:
                    effective_kantor = "cabang"

            res = CustomerService.execute_json_import(db=db, data_list=data_list, default_kantor=effective_kantor)
            if request:
                ActivityLogService.log_from_request(
                    db=db,
                    request=request,
                    action="IMPORT_PELANGGAN",
                    status="SUCCESS",
                    keterangan=f"Import berhasil ({effective_kantor.upper()}): {res['imported']} baru, {res['skipped']} dilewati, {res['failed']} gagal dari total {res['total_processed']} baris",
                    user=user
                )
            return {
                "status": "success",
                "message": f"Berhasil memproses {res['total_processed']} baris ({res['imported']} baru, {res['skipped']} dilewati, {res['failed']} gagal).",
                "result": res
            }
        except ValueError as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="IMPORT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal import data pelanggan: {str(e)}", user=user
                )
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            if request:
                ActivityLogService.log_from_request(
                    db=db, request=request, action="IMPORT_PELANGGAN", status="FAILED",
                    keterangan=f"Gagal mengeksekusi import pelanggan: {str(e)}", user=user
                )
            raise HTTPException(status_code=500, detail=f"Gagal mengeksekusi import: {e}")

