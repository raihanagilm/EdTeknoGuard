import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import get_password_hash, get_all_kantor_codes, parse_allowed_kantor
from app.db.models import User, Kantor, Pelanggan, UserKantor
from app.modules.activity_logs.service import ActivityLogService

logger = logging.getLogger("users_service")
VALID_ROLES = ["super admin", "admin", "teknisi"]

class UsersService:

    @staticmethod
    def get_kantors_list(db: Session) -> List[Dict[str, Any]]:
        """Mengambil seluruh daftar kantor, auto-seed default jika kosong"""
        kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()
        if not kantors:
            default_items = [
                ("pusat", "Pusat", "Kantor Pusat ISP", None, None, None, None),
                ("cabang", "Cabang", "Kantor Cabang Operasional", None, None, None, None),
                ("banyumas", "Banyumas", "Kantor Wilayah Banyumas", "192.168.202.50", 8728, "tekno", "tekno2025")
            ]
            for k_code, k_name, k_desc, m_host, m_port, m_user, m_pass in default_items:
                db.add(Kantor(
                    kode=k_code,
                    nama=k_name,
                    alamat=k_desc,
                    mikrotik_host=m_host,
                    mikrotik_port=m_port,
                    mikrotik_user=m_user,
                    mikrotik_pass=m_pass
                ))
            db.commit()
            kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()

        return [{
            "id": k.id,
            "kode": k.kode,
            "nama": k.nama,
            "is_active": k.is_active if k.is_active is not None else True,
            "alamat": k.alamat or "",
            "mikrotik_host": k.mikrotik_host or "",
            "mikrotik_port": k.mikrotik_port or "",
            "mikrotik_user": k.mikrotik_user or "",
            "mikrotik_pass": k.mikrotik_pass or "",
            "mikrotik_sync_interval": k.mikrotik_sync_interval if k.mikrotik_sync_interval is not None else 3,
            "last_mikrotik_sync": k.last_mikrotik_sync.strftime("%Y-%m-%d %H:%M:%S") if k.last_mikrotik_sync else None
        } for k in kantors]

    @staticmethod
    def add_kantor(
        db: Session,
        nama: str,
        kode: Optional[str] = None,
        is_active: bool = True,
        alamat: Optional[str] = None,
        mikrotik_host: Optional[str] = None,
        mikrotik_port: Optional[Any] = None,
        mikrotik_user: Optional[str] = None,
        mikrotik_pass: Optional[str] = None,
        sync_interval: int = 3,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[List[str]]]:
        """Menambahkan kantor wilayah baru dan menginisialisasi database fisik tenant"""
        nama = nama.strip() if nama else ""
        if not nama:
            return False, "Nama kantor wajib diisi.", None, None

        if not kode:
            kode = "".join(c for c in nama.lower() if c.isalnum() or c in ['_', '-']).strip()
            if not kode:
                kode = f"kantor_{int(datetime.now().timestamp())}"

        existing = db.query(Kantor).filter(Kantor.nama == nama).first()
        if existing:
            return False, f"Kantor dengan nama '{nama}' sudah terdaftar.", None, None

        parsed_port = None
        if mikrotik_port is not None and str(mikrotik_port).strip():
            try:
                parsed_port = int(str(mikrotik_port).strip())
            except ValueError:
                parsed_port = None

        try:
            parsed_interval = max(1, int(sync_interval))
        except (ValueError, TypeError):
            parsed_interval = 3

        new_kantor = Kantor(
            nama=nama,
            is_active=bool(is_active),
            alamat=alamat if alamat else None,
            mikrotik_host=mikrotik_host if mikrotik_host else None,
            mikrotik_port=parsed_port,
            mikrotik_user=mikrotik_user if mikrotik_user else None,
            mikrotik_pass=mikrotik_pass if mikrotik_pass else None,
            mikrotik_sync_interval=parsed_interval
        )
        db.add(new_kantor)
        db.commit()
        db.refresh(new_kantor)

        # Inisialisasi database tenant fisik
        try:
            from app.core.tenant_database import TenantDatabaseManager
            TenantDatabaseManager.provision_new_office(
                kode_kantor=new_kantor.kode,
                id_kantor=new_kantor.id,
                nama_kantor=new_kantor.nama
            )
        except Exception as e:
            logger.error(f"[KANTOR] Gagal membuat database tenant untuk '{nama}': {e}")

        ActivityLogService.log_activity(
            db=db,
            username=(user_session or {}).get("user", "admin"),
            action="ADD_KANTOR",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Berhasil menambahkan kantor baru & database fisik: {nama} ({kode}) dengan setting MikroTik {mikrotik_host or '-'} (Interval {parsed_interval}m)"
        )

        all_k = get_all_kantor_codes(db=db)
        kantor_data = {
            "id": new_kantor.id,
            "kode": new_kantor.kode,
            "nama": new_kantor.nama,
            "is_active": new_kantor.is_active,
            "alamat": new_kantor.alamat or "",
            "mikrotik_host": new_kantor.mikrotik_host or "",
            "mikrotik_port": new_kantor.mikrotik_port or "",
            "mikrotik_user": new_kantor.mikrotik_user or "",
            "mikrotik_pass": new_kantor.mikrotik_pass or "",
            "mikrotik_sync_interval": new_kantor.mikrotik_sync_interval,
            "last_mikrotik_sync": new_kantor.last_mikrotik_sync.strftime("%Y-%m-%d %H:%M:%S") if new_kantor.last_mikrotik_sync else None
        }
        return True, f"Kantor '{nama}' berhasil ditambahkan dan siap digunakan.", kantor_data, all_k

    @staticmethod
    def edit_kantor(
        db: Session,
        kantor_id: int,
        nama: str,
        is_active: Optional[bool] = None,
        alamat: Optional[str] = None,
        mikrotik_host: Optional[str] = None,
        mikrotik_port: Optional[Any] = None,
        mikrotik_user: Optional[str] = None,
        mikrotik_pass: Optional[str] = None,
        sync_interval: Optional[Any] = None,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[List[str]]]:
        """Mengubah data kantor wilayah & konfigurasi router MikroTik"""
        kantor = db.query(Kantor).filter(Kantor.id == kantor_id).first()
        if not kantor:
            return False, "Kantor tidak ditemukan.", None, None

        nama = nama.strip() if nama else ""
        if not nama:
            return False, "Nama kantor wajib diisi.", None, None

        old_kode = kantor.kode
        new_kode = nama.lower().strip()

        kantor.nama = nama
        if is_active is not None:
            kantor.is_active = bool(is_active)
        kantor.alamat = alamat if alamat else None

        kantor.mikrotik_host = mikrotik_host if mikrotik_host else None
        if mikrotik_port is not None and str(mikrotik_port).strip():
            try:
                kantor.mikrotik_port = int(str(mikrotik_port).strip())
            except ValueError:
                kantor.mikrotik_port = None
        else:
            kantor.mikrotik_port = None

        kantor.mikrotik_user = mikrotik_user if mikrotik_user else None
        if mikrotik_pass:
            kantor.mikrotik_pass = mikrotik_pass

        if sync_interval is not None:
            try:
                kantor.mikrotik_sync_interval = max(1, int(sync_interval))
            except (ValueError, TypeError):
                pass

        db.commit()

        if old_kode != new_kode:
            try:
                from app.core.tenant_database import TenantDatabaseManager
                TenantDatabaseManager.rename_tenant_database(old_kode, new_kode)
                logger.info(f"[KANTOR] Database fisik berhasil di-rename dari 'edtekno_{old_kode}' ke 'edtekno_{new_kode}'")
            except Exception as e:
                logger.error(f"[KANTOR] Gagal me-rename database fisik dari {old_kode} ke {new_kode}: {e}")

        sync_msg = ""
        if kantor.is_active and kantor.mikrotik_host and kantor.mikrotik_user:
            try:
                from app.services.mikrotik_service import MikroTikSyncService
                params = {
                    "host": kantor.mikrotik_host,
                    "port": kantor.mikrotik_port or 8728,
                    "username": kantor.mikrotik_user,
                    "password": kantor.mikrotik_pass or "",
                    "kantor": kantor.kode
                }
                from app.core.tenant_database import TenantDatabaseManager
                t_sess = TenantDatabaseManager.get_tenant_session(kantor.kode)
                try:
                    res_sync = MikroTikSyncService.sync_customers_from_mikrotik(t_sess, params)
                finally:
                    t_sess.close()
                if res_sync.get("success"):
                    sync_msg = f" Sinkronisasi otomatis berhasil: {res_sync.get('added_count', 0)} pelanggan baru ditambahkan, {res_sync.get('updated_count', 0)} diperbarui."
                else:
                    sync_msg = f" (Catatan: Router MikroTik belum dapat dijangkau: {res_sync.get('message')})"
            except Exception as e:
                sync_msg = f" (Catatan: Penarikan MikroTik gagal: {e})"

        ActivityLogService.log_activity(
            db=db,
            username=(user_session or {}).get("user", "admin"),
            action="EDIT_KANTOR",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Berhasil mengubah data kantor: {nama} ({kantor.kode}).{sync_msg}"
        )

        all_k = get_all_kantor_codes(db=db)
        kantor_data = {
            "id": kantor.id,
            "kode": kantor.kode,
            "nama": kantor.nama,
            "is_active": kantor.is_active,
            "alamat": kantor.alamat or "",
            "mikrotik_host": kantor.mikrotik_host or "",
            "mikrotik_port": kantor.mikrotik_port or "",
            "mikrotik_user": kantor.mikrotik_user or "",
            "mikrotik_pass": kantor.mikrotik_pass or "",
            "mikrotik_sync_interval": kantor.mikrotik_sync_interval,
            "last_mikrotik_sync": kantor.last_mikrotik_sync.strftime("%Y-%m-%d %H:%M:%S") if kantor.last_mikrotik_sync else None
        }
        return True, f"Data kantor '{nama}' berhasil diperbarui.{sync_msg}", kantor_data, all_k

    @staticmethod
    def delete_kantor(
        db: Session,
        kantor_id: int,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str, Optional[List[str]]]:
        """Menghapus kantor wilayah dan database fisik tenant"""
        kantor = db.query(Kantor).filter(Kantor.id == kantor_id).first()
        if not kantor:
            return False, "Kantor tidak ditemukan.", None

        pelanggan_count = db.query(Pelanggan).filter(
            (Pelanggan.id_kantor == kantor.id_kantor) | (Pelanggan.kantor == kantor.kode)
        ).count()
        if pelanggan_count > 0:
            return False, f"Kantor '{kantor.nama}' masih memiliki {pelanggan_count} pelanggan terdaftar. Pindahkan atau hapus pelanggan terlebih dahulu.", None

        deleted_nama = kantor.nama
        deleted_kode = kantor.kode
        db.delete(kantor)
        db.commit()

        try:
            from app.core.tenant_database import TenantDatabaseManager
            TenantDatabaseManager.drop_tenant_database(deleted_kode)
            logger.info(f"[KANTOR] Database fisik 'edtekno_{deleted_kode}' berhasil dihapus.")
        except Exception as e:
            logger.error(f"[KANTOR] Gagal menghapus database fisik edtekno_{deleted_kode}: {e}")

        ActivityLogService.log_activity(
            db=db,
            username=(user_session or {}).get("user", "admin"),
            action="DELETE_KANTOR",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Berhasil menghapus kantor & database fisik: {deleted_nama} ({deleted_kode})"
        )

        all_k = get_all_kantor_codes(db=db)
        return True, f"Kantor '{deleted_nama}' beserta database fisiknya berhasil dihapus permanen.", all_k

    @staticmethod
    def get_users_list(db: Session) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Mengambil seluruh daftar pengguna NOC"""
        all_k = get_all_kantor_codes(db=db)
        users = db.query(User).all()
        users_data = []
        for u in users:
            users_data.append({
                "id": u.id,
                "username": u.username,
                "nama_karyawan": u.nama_karyawan or "",
                "no_wa": u.no_wa or "",
                "role": u.role,
                "allowed_kantor": parse_allowed_kantor(u.allowed_kantor_list, all_k),
                "is_active": u.is_active,
                "created_at": u.created_at.strftime("%d/%m/%Y %H:%M") if u.created_at else "-",
                "updated_at": u.updated_at.strftime("%d/%m/%Y %H:%M") if u.updated_at else "-"
            })
        return users_data, all_k

    @staticmethod
    def add_user(
        db: Session,
        username: str,
        password: str,
        nama_karyawan: Optional[str] = None,
        no_wa: Optional[str] = None,
        role: str = "teknisi",
        kantor: Optional[Any] = None,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str]:
        """Menambahkan user baru dan sinkronisasi hak kantor"""
        username = username.strip() if username else ""
        if not username or not password:
            return False, "Username dan password wajib diisi."

        role = role.lower().strip() if role else "teknisi"
        if role not in VALID_ROLES:
            role = "teknisi"

        all_k = get_all_kantor_codes(db=db)
        if role == "super admin":
            kantor_json = json.dumps(all_k)
            target_kantors = all_k
        else:
            cleaned_kantor = parse_allowed_kantor(kantor, all_k)
            kantor_json = json.dumps(cleaned_kantor)
            target_kantors = cleaned_kantor

        try:
            hashed_password = get_password_hash(password)
            new_user = User(
                username=username,
                hashed_password=hashed_password,
                nama_karyawan=nama_karyawan.strip() if nama_karyawan else None,
                no_wa=no_wa.strip() if no_wa else None,
                role=role,
                allowed_kantor=kantor_json,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            # Sinkronisasi ke tabel pivot user_kantors
            all_kantor_objs = {k.nama.lower().strip(): k.id_kantor for k in db.query(Kantor).all()}
            for k_code in target_kantors:
                k_id = all_kantor_objs.get(k_code.lower().strip())
                if k_id:
                    db.add(UserKantor(user_id=new_user.id, id_kantor=k_id))
            db.commit()

            ActivityLogService.log_activity(
                db=db,
                user_id=(user_session or {}).get("user_id"),
                username=(user_session or {}).get("user", "admin"),
                action="ADD_USER",
                ip_address=client_ip,
                status="SUCCESS",
                keterangan=f"Berhasil menambahkan user: {username} ({role})"
            )
            return True, f"Pengguna '{username}' berhasil ditambahkan."
        except IntegrityError:
            db.rollback()
            return False, f"Username '{username}' sudah terdaftar di sistem."

    @staticmethod
    def edit_user(
        db: Session,
        user_id: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        nama_karyawan: Optional[str] = None,
        no_wa: Optional[str] = None,
        role: Optional[str] = None,
        kantor: Optional[Any] = None,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str]:
        """Mengubah profil, role, atau hak akses kantor user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Pengguna tidak ditemukan."

        all_k = get_all_kantor_codes(db=db)
        if user.username == "admin":
            role = "super admin"
            kantor_json = json.dumps(all_k)
            target_kantors = all_k
        else:
            role = (role or user.role).lower().strip()
            if role not in VALID_ROLES:
                role = user.role
            if role == "super admin":
                kantor_json = json.dumps(all_k)
                target_kantors = all_k
            else:
                cleaned_kantor = parse_allowed_kantor(kantor, all_k)
                kantor_json = json.dumps(cleaned_kantor)
                target_kantors = cleaned_kantor

        if username and username.strip():
            user.username = username.strip()
        user.nama_karyawan = nama_karyawan.strip() if nama_karyawan else None
        user.no_wa = no_wa.strip() if no_wa else None
        user.role = role
        user.allowed_kantor = kantor_json

        if password and password.strip():
            user.hashed_password = get_password_hash(password.strip())

        # Sinkronisasi ke tabel pivot user_kantors
        all_kantor_objs = {k.nama.lower().strip(): k.id_kantor for k in db.query(Kantor).all()}
        db.query(UserKantor).filter(UserKantor.user_id == user.id).delete()
        for k_code in target_kantors:
            k_id = all_kantor_objs.get(k_code.lower().strip())
            if k_id:
                db.add(UserKantor(user_id=user.id, id_kantor=k_id))

        db.commit()
        ActivityLogService.log_activity(
            db=db,
            user_id=(user_session or {}).get("user_id"),
            username=(user_session or {}).get("user", "admin"),
            action="EDIT_USER",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Berhasil mengedit data user: {user.username}"
        )
        return True, f"Data pengguna '{user.username}' berhasil diperbarui."

    @staticmethod
    def toggle_user(
        db: Session,
        user_id: int,
        is_active: Optional[bool] = None,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str]:
        """Mengaktifkan / menonaktifkan akun user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Pengguna tidak ditemukan."

        if user.username == "admin":
            return False, "Akun admin utama tidak dapat dinonaktifkan."

        current_username = (user_session or {}).get("user")
        if user.username == current_username:
            return False, "Anda tidak dapat menonaktifkan akun sendiri."

        user.is_active = not user.is_active if is_active is None else bool(is_active)
        db.commit()

        status_str = "Aktif" if user.is_active else "Nonaktif"
        ActivityLogService.log_activity(
            db=db,
            username=current_username or "admin",
            action="TOGGLE_USER",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Mengubah status user {user.username} menjadi {status_str}"
        )
        return True, f"Status pengguna '{user.username}' diubah menjadi {status_str}."

    @staticmethod
    def delete_user(
        db: Session,
        user_id: int,
        user_session: Optional[Dict[str, Any]] = None,
        client_ip: str = "unknown"
    ) -> Tuple[bool, str]:
        """Menghapus akun user permanen"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Pengguna tidak ditemukan."

        if user.username == "admin":
            return False, "Akun admin utama dilarang dihapus."

        current_username = (user_session or {}).get("user")
        if user.username == current_username:
            return False, "Anda tidak dapat menghapus akun sendiri."

        deleted_username = user.username
        db.delete(user)
        db.commit()

        ActivityLogService.log_activity(
            db=db,
            username=current_username or "admin",
            action="DELETE_USER",
            ip_address=client_ip,
            status="SUCCESS",
            keterangan=f"Berhasil menghapus user: {deleted_username}"
        )
        return True, f"Pengguna '{deleted_username}' berhasil dihapus permanen."

