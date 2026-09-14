import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.db.models import UserActivityLog

class ActivityLogService:

    @staticmethod
    def log_activity(
        db: Session,
        username: str,
        action: str,
        nama_karyawan: Optional[str] = None,
        role: str = "admin",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "SUCCESS",
        keterangan: Optional[str] = None
    ) -> UserActivityLog:
        """Mencatat entri aktivitas pengguna ke dalam database"""
        try:
            log_entry = UserActivityLog(
                username=username.strip() if username else "unknown",
                nama_karyawan=nama_karyawan.strip() if nama_karyawan else (username.title() if username else None),
                role=role or "admin",
                action=action.upper(),
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                status=status.upper(),
                keterangan=keterangan,
                created_at=datetime.datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except Exception as e:
            db.rollback()
            print(f"[ActivityLogService] Gagal mencatat log aktivitas: {e}")
            return None

    @staticmethod
    def get_distinct_users(db: Session) -> List[Dict[str, str]]:
        """Mendapatkan daftar unik username & nama karyawan untuk filter dropdown"""
        rows = (
            db.query(UserActivityLog.username, UserActivityLog.nama_karyawan)
            .distinct()
            .order_by(UserActivityLog.username.asc())
            .all()
        )
        return [
            {"username": r[0], "nama_karyawan": r[1] or r[0]}
            for r in rows if r[0]
        ]

    @staticmethod
    def get_activity_logs(
        db: Session,
        username: Optional[str] = None,
        q: Optional[str] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 25
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """Mengambil data log aktivitas dengan filter, sorting dinamis, dan pagination"""
        query = db.query(UserActivityLog)

        # Filter berdasarkan username/karyawan tertentu
        if username and username != "all":
            query = query.filter(UserActivityLog.username == username.strip())

        # Filter berdasarkan aksi
        if action and action != "all":
            query = query.filter(UserActivityLog.action == action.strip().upper())

        # Filter status
        if status and status != "all":
            query = query.filter(UserActivityLog.status == status.strip().upper())

        # Pencarian fleksibel
        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    UserActivityLog.username.ilike(search_pattern),
                    UserActivityLog.nama_karyawan.ilike(search_pattern),
                    UserActivityLog.action.ilike(search_pattern),
                    UserActivityLog.ip_address.ilike(search_pattern),
                    UserActivityLog.keterangan.ilike(search_pattern)
                )
            )

        total_count = query.count()

        # Dynamic column sorting
        col_map = {
            "created_at": UserActivityLog.created_at,
            "username": UserActivityLog.username,
            "nama_karyawan": UserActivityLog.nama_karyawan,
            "role": UserActivityLog.role,
            "action": UserActivityLog.action,
            "ip_address": UserActivityLog.ip_address,
            "status": UserActivityLog.status,
            "id": UserActivityLog.id
        }
        target_col = col_map.get(sort_by, UserActivityLog.created_at)
        if sort_dir.lower() == "desc":
            query = query.order_by(desc(target_col))
        else:
            query = query.order_by(asc(target_col))

        offset = (page - 1) * limit
        logs = query.offset(offset).limit(limit).all()

        results = []
        for l in logs:
            results.append({
                "id": l.id,
                "username": l.username,
                "nama_karyawan": l.nama_karyawan or l.username,
                "role": l.role,
                "action": l.action,
                "ip_address": l.ip_address or "-",
                "user_agent": l.user_agent or "-",
                "status": l.status,
                "keterangan": l.keterangan or "-",
                "waktu": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-"
            })

        return total_count, results
