import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_master_db
from app.core.security import require_admin, require_super_admin
from app.modules.users.service import UsersService
from app.db.models import Kantor

logger = logging.getLogger("users_routes")
router = APIRouter(prefix="/users", tags=["Users"])

# ------------------------------------------------------------------------------
# API KANTOR CABANG (MULTI-TENANT OFFICE MANAGEMENT)
# ------------------------------------------------------------------------------

@router.get("/api/kantor/list")
async def get_kantors_json(request: Request, db: Session = Depends(get_master_db)):
    """Mengambil seluruh daftar kantor (kode & nama) untuk switcher dan manajemen kantor"""
    require_admin(request)
    kantors = UsersService.get_kantors_list(db)
    return {"status": "success", "kantors": kantors}


@router.post("/api/kantor/add")
async def add_kantor_json(request: Request, db: Session = Depends(get_master_db)):
    """Menambahkan kantor wilayah baru lengkap dengan setting router MikroTik (Khusus Super Admin)"""
    user_session = require_super_admin(request)
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    client_ip = request.client.host if request.client else "unknown"
    success, msg, kantor_data, all_k = UsersService.add_kantor(
        db=db,
        nama=data.get("nama", ""),
        kode=data.get("kode"),
        is_active=data.get("is_active", True),
        alamat=data.get("alamat"),
        mikrotik_host=data.get("mikrotik_host"),
        mikrotik_port=data.get("mikrotik_port"),
        mikrotik_user=data.get("mikrotik_user"),
        mikrotik_pass=data.get("mikrotik_pass"),
        sync_interval=data.get("mikrotik_sync_interval", 3),
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {
        "status": "success",
        "message": msg,
        "kantor": kantor_data,
        "all_kantor": all_k
    }


@router.post("/api/kantor/edit/{kantor_id}")
async def edit_kantor_json(request: Request, kantor_id: int, db: Session = Depends(get_master_db)):
    """Mengubah data kantor wilayah & setting router MikroTik (Khusus Super Admin)"""
    user_session = require_super_admin(request)
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    client_ip = request.client.host if request.client else "unknown"
    success, msg, kantor_data, all_k = UsersService.edit_kantor(
        db=db,
        kantor_id=kantor_id,
        nama=data.get("nama", ""),
        is_active=data.get("is_active"),
        alamat=data.get("alamat"),
        mikrotik_host=data.get("mikrotik_host"),
        mikrotik_port=data.get("mikrotik_port"),
        mikrotik_user=data.get("mikrotik_user"),
        mikrotik_pass=data.get("mikrotik_pass"),
        sync_interval=data.get("mikrotik_sync_interval"),
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {
        "status": "success",
        "message": msg,
        "kantor": kantor_data,
        "all_kantor": all_k
    }


@router.post("/api/kantor/delete/{kantor_id}")
async def delete_kantor_json(request: Request, kantor_id: int, db: Session = Depends(get_master_db)):
    """Menghapus kantor wilayah (Khusus Super Admin)"""
    user_session = require_super_admin(request)
    client_ip = request.client.host if request.client else "unknown"
    success, msg, all_k = UsersService.delete_kantor(
        db=db,
        kantor_id=kantor_id,
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {
        "status": "success",
        "message": msg,
        "all_kantor": all_k
    }


@router.post("/api/kantor/sync/{kantor_id}")
async def sync_kantor_mikrotik_json(request: Request, kantor_id: int, db: Session = Depends(get_master_db)):
    """Memicu penarikan data pelanggan langsung (on-demand) dari router MikroTik kantor terkait"""
    user_session = require_admin(request)
    kantor = db.query(Kantor).filter(Kantor.id == kantor_id).first()
    if not kantor:
        return {"status": "error", "message": "Kantor tidak ditemukan."}

    if not kantor.is_active:
        return {
            "status": "error",
            "message": f"Kantor '{kantor.nama}' dalam status Nonaktif. Aktifkan kantor terlebih dahulu sebelum menyinkronkan router MikroTik."
        }

    if not kantor.mikrotik_host or not kantor.mikrotik_user:
        return {
            "status": "error",
            "message": f"Kredensial MikroTik untuk kantor '{kantor.nama}' belum diatur (Host & Username wajib diisi)."
        }

    from app.services.mikrotik_service import MikroTikSyncService
    params = {
        "host": kantor.mikrotik_host,
        "port": kantor.mikrotik_port or 8728,
        "username": kantor.mikrotik_user,
        "password": kantor.mikrotik_pass or "",
        "kantor": kantor.kode
    }

    try:
        from app.core.tenant_database import TenantDatabaseManager
        t_sess = TenantDatabaseManager.get_tenant_session(kantor.kode)
        try:
            res = MikroTikSyncService.sync_customers_from_mikrotik(t_sess, params)
        finally:
            t_sess.close()

        if res.get("success"):
            from app.core.timezone import get_now_wib
            from app.modules.activity_logs.service import ActivityLogService
            kantor.last_mikrotik_sync = get_now_wib()
            db.commit()
            ActivityLogService.log_activity(
                db=db,
                username=user_session.get("user"),
                action="MANUAL_SYNC_MIKROTIK",
                ip_address=request.client.host if request.client else "unknown",
                status="SUCCESS",
                keterangan=f"Sinkronisasi manual MikroTik kantor {kantor.nama} ({kantor.mikrotik_host}): {res.get('added_count', 0)} baru, {res.get('updated_count', 0)} diperbarui."
            )
            return {
                "status": "success",
                "message": res.get("message", "Sinkronisasi MikroTik berhasil!"),
                "data": res
            }
        else:
            host_str = f"{kantor.mikrotik_host}:{kantor.mikrotik_port or 8728}"
            error_msg = f"Router MikroTik ({host_str}) tidak dapat dijangkau. Pastikan jaringan server terhubung ke jaringan router."
            return {
                "status": "error",
                "message": error_msg,
                "raw_error": res.get("message")
            }
    except Exception as e:
        host_str = f"{kantor.mikrotik_host}:{kantor.mikrotik_port or 8728}"
        return {
            "status": "error",
            "message": f"Router MikroTik ({host_str}) tidak dapat dijangkau. Pastikan jaringan server terhubung ke jaringan router. Detail: {e}"
        }


# ------------------------------------------------------------------------------
# API PENGGUNA NOC (USER MANAGEMENT)
# ------------------------------------------------------------------------------

@router.get("/api/list")
async def get_users_json(request: Request, db: Session = Depends(get_master_db)):
    """Mengambil daftar pengguna NOC (Khusus Super Admin)"""
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    users_data, all_k = UsersService.get_users_list(db)
    return {
        "status": "success",
        "users": users_data,
        "all_kantor": all_k
    }


@router.post("/api/add")
async def add_user_json(request: Request, db: Session = Depends(get_master_db)):
    """Menambahkan akun pengguna baru (Khusus Super Admin)"""
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    client_ip = request.client.host if request.client else "unknown"
    success, msg = UsersService.add_user(
        db=db,
        username=data.get("username", ""),
        password=data.get("password", ""),
        nama_karyawan=data.get("nama_karyawan"),
        no_wa=data.get("no_wa"),
        role=data.get("role", "teknisi"),
        kantor=data.get("kantor"),
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {"status": "success", "message": msg}


@router.post("/api/edit/{user_id}")
async def edit_user_json(request: Request, user_id: int, db: Session = Depends(get_master_db)):
    """Mengubah profil dan kewenangan pengguna (Khusus Super Admin)"""
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    client_ip = request.client.host if request.client else "unknown"
    success, msg = UsersService.edit_user(
        db=db,
        user_id=user_id,
        username=data.get("username"),
        password=data.get("password"),
        nama_karyawan=data.get("nama_karyawan"),
        no_wa=data.get("no_wa"),
        role=data.get("role"),
        kantor=data.get("kantor"),
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {"status": "success", "message": msg}


@router.post("/api/toggle/{user_id}")
async def toggle_user_json(request: Request, user_id: int, db: Session = Depends(get_master_db)):
    """Mengaktifkan / menonaktifkan pengguna (Khusus Super Admin)"""
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    try:
        data = await request.json()
        is_active = data.get("is_active")
    except Exception:
        is_active = None

    client_ip = request.client.host if request.client else "unknown"
    success, msg = UsersService.toggle_user(
        db=db,
        user_id=user_id,
        is_active=is_active,
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {"status": "success", "message": msg}


@router.post("/api/delete/{user_id}")
async def delete_user_json(request: Request, user_id: int, db: Session = Depends(get_master_db)):
    """Menghapus akun pengguna (Khusus Super Admin)"""
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    client_ip = request.client.host if request.client else "unknown"
    success, msg = UsersService.delete_user(
        db=db,
        user_id=user_id,
        user_session=user_session,
        client_ip=client_ip
    )

    if not success:
        return {"status": "error", "message": msg}

    return {"status": "success", "message": msg}
