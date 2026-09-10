from typing import Optional
from app.core.security import create_session_token

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "agiltampan"

class AuthService:

    @staticmethod
    def authenticate(username: str, password: str) -> Optional[str]:
        """Validasi kredensial admin dan kembalikan token sesi jika valid"""
        if username.strip() == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            return create_session_token(username.strip())
        return None
