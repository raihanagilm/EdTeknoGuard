from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.users.controller import UsersController

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_class=Response)
async def users_page(request: Request, db: Session = Depends(get_db)):
    return UsersController.render_users_page(request, db)

@router.post("/add")
async def add_user(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    nama_karyawan: str = Form(""),
    role: str = Form("operator"),
    db: Session = Depends(get_db)
):
    return UsersController.handle_add_user(request, username, password, nama_karyawan, role, db)

@router.post("/edit/{user_id}")
async def edit_user(
    request: Request,
    user_id: int,
    username: str = Form(...),
    password: str = Form(None),
    nama_karyawan: str = Form(""),
    role: str = Form("operator"),
    db: Session = Depends(get_db)
):
    return UsersController.handle_edit_user(request, user_id, username, password, nama_karyawan, role, db)

@router.post("/toggle/{user_id}")
async def toggle_user(
    request: Request,
    user_id: int,
    is_active: bool = Form(...),
    db: Session = Depends(get_db)
):
    return UsersController.handle_toggle_user(request, user_id, is_active, db)

@router.post("/delete/{user_id}")
async def delete_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db)
):
    return UsersController.handle_delete_user(request, user_id, db)
