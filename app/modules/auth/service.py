from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.core.security import create_session_token, verify_password
from app.db.models import User

class AuthService:

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[Tuple[str, User]]:
        """Validasi kredensial user dari database dan kembalikan (token_sesi, objek_user) jika valid"""
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        if user and verify_password(password, user.hashed_password):
            token = create_session_token(
                user.username, 
                role=user.role, 
                nama_karyawan=user.nama_karyawan,
                allowed_kantor=user.allowed_kantor
            )
            return token, user
        return None
