from typing import Optional
from sqlalchemy.orm import Session
from app.core.security import create_session_token, verify_password
from app.db.models import User

class AuthService:

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[str]:
        """Validasi kredensial user dari database dan kembalikan token sesi jika valid"""
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        if user and verify_password(password, user.hashed_password):
            return create_session_token(user.username, role=user.role)
        return None
