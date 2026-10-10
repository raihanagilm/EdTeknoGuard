import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import (
    require_admin, require_super_admin, get_password_hash, 
    get_all_kantor_codes, parse_allowed_kantor
)
from app.db.models import User, Kantor
from app.modules.activity_logs.service import ActivityLogService
from app.modules.users.controller import UsersController

VALID_ROLES = ["super admin", "admin", "teknisi"]

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/api/kantor/list")
async def get_kantors_json(request: Request, db: Session = Depends(get_db)):
    """Mengambil seluruh daftar kantor (kode & nama) untuk switcher dan manajemen kantor"""
    user_session = require_admin(request)
    kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()
    if not kantors:
        # Auto seed default jika kosong
        default_items = [
            ("pusat", "Pusat", "Kantor Pusat ISP"),
            ("cabang", "Cabang", "Kantor Cabang Operasional"),
            ("banyumas", "Banyumas", "Kantor Wilayah Banyumas")
        ]
        for k_code, k_name, k_desc in default_items:
            db.add(Kantor(kode=k_code, nama=k_name, alamat=k_desc))
        db.commit()
        kantors = db.query(Kantor).order_by(Kantor.id.asc()).all()

    return {
        "status": "success",
        "kantors": [{"id": k.id, "kode": k.kode, "nama": k.nama, "alamat": k.alamat or ""} for k in kantors]
    }

@router.post("/api/kantor/add")
async def add_kantor_json(request: Request, db: Session = Depends(get_db)):
    """Menambahkan kantor wilayah baru (Khusus Super Admin)"""
    user_session = require_super_admin(request)
    try:
        data = await request.json()
        nama = data.get("nama", "").strip()
        kode = data.get("kode", "").lower().strip()
        alamat = data.get("alamat", "").strip()
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    if not nama:
        return {"status": "error", "message": "Nama kantor wajib diisi."}
    
    if not kode:
        # Buat kode otomatis dari nama (hanya huruf & angka)
        kode = "".join(c for c in nama.lower() if c.isalnum() or c in ['_', '-']).strip()
        if not kode:
            kode = f"kantor_{int(datetime.now().timestamp())}"

    # Cek duplikasi kode
    existing = db.query(Kantor).filter(Kantor.kode == kode).first()
    if existing:
        return {"status": "error", "message": f"Kantor dengan kode '{kode}' sudah terdaftar."}

    new_kantor = Kantor(kode=kode, nama=nama, alamat=alamat if alamat else None)
    db.add(new_kantor)
    db.commit()
    db.refresh(new_kantor)

    ActivityLogService.log_activity(
        db=db,
        username=user_session.get("user"),
        action="ADD_KANTOR",
        ip_address=request.client.host if request.client else "unknown",
        status="SUCCESS",
        keterangan=f"Berhasil menambahkan kantor baru: {nama} ({kode})"
    )

    all_k = get_all_kantor_codes(db=db)
    return {
        "status": "success", 
        "message": f"Kantor '{nama}' berhasil ditambahkan dan siap digunakan.",
        "kantor": {"id": new_kantor.id, "kode": new_kantor.kode, "nama": new_kantor.nama, "alamat": new_kantor.alamat or ""},
        "all_kantor": all_k
    }

@router.get("/api/list")
async def get_users_json(request: Request, db: Session = Depends(get_db)):
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}
        
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
            "allowed_kantor": parse_allowed_kantor(u.allowed_kantor, all_k),
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%d/%m/%Y %H:%M") if u.created_at else "-",
            "updated_at": u.updated_at.strftime("%d/%m/%Y %H:%M") if u.updated_at else "-"
        })
    
    return {
        "status": "success",
        "users": users_data,
        "all_kantor": all_k
    }

