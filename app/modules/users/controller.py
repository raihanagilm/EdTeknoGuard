from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import require_admin, get_password_hash
from app.db.models import User
from app.modules.activity_logs.service import ActivityLogService
from app.core.config import settings

templates = Jinja2Templates(directory="templates")

class UsersController:

    @staticmethod
    def render_users_page(request: Request, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "admin":
            return RedirectResponse("/", status_code=303)
            
        users = db.query(User).all()
        
        return templates.TemplateResponse(
            request=request,
            name="users/index.html",
            context={
                "request": request,
                "users": users,
                "current_user": user_session,
                "app_name": settings.APP_NAME
            }
        )

    @staticmethod
    def handle_add_user(request: Request, username: str, password: str, nama_karyawan: str, role: str, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "admin":
            return RedirectResponse("/", status_code=303)
            
        try:
            hashed_password = get_password_hash(password)
            new_user = User(
                username=username,
                hashed_password=hashed_password,
                nama_karyawan=nama_karyawan,
                role=role,
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
                keterangan=f"Berhasil menambahkan user baru: {username}"
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
    def handle_edit_user(request: Request, user_id: int, username: str, password: str, nama_karyawan: str, role: str, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "admin":
            return RedirectResponse("/", status_code=303)
            
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.username = username
            user.nama_karyawan = nama_karyawan
            user.role = role
            
            if password:
                user.hashed_password = get_password_hash(password)
                
            db.commit()
            ActivityLogService.log_activity(
                db=db,
                username=user_session.get("user"),
                action="EDIT_USER",
                ip_address=request.client.host if request.client else "unknown",
                status="SUCCESS",
                keterangan=f"Berhasil mengedit data user: {username}"
            )
            
        return RedirectResponse("/users", status_code=303)

    @staticmethod
    def handle_toggle_user(request: Request, user_id: int, is_active: bool, db: Session):
        user_session = require_admin(request)
        if user_session.get("role") != "admin":
            return RedirectResponse("/", status_code=303)
            
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.username != "admin":  # Prevent toggling the main admin
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
