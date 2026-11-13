"""
PaymentService - Layer tagihan & pembayaran Portal Pelanggan TeknoCust.

Sumber data tunggal: Network Bill API v1 (lihat api-v1.md), dibaca LIVE.
Portal TIDAK berada di jalur uang: pelanggan membayar ke bank, Faspay meneruskan
ke Network Bill, Network Bill melunasi tagihan. Portal hanya menampilkan nomor
Virtual Account beserta nominalnya, lalu membaca ulang hasilnya. Portal tidak
pernah memanggil Faspay, dan tidak ada webhook yang masuk ke portal.

Dua aturan yang dipegang di sini:
1. Tagihan dan nomor VA DILARANG disalin ke database lokal lalu ditampilkan dari
   salinan. Pelanggan yang baru membayar di kasir akan tetap melihat "belum bayar".
   Cache di bawah hanya penyatu permintaan berumur beberapa detik, bukan penyimpanan.
2. Batas 120 request per menit berlaku untuk SELURUH portal, bukan per pelanggan.
   Karena itu seluruh pembacaan lewat satu pintu dan di-dedupe.
"""
import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from app.services.network_bill_service import NetworkBillService

logger = logging.getLogger("portal_payment_service")

# Umur dedupe pembacaan. Cukup pendek agar pelanggan yang menekan "Saya sudah
# bayar" tetap melihat perubahan pada percobaan berikutnya (polling 10 detik),
# cukup panjang agar banyak warga yang membuka halaman serentak tidak menembus
# batas 120 request per menit.
_CACHE_TTL_SECONDS = 8

# Kode kanal Faspay -> nama bank ringkas untuk kunci logo di frontend.
# Kode di luar tabel ini tetap WAJIB dirender memakai label `bank` dari API.
CHANNEL_BANKS: Dict[str, str] = {
    "802": "mandiri",
    "800": "bri",
    "702": "bca",
    "723": "bsi",
    "402": "permata",
    "708": "danamon",
    "825": "cimb",
    "818": "sinarmas",
    "408": "maybank",
}

_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_cache_lock = threading.Lock()


def _cached(key: str, fetcher) -> Dict[str, Any]:
    now = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and (now - hit[0]) < _CACHE_TTL_SECONDS:
            return hit[1]

    result = fetcher()

    # Hanya jawaban sehat yang di-dedupe. Kegagalan sementara (429, jaringan)
    # tidak boleh mengunci pelanggan selama beberapa detik berikutnya.
    if result.get("ok") or result.get("status") in (403, 404):
        with _cache_lock:
            _cache[key] = (time.monotonic(), result)
            if len(_cache) > 2000:
                cutoff = time.monotonic() - _CACHE_TTL_SECONDS
                for k, (ts, _) in list(_cache.items()):
                    if ts < cutoff:
                        _cache.pop(k, None)
    return result


