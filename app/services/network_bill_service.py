import logging
import requests
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger(__name__)

class NetworkBillService:
    """
    Service client untuk integrasi Network Bill API v1 (Tekno Bill).
    Dokumentasi: api-v1.md
    Base URL: https://pop.teknoindo.net/api/v1
    Scopes: customers:read, network:read, billing:read
    """

    @classmethod
    def get_base_url(cls) -> str:
        return (settings.NETWORK_BILL_BASE_URL or "https://pop.teknoindo.net/api/v1").rstrip("/")

    @classmethod
    def get_headers(cls, is_billing: bool = False) -> Dict[str, str]:
        token = settings.NETWORK_BILL_BILLING_TOKEN if is_billing else settings.NETWORK_BILL_API_TOKEN
        if not token:
            # Hak akses melekat ke klien API, bukan ke token: satu token yang sudah
            # diberi billing:read melayani keduanya. Fallback ini agar deployment
            # dengan token tunggal tetap jalan.
            token = settings.NETWORK_BILL_API_TOKEN
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

    # ══════════════════════════════════════════════════════════════════
    # TAGIHAN & PEMBAYARAN (hak akses billing:read)
    # Dibaca LIVE tiap pelanggan membuka halaman. DILARANG disalin ke
    # database lokal lalu ditampilkan dari salinan: pelanggan yang baru
    # membayar di kasir akan tetap melihat "belum bayar".
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _billing_get(cls, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Pemanggil mentah endpoint billing. Mengembalikan amplop seragam
        {ok, status, data, message, retry_after} tanpa pernah melempar exception,
        supaya portal bisa membedakan 404, channels kosong, dan 429.
        """
        token = settings.NETWORK_BILL_BILLING_TOKEN or settings.NETWORK_BILL_API_TOKEN
        if not token:
            return {
                "ok": False, "status": 0, "data": None, "retry_after": None,
                "message": "Token Network Bill belum diisi di file .env (NETWORK_BILL_BILLING_TOKEN atau NETWORK_BILL_API_TOKEN).",
            }

        url = f"{cls.get_base_url()}{path}"
        try:
            resp = requests.get(url, headers=cls.get_headers(is_billing=True), params=params or {}, timeout=15)
        except Exception as e:
            logger.error(f"Network Bill billing request gagal {path}: {e}")
            return {
                "ok": False, "status": 0, "data": None, "retry_after": None,
                "message": "Tidak dapat menghubungi server tagihan. Periksa koneksi internet server.",
            }

        try:
            body = resp.json()
        except Exception:
            body = {}

        if resp.status_code == 200:
            return {"ok": True, "status": 200, "data": body.get("data"), "message": None, "retry_after": None}

        retry_after = None
        if resp.status_code == 429:
            try:
                retry_after = int(resp.headers.get("Retry-After") or 0) or None
            except (TypeError, ValueError):
                retry_after = None

        message = body.get("message") if isinstance(body, dict) else None
        if not message:
            message = {
                401: "Token Network Bill tidak valid atau kedaluwarsa.",
                403: "Klien API belum diberi hak akses 'billing:read'.",
                404: "Data tagihan tidak ditemukan.",
                422: "Parameter permintaan tidak valid.",
                429: "Permintaan ke server tagihan sedang padat.",
            }.get(resp.status_code, f"Server tagihan menjawab {resp.status_code}.")

        if resp.status_code >= 500 or resp.status_code in (401, 403, 429):
            logger.warning(f"Network Bill billing {resp.status_code} on {path}: {message}")

        return {
            "ok": False, "status": resp.status_code, "data": None,
            "message": message, "retry_after": retry_after,
        }

    @classmethod
    def fetch_invoices(
        cls,
        pop_slug: str,
        customer_id: Any,
        status: Optional[str] = None,
        limit: int = 24,
    ) -> Dict[str, Any]:
        """
        GET /pops/{pop}/customers/{id}/invoices
        `status` boleh 'unpaid', 'paid', 'cancelled', atau gabungan dipisah koma.
        Urut periode terbaru dulu. `limit` dibatasi API pada 1-120.
        """
        params: Dict[str, Any] = {"limit": max(1, min(int(limit or 24), 120))}
        if status:
            params["status"] = status
        return cls._billing_get(f"/pops/{pop_slug}/customers/{customer_id}/invoices", params)

    @classmethod
    def fetch_payments(
        cls,
        pop_slug: str,
        customer_id: Any,
        limit: int = 24,
    ) -> Dict[str, Any]:
        """
        GET /pops/{pop}/customers/{id}/payments
        Riwayat pembayaran pelanggan diurutkan berdasarkan tanggal uang masuk (date) terbaru dulu.
        `limit` dibatasi API pada 1-120 (default 24).
        """
        params: Dict[str, Any] = {"limit": max(1, min(int(limit or 24), 120))}
        return cls._billing_get(f"/pops/{pop_slug}/customers/{customer_id}/payments", params)

    @classmethod
    def fetch_virtual_account(cls, pop_slug: str, customer_id: Any) -> Dict[str, Any]:
        """
        GET /pops/{pop}/customers/{id}/virtual-account

        Dua keadaan gagal yang WAJIB dibedakan portal:
        - status 404  -> pembayaran VA belum aktif di PoP itu (bayar lewat petugas).
        - channels [] -> nomor VA pelanggan belum diterbitkan admin.
        """
        return cls._billing_get(f"/pops/{pop_slug}/customers/{customer_id}/virtual-account")

    @classmethod
    def fetch_connection_status(cls, pop_slug: str) -> Dict[str, Any]:
        """
        GET /pops/{pop}/connections/status (hak akses network:read, modul Integrasi Router).
        Hanya baca. Dipakai portal untuk satu hal: memberitahu pelanggan yang baru
        melunasi bahwa koneksinya masih menunggu dibuka petugas selama
        `router_isolated` masih True. Isolir dikerjakan di aplikasi Network Bill.
        """
        return cls._billing_get(f"/pops/{pop_slug}/connections/status")

    @classmethod
    def fetch_pops(cls) -> List[Dict[str, Any]]:
        """Mengambil daftar PoP yang diizinkan untuk klien ini."""
        url = f"{cls.get_base_url()}/pops"
        try:
            resp = requests.get(url, headers=cls.get_headers(), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
            else:
                logger.warning(f"fetch_pops returned status {resp.status_code}: {resp.text}")
                return []
        except Exception as e:
            logger.error(f"Error fetching pops: {e}")
            return []

    @classmethod
    def fetch_customer(cls, pop_slug: str, customer_id: Any) -> Dict[str, Any]:
        """
        Mengambil data detail satu pelanggan dari Network Bill (termasuk due_date_day).
        GET /pops/{pop}/customers/{id} (hanya butuh hak akses customers:read)
        """
        headers = cls.get_headers(is_billing=False)
        url = f"{cls.get_base_url()}/pops/{pop_slug}/customers/{customer_id}"
        try:
            resp = requests.get(url, headers=headers, timeout=12)
            if resp.status_code == 200:
                return resp.json()
            return {"ok": False, "status": resp.status_code, "data": None}
        except Exception as e:
            logger.error(f"Error fetching customer {customer_id} in {pop_slug}: {e}")
            return {"ok": False, "error": str(e), "data": None}

    @classmethod
    def fetch_customers(
        cls, 
        pop_slug: str, 
        per_page: int = 100, 
        cursor: Optional[str] = None,
        updated_since: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mengambil daftar pelanggan dari Network Bill untuk suatu PoP.
        GET /pops/{pop}/customers (hanya butuh hak akses customers:read, tanpa billing)
        """
        headers = cls.get_headers(is_billing=False)
        token = headers.get("Authorization", "").replace("Bearer", "").strip()
        if not token:
            raise ValueError(
                "NETWORK_BILL_API_TOKEN belum diisi di file .env! "
                "Silakan masukkan token API (akses customers:read) pada file .env lalu coba lagi."
            )

        url = f"{cls.get_base_url()}/pops/{pop_slug}/customers"
        params = {"per_page": min(per_page, 500)}
        if cursor:
            params["cursor"] = cursor
        if updated_since:
            params["updated_since"] = updated_since

        resp = requests.get(url, headers=headers, params=params, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise ValueError("Token API Network Bill tidak valid atau kedaluwarsa (401).")
        elif resp.status_code == 403:
            raise ValueError("Klien API tidak memiliki izin 'customers:read' (403).")
        elif resp.status_code == 404:
            raise ValueError(f"PoP '{pop_slug}' tidak ditemukan atau tidak aktif (404).")
        else:
            try:
                err_msg = resp.json().get("message", resp.text)
            except Exception:
                err_msg = resp.text
            raise ValueError(f"Network Bill API error ({resp.status_code}): {err_msg}")

    @classmethod
    def preview_from_api(
        cls,
        pop_slug: str,
        limit: int = 1,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Menarik sejumlah data dari API Network Bill untuk ditampilkan di Langkah 3 Pratinjau.
        Menghasilkan struktur yang sama persis dengan CustomerService.preview_import_file.
        """
        from app.db.models import Pelanggan, PerangkatONT

        # 1. Tarik dari API (Dukung penarikan bertahap/semua data dengan cursor)
        customers_data = []
        cursor = None
        max_batch = 500 if limit > 1 else 1
        
        while True:
            api_result = cls.fetch_customers(pop_slug=pop_slug, per_page=max_batch, cursor=cursor)
            batch = api_result.get("data", [])
            customers_data.extend(batch)
            
            # Jika hanya uji coba 1 data atau sudah mencapai limit tertentu
            if limit == 1 or len(customers_data) >= limit:
                customers_data = customers_data[:limit]
                break
                
            next_cursor = api_result.get("meta", {}).get("next_cursor")
            if not next_cursor or not batch:
                break
            cursor = next_cursor

        # 2. Ambil data existing dari database lokal EdTeknoGuard
        existing_customers = []
        existing_ids = set()
        existing_by_ip = {}

        if db:
            existing_customers = (
                db.query(
                    Pelanggan.id_pelanggan,
                    PerangkatONT.ip_router,
                    PerangkatONT.ip_ont,
                    Pelanggan.nama,
                    Pelanggan.no_hp,
                    Pelanggan.alamat,
                    Pelanggan.paket,
                    Pelanggan.pop,
                    Pelanggan.kantor,
                    PerangkatONT.nama_wifi,
                    PerangkatONT.password_wifi,
                    PerangkatONT.jenis_modem
                )
                .outerjoin(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan)
                .filter(Pelanggan.is_active == True)
                .all()
            )
            existing_ids = {row[0] for row in existing_customers if row[0]}
            for row in existing_customers:
                cust_info = {
                    "id_pelanggan": row[0],
                    "nama": row[3] or "",
                    "no_wa": row[4] or "",
                    "alamat": row[5] or "",
                    "paket": row[6] or "",
                    "pop": row[7] or "",
                    "kantor": row[8] or "",
                    "nama_wifi": row[9] or "",
                    "password_wifi": row[10] or "",
                    "jenis_modem": row[11] or None
                }
                ip_r = (row[1] or "").strip()
                ip_o = (row[2] or "").strip()
                if ip_r:
                    existing_by_ip[ip_r] = cust_info
                if ip_o:
                    existing_by_ip[ip_o] = cust_info

        mapped_data = []
        for index, item in enumerate(customers_data, start=1):
            conn = item.get("connection") or {}
            ip_router = (conn.get("ip_address") or "").strip()
            mac_address = (conn.get("mac_address") or "").strip()
            
            # Paket aktif
            packages = item.get("packages") or []
            active_pkg_name = ""
            for p in packages:
                if p.get("is_active"):
                    active_pkg_name = f"Paket {p.get('package_id')}"
                    break

            # Koordinat GPS
            lat = conn.get("latitude")
            long = conn.get("longitude")
            lokasi_gps = f"{lat},{long}" if lat is not None and long is not None else ""

            # Prioritaskan `code` resmi Network Bill (contoh: BMS-0001, PLG-0012)
            # sebagai ID utama tampilan dan identitas pelanggan di sistem.
            # Jika `code` tidak tersedia, fallback ke `id` numerik.
            nb_id = item.get("id")
            nb_code = (item.get("code") or "").strip()
            official_code = nb_code if nb_code else (str(nb_id).strip() if nb_id is not None else "")
            if not official_code:
                official_code = str(index)

            # Standard row data untuk EdTeknoGuard
            mapped_row = {
                "id_pelanggan": official_code,
                "nama": item.get("name") or "",
                "no_wa": item.get("whatsapp") or "",
                "no_hp": item.get("whatsapp") or "",
                "alamat": item.get("address") or "",
                "ip_router": ip_router,
                "mac_address": mac_address,
                "paket": active_pkg_name,
                "lokasi_gps": lokasi_gps,
                "pop": pop_slug.upper(),
                "kantor": pop_slug.lower(),
                "network_bill_id": nb_id,
                "network_bill_code": official_code,
                "network_bill_display_code": nb_code or str(nb_id or ""),
                "status_langganan": item.get("status")
            }

            _status = "valid"
            _action = "update"
            _message = ""
            old_data = None
            has_conflicts = False

            if not ip_router:
                _status = "error"
                _action = "skip"
                _message = "IP address belum diisi di Network Bill"
            elif ip_router in existing_by_ip:
                old_data = existing_by_ip[ip_router]
                # Cek perbedaan data
                conflicts = []
                if old_data.get("no_wa") and mapped_row["no_wa"] and old_data["no_wa"] != mapped_row["no_wa"]:
                    conflicts.append("No. WA")
                if old_data.get("alamat") and mapped_row["alamat"] and old_data["alamat"] != mapped_row["alamat"]:
                    conflicts.append("Alamat")
                if old_data.get("nama") and mapped_row["nama"] and old_data["nama"].lower() != mapped_row["nama"].lower():
                    conflicts.append("Nama")

                if conflicts:
                    has_conflicts = True
                    _status = "conflict"
                    _action = "update"
                    _message = f"Ditemukan perbedaan data pada {', '.join(conflicts)}. Data Network Bill siap memperbarui."
                else:
                    _status = "match"
                    _action = "update"
                    _message = f"Cocok dengan pelanggan lokal {old_data['nama']} ({old_data['id_pelanggan']})."
            else:
                _status = "unregistered"
                _action = "insert"
                _message = f"Pelanggan baru dari Network Bill (ID: {mapped_row['id_pelanggan']}). Siap didaftarkan."

            mapped_data.append({
                "original_row": index,
                "data": mapped_row,
                "old_data": old_data,
                "has_conflicts": has_conflicts,
                "conflicts": conflicts if has_conflicts else [],
                "selected_version": "new",
                "_status": _status,
                "_action": _action,
                "_message": _message
            })

        match_count = sum(1 for r in mapped_data if r["_status"] in ("match", "conflict"))
        unreg_count = sum(1 for r in mapped_data if r["_status"] == "unregistered")
        conflict_count = sum(1 for r in mapped_data if r["_status"] == "conflict")
        err_count = sum(1 for r in mapped_data if r["_status"] == "error")

        return {
            "source": "network_bill",
            "pop_slug": pop_slug,
            "total_rows": len(mapped_data),
            "match_count": match_count,
            "unregistered_count": unreg_count,
            "conflict_count": conflict_count,
            "errors_count": err_count,
            "preview_data": mapped_data,
            "existing_ids": list(existing_ids),
            "existing_ips": list(existing_by_ip.keys()),
            "meta": api_result.get("meta", {})
        }
