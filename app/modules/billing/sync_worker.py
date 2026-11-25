"""
app/modules/billing/sync_worker.py - Background Worker Sinkronisasi Tagihan Bertahap (Throttled Amortized Sync)
"""
import time
import re
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import case, or_, and_
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, Kantor
from app.core.tenant_database import TenantDatabaseManager
from app.services.network_bill_service import NetworkBillService

logger = logging.getLogger("billing_sync_worker")


class BillingSyncWorker:
    """Worker background untuk mencicil sinkronisasi data tagihan ke Network Bill secara bertahap."""

    _customer_cache: Dict[str, Dict[str, Any]] = {}  # {pop_slug: {"ts": float, "by_code": {}, "by_wa": {}}}
    _conn_cache: Dict[str, Dict[str, Any]] = {}  # {pop_slug: {"ts": float, "map": {}}}
    CACHE_TTL_SECONDS = 900  # 15 menit

    @staticmethod
    def clean_name_key(name: Optional[str]) -> str:
        """Membersihkan nama pelanggan: menghilangkan prefix port OLT, timestamp, dan spasi/simbol."""
        if not name:
            return ""
        # 1. Hilangkan prefix port OLT ZTE jika ada (contoh: 1/3/1:21_ atau 1/1/1:5_)
        n = re.sub(r'^\d+/\d+/\d+:\d+[_ ]*', '', str(name).strip())
        # 2. Hilangkan prefix ID/timestamp jika ada (contoh: 150120265457 - )
        n = re.sub(r'^\d{8,}\s*-\s*', '', n)
        # 3. Hilangkan trailing keterangan paket/perumahan jika ada pemisah '@'
        if '@' in n:
            n = n.split('@', 1)[0]
        return re.sub(r'[^a-z0-9]', '', n.lower())

    @classmethod
    def _get_or_load_customer_map(cls, pop_slug: str) -> Dict[str, Any]:
        now_ts = time.time()
        cached = cls._customer_cache.get(pop_slug)
        if cached and (now_ts - cached.get("ts", 0) < cls.CACHE_TTL_SECONDS):
            return cached

        by_id = {}
        by_code = {}
        by_wa = {}
        by_name = {}
        raw_items = []
        try:
            cursor = None
            for _ in range(20):
                res = NetworkBillService.fetch_customers(pop_slug, per_page=500, cursor=cursor)
                items = res.get("data") or []
                for item in items:
                    i_id = str(item.get("id") or "").strip()
                    i_code = (item.get("code") or "").strip().upper()
                    i_wa = str(item.get("whatsapp") or "").replace("+", "").replace("-", "").replace(" ", "").strip()
                    i_name = cls.clean_name_key(item.get("name") or "")
                    payload = (i_id, item)
                    if i_id:
                        by_id[i_id] = item
                    if i_code and i_id:
                        by_code[i_code] = payload
                    if i_wa and i_id:
                        by_wa[i_wa[-9:]] = payload
                    if i_name and i_id:
                        by_name[i_name] = payload
                    raw_items.append(item)
                next_cursor = (res.get("meta") or {}).get("next_cursor")
                if not next_cursor or not items:
                    break
                cursor = next_cursor
            cls._customer_cache[pop_slug] = {
                "ts": now_ts,
                "by_id": by_id,
                "by_code": by_code,
                "by_wa": by_wa,
                "by_name": by_name,
                "raw_items": raw_items
            }
            logger.info(f"[BILLING_WORKER] Cache mapping pelanggan Network Bill diperbarui ({pop_slug}): {len(raw_items)} items.")
        except Exception as e:
            logger.warning(f"[BILLING_WORKER] Gagal memuat customer map Network Bill {pop_slug}: {e}")
            if not cached:
                cls._customer_cache[pop_slug] = {"ts": now_ts, "by_id": {}, "by_code": {}, "by_wa": {}, "by_name": {}, "raw_items": []}

        return cls._customer_cache[pop_slug]

    @classmethod
    def resolve_nb_id(cls, db: Session, cust: Pelanggan, pop_slug: str) -> Optional[str]:
        if cust.network_bill_id and str(cust.network_bill_id).strip():
            return str(cust.network_bill_id).strip()

        # Jika ID pelanggan murni angka (seperti Karanggede '596'), langsung gunakan
        if cust.id_pelanggan and cust.id_pelanggan.isdigit():
            cust.network_bill_id = cust.id_pelanggan
            db.commit()
            return cust.id_pelanggan

        mapping = cls._get_or_load_customer_map(pop_slug)
        matched_id = None
        matched_item = None

        # 1. Cek berdasarkan kode pelanggan (misal PLG-0001 / CUST-...)
        target_code = (cust.id_pelanggan or "").strip().upper()
        if target_code in mapping.get("by_code", {}):
            matched_id, matched_item = mapping["by_code"][target_code]

        # 2. Cek berdasarkan nomor WhatsApp terdaftar (9 digit terakhir)
        if not matched_id:
            target_wa = (cust.no_hp or "").replace("+", "").replace("-", "").replace(" ", "").strip()
            if target_wa and len(target_wa) >= 9:
                wa_suffix = target_wa[-9:]
                if wa_suffix in mapping.get("by_wa", {}):
                    matched_id, matched_item = mapping["by_wa"][wa_suffix]

        # 3. Cek berdasarkan nama yang sudah dinormalisasi (membersihkan prefix OLT/timestamp)
        target_name = cls.clean_name_key(cust.nama)
        if not matched_id and target_name:
            if target_name in mapping.get("by_name", {}):
                matched_id, matched_item = mapping["by_name"][target_name]

        # 4. Fallback: Pencocokan substring nama (jika panjang karakter alfanumerik >= 5)
        if not matched_id and target_name and len(target_name) >= 5:
            for item in mapping.get("raw_items", []):
                nb_name = cls.clean_name_key(item.get("name"))
                if nb_name and (target_name in nb_name or nb_name in target_name):
                    matched_id = str(item.get("id")).strip()
                    matched_item = item
                    break

        if matched_id:
            cust.network_bill_id = matched_id
            # Auto-populate nomor WhatsApp & mode tagihan dari Network Bill
            if matched_item:
                if not cust.no_hp:
                    nb_wa = (matched_item.get("whatsapp") or "").strip()
                    if nb_wa:
                        cust.no_hp = nb_wa
                nb_mode = NetworkBillService.normalize_billing_mode(matched_item.get("billing_mode"))
                if nb_mode:
                    cust.billing_mode = nb_mode
            db.commit()
            return matched_id

        return None

    @classmethod
    def sync_billing_mode_from_cache(cls, cust: Pelanggan, pop_slug: str, nb_id: Optional[str]) -> None:
        """Memperbarui billing_mode pelanggan dari cache daftar pelanggan Network Bill tanpa request tambahan."""
        if not nb_id:
            return
        mapping = cls._get_or_load_customer_map(pop_slug)
        nb_item = mapping.get("by_id", {}).get(str(nb_id).strip())
        if nb_item:
            nb_mode = NetworkBillService.normalize_billing_mode(nb_item.get("billing_mode"))
            if nb_mode and getattr(cust, "billing_mode", None) != nb_mode:
                cust.billing_mode = nb_mode

    @classmethod
    def sync_office_batch(cls, db: Session, pop_slug: str, batch_size: int = 4) -> int:
        """
        Memproses satu batch kecil pelanggan dengan algoritma Smart Adaptive Priority:
        1. Prioritas 0: Pelanggan baru / belum pernah sync sama sekali (last_billing_sync is None).
        2. Prioritas 1: Pelanggan kritis OVERDUE / is_overdue (perlu verifikasi cepat pembayaran denda/isolir).
        3. Prioritas 2: Pelanggan BELUM_BAYAR yang jatuh temponya mendekati deadline (H-5 s/d H+2).
        4. Prioritas 3: Pelanggan BELUM_BAYAR reguler (dicek berkala tiap >= 30 menit).
        5. Prioritas 4: Pelanggan LUNAS (Deep Sleep, hanya dicek 1x per >= 12 jam untuk invoice bulan baru).
        """
        now = get_now_wib()
        thirty_mins_ago = now - timedelta(minutes=30)
        twelve_hours_ago = now - timedelta(hours=12)
        today = now.date()
        approaching_due_date = today + timedelta(days=5)

        # Skema Bobot Prioritas Dinamis (Angka terendah = Paling pertama diproses)
        priority_case = case(
            (Pelanggan.last_billing_sync.is_(None), 0),
            (or_(Pelanggan.is_overdue == True, Pelanggan.status_pembayaran == "OVERDUE"), 1),
            (
                and_(
                    Pelanggan.status_pembayaran != "LUNAS",
                    Pelanggan.jatuh_tempo.isnot(None),
                    Pelanggan.jatuh_tempo <= approaching_due_date
                ),
                2
            ),
            (Pelanggan.status_pembayaran != "LUNAS", 3),
            else_=4
        )

        # Filter cerdas: hanya ambil kandidat yang sudah layak diperbarui (menghemat 80%+ kuota API)
        need_sync_condition = or_(
            Pelanggan.last_billing_sync.is_(None),
            and_(
                or_(Pelanggan.status_pembayaran != "LUNAS", Pelanggan.is_overdue == True),
                Pelanggan.last_billing_sync <= thirty_mins_ago
            ),
            and_(
                Pelanggan.status_pembayaran == "LUNAS",
                Pelanggan.last_billing_sync <= twelve_hours_ago
            )
        )

        candidates = db.query(Pelanggan).filter(
            Pelanggan.is_active == True,
            need_sync_condition
        ).order_by(
            priority_case.asc(),
            Pelanggan.last_billing_sync.asc().nullsfirst()
        ).limit(batch_size).all()

        if not candidates:
            return 0

        synced_count = 0
        now = get_now_wib()
        now_ts = time.time()

        # Cache koneksi/isolir router per PoP (TTL 5 menit)
        conn_cache = cls._conn_cache.get(pop_slug)
        if not conn_cache or (now_ts - conn_cache.get("ts", 0) > 300):
            try:
                conn_res = NetworkBillService.fetch_connection_status(pop_slug)
                iso_map = {}
                if conn_res.get("ok") and isinstance(conn_res.get("data"), list):
                    for row in conn_res.get("data") or []:
                        cid = str(row.get("customer_id") or "").strip()
                        if cid:
                            iso_map[cid] = bool(row.get("router_isolated") or row.get("status") == "isolir")
                cls._conn_cache[pop_slug] = {"ts": now_ts, "map": iso_map}
            except Exception:
                cls._conn_cache[pop_slug] = {"ts": now_ts, "map": {}}

        iso_map = cls._conn_cache.get(pop_slug, {}).get("map", {})

        for cust in candidates:
            try:
                nb_id = cls.resolve_nb_id(db, cust, pop_slug)

                # Sinkronkan status isolir jika ada di pemetaan router
                matched_cid = str(nb_id) if nb_id else str(cust.id_pelanggan or "")
                if matched_cid in iso_map:
                    cust.status_isolir = iso_map[matched_cid]
                elif str(cust.id_pelanggan or "") in iso_map:
                    cust.status_isolir = iso_map[str(cust.id_pelanggan)]
                elif cust.status_pembayaran == "ISOLIR":
                    cust.status_isolir = True

                if not nb_id:
                    # Tandai last_billing_sync agar tidak terus tersangkut di antrean prioritas pertama
                    cust.last_billing_sync = now
                    db.commit()
                    continue

                cls.sync_billing_mode_from_cache(cust, pop_slug, nb_id)
                inv_res = NetworkBillService.fetch_invoices(pop_slug, nb_id, status="unpaid", limit=12)
                time.sleep(0.3)  # Jeda aman per panggilan API

                if inv_res.get("ok"):
                    unpaid_list = inv_res.get("data") or []
                    if not unpaid_list:
                        cust.status_pembayaran = "LUNAS"
                        cust.total_tagihan = 0
                        cust.is_overdue = False
                        cust.periode_tagihan = None
                        cust.jatuh_tempo = None
                    else:
                        cust.status_pembayaran = "BELUM_BAYAR"
                        cust.total_tagihan = sum(float(i.get("total") or 0.0) for i in unpaid_list)
                        cust.is_overdue = any(bool(i.get("overdue")) for i in unpaid_list)
                        if cust.is_overdue:
                            cust.status_pembayaran = "OVERDUE"
                        oldest_inv = unpaid_list[-1]
                        cust.periode_tagihan = oldest_inv.get("billing_period")
                        due_str = oldest_inv.get("due_date")
                        if due_str:
                            try:
                                cust.jatuh_tempo = datetime.strptime(due_str[:10], "%Y-%m-%d").date()
                            except Exception:
                                pass

                # Cek VA jika belum tersimpan
                if not cust.nomor_va or cust.nomor_va == "-":
                    va_res = NetworkBillService.fetch_virtual_account(pop_slug, nb_id)
                    time.sleep(0.3)
                    if va_res.get("ok") and isinstance(va_res.get("data"), dict):
                        channels = va_res["data"].get("channels") or []
                        if channels and channels[0].get("va_number"):
                            cust.nomor_va = channels[0]["va_number"]

                cust.last_billing_sync = now
                db.commit()
                synced_count += 1
            except Exception as e:
                logger.debug(f"[BILLING_WORKER] Error sync {cust.id_pelanggan}: {e}")
                cust.last_billing_sync = now
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        return synced_count

    @classmethod
    def run_throttled_sync_cycle(cls) -> None:
        """Siklus background reguler yang dipanggil oleh scheduler APScheduler setiap 1 menit."""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                pop_slug = (k.kode or "slawi").strip().lower()
                if pop_slug == "cabang":
                    pop_slug = "slawi"

                t_db = None
                try:
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    synced = cls.sync_office_batch(t_db, pop_slug, batch_size=4)
                    if synced > 0:
                        logger.debug(f"[BILLING_WORKER] Kantor {k.kode}: {synced} data tagihan dicicil sukses.")
                except Exception as e:
                    logger.debug(f"[BILLING_WORKER] Kantor {k.kode} error saat cicil sync: {e}")
                finally:
                    if t_db:
                        t_db.close()
        finally:
            m_db.close()
