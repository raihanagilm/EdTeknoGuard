from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.security import is_default_customer_password
import ipaddress
import bcrypt

# Subnet IP Publik resmi PT Tekno Indo Jaya (AS153729) untuk klien yang terhubung ke jaringan ISP
TEKNO_ISP_PUBLIC_SUBNETS = [
    ipaddress.ip_network("38.253.120.0/24"),
    ipaddress.ip_network("38.253.121.0/24"),
    ipaddress.ip_network("163.223.112.0/24"),
]

CUSTOMER_SESSION_COOKIE = "edtekno_pelanggan_session"
MAX_SESSION_AGE = 86400 * 60  # 60 Hari (2 Bulan) Inaktivitas Sesi Pelanggan

_customer_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="edtekno-customer-session")
_reset_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="edtekno-password-reset")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_customer_session_token(
    id_pelanggan: str,
    nama: str,
    status_verifikasi: str,
    kantor: str,
    account_id: Optional[int] = None
) -> str:
    return _customer_serializer.dumps({
        "token_type": "customer",
        "id_pelanggan": id_pelanggan,
        "nama": nama,
        "status_verifikasi": status_verifikasi,
        "kantor": (kantor or "").lower().strip(),
        "account_id": account_id
    })

def verify_customer_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        data = _customer_serializer.loads(token, max_age=MAX_SESSION_AGE)
        if not isinstance(data, dict) or data.get("token_type") != "customer" or not data.get("id_pelanggan"):
            return None
        return data
    except (BadSignature, SignatureExpired):
        return None

def create_password_reset_token(id_pelanggan: str, no_hp: str, kantor: str) -> str:
    """Membuat token bertanda tangan kriptografis untuk reset kata sandi mandiri berbatas 15 menit."""
    return _reset_serializer.dumps({
        "type": "password_reset",
        "id_pelanggan": id_pelanggan,
        "no_hp": no_hp,
        "kantor": (kantor or "").lower().strip()
    })

def verify_password_reset_token(token: str, max_age: int = 900) -> Optional[Dict[str, Any]]:
    """Memverifikasi token reset kata sandi (default 15 menit = 900 detik)."""
    if not token:
        return None
    try:
        data = _reset_serializer.loads(token, max_age=max_age)
        if isinstance(data, dict) and data.get("type") == "password_reset":
            return data
        return None
    except (BadSignature, SignatureExpired):
        return None

def get_current_customer_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(CUSTOMER_SESSION_COOKIE)
    if not token:
        return None
    return verify_customer_session_token(token)

def get_portal_base_url(request: Request) -> str:
    root = request.scope.get("root_path", "")
    if root.startswith("/portal"):
        return root.rstrip("/")
    if request.url.path.startswith("/portal"):
        return "/portal"
    return ""

def require_customer_login(request: Request) -> Dict[str, Any]:
    cust = get_current_customer_optional(request)
    if not cust:
        base = get_portal_base_url(request)
        raise HTTPException(
            status_code=303,
            detail="Silakan login terlebih dahulu",
            headers={"Location": f"{base}/login"}
        )
    return cust


def check_is_home_wifi(request: Request, pelanggan) -> bool:
    """
    Validasi ketat apakah perangkat klien saat ini benar-benar terhubung ke WiFi modem pelanggan:
    1. Kecocokan IP WAN/Router persis (client_ip == ip_target) dari IP terverifikasi.
    2. Pengecekan jaringan ISP Tekno Indo Jaya (Klien Web Browser melalui CGNAT / IP Publik ISP).
    3. Pengecekan perangkat lokal (Localhost / Development) mencocokkan SSID atau ARP MAC.
    4. Klien dari luar jangkauan / subnet lain / header palsu -> False (Ditolak).
    """
    if not pelanggan:
        return False

    from app.core.security import get_trusted_client_ip
    client_ip = get_trusted_client_ip(request)

    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    cust_mac = (pelanggan.mac_address or (pelanggan.perangkat.mac_address if pelanggan.perangkat else "") or "").strip().upper()
    cust_ssid = (pelanggan.nama_wifi or (pelanggan.perangkat.nama_wifi if pelanggan.perangkat else "") or "").strip().lower()

    # 1. Kecocokan IP WAN/Router persis
    if ip_target and client_ip and client_ip == ip_target:
        return True

    # 2. Pengecekan jaringan ISP Tekno Indo Jaya (Klien Web Browser melalui CGNAT / IP Publik ISP)
    if client_ip:
        try:
            c_addr = ipaddress.ip_address(client_ip)
            if any(c_addr in net for net in TEKNO_ISP_PUBLIC_SUBNETS):
                st_lease = getattr(pelanggan, "status_lease", None)
                if st_lease != "waiting":
                    return True
        except Exception:
            pass

    # 4. Pengecekan perangkat lokal (Localhost / Development)
    if client_ip in ["127.0.0.1", "::1", "localhost"]:
        import subprocess, re
        
        # A. Cocokkan SSID aktif adaptor Wi-Fi
        try:
            out_wlan = subprocess.check_output("netsh wlan show interfaces", text=True, timeout=2)
            m_ssid = re.search(r"^\s*SSID\s*:\s*(.+)$", out_wlan, re.MULTILINE)
            if m_ssid:
                active_ssid = m_ssid.group(1).strip().lower()
                if cust_ssid:
                    if active_ssid == cust_ssid:
                        return True
                    else:
                        return False
        except Exception:
            pass

        # B. Cocokkan Physical Address / MAC Gateway Modem Default
        try:
            out_arp = subprocess.check_output("arp -a 192.168.1.1", text=True, timeout=2)
            m_mac = re.search(r"([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})", out_arp)
            if m_mac and cust_mac:
                active_gateway_mac = m_mac.group(1).replace("-", ":").upper()
                if active_gateway_mac == cust_mac:
                    return True
                else:
                    return False
        except Exception:
            pass

    return False
