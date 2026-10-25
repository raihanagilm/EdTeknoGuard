import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func, text

from app.core.timezone import get_now_wib, get_today_wib
from app.db.models import UserActivityLog

class ActivityLogService:

    @staticmethod
    def log_activity(
        db: Session,
        username: str,
        action: str,
        user_id: Optional[int] = None,
        nama_karyawan: Optional[str] = None,
        role: str = "admin",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "SUCCESS",
        keterangan: Optional[str] = None
    ) -> Optional[UserActivityLog]:
        """Mencatat entri aktivitas pengguna ke dalam database"""
        try:
            clean_username = username.strip() if username else "unknown"
            resolved_nama = nama_karyawan.strip() if nama_karyawan else ("Administrator NOC" if clean_username == "admin" else clean_username.title())
            resolved_role = role if (role and role != "admin") else ("super admin" if clean_username == "admin" else (role or "admin"))

            log_entry = UserActivityLog(
                user_id=user_id,
                username=clean_username,
                nama_karyawan=resolved_nama,
                role=resolved_role,
                action=action.upper(),
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                status=status.upper(),
                keterangan=keterangan,
                created_at=get_now_wib()
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
    def _build_log_filter(
        query,
        username: Optional[str] = None,
        q: Optional[str] = None,
        action: Optional[str] = None,
        range_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        date: Optional[str] = None
    ):
        now = get_now_wib()
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
                pass

        if username and username != "all":
            query = query.filter(UserActivityLog.username == username.strip())

        if action and action != "all":
            query = query.filter(UserActivityLog.action == action.strip().upper())

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

        return query

    @staticmethod
    def get_distinct_users(db: Session, target_kantor: Optional[str] = None, current_user: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
        """Mendapatkan daftar unik username & nama karyawan untuk filter dropdown lintas kantor"""
        from app.core.tenant_database import TenantDatabaseManager
        from app.core.security import get_all_kantor_codes

        kantor_list = []
        is_super = current_user and (current_user.get("role") == "super admin" or current_user.get("user") == "admin")
        if target_kantor and target_kantor.lower() != "all":
            kantor_list = [target_kantor.lower()]
        elif is_super:
            kantor_list = get_all_kantor_codes()
        elif current_user and current_user.get("allowed_kantor"):
            kantor_list = [k.lower() for k in current_user.get("allowed_kantor", [])]

        if not kantor_list:
            rows = db.query(UserActivityLog.username, UserActivityLog.nama_karyawan).distinct().all()
            return [{"username": r[0], "nama_karyawan": r[1] or r[0]} for r in rows if r[0]]

        user_dict = {}
        for k in kantor_list:
            try:
                t_sess = TenantDatabaseManager.get_tenant_session(k)
                try:
                    rows = t_sess.query(UserActivityLog.username, UserActivityLog.nama_karyawan).distinct().all()
                    for r in rows:
                        if r[0] and r[0] not in user_dict:
                            user_dict[r[0]] = r[1] or r[0]
                finally:
                    t_sess.close()
            except Exception:
                pass

        # Tambahkan juga dari master db
        try:
            rows = db.query(UserActivityLog.username, UserActivityLog.nama_karyawan).distinct().all()
            for r in rows:
                if r[0] and r[0] not in user_dict:
                    user_dict[r[0]] = r[1] or r[0]
        except Exception:
            pass

        return [{"username": u, "nama_karyawan": n} for u, n in sorted(user_dict.items(), key=lambda x: x[0])]

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
        limit: int = 15,
        target_kantor: Optional[str] = None,
        current_user: Optional[Dict[str, Any]] = None
    ) -> Tuple[int, List[Dict[str, Any]], Optional[str]]:
        """Mengambil data log aktivitas dengan dukungan multi-tenant (Super Admin dapat melihat semua kantor atau per kantor terpilih)"""
        from app.core.tenant_database import TenantDatabaseManager
        from app.core.security import get_all_kantor_codes

        is_super = current_user and (current_user.get("role") == "super admin" or current_user.get("user") == "admin")
        kantor_list = []
        if target_kantor and target_kantor.lower() != "all":
            kantor_list = [target_kantor.lower()]
        elif is_super:
            kantor_list = get_all_kantor_codes()
        elif current_user and current_user.get("allowed_kantor"):
            kantor_list = [k.lower() for k in current_user.get("allowed_kantor", [])]

        # Jika hanya 1 database spesifik dan bukan agregasi multi-kantor
        if len(kantor_list) <= 1:
            active_db = db
            close_sess = False
            active_k_name = kantor_list[0].upper() if kantor_list else "PUSAT"
            if kantor_list:
                try:
                    active_db = TenantDatabaseManager.get_tenant_session(kantor_list[0])
                    close_sess = True
                except Exception:
                    active_db = db
                    close_sess = False

            try:
                query = active_db.query(UserActivityLog)
                query = ActivityLogService._build_log_filter(
                    query=query,
                    username=username,
                    q=q,
                    action=action,
                    range_type=range_type,
                    start_date=start_date,
                    end_date=end_date,
                    date=date
                )
                total_count = query.count()

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
                        "kantor": active_k_name,
                        "username": l.username,
                        "nama_karyawan": l.nama_karyawan or l.username,
                        "role": l.role,
                        "action": l.action,
                        "ip_address": l.ip_address or "-",
                        "user_agent": l.user_agent or "-",
                        "status": l.status,
                        "keterangan": l.keterangan or "-",
                        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-",
                        "waktu": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-"
                    })

                earliest = active_db.query(func.min(UserActivityLog.created_at)).scalar()
                min_date_str = earliest.strftime("%Y-%m-%d") if earliest else get_today_wib().strftime("%Y-%m-%d")
                return total_count, results, min_date_str
            finally:
                if close_sess:
                    active_db.close()

        # Agregasi Lintas Semua Kantor (Super Admin Mode)
        all_logs = []
        earliest_dates = []

        # 1. Tarik dari database master jika ada
        try:
            q_master = db.query(UserActivityLog)
            q_master = ActivityLogService._build_log_filter(
                query=q_master,
                username=username,
                q=q,
                action=action,
                range_type=range_type,
                start_date=start_date,
                end_date=end_date,
                date=date
            )
            master_logs = q_master.all()
            for l in master_logs:
                all_logs.append({
                    "id": l.id,
                    "kantor": "MASTER",
                    "username": l.username,
                    "nama_karyawan": l.nama_karyawan or l.username,
                    "role": l.role,
                    "action": l.action,
                    "ip_address": l.ip_address or "-",
                    "user_agent": l.user_agent or "-",
                    "status": l.status,
                    "keterangan": l.keterangan or "-",
                    "raw_created_at": l.created_at,
                    "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-",
                    "waktu": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-"
                })
                if l.created_at:
                    earliest_dates.append(l.created_at)
        except Exception:
            pass

        # 2. Tarik dari setiap tenant DB kantor yang terdaftar
        for k in kantor_list:
            try:
                t_sess = TenantDatabaseManager.get_tenant_session(k)
                try:
                    q_tenant = t_sess.query(UserActivityLog)
                    q_tenant = ActivityLogService._build_log_filter(
                        query=q_tenant,
                        username=username,
                        q=q,
                        action=action,
                        range_type=range_type,
                        start_date=start_date,
                        end_date=end_date,
                        date=date
                    )
                    t_logs = q_tenant.all()
                    for l in t_logs:
                        all_logs.append({
                            "id": l.id,
                            "kantor": k.upper(),
                            "username": l.username,
                            "nama_karyawan": l.nama_karyawan or l.username,
                            "role": l.role,
                            "action": l.action,
                            "ip_address": l.ip_address or "-",
                            "user_agent": l.user_agent or "-",
                            "status": l.status,
                            "keterangan": l.keterangan or "-",
                            "raw_created_at": l.created_at,
                            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-",
                            "waktu": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "-"
                        })
                        if l.created_at:
                            earliest_dates.append(l.created_at)
                finally:
                    t_sess.close()
            except Exception as e:
                print(f"[ActivityLogService] Error fetching logs for kantor {k}: {e}")

        total_count = len(all_logs)

        # Sorting dinamis di memori
        reverse_sort = (sort_dir.lower() == "desc")
        if sort_by == "created_at":
            all_logs.sort(key=lambda x: x.get("raw_created_at") or datetime.datetime.min, reverse=reverse_sort)
        elif sort_by in ["username", "nama_karyawan", "role", "action", "ip_address", "status", "kantor"]:
            all_logs.sort(key=lambda x: str(x.get(sort_by, "")).lower(), reverse=reverse_sort)
        else:
            all_logs.sort(key=lambda x: x.get("raw_created_at") or datetime.datetime.min, reverse=True)

        offset = (page - 1) * limit
        paginated_logs = all_logs[offset:offset + limit]

        min_date_str = min(earliest_dates).strftime("%Y-%m-%d") if earliest_dates else get_today_wib().strftime("%Y-%m-%d")
        return total_count, paginated_logs, min_date_str

    @staticmethod
    def cleanup_old_activity_logs(db: Session, days: int = 60) -> int:
        """Hapus log aktivitas yang lebih lama dari `days` hari. Default 60 hari (2 bulan)."""
        try:
            cutoff = get_now_wib() - datetime.timedelta(days=days)
            deleted = db.query(UserActivityLog).filter(UserActivityLog.created_at < cutoff).delete()
            db.commit()
            print(f"[ActivityLogService] Cleanup: {deleted} log aktivitas lama dihapus (> {days} hari)")
            return deleted
        except Exception as e:
            db.rollback()
            print(f"[ActivityLogService] cleanup_old_activity_logs error: {e}")
            return 0