@router.post("/api/add")
async def add_user_json(request: Request, db: Session = Depends(get_db)):
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}
    
    all_k = get_all_kantor_codes(db=db)
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        password = data.get("password", "")
        nama_karyawan = data.get("nama_karyawan", "").strip()
        no_wa = data.get("no_wa", "").strip()
        role = data.get("role", "teknisi").lower().strip()
        kantor = data.get("kantor", [all_k[0] if all_k else "cabang"])
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    if not username or not password:
        return {"status": "error", "message": "Username dan password wajib diisi."}

    if role not in VALID_ROLES:
        role = "teknisi"

    if role == "super admin":
        kantor_json = json.dumps(all_k)
    else:
        cleaned_kantor = parse_allowed_kantor(kantor, all_k)
        kantor_json = json.dumps(cleaned_kantor)

    try:
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            hashed_password=hashed_password,
            nama_karyawan=nama_karyawan if nama_karyawan else None,
            no_wa=no_wa if no_wa else None,
            role=role,
            allowed_kantor=kantor_json,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        ActivityLogService.log_activity(
            db=db,
            username=user_session.get("user"),
            action="ADD_USER",
            ip_address=request.client.host if request.client else "unknown",
            status="SUCCESS",
            keterangan=f"Berhasil menambahkan user: {username} ({role})"
        )
        return {"status": "success", "message": f"Pengguna '{username}' berhasil ditambahkan."}
    except IntegrityError:
        db.rollback()
        return {"status": "error", "message": f"Username '{username}' sudah terdaftar di sistem."}

@router.post("/api/edit/{user_id}")
async def edit_user_json(request: Request, user_id: int, db: Session = Depends(get_db)):
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "Pengguna tidak ditemukan."}

    all_k = get_all_kantor_codes(db=db)
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        password = data.get("password")
        nama_karyawan = data.get("nama_karyawan", "").strip()
        no_wa = data.get("no_wa", "").strip()
        role = data.get("role", user.role).lower().strip()
        kantor = data.get("kantor", [all_k[0] if all_k else "cabang"])
    except Exception:
        return {"status": "error", "message": "Payload JSON tidak valid."}

    if user.username == "admin":
        role = "super admin"
        kantor_json = json.dumps(all_k)
    else:
        if role not in VALID_ROLES:
            role = user.role
        if role == "super admin":
            kantor_json = json.dumps(all_k)
        else:
            cleaned_kantor = parse_allowed_kantor(kantor, all_k)
            kantor_json = json.dumps(cleaned_kantor)

    if username:
        user.username = username
    user.nama_karyawan = nama_karyawan if nama_karyawan else None
    user.no_wa = no_wa if no_wa else None
    user.role = role
    user.allowed_kantor = kantor_json

    if password:
        user.hashed_password = get_password_hash(password)

    db.commit()
    ActivityLogService.log_activity(
        db=db,
        username=user_session.get("user"),
        action="EDIT_USER",
        ip_address=request.client.host if request.client else "unknown",
        status="SUCCESS",
        keterangan=f"Berhasil mengedit data user: {user.username}"
    )
    return {"status": "success", "message": f"Data pengguna '{user.username}' berhasil diperbarui."}


@router.post("/api/toggle/{user_id}")
async def toggle_user_json(request: Request, user_id: int, db: Session = Depends(get_db)):
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "Pengguna tidak ditemukan."}

    if user.username == "admin":
        return {"status": "error", "message": "Akun admin utama tidak dapat dinonaktifkan."}

    if user.username == user_session.get("user"):
        return {"status": "error", "message": "Anda tidak dapat menonaktifkan akun sendiri."}

    try:
        data = await request.json()
        is_active = data.get("is_active", True)
    except Exception:
        is_active = not user.is_active

    user.is_active = is_active
    db.commit()

    status_str = "Aktif" if is_active else "Nonaktif"
    ActivityLogService.log_activity(
        db=db,
        username=user_session.get("user"),
        action="TOGGLE_USER",
        ip_address=request.client.host if request.client else "unknown",
        status="SUCCESS",
        keterangan=f"Mengubah status user {user.username} menjadi {status_str}"
    )
    return {"status": "success", "message": f"Status pengguna '{user.username}' diubah menjadi {status_str}."}

@router.post("/api/delete/{user_id}")
async def delete_user_json(request: Request, user_id: int, db: Session = Depends(get_db)):
    user_session = require_admin(request)
    if user_session.get("role") != "super admin":
        return {"status": "error", "message": "Hanya Super Admin yang diizinkan."}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "Pengguna tidak ditemukan."}

    if user.username == "admin":
        return {"status": "error", "message": "Akun admin utama dilarang dihapus."}

    if user.username == user_session.get("user"):
        return {"status": "error", "message": "Anda tidak dapat menghapus akun sendiri."}

    deleted_username = user.username
    db.delete(user)
    db.commit()

    ActivityLogService.log_activity(
        db=db,
        username=user_session.get("user"),
        action="DELETE_USER",
        ip_address=request.client.host if request.client else "unknown",
        status="SUCCESS",
        keterangan=f"Berhasil menghapus user: {deleted_username}"
    )
    return {"status": "success", "message": f"Pengguna '{deleted_username}' berhasil dihapus permanen."}
