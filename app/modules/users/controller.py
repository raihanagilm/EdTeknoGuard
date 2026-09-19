import json
from typing import List
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import require_admin, get_password_hash, ALL_KANTOR, parse_allowed_kantor
from app.db.models import User
from app.modules.activity_logs.service import ActivityLogService
from app.core.config import settings

templates = Jinja2Templates(directory="templates")

VALID_ROLES = ["super admin", "admin", "teknisi"]

class UsersController:

    @staticmethod
    def render_users_page(request: Request, db: Session):
        user_session = require_admin(request)
        # Khusus Super Admin saja
        if user_session.get("role") != "super admin":
            return RedirectResponse("/", status_code=303)
            
        users = db.query(User).all()
        # Parse allowed_kantor untuk setiap user agar mudah di template
        users_data = []
        for u in users:
            users_data.append({
                "id": u.id,
                "username": u.username,
                "nama_karyawan": u.nama_karyawan or "",
                "role": u.role,
                "allowed_kantor": parse_allowed_kantor(u.allowed_kantor),
                "is_active": u.is_active,
                "created_at": u.created_at,
                "updated_at": u.updated_at
            })
        
        return templates.TemplateResponse(
            request=request,
            name="users/index.html",
            context={
                "request": request,
                "users": users_data,
                "current_user": user_session,
                "all_kantor": ALL_KANTOR,
                "app_name": settings.APP_NAME
            }
        )

    @staticmethod
    def handle_add_user(
        request: Request, 
        username: str, 
        password: str, 
        nama_karyawan: str, 
        role: str, 
        kantor: List[str], 
        db: Session
    ):
        user_session = require_admin(request)
        if user_session.get("role") != "super admin":
            return RedirectResponse("/", status_code=303)
            
        clean_role = role.lower().strip()
        if clean_role not in VALID_ROLES:
            clean_role = "teknisi"

        if clean_role == "super admin":
            kantor_json = json.dumps(ALL_KANTOR)
        else:
            cleaned_kantor = parse_allowed_kantor(kantor)
            kantor_json = json.dumps(cleaned_kantor)

        try:
            hashed_password = get_password_hash(password)
            new_user = User(
                username=username.strip(),
                hashed_password=hashed_password,
                nama_karyawan=nama_karyawan.strip() if nama_karyawan else None,
                role=clean_role,
                allowed_kantor=kantor_json,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            
            ActivityLogService.log_activity(
                db=db,
                username=user_session.get("user"),
                action="ADD_USER",
                ip_address=request.client.host if request.client else "unknown",
                status="SUCCESS",
                keterangan=f"Berhasil menambahkan user baru: {username} (Role: {clean_role}, Kantor: {kantor_json})"
            )
            
        except IntegrityError:
            db.rollback()
            ActivityLogService.log_activity(
                db=db,
                username=user_session.get("user"),
                action="ADD_USER_FAILED",
                ip_address=request.client.host if request.client else "unknown",
                status="FAILED",
                keterangan=f"Gagal menambahkan user, username {username} sudah ada"
            )
            
        return RedirectResponse("/users", status_code=303)

    @staticmethod
    def handle_edit_user(
        request: Request, 
        user_id: int, 
        username: str, 
        password: str, 
        nama_karyawan: str, 
        role: str, 
        kantor: List[str], 
        db: Session
    ):
        user_session = require_admin(request)
        if user_session.get("role") != "super admin":
            return RedirectResponse("/", status_code=303)
            
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            clean_role = role.lower().strip()
            if clean_role not in VALID_ROLES:
                clean_role = user.role

            # Super admin tidak bisa mendowngrade akun 'admin' utama
            if user.username == "admin":
                clean_role = "super admin"
                kantor_json = json.dumps(ALL_KANTOR)
            else:
                if clean_role == "super admin":
                    kantor_json = json.dumps(ALL_KANTOR)
                else:
                    cleaned_kantor = parse_allowed_kantor(kantor)
                    kantor_json = json.dumps(cleaned_kantor)

            user.username = username.strip()
            user.nama_karyawan = nama_karyawan.strip() if nama_karyawan else None
            user.role = clean_role
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
                keterangan=f"Berhasil mengedit data user: {username} (Role: {clean_role}, Kantor: {kantor_json})"
            )
            
        return RedirectResponse("/users", status_code=303)

    @staticmethod
    def handle_toggle_user(request: Request, user_id: int, is_active: bool, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "super admin":
            return RedirectResponse("/", status_code=303)
            
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.username != "admin":  # Prevent toggling the main admin
            # Super admin tidak bisa menonaktifkan akun dirinya sendiri
            if user.username == user_session.get("user"):
                return RedirectResponse("/users", status_code=303)

            user.is_active = is_active
            db.commit()
            
            status_str = "Aktif" if is_active else "Nonaktif"
            ActivityLogService.log_activity(
                db=db,
                username=user_session.get("user"),
                action="TOGGLE_USER",
                ip_address=request.client.host if request.client else "unknown",
                status="SUCCESS",
                keterangan=f"Berhasil mengubah status user {user.username} menjadi {status_str}"
            )
            
        return RedirectResponse("/users", status_code=303)

    @staticmethod
    def handle_delete_user(request: Request, user_id: int, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "super admin":
            return RedirectResponse("/", status_code=303)
            
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Tidak bisa menghapus akun 'admin' utama
            if user.username == "admin":
                return RedirectResponse("/users", status_code=303)
            
            # Super admin tidak bisa menghapus dirinya sendiri
            if user.username == user_session.get("user"):
                return RedirectResponse("/users", status_code=303)

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
            
        return RedirectResponse("/users", status_code=303)