class PaymentService:

    # ── Identitas pelanggan di Network Bill ──────────────────────────────

    @staticmethod
    def resolve_identity(pelanggan) -> Optional[Tuple[str, str]]:
        """
        Identitas pelanggan di Network Bill = slug PoP + id numerik.
        Di sini slug PoP tersimpan pada kolom `kantor`, dan id numerik pada
        `id_pelanggan` (ditimpa oleh alur Lengkapi Data di menu Pelanggan).

        Mengembalikan (pop_slug, customer_id), atau None bila pelanggan belum
        tertaut: `id_pelanggan` masih kode lama seperti "CUST-SLA-003" atau
        "BMS-0001", bukan angka. Kode DILARANG dikirim ke API sebagai id.
        """
        if not pelanggan:
            return None

        pop_slug = (getattr(pelanggan, "kantor", "") or "").strip().lower()
        if pop_slug == "cabang":
            pop_slug = "slawi"

        raw_id = str(getattr(pelanggan, "id_pelanggan", "") or "").strip()

        if not pop_slug or not raw_id.isdigit():
            return None
        return pop_slug, raw_id

    # ── Pembacaan mentah, ter-dedupe ────────────────────────────────────

    @classmethod
    def read_invoices(cls, pop: str, cid: str, status: Optional[str] = None, limit: int = 24) -> Dict[str, Any]:
        key = f"inv:{pop}:{cid}:{status or 'all'}:{limit}"
        return _cached(key, lambda: NetworkBillService.fetch_invoices(pop, cid, status=status, limit=limit))

    @classmethod
    def read_payments(cls, pop: str, cid: str, limit: int = 24) -> Dict[str, Any]:
        key = f"pay:{pop}:{cid}:{limit}"
        return _cached(key, lambda: NetworkBillService.fetch_payments(pop, cid, limit=limit))

    @classmethod
    def read_virtual_account(cls, pop: str, cid: str) -> Dict[str, Any]:
        key = f"va:{pop}:{cid}"
        return _cached(key, lambda: NetworkBillService.fetch_virtual_account(pop, cid))

    @classmethod
    def read_customer_profile(cls, pop: str, cid: str) -> Dict[str, Any]:
        key = f"cust_profile:{pop}:{cid}"
        return _cached(key, lambda: NetworkBillService.fetch_customer(pop, cid))

    @classmethod
    def read_router_isolated(cls, pop: str, cid: str) -> Optional[bool]:
        """
        True bila entri isolir pelanggan di router masih terpasang, False bila
        sudah dibuka, None bila tidak diketahui (modul router mati di PoP itu,
        belum pernah dibaca, atau pelanggan tidak ada di daftar).

        Dipakai untuk satu hal saja: tidak menjanjikan internet langsung menyala
        kepada pelanggan isolir yang baru melunasi. Pembukaan isolir dikerjakan
        petugas di aplikasi Network Bill, bukan di portal ini.
        """
        res = _cached(f"conn:{pop}", lambda: NetworkBillService.fetch_connection_status(pop))
        if not res.get("ok"):
            return None
        for row in res.get("data") or []:
            if str(row.get("customer_id")) == str(cid):
                value = row.get("router_isolated")
                return bool(value) if value is not None else None
        return None

    # ── Pembentukan jawaban untuk portal ────────────────────────────────

    @staticmethod
    def shape_invoice(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merapikan satu tagihan untuk portal. Nominal tetap dikirim sebagai angka;
        format Rupiah dikerjakan frontend. `overdue` diambil apa adanya dari API:
        itu definisi yang dipakai Network Bill untuk isolir, dan `issue_date` bisa
        lebih baru dari `due_date` pada data historis sehingga tidak boleh dihitung
        ulang di sini.
        """
        items: List[Dict[str, Any]] = []
        for it in raw.get("items") or []:
            speed = it.get("package_speed")
            items.append({
                "package_name": it.get("package_name") or "",
                # API mengirim kecepatan sebagai angka (mis. 20), bukan "20 Mbps".
                "package_speed": f"{speed} Mbps" if isinstance(speed, (int, float)) else (speed or ""),
                "price": it.get("price"),
                "quantity": it.get("quantity"),
                "subtotal": it.get("subtotal"),
            })

        payment = raw.get("payment") or None
        if payment:
            method = (payment.get("method") or "").lower()
            payment = {
                "date": payment.get("date"),
                "amount": payment.get("amount"),
                "method": method,
                # "gateway" adalah istilah internal Network Bill; warga membacanya
                # sebagai nama cara bayar yang mereka kenal.
                "method_label": {
                    "tunai": "Tunai ke Petugas",
                    "transfer": "Transfer Bank",
                    "gateway": "Virtual Account",
                }.get(method, method.title() or "-"),
            }

        return {
            "id": raw.get("id"),
            "number": raw.get("number") or "",
            "type": raw.get("type") or "",
            "billing_period": raw.get("billing_period") or "",
            "issue_date": raw.get("issue_date"),
            "due_date": raw.get("due_date"),
            "subtotal": raw.get("subtotal"),
            "discount": raw.get("discount"),
            "total": raw.get("total"),
            "status": raw.get("status") or "",
            "overdue": bool(raw.get("overdue")),
            "items": items,
            "payment": payment,
        }

    @staticmethod
    def shape_channel(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Satu kanal bank. `amount_to_pay` dikirim apa adanya dari API dan DILARANG
        dihitung ulang di portal. `va_number` dikirim sebagai 16 digit bersih;
        pengelompokan 4-4-4-4 hanya urusan tampilan, dan tombol salin wajib
        menyalin versi bersih ini.
        """
        channel = str(raw.get("channel") or "").strip()
        va = "".join(ch for ch in str(raw.get("va_number") or "") if ch.isdigit())
        return {
            "channel": channel,
            "bank": raw.get("bank") or f"Bank {channel}",
            "bank_key": CHANNEL_BANKS.get(channel, ""),
            "va_number": va,
            "admin_fee": raw.get("admin_fee"),
            "amount_to_pay": raw.get("amount_to_pay"),
        }

    @classmethod
    def build_billing_page(cls, pelanggan) -> Dict[str, Any]:
        """
        Satu jawaban untuk halaman Tagihan: daftar tagihan belum lunas, kartu
        bayar `next_bill`, dan kanal bank. Keadaan VA dibedakan secara eksplisit
        supaya frontend tidak perlu menerka:

        - `not_linked`  : pelanggan belum tertaut Network Bill (Lengkapi Data belum dijalankan)
        - `inactive`    : status 404, pembayaran VA belum aktif di PoP itu
        - `not_issued`  : channels [] , nomor VA pelanggan belum diterbitkan admin
        - `no_bill`     : next_bill null, tidak ada tagihan yang bisa dibayar
        - `payable`     : kartu bayar siap tampil
        - `error`       : gangguan pembacaan (termasuk 429)
        """
        ident = cls.resolve_identity(pelanggan)
        if not ident:
            return {
                "ok": True,
                "va_state": "not_linked",
                "message": "Data langganan Anda belum tertaut ke sistem tagihan. Hubungi petugas kantor.",
                "unpaid": [], "next_bill": None, "channels": [], "other_unpaid": [],
            }

        pop, cid = ident
        inv_res = cls.read_invoices(pop, cid, status="unpaid", limit=120)
        va_res = cls.read_virtual_account(pop, cid)

        if not inv_res.get("ok") and inv_res.get("status") != 404:
            return {
                "ok": False,
                "va_state": "error",
                "status": inv_res.get("status"),
                "retry_after": inv_res.get("retry_after"),
                "message": inv_res.get("message") or "Gagal membaca tagihan.",
                "unpaid": [], "next_bill": None, "channels": [], "other_unpaid": [],
            }

        raw_invoices = inv_res.get("data") or []
        # Urutkan tagihan belum lunas dari yang paling lama/jatuh tempo awal (FIFO)
        raw_invoices = sorted(
            raw_invoices,
            key=lambda x: (str(x.get("due_date") or x.get("billing_period") or ""), int(x.get("id") or 0))
        )
        unpaid = [cls.shape_invoice(r) for r in raw_invoices]

        # Keadaan VA
        va_state = "payable"
        next_bill: Optional[Dict[str, Any]] = None
        channels: List[Dict[str, Any]] = []
        message = None

        if va_res.get("status") == 404:
            va_state = "inactive"
            message = "Pembayaran lewat Virtual Account belum tersedia di kantor layanan Anda. Pembayaran dilayani langsung oleh petugas."
        elif not va_res.get("ok"):
            va_state = "error"
            message = va_res.get("message") or "Gagal membaca nomor Virtual Account."
        else:
            va_data = va_res.get("data") or {}
            raw_next = va_data.get("next_bill")
            raw_channels = va_data.get("channels") or []
            channels = [cls.shape_channel(c) for c in raw_channels]

            if not raw_channels:
                va_state = "not_issued"
                message = "Nomor Virtual Account Anda belum diterbitkan. Hubungi petugas kantor untuk memintanya."
            elif not raw_next:
                va_state = "no_bill"
                message = "Belum ada tagihan yang perlu dibayar. Tagihan bulanan diterbitkan petugas, jadi di awal bulan bisa kosong beberapa hari."
            else:
                nb_id = raw_next.get("invoice_id")
                detail = next((i for i in unpaid if i.get("id") == nb_id), None)
                next_bill = {
                    "invoice_id": nb_id,
                    "number": raw_next.get("number") or (detail or {}).get("number") or "",
                    "total": raw_next.get("total"),
                    "type": (detail or {}).get("type") or "",
                    "billing_period": (detail or {}).get("billing_period") or "",
                    "due_date": (detail or {}).get("due_date"),
                    "overdue": bool((detail or {}).get("overdue")),
                    "items": (detail or {}).get("items") or [],
                }

        # Tagihan belum lunas selain yang ada di kartu bayar. Pembayaran selalu
        # dimulai dari yang tertua dan pelanggan tidak bisa memilih, jadi sisanya
        # hanya ditampilkan sebagai keterangan, bukan sebagai pilihan.
        #
        # Tanpa kartu bayar (VA mati / belum terbit / tidak tertaut) daftar ini
        # dikosongkan: seluruh tagihan sudah ditampilkan sebagai daftar biasa,
        # dan mengisi keduanya membuat tagihan tampil dua kali di layar.
        if next_bill:
            paid_first_id = next_bill.get("invoice_id")
            other_unpaid = [i for i in unpaid if i.get("id") != paid_first_id]
        else:
            other_unpaid = []

        return {
            "ok": True,
            "va_state": va_state,
            "message": message,
            "unpaid": unpaid,
            "unpaid_count": len(unpaid),
            "unpaid_total": sum(i.get("total") or 0 for i in unpaid),
            "next_bill": next_bill,
            "channels": channels,
            "other_unpaid": other_unpaid,
        }

    @staticmethod
    def shape_payment(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merapikan satu baris riwayat pembayaran dari GET /customers/{id}/payments.
        Data diurutkan berdasarkan tanggal uang diterima (date) terbaru.
        """
        method = (raw.get("method") or "").lower()
        method_label = raw.get("method_label") or {
            "tunai": "Tunai",
            "transfer": "Transfer Bank",
            "gateway": "Virtual Account",
        }.get(method, method.title() or "-")

        inv_raw = raw.get("invoice") or {}
        invoice = {
            "id": inv_raw.get("id"),
            "number": inv_raw.get("number") or "",
            "type": inv_raw.get("type") or "langganan",
            "billing_period": inv_raw.get("billing_period") or "",
            "total": inv_raw.get("total"),
        }

        return {
            "id": raw.get("id"),
            "date": raw.get("date"),
            "amount": raw.get("amount"),
            "method": method,
            "method_label": method_label,
            "bank_account": raw.get("bank_account"),
            "credit_used": raw.get("credit_used") or 0,
            "credit_added": raw.get("credit_added") or 0,
            "invoice": invoice,
            # Backward-compatibility shortcuts untuk tampilan list
            "number": invoice["number"],
            "billing_period": invoice["billing_period"],
            "type": invoice["type"],
            "total": invoice["total"] if invoice["total"] is not None else raw.get("amount"),
            "payment": {
                "date": raw.get("date"),
                "amount": raw.get("amount"),
                "method": method,
                "method_label": method_label,
            }
        }

    @classmethod
    def build_history(cls, pelanggan, limit: int = 24) -> Dict[str, Any]:
        ident = cls.resolve_identity(pelanggan)
        if not ident:
            return {"ok": True, "linked": False, "invoices": []}

        pop, cid = ident
        # 1. Coba baca dari endpoint payments terbaru (urut tanggal bayar)
        pay_res = cls.read_payments(pop, cid, limit=limit)
        if pay_res.get("ok"):
            raw_payments = pay_res.get("data") or []
            return {
                "ok": True,
                "linked": True,
                "invoices": [cls.shape_payment(p) for p in raw_payments],
            }

        # 2. Fallback mulus ke /invoices?status=paid jika endpoint /payments belum aktif di PoP / versi lama
        res = cls.read_invoices(pop, cid, status="paid", limit=limit)
        if not res.get("ok"):
            return {
                "ok": False, "linked": True, "invoices": [],
                "status": res.get("status"),
                "retry_after": res.get("retry_after"),
                "message": res.get("message") or "Gagal membaca riwayat pembayaran.",
            }

        return {
            "ok": True,
            "linked": True,
            "invoices": [cls.shape_invoice(r) for r in (res.get("data") or [])],
        }

    @classmethod
    def check_after_payment(cls, pelanggan, known_invoice_id: Optional[int]) -> Dict[str, Any]:
        """
        Satu kali pemeriksaan untuk layar "Saya sudah bayar".

        Berhasil bila `next_bill.invoice_id` berganti atau `next_bill` menjadi
        null dibanding tagihan yang tadi ditampilkan. Portal yang memanggil ini
        bertanggung jawab berhenti sesudah 2 menit dan saat menerima 429;
        tidak ada pembacaan latar belakang yang berlanjut di server.
        """
        ident = cls.resolve_identity(pelanggan)
        if not ident:
            return {"ok": False, "settled": False, "message": "Data langganan belum tertaut ke sistem tagihan."}

        pop, cid = ident
        va_res = cls.read_virtual_account(pop, cid)

        if not va_res.get("ok"):
            return {
                "ok": False,
                "settled": False,
                "status": va_res.get("status"),
                "retry_after": va_res.get("retry_after"),
                "message": va_res.get("message") or "Gagal memeriksa status pembayaran.",
            }

        raw_next = (va_res.get("data") or {}).get("next_bill")
        current_id = raw_next.get("invoice_id") if raw_next else None
        settled = (known_invoice_id is not None) and (current_id != known_invoice_id)

        result: Dict[str, Any] = {
            "ok": True,
            "settled": settled,
            "next_invoice_id": current_id,
            "next_bill": {
                "invoice_id": current_id,
                "number": raw_next.get("number") if raw_next else None,
                "total": raw_next.get("total") if raw_next else None,
            } if raw_next else None,
        }

        if settled:
            # Tagihan yang barusan lunas, diambil dari daftar lunas.
            paid = cls.read_invoices(pop, cid, status="paid", limit=5)
            rows = [cls.shape_invoice(r) for r in (paid.get("data") or [])] if paid.get("ok") else []
            result["settled_invoice"] = next(
                (r for r in rows if r.get("id") == known_invoice_id), rows[0] if rows else None
            )
            # Lunas belum berarti internet menyala: entri isolir di router dibuka
            # petugas, bukan oleh pelunasan ini.
            result["router_isolated"] = cls.read_router_isolated(pop, cid)

        return result
