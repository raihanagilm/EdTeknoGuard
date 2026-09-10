import uuid
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.models import Pelanggan, LogPerformaONT
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate

class CustomerService:

    @staticmethod
    def get_customers(
        db: Session,
        q: Optional[str] = None,
        pop: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 25
    ) -> Tuple[int, List[Dict[str, Any]]]:
        query = db.query(Pelanggan).filter(Pelanggan.is_active == True)

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Pelanggan.nama.ilike(search_pattern),
                    Pelanggan.ip_router.ilike(search_pattern),
                    Pelanggan.mac_address.ilike(search_pattern),
                    Pelanggan.id_pelanggan.ilike(search_pattern)
                )
            )

        if pop and pop != "Semua POP":
            query = query.filter(Pelanggan.pop == pop)

        total_count = query.count()
        offset = (page - 1) * limit
        customers = query.order_by(Pelanggan.id.asc()).offset(offset).limit(limit).all()

        result = []
        for c in customers:
            latest_log = (
                db.query(LogPerformaONT)
                .filter(LogPerformaONT.id_pelanggan == c.id_pelanggan)
                .order_by(LogPerformaONT.waktu_cek.desc())
                .first()
            )
            
            current_status = latest_log.status_koneksi if latest_log else "NORMAL"
            current_rx = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else (float(c.redaman_baseline) if c.redaman_baseline else None)
            last_check = latest_log.waktu_cek.strftime("%d/%m %H:%M") if latest_log else "-"

            if status and status != "Semua Status":
                if current_status != status:
                    continue

            result.append({
                "id_pelanggan": c.id_pelanggan,
                "nama": c.nama,
                "alamat": c.alamat or "-",
                "no_hp": c.no_hp or "-",
                "pop": c.pop,
                "ip_router": c.ip_router,
                "paket": c.paket or "-",
                "jenis_modem": c.jenis_modem,
                "mac_address": c.mac_address or "-",
                "redaman_baseline": float(c.redaman_baseline) if c.redaman_baseline else None,
                "redaman_current": current_rx,
                "status": current_status,
                "last_check": last_check,
                "nama_wifi": c.nama_wifi or "-",
                "user_admin": c.user_admin or "-"
            })

        return total_count, result

    @staticmethod
    def get_customer_detail(db: Session, id_pelanggan: str) -> Optional[Tuple[Pelanggan, List[LogPerformaONT]]]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        logs = (
            db.query(LogPerformaONT)
            .filter(LogPerformaONT.id_pelanggan == id_pelanggan)
            .order_by(LogPerformaONT.waktu_cek.desc())
            .limit(20)
            .all()
        )
        return cust, logs

    @staticmethod
    def get_pop_list(db: Session) -> List[str]:
        rows = db.query(Pelanggan.pop).filter(Pelanggan.is_active == True).distinct().all()
        return [r[0] for r in rows if r[0]]

    @staticmethod
    def get_customer_stats(db: Session) -> Dict[str, Any]:
        total_pelanggan = db.query(Pelanggan).filter(Pelanggan.is_active == True).count()
        pop_counts = (
            db.query(Pelanggan.pop, func.count(Pelanggan.id))
            .filter(Pelanggan.is_active == True)
            .group_by(Pelanggan.pop)
            .all()
        )
        return {
            "total": total_pelanggan,
            "pop_distribution": [{"pop": p[0], "count": p[1]} for p in pop_counts]
        }

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate) -> Pelanggan:
        # Generate id_pelanggan jika tidak ada
        cid = data.id_pelanggan
        if not cid or not cid.strip():
            cid = f"CUST-{uuid.uuid4().hex[:8].upper()}"

        existing = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cid).first()
        if existing:
            raise ValueError(f"ID Pelanggan '{cid}' sudah digunakan.")

        new_cust = Pelanggan(
            id_pelanggan=cid,
            nama=data.nama,
            alamat=data.alamat,
            no_hp=data.no_hp,
            pop=data.pop,
            ip_router=data.ip_router,
            paket=data.paket,
            jenis_modem=data.jenis_modem,
            mac_address=data.mac_address,
            redaman_baseline=data.redaman_baseline,
            nama_wifi=data.nama_wifi,
            password_wifi=data.password_wifi,
            user_admin=data.user_admin,
            pass_admin=data.pass_admin,
            snmp_community=data.snmp_community or "public",
            is_active=True
        )
        db.add(new_cust)
        db.commit()
        db.refresh(new_cust)
        return new_cust

    @staticmethod
    def update_customer(db: Session, id_pelanggan: str, data: CustomerUpdate) -> Optional[Pelanggan]:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return None

        update_dict = data.dict(exclude_unset=True)
        for field, val in update_dict.items():
            if hasattr(cust, field) and val is not None:
                setattr(cust, field, val)

        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def delete_customer(db: Session, id_pelanggan: str) -> bool:
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return False

        # Soft delete
        cust.is_active = False
        db.commit()
        return True
