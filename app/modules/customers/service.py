import uuid
import csv
import io
import re
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case

import openpyxl
import pandas as pd
import json
from app.modules.customers.importer import CustomerImporter
from app.modules.customers.exporter import CustomerExporter

from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.timezone import get_now_wib, get_current_period
from app.db.models import Pelanggan, LogPerformaONT, PerangkatONT, KuotaPelanggan
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate

class CustomerService:

    @staticmethod
    # --- DELEGASI IMPORTER ---
    @staticmethod
    def read_csv_safely(file_content: bytes) -> pd.DataFrame:
        return CustomerImporter.read_csv_safely(file_content)

    @staticmethod
    def generate_structured_customer_id(existing_ids: Optional[set] = None) -> str:
        return CustomerImporter.generate_structured_customer_id(existing_ids)

    @staticmethod
    def generate_customer_id_from_ip(ip: str, sequence: int = 1) -> str:
        return CustomerImporter.generate_customer_id_from_ip(ip, sequence)

    @staticmethod
    def analyze_import_file(file_content: bytes, filename: str) -> dict:
        return CustomerImporter.analyze_import_file(file_content, filename)

    @staticmethod
    def preview_import_file(file_content: bytes, filename: str, sheet_name: Optional[str] = None, column_mapping: Optional[dict] = None) -> dict:
        return CustomerImporter.preview_import_file(file_content, filename, sheet_name, column_mapping)

    @staticmethod
    def execute_json_import(db: Session, data_list: list, default_kantor: str = 'cabang') -> dict:
        return CustomerImporter.execute_json_import(db, data_list, default_kantor)

    @staticmethod
    def import_customers_from_csv(db: Session, file_content: bytes) -> Dict[str, Any]:
        return CustomerImporter.import_customers_from_csv(db, file_content)

    # --- DELEGASI EXPORTER ---
    @staticmethod
    def generate_excel_export(db: Session, search_query: Optional[str] = None, kantor_filter: Optional[str] = None) -> bytes:
        return CustomerExporter.generate_excel_export(db, search_query, kantor_filter)

    @staticmethod
    def generate_excel_template() -> bytes:
        return CustomerExporter.generate_excel_template()

    @staticmethod
    def generate_csv_template() -> str:
        return CustomerExporter.generate_csv_template()

    @staticmethod
    def get_customers(
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
    ) -> Tuple[int, List[Dict[str, Any]]]:
        # Subquery ID log terbaru per id_pelanggan
        subq = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.id).label('max_log_id')
            )
            .group_by(LogPerformaONT.id_pelanggan)
            .subquery()
        )

        current_period = get_current_period()

        query = (
            db.query(Pelanggan, LogPerformaONT, KuotaPelanggan)
            .outerjoin(PerangkatONT, PerangkatONT.id_pelanggan == Pelanggan.id_pelanggan)
            .outerjoin(subq, subq.c.id_pelanggan == Pelanggan.id_pelanggan)
            .outerjoin(LogPerformaONT, LogPerformaONT.id == subq.c.max_log_id)
            .outerjoin(
                KuotaPelanggan,
                (KuotaPelanggan.id_pelanggan == Pelanggan.id_pelanggan) & 
                (KuotaPelanggan.periode_bulan == current_period)
            )
            .filter(Pelanggan.is_active == True)
        )

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Pelanggan.nama.ilike(search_pattern),
                    Pelanggan.id_pelanggan.ilike(search_pattern),
                    Pelanggan.alamat.ilike(search_pattern),
                    PerangkatONT.ip_router.ilike(search_pattern),
                    PerangkatONT.ip_ont.ilike(search_pattern),
                    PerangkatONT.mac_address.ilike(search_pattern),
                    PerangkatONT.nama_wifi.ilike(search_pattern)
                )
            )

        if pop and pop != "Semua POP" and pop != "ALL":
            query = query.filter(Pelanggan.pop == pop)

        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            query = query.filter(Pelanggan.kantor.in_(allowed_kantor))

        if status and status != "Semua Status" and status != "ALL":
            if status == "OFFLINE":
                query = query.filter(or_(Pelanggan.status_lease == "waiting", Pelanggan.is_monitored == False))
            elif status == "NORMAL":
                query = query.filter(
                    Pelanggan.status_lease != "waiting",
                    LogPerformaONT.status_koneksi == "NORMAL",
                    LogPerformaONT.rx_power.isnot(None)
                )
            elif status == "WARNING":
                query = query.filter(
                    LogPerformaONT.status_koneksi == "WARNING",
                    LogPerformaONT.rx_power.isnot(None),
                    Pelanggan.status_lease != "waiting"
                )
            elif status == "CRITICAL":
                query = query.filter(
                    LogPerformaONT.status_koneksi == "CRITICAL",
                    Pelanggan.status_lease != "waiting"
                )
            elif status == "LOS":
                query = query.filter(LogPerformaONT.status_koneksi == "LOS")
            elif status in ("NONAKTIF", "OFF"):
                query = query.filter(Pelanggan.is_monitored == False)
            elif status == "UNTESTED":
                query = query.filter(
                    or_(
                        LogPerformaONT.id.is_(None),
                        LogPerformaONT.status_koneksi == "UNTESTED",
                        LogPerformaONT.status_koneksi.is_(None)
                    )
                )
            elif status == "INVALID":
                query = query.filter(
                    PerangkatONT.status_kredensial == "INVALID"
                )
            else:
                query = query.filter(LogPerformaONT.status_koneksi == status)

        if monitoring and monitoring != "all":
            if monitoring in ("active", "true", "1"):
                query = query.filter(Pelanggan.is_monitored == True)
            elif monitoring in ("inactive", "false", "0"):
                query = query.filter(Pelanggan.is_monitored == False)

        # Filter Rentang Waktu Tanggal (Berdasarkan waktu cek log terakhir atau tanggal terdaftar)
        now = get_now_wib()
        date_col = func.coalesce(LogPerformaONT.waktu_cek, Pelanggan.created_at)
        if range_type == "today":
            cutoff = datetime(now.year, now.month, now.day)
            query = query.filter(date_col >= cutoff)
        elif range_type == "7d":
            cutoff = now - timedelta(days=7)
            query = query.filter(date_col >= cutoff)
        elif range_type == "30d":
            cutoff = now - timedelta(days=30)
            query = query.filter(date_col >= cutoff)
        elif range_type == "custom" and start_date and end_date:
            try:
                s_dt = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                e_dt = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                query = query.filter(date_col >= s_dt, date_col < e_dt)
            except ValueError:
                pass

        total_count = query.count()

        # Dynamic sorting yang aman dan sesuai kolom tabel
        effective_ip = func.coalesce(PerangkatONT.ip_ont, PerangkatONT.ip_router)
        effective_status = case(
            (LogPerformaONT.status_koneksi == "LOS", "LOS"),
            (Pelanggan.status_lease == "waiting", "OFFLINE"),
            (LogPerformaONT.status_koneksi.isnot(None), LogPerformaONT.status_koneksi),
            else_="UNTESTED"
        )
        col_map = {
            "id": Pelanggan.id,
            "id_pelanggan": Pelanggan.id_pelanggan,
            "nama": Pelanggan.nama,
            "pop": Pelanggan.pop,
            "ip_router": PerangkatONT.ip_router,
            "ip_ont": PerangkatONT.ip_ont,
            "ip": effective_ip,
            "paket": Pelanggan.paket,
            "jenis_modem": PerangkatONT.jenis_modem,
            "modem": PerangkatONT.jenis_modem,
            "redaman_baseline": PerangkatONT.redaman_baseline,
            "status_kredensial": PerangkatONT.status_kredensial,
            "redaman_current": LogPerformaONT.rx_power,
            "rx_power": LogPerformaONT.rx_power,
            "status": effective_status,
            "status_koneksi": effective_status,
            "kuota": KuotaPelanggan.kuota_terpakai_gb,
            "kuota_terpakai_gb": KuotaPelanggan.kuota_terpakai_gb,
            "terpakai_gb": KuotaPelanggan.kuota_terpakai_gb,
            "is_monitored": Pelanggan.is_monitored,
            "waktu_cek": LogPerformaONT.waktu_cek,
            "created_at": Pelanggan.created_at
        }
        target_col = col_map.get(sort_by, Pelanggan.id)
        if sort_by in ("rx_power", "redaman_current"):
            # Jika user klik sort Redaman (dBm), arah 'asc' (default pertama klik) memprioritaskan BELUM CEK (null) di puncak tabel
            if sort_dir.lower() == "desc":
                # Pengurutan tertinggi ke terendah, nilai terukur di atas, null di akhir
                query = query.order_by(target_col.is_(None), target_col.desc())
            else:
                # BELUM CEK (target_col is None) tampil paling atas/pertama, disusul nilai redaman terendah ke tertinggi
                query = query.order_by(target_col.isnot(None), target_col.asc())
        elif sort_by == "status_kredensial":
            # Jika user klik sort status_kredensial (WiFi & Admin ONT):
            # asc: Prioritaskan INVALID di baris paling atas/awal agar admin langsung tahu mana yang perlu diperbaiki kredensialnya
            if sort_dir.lower() == "asc":
                query = query.order_by(
                    case((PerangkatONT.status_kredensial == "INVALID", 0), else_=1),
                    PerangkatONT.status_kredensial.asc()
                )
            else:
                query = query.order_by(
                    case((PerangkatONT.status_kredensial == "VALID", 0), else_=1),
                    PerangkatONT.status_kredensial.desc()
                )
        elif sort_dir.lower() == "desc":
            query = query.order_by(target_col.is_(None), target_col.desc())
        else:
            query = query.order_by(target_col.is_(None), target_col.asc())

        offset = (page - 1) * limit
        rows = query.offset(offset).limit(limit).all()

        result = []
        for c, latest_log, kuota_rec in rows:
            lease_status = getattr(c, "status_lease", "bound") or "bound"
            if latest_log and latest_log.status_koneksi == "LOS":
                current_status = "LOS"
            elif lease_status == "waiting":
                current_status = "OFFLINE"
            else:
                current_status = latest_log.status_koneksi if (latest_log and latest_log.status_koneksi) else "UNTESTED"
            current_rx = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else None
            last_check = latest_log.waktu_cek.strftime("%d/%m %H:%M") if (latest_log and latest_log.waktu_cek) else "-"
            waktu_terakhir_iso = latest_log.waktu_cek.isoformat() if (latest_log and latest_log.waktu_cek) else None

            kuota_gb = float(kuota_rec.kuota_terpakai_gb) if kuota_rec and kuota_rec.kuota_terpakai_gb is not None else 0.0
            up_bytes = int(kuota_rec.upload_bytes) if kuota_rec and kuota_rec.upload_bytes else 0
            dl_bytes = int(kuota_rec.download_bytes) if kuota_rec and kuota_rec.download_bytes else 0
            last_sync_str = kuota_rec.last_sync_mikrotik.strftime("%d/%m %H:%M") if kuota_rec and kuota_rec.last_sync_mikrotik else None

            result.append({
                "id_pelanggan": c.id_pelanggan,
                "nama": c.nama,
                "alamat": c.alamat or "-",
                "no_hp": c.no_hp or "-",
                "pop": c.pop,
                "ip_router": c.ip_router,
                "ip_ont": getattr(c, "ip_ont", None),
                "paket": c.paket or "-",
                "jenis_modem": c.jenis_modem,
                "mac_address": c.mac_address or "-",
                "redaman_baseline": float(c.redaman_baseline) if c.redaman_baseline else None,
                "rx_power": current_rx,
                "rx": current_rx,
                "redaman_current": current_rx,
                "redaman_terakhir": current_rx,
                "status": current_status,
                "status_koneksi": current_status,
                "status_terakhir": current_status,
                "last_check": last_check,
                "waktu_terakhir": waktu_terakhir_iso,
                "waktu_cek": last_check,
                "suhu_ont": float(latest_log.suhu_ont) if (latest_log and latest_log.suhu_ont is not None) else None,
                "latency_ms": int(latest_log.latency_ms) if (latest_log and latest_log.latency_ms is not None) else None,
                "lokasi_gps": c.lokasi_gps or None,
                "nama_wifi": c.nama_wifi or "-",
                "password_wifi": c.password_wifi or "-",
                "user_admin": c.user_admin or "-",
                "pass_admin": c.pass_admin or "-",
                "status_kredensial": getattr(c, "status_kredensial", "UNTESTED") or "UNTESTED",
                "is_monitored": bool(getattr(c, "is_monitored", True)),
                "status_lease": getattr(c, "status_lease", "bound") or "bound",
                "kantor": getattr(c, "kantor", "cabang") or "cabang",
                "status_isolir": bool(getattr(c, "status_isolir", False)),
                "queue_name": getattr(c, "queue_name", None) or c.nama,
                "kuota_terpakai_gb": kuota_gb,
                "upload_bytes": up_bytes,
                "download_bytes": dl_bytes,
                "last_sync_mikrotik": last_sync_str
            })

        return total_count, result

    @staticmethod
    def toggle_monitoring(db: Session, id_pelanggan: str, is_monitored: Optional[bool] = None) -> Optional[Pelanggan]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None
        if is_monitored is not None:
            cust.is_monitored = bool(is_monitored)
        else:
            cust.is_monitored = not bool(getattr(cust, "is_monitored", True))
        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Optional[Tuple[Pelanggan, List[LogPerformaONT]]]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        logs = (
            db.query(LogPerformaONT)
            .filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            .order_by(LogPerformaONT.waktu_cek.desc())
            .limit(50)
            .all()
        )
        return cust, logs

    @staticmethod
    def get_min_date(db: Session) -> str:
        earliest_log = db.query(func.min(LogPerformaONT.waktu_cek)).scalar()
        earliest_cust = db.query(func.min(Pelanggan.created_at)).scalar()
        dates = [d for d in [earliest_log, earliest_cust] if d is not None]
        if dates:
            return min(dates).strftime("%Y-%m-%d")
        return "2026-09-01"

    @staticmethod
    def get_pop_list(
        db: Session, 
        kantor: Optional[str] = None, 
        allowed_kantor: Optional[List[str]] = None
    ) -> List[str]:
        q = db.query(Pelanggan.pop).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            q = q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q = q.filter(Pelanggan.kantor.in_(allowed_kantor))
        rows = q.distinct().all()
        return [r[0] for r in rows if r[0]]

    @staticmethod
    def get_customer_stats(
        db: Session,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Menghitung agregasi KPI status pelanggan untuk kartu analitik dashboard"""
        base_q = db.query(Pelanggan).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            base_q = base_q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            base_q = base_q.filter(Pelanggan.kantor.in_(allowed_kantor))

        monitored_active = base_q.filter(Pelanggan.is_monitored == True).count()
        monitored_inactive = base_q.filter(Pelanggan.is_monitored == False).count()
        total_all = base_q.count()

        total_pelanggan = total_all  # Nilai total harus sesuai dengan jumlah data pelanggan aktual di database

        pop_q = (
            db.query(Pelanggan.pop, func.count(Pelanggan.id))
            .filter(
                Pelanggan.is_active == True
            )
        )
        if kantor and kantor != "all":
            pop_q = pop_q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            pop_q = pop_q.filter(Pelanggan.kantor.in_(allowed_kantor))
        pop_counts = pop_q.group_by(Pelanggan.pop).all()

        subq_builder = (
            db.query(
                LogPerformaONT.id_pelanggan,
                func.max(LogPerformaONT.id).label('max_log_id')
            )
            .join(Pelanggan, Pelanggan.id_pelanggan == LogPerformaONT.id_pelanggan)
            .filter(
                Pelanggan.is_active == True
            )
        )
        if kantor and kantor != "all":
            subq_builder = subq_builder.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            subq_builder = subq_builder.filter(Pelanggan.kantor.in_(allowed_kantor))
        subq = subq_builder.group_by(LogPerformaONT.id_pelanggan).subquery()

        status_counts = (
            db.query(
                LogPerformaONT.status_koneksi,
                func.count(Pelanggan.id)
            )
            .join(subq, subq.c.id_pelanggan == Pelanggan.id_pelanggan)
            .join(LogPerformaONT, LogPerformaONT.id == subq.c.max_log_id)
            .filter(
                Pelanggan.is_active == True,
                case(
                    (LogPerformaONT.status_koneksi == "WARNING", LogPerformaONT.rx_power.isnot(None)),
                    else_=True
                )
            )
            .group_by(LogPerformaONT.status_koneksi)
            .all()
        )
        status_dict = {s[0]: s[1] for s in status_counts}
        normal_count = status_dict.get("NORMAL", 0)
        warning_count = status_dict.get("WARNING", 0)
        critical_count = status_dict.get("CRITICAL", 0)
        los_count = status_dict.get("LOS", 0)

        # Hitung jumlah modem dengan kredensial INVALID murni
        invalid_q = (
            db.query(func.count(Pelanggan.id))
            .join(PerangkatONT, PerangkatONT.id_pelanggan == Pelanggan.id_pelanggan)
            .filter(
                Pelanggan.is_active == True,
                PerangkatONT.status_kredensial == "INVALID"
            )
        )
        if kantor and kantor != "all":
            invalid_q = invalid_q.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            invalid_q = invalid_q.filter(Pelanggan.kantor.in_(allowed_kantor))
        invalid_count = invalid_q.scalar() or 0

        return {
            "total": total_pelanggan,
            "total_all": total_all,
            "normal": normal_count,
            "warning": warning_count,
            "critical": critical_count,
            "los": los_count,
            "invalid": invalid_count,
            "critical_los": critical_count + los_count,
            "monitored_active": monitored_active,
            "monitored_inactive": monitored_inactive,
            "pop_distribution": [{"pop": p[0], "count": p[1]} for p in pop_counts]
        }

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate) -> Pelanggan:
        from app.db.models import PerangkatONT

        if not data.id_pelanggan or not str(data.id_pelanggan).strip():
            # Cari urutan sequence untuk IP router terkait jika sudah ada di DB
            clean_ip = "".join(filter(str.isdigit, str(data.ip_router or "0")))
            existing_count = db.query(Pelanggan).filter(Pelanggan.id_pelanggan.like(f"P{clean_ip}%")).count()
            data.id_pelanggan = CustomerService.generate_customer_id_from_ip(data.ip_router or "10.10.0.1", existing_count + 1)

        # Validasi duplikasi ID Pelanggan
        existing_id = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == data.id_pelanggan).first()
        if existing_id:
            raise ValueError(f"ID Pelanggan '{data.id_pelanggan}' sudah terdaftar")

        # Validasi duplikasi IP Router aktif (join PerangkatONT)
        existing_ip = (
            db.query(PerangkatONT)
            .join(Pelanggan, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
            .filter(
                PerangkatONT.ip_router == data.ip_router,
                Pelanggan.is_active == True
            )
            .first()
        )
        if existing_ip:
            pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == existing_ip.id_pelanggan).first()
            pel_name = pel.nama if pel else existing_ip.id_pelanggan
            raise ValueError(f"IP Router '{data.ip_router}' sudah digunakan oleh pelanggan '{pel_name}'")

        from app.core.security import get_password_hash, DEFAULT_CUSTOMER_PASSWORD

        new_cust = Pelanggan(
            id_pelanggan=data.id_pelanggan,
            nama=data.nama,
            alamat=data.alamat,
            no_hp=data.no_hp,
            pop=data.pop,
            kantor=getattr(data, "kantor", "cabang") or "cabang",
            paket=data.paket,
            is_monitored=getattr(data, "is_monitored", True) if getattr(data, "is_monitored", None) is not None else True,
            is_active=True,
            password_hash=get_password_hash(DEFAULT_CUSTOMER_PASSWORD)
        )
        db.add(new_cust)
        db.flush()

        new_ont = PerangkatONT(
            id_pelanggan=data.id_pelanggan,
            ip_router=data.ip_router,
            jenis_modem=data.jenis_modem or None,
            mac_address=data.mac_address,
            redaman_baseline=data.redaman_baseline,
            nama_wifi=data.nama_wifi,
            password_wifi=data.password_wifi,
            user_admin=data.user_admin or "admin",
            pass_admin=data.pass_admin or "tekno2024",
            snmp_community=data.snmp_community or "public",
            status_kredensial="INVALID"
        )
        db.add(new_ont)
        db.commit()
        db.refresh(new_cust)
        return new_cust

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate) -> Optional[Pelanggan]:
        from app.db.models import PerangkatONT

        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        update_dict = data.dict(exclude_unset=True)

        if "ip_router" in update_dict and update_dict["ip_router"]:
            new_ip = str(update_dict["ip_router"]).strip()
            # Periksa apakah IP sudah digunakan oleh pelanggan aktif lain
            existing_ip = (
                db.query(PerangkatONT)
                .join(Pelanggan, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
                .filter(
                    PerangkatONT.ip_router == new_ip,
                    Pelanggan.is_active == True,
                    Pelanggan.id_pelanggan != id_pelanggan
                )
                .first()
            )
            if existing_ip:
                pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == existing_ip.id_pelanggan).first()
                pel_name = pel.nama if pel else existing_ip.id_pelanggan
                raise ValueError(f"IP Router '{new_ip}' sudah digunakan oleh pelanggan '{pel_name}' (ID: {existing_ip.id_pelanggan})")

        if "no_wa" in update_dict and update_dict["no_wa"] is not None:
            cust.no_hp = str(update_dict["no_wa"]).strip()

        for field, val in update_dict.items():
            if hasattr(cust, field) and val is not None:
                setattr(cust, field, val)

        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def reset_customer_portal_password(db: Session, id_pelanggan: str) -> Optional[Pelanggan]:
        """Reset kata sandi aplikasi TeknoCust pelanggan kembali ke default '123456'."""
        from app.core.security import get_password_hash, DEFAULT_CUSTOMER_PASSWORD
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None
        target_pwd = cust.no_hp.strip() if cust.no_hp else DEFAULT_CUSTOMER_PASSWORD
        cust.password_hash = get_password_hash(target_pwd)
        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str) -> bool:
        """Hapus permanen data utama pelanggan beserta seluruh data anakannya (CASCADE)."""
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return False

        # Hard delete memicu foreign key ON DELETE CASCADE dan SQLAlchemy cascade
        db.delete(cust)
        db.commit()
        return True

    @staticmethod
    def bulk_delete_customers(db: Session, id_list: List[str]) -> int:
        """Hapus permanen banyak pelanggan sekaligus beserta seluruh data anakannya (CASCADE)."""
        if not id_list:
            return 0

        customers = db.query(Pelanggan).filter(Pelanggan.id_pelanggan.in_(id_list)).all()
        affected = len(customers)
        for cust in customers:
            db.delete(cust)
        db.commit()
        return affected

