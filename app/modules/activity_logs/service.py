import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func, text

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
    ) -> Optional[UserActivityLog]:
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
    def extract_client_info(request: Any, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ekstraksi IP Address, User Agent, Username, dan Role dari Request FastAPI"""
        ip = "unknown"
        if hasattr(request, "client") and request.client and getattr(request.client, "host", None):
            ip = request.client.host
        if hasattr(request, "headers"):
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip = forwarded_for.split(",")[0].strip()
            user_agent = request.headers.get("user-agent")
        else:
            user_agent = None

        if not user and hasattr(request, "cookies"):
            from app.core.security import get_current_user_optional
            user = get_current_user_optional(request)

        if isinstance(user, dict):
            raw_user = user.get("user") or user.get("username") or "admin"
            if isinstance(raw_user, dict):
                username = str(raw_user.get("username") or raw_user.get("user") or "admin")
            else:
                username = str(raw_user)
            role = str(user.get("role", "admin"))
            nama_karyawan = user.get("nama_karyawan") or ("Administrator NOC" if username == "admin" else username.title())
        elif isinstance(user, str):
            username = user
            role = "admin"
            nama_karyawan = "Administrator NOC" if username == "admin" else username.title()
        else:
            username = "admin"
            role = "admin"
            nama_karyawan = "Administrator NOC"

        return {
            "username": username,
            "nama_karyawan": nama_karyawan,
            "role": role,
            "ip_address": ip,
            "user_agent": user_agent
        }

    @staticmethod
    def log_from_request(
        db: Session,
        request: Any,
        action: str,
        status: str = "SUCCESS",
        keterangan: Optional[str] = None,
        user: Optional[Dict[str, Any]] = None
    ) -> Optional[UserActivityLog]:
        """Helper ringkas untuk mencatat aktivitas langsung dari objek Request FastAPI"""
        try:
            info = ActivityLogService.extract_client_info(request, user)
            return ActivityLogService.log_activity(
                db=db,
                username=info["username"],
                action=action,
                nama_karyawan=info["nama_karyawan"],
                role=info["role"],
                ip_address=info["ip_address"],
                user_agent=info["user_agent"],
                status=status,
                keterangan=keterangan
            )
        except Exception as e:
            print(f"[ActivityLogService] log_from_request error: {e}")
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
    def get_distinct_dates(db: Session) -> List[str]:
        """Mendapatkan daftar tanggal unik yang ada di database untuk filter dropdown"""
        try:
            rows = (
                db.query(func.date(UserActivityLog.created_at).label("log_date"))
                .distinct()
                .order_by(desc("log_date"))
                .all()
            )
            return [str(r[0]) for r in rows if r[0]]
        except Exception as e:
            print(f"[ActivityLogService] get_distinct_dates error: {e}")
            return []

    @staticmethod
    def get_activity_logs(
        db: Session,
        username: Optional[str] = None,
        q: Optional[str] = None,
        action: Optional[str] = None,
        range_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        date: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 25
    ) -> Tuple[int, List[Dict[str, Any]], Optional[str]]:
        """Mengambil data log aktivitas dengan filter rentang waktu/kustom tanggal, sorting dinamis, dan pagination"""
        query = db.query(UserActivityLog)

        now = datetime.datetime.utcnow()
        if range_type == "today":
            cutoff = datetime.datetime(now.year, now.month, now.day)
            query = query.filter(UserActivityLog.created_at >= cutoff)
        elif range_type == "7d":
            cutoff = now - datetime.timedelta(days=7)
            query = query.filter(UserActivityLog.created_at >= cutoff)
        elif range_type == "30d":
            cutoff = now - datetime.timedelta(days=30)
            query = query.filter(UserActivityLog.created_at >= cutoff)
        elif range_type == "custom" and start_date and end_date:
            try:
                s_dt = datetime.datetime.strptime(start_date.strip(), "%Y-%m-%d")
                e_dt = datetime.datetime.strptime(end_date.strip(), "%Y-%m-%d") + datetime.timedelta(days=1)
                query = query.filter(UserActivityLog.created_at >= s_dt, UserActivityLog.created_at < e_dt)
            except ValueError:
                pass
        elif date and date != "all":
            try:
                target_date = datetime.date.fromisoformat(date.strip())
                next_day = target_date + datetime.timedelta(days=1)
                query = query.filter(
                    UserActivityLog.created_at >= datetime.datetime.combine(target_date, datetime.time.min),
                    UserActivityLog.created_at < datetime.datetime.combine(next_day, datetime.time.min)
                )
            except ValueError:
                pass  # Abaikan format tanggal yang tidak valid

        # Filter berdasarkan username/karyawan tertentu
        if username and username != "all":
            query = query.filter(UserActivityLog.username == username.strip())

        # Filter berdasarkan aksi
        if action and action != "all":
            query = query.filter(UserActivityLog.action == action.strip().upper())

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

        earliest = db.query(func.min(UserActivityLog.created_at)).scalar()
        min_date_str = earliest.strftime("%Y-%m-%d") if earliest else datetime.date.today().strftime("%Y-%m-%d")
        return total_count, results, min_date_str

    @staticmethod
    def cleanup_old_activity_logs(db: Session, days: int = 60) -> int:
        """Hapus log aktivitas yang lebih lama dari `days` hari. Default 60 hari (2 bulan)."""
        try:
            cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
            deleted = db.query(UserActivityLog).filter(UserActivityLog.created_at < cutoff).delete()
            db.commit()
            print(f"[ActivityLogService] Cleanup: {deleted} log aktivitas lama dihapus (> {days} hari)")
            return deleted
        except Exception as e:
            db.rollback()
            print(f"[ActivityLogService] cleanup_old_activity_logs error: {e}")
            return 0
