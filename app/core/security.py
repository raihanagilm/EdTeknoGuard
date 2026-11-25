import ipaddress
import json
import re
from typing import Optional, Dict, Any, List
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from app.core.config import settings

import bcrypt

SESSION_COOKIE_NAME = "edteknoguard_session"
MAX_SESSION_AGE = 86400 * 30  # 30 hari inaktivitas (2.592.000 detik)
DEFAULT_CUSTOMER_PASSWORD = "123456"
DEFAULT_KANTORS = ["banyumas", "pusat"]
ALL_KANTOR = DEFAULT_KANTORS

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="edteknoguard-admin-session")


_TRUSTED_PROXY_NETWORKS = (
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
)


def _is_trusted_proxy_peer(peer_host: Optional[str]) -> bool:
    """Memeriksa apakah peer koneksi langsung adalah reverse proxy lokal / TestClient terpercaya."""
    if not peer_host:
        return False
    if peer_host in ("127.0.0.1", "::1", "localhost", "testclient"):
        return True
    try:
        ip_obj = ipaddress.ip_address(peer_host)
        return any(ip_obj in net for net in _TRUSTED_PROXY_NETWORKS)
    except ValueError:
        return False


def get_trusted_client_ip(request: Request) -> str:
    """
    Mengambil IP klien secara aman tanpa rentan spoofing header:
    - Jika koneksi langsung bukan dari reverse proxy lokal/private, abaikan header proxy.
    - Jika di belakang reverse proxy (Nginx/Cloudflare Tunnel), prioritaskan cf-connecting-ip,
      lalu x-real-ip, lalu IP paling kanan pada x-forwarded-for.
    """
    peer_host = request.client.host if getattr(request, "client", None) else ""
    if not _is_trusted_proxy_peer(peer_host):
        return peer_host or "unknown"

    cf_ip = (request.headers.get("cf-connecting-ip") or "").strip()
    if cf_ip:
        return cf_ip

    real_ip = (request.headers.get("x-real-ip") or "").strip()
    if real_ip:
        return real_ip

    xff = (request.headers.get("x-forwarded-for") or "").strip()
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]

    return peer_host or "unknown"


def is_https_request(request: Request) -> bool:
    """Mendeteksi apakah request masuk melalui HTTPS (langsung atau via proxy header)."""
    proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip().lower()
    if proto == "https":
        return True
    scheme = getattr(getattr(request, "url", None), "scheme", "")
    return str(scheme).lower() == "https"

def get_all_kantor_codes(db=None, active_only: bool = True) -> List[str]:
    """Mengambil seluruh kode kantor aktif secara dinamis dari tabel master `kantors` di database."""
    if db is not None:
        try:
            from app.db.models import Kantor
            q = db.query(Kantor.nama)
            if active_only:
                q = q.filter(Kantor.is_active == True)
            return [k[0].lower().strip() for k in q.order_by(Kantor.id_kantor.asc()).all() if k[0]]
        except Exception:
            return []
    else:
        try:
            from app.core.database import SessionLocal
            from app.db.models import Kantor
            session = SessionLocal()
            try:
                q = session.query(Kantor.nama)
                if active_only:
                    q = q.filter(Kantor.is_active == True)
                return [k[0].lower().strip() for k in q.order_by(Kantor.id_kantor.asc()).all() if k[0]]
            finally:
                session.close()
        except Exception:
            return []

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:

    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')



def is_default_customer_password(cust: Any, candidate_phones: Optional[List[str]] = None) -> bool:

    """

    Memeriksa apakah kata sandi pelanggan masih kata sandi bawaan sistem:

    1. Belum ada password_hash

    2. Cocok dengan default '123456'

    3. Cocok dengan variasi format nomor WhatsApp terdaftar (08..., 628..., 8..., +628...)

    Jika pelanggan sudah mengubah sandi kustom sendiri (misal: 'rahasia123'), fungsi ini mengembalikan False.

    """

    if not cust or not getattr(cust, "password_hash", None):

        return True



    # 1. Cek default '123456'

    if verify_password(DEFAULT_CUSTOMER_PASSWORD, cust.password_hash):

        return True



    # 2. Cek seluruh variasi format nomor WhatsApp

    phones_to_check = []

    cust_no_hp = getattr(cust, "no_hp", None)

    if cust_no_hp:

        phones_to_check.append(str(cust_no_hp))

    if candidate_phones:

        phones_to_check.extend([str(p) for p in candidate_phones if p])



    for raw_phone in phones_to_check:

        clean = re.sub(r'[^0-9]', '', str(raw_phone).strip())

        if not clean:

            continue

        core = clean

        if core.startswith("62"):

            core = core[2:]

        elif core.startswith("0"):

            core = core[1:]



        if len(core) >= 8:

            variants = [clean, core, f"0{core}", f"62{core}"]

            for v in variants:

                if verify_password(v, cust.password_hash):

                    return True



    return False



