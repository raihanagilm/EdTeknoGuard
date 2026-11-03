from typing import Optional, Dict, Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings
import bcrypt

CUSTOMER_SESSION_COOKIE = "edtekno_pelanggan_session"
MAX_SESSION_AGE = 86400 * 60  # 60 Hari (2 Bulan) Inaktivitas Sesi Pelanggan

_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

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
    return _serializer.dumps({
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
        data = _serializer.loads(token, max_age=MAX_SESSION_AGE)
        return data
    except (BadSignature, SignatureExpired):
        return None

def create_password_reset_token(id_pelanggan: str, no_hp: str, kantor: str) -> str:
    """Membuat token bertanda tangan kriptografis untuk reset kata sandi mandiri berbatas 15 menit."""
    return _serializer.dumps({
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
        data = _serializer.loads(token, max_age=max_age)
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
    1. Jika akses via IP publik/WAN router (client_ip == ip_target), cocok 100%.
    2. Jika akses dari localhost / development:
       - Memeriksa SSID aktif yang terhubung pada adaptor WiFi (misal via netsh di Windows).
       - Jika SSID aktif cocok dengan nama_wifi pelanggan -> True.
       - Jika SSID aktif adalah WiFi lain -> False.
       - Memeriksa MAC Gateway lokal (192.168.1.1) via ARP. Jika cocok -> True, jika beda -> False.
    3. Jika klien di belakang NAT/LAN tapi subnet berbeda atau bukan modem pelanggan -> False.
    """
    if not pelanggan:
        return False

    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""

    ip_target = (pelanggan.ip_router or pelanggan.ip_ont or "").strip()
    cust_mac = (pelanggan.mac_address or (pelanggan.perangkat.mac_address if pelanggan.perangkat else "") or "").strip().upper()
    cust_ssid = (pelanggan.nama_wifi or "").strip().lower()

    # 1. Kecocokan IP WAN/Router persis
    if ip_target and client_ip and client_ip == ip_target:
        return True

    # 2. Pengecekan perangkat lokal (Localhost / Development)
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