def parse_allowed_kantor(allowed_kantor_val, valid_kantors: Optional[List[str]] = None) -> List[str]:
    valid_list = [k.lower().strip() for k in (valid_kantors or get_all_kantor_codes())]
    if isinstance(allowed_kantor_val, list):
        filtered = [k.lower().strip() for k in allowed_kantor_val if k.lower().strip() in valid_list]
        return filtered if filtered else [valid_list[0]] if valid_list else ["banyumas"]
    if isinstance(allowed_kantor_val, str):
        try:
            parsed = json.loads(allowed_kantor_val)
            if isinstance(parsed, list):
                filtered = [k.lower().strip() for k in parsed if k.lower().strip() in valid_list]
                return filtered if filtered else [valid_list[0]] if valid_list else ["banyumas"]
        except Exception:
            pass
        items = [k.lower().strip() for k in allowed_kantor_val.split(",") if k.lower().strip() in valid_list]
        if items:
            return items
    return [valid_list[0]] if valid_list else ["banyumas"]

def create_session_token(username: str, role: Optional[str] = None, nama_karyawan: str = "User", allowed_kantor: Optional[List[str]] = None, user_id: Optional[int] = None) -> str:
    actual_role = role or ("super admin" if username == "admin" else "teknisi")
    all_k = get_all_kantor_codes()
    if actual_role == "super admin" or username == "admin":
        kantor_list = all_k
    else:
        kantor_list = parse_allowed_kantor(allowed_kantor, all_k) if allowed_kantor else [all_k[0] if all_k else "banyumas"]
    return _serializer.dumps({
        "token_type": "admin",
        "user_id": user_id,
        "user": username,
        "role": actual_role,
        "nama_karyawan": nama_karyawan,
        "allowed_kantor": kantor_list
    })

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        if not isinstance(data, dict):
            return None
        if data.get("token_type") != "admin" or not data.get("user"):
            return None
        if data.get("role") not in ("super admin", "admin", "teknisi"):
            return None
        all_k = get_all_kantor_codes()
        # Pastikan allowed_kantor selalu ada dan up to date
        if "allowed_kantor" not in data or data.get("role") == "super admin" or data.get("user") == "admin":
            if data.get("role") == "super admin" or data.get("user") == "admin":
                data["allowed_kantor"] = all_k
            else:
                data["allowed_kantor"] = [all_k[0] if all_k else "banyumas"]
        return data
    except (BadSignature, SignatureExpired):
        return None

def get_user_allowed_kantor(user: Dict[str, Any]) -> List[str]:
    if not user:
        return []
    all_k = get_all_kantor_codes()
    if user.get("role") == "super admin" or user.get("user") == "admin":
        return all_k
    return parse_allowed_kantor(user.get("allowed_kantor"), all_k)

def get_active_kantor(request: Request, user: Optional[Dict[str, Any]]) -> str:
    all_k = get_all_kantor_codes()
    allowed = get_user_allowed_kantor(user) if user else all_k

    # Prioritas: 1. Query param ?kantor=, 2. Header X-Active-Kantor, 3. Cookie active_kantor
    candidate = (
        request.query_params.get("kantor")
        or request.headers.get("X-Active-Kantor")
        or request.cookies.get("active_kantor", "")
    ).strip().lower()

    if candidate and candidate in allowed and candidate != "all":
        return candidate

    return allowed[0] if allowed else (all_k[0] if all_k else "")

def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        return None

    return verify_session_token(token)

def require_admin(request: Request) -> Dict[str, Any]:
    user = get_current_user_optional(request)
    if not user:
        # Jika request meminta HTML (dari browser)
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header or request.method == "GET" and not request.url.path.startswith("/api/"):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                detail="Not authenticated",
                headers={"Location": "/login"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akses ditolak. Silakan login."
        )
    return user

def require_admin_role(request: Request) -> Dict[str, Any]:
    """Proteksi endpoint untuk role admin dan super admin. Teknisi dilarang akses."""
    user = require_admin(request)
    if user.get("role") not in ["admin", "super admin"]:
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header or (request.method == "GET" and not request.url.path.startswith("/api/")):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                detail="Akses khusus Admin & Super Admin",
                headers={"Location": "/"}
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Fitur ini hanya untuk Admin dan Super Admin."
        )
    return user

def require_super_admin(request: Request) -> Dict[str, Any]:
    user = require_admin(request)
    if user.get("role") != "super admin":
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header or request.method == "GET" and not request.url.path.startswith("/api/"):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                detail="Akses khusus Super Admin",
                headers={"Location": "/"}
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Fitur ini hanya untuk Super Admin."
        )
    return user

require_login = require_admin

