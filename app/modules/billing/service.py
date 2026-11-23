"""
app/modules/billing/service.py - Logika Bisnis Modul Pemantauan Pembayaran Admin NOC
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy import func, or_, case
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, PerangkatONT
from app.services.network_bill_service import NetworkBillService
from app.portal.modules.payment.service import PaymentService
from app.services.fcm_service import send_push_notification

logger = logging.getLogger("billing_service")

class BillingService:

    @staticmethod
    def get_billing_overview(
        db: Session,
        kantor: str,
        q: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_dir: Optional[str] = "asc",
        page: int = 1,
        limit: int = 15
    ) -> Dict[str, Any]:
        """Mengambil data rekapitulasi pembayaran per kantor dengan filter, sorting, dan KPI."""
        base_query = db.query(Pelanggan).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            base_query = base_query.filter(Pelanggan.kantor == kantor)

        # 1. Hitung Ringkasan KPI Kantor
        total_pelanggan = base_query.count()
        total_lunas = base_query.filter(Pelanggan.status_pembayaran == "LUNAS").count()
        total_belum_bayar = base_query.filter(Pelanggan.status_pembayaran.in_(["BELUM_BAYAR", "OVERDUE", "ISOLIR"])).count()
        total_overdue = base_query.filter(or_(Pelanggan.is_overdue == True, Pelanggan.status_pembayaran == "OVERDUE")).count()

        sum_tunggakan = db.query(func.coalesce(func.sum(Pelanggan.total_tagihan), 0)).filter(
            Pelanggan.is_active == True,
            Pelanggan.status_pembayaran.in_(["BELUM_BAYAR", "OVERDUE", "ISOLIR"])
        )
        if kantor and kantor != "all":
            sum_tunggakan = sum_tunggakan.filter(Pelanggan.kantor == kantor)
        total_nominal_tunggakan = float(sum_tunggakan.scalar() or 0.0)

        max_sync = db.query(func.max(Pelanggan.last_billing_sync)).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            max_sync = max_sync.filter(Pelanggan.kantor == kantor)
        latest_sync_dt = max_sync.scalar()
        latest_sync_str = latest_sync_dt.strftime("%d/%m/%Y %H:%M:%S") if latest_sync_dt else "-"

        # 2. Filter Pencarian
        filtered_query = base_query
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            filtered_query = filtered_query.outerjoin(PerangkatONT, Pelanggan.id_pelanggan == PerangkatONT.id_pelanggan).filter(
                or_(
                    func.lower(Pelanggan.nama).like(term),
                    func.lower(Pelanggan.id_pelanggan).like(term),
                    func.lower(Pelanggan.no_hp).like(term),
                    func.lower(Pelanggan.nomor_va).like(term),
                    func.lower(PerangkatONT.ip_router).like(term),
                    func.lower(PerangkatONT.ip_ont).like(term)
                )
            )

        # 3. Filter Status Pembayaran
        if status and status.upper() != "ALL":
            st_clean = status.strip().upper()
            if st_clean == "LUNAS":
                filtered_query = filtered_query.filter(Pelanggan.status_pembayaran == "LUNAS")
            elif st_clean == "BELUM_BAYAR":
                filtered_query = filtered_query.filter(Pelanggan.status_pembayaran.in_(["BELUM_BAYAR", "OVERDUE"]))
            elif st_clean == "OVERDUE":
                filtered_query = filtered_query.filter(or_(Pelanggan.is_overdue == True, Pelanggan.status_pembayaran == "OVERDUE"))
            elif st_clean == "ISOLIR":
                filtered_query = filtered_query.filter(Pelanggan.status_pembayaran == "ISOLIR")

        # 4. Pengurutan Data (Sorting)
        sort_dir_clean = (sort_dir or "asc").lower().strip()
        is_desc = sort_dir_clean == "desc"

        if sort_by == "nama":
            order_expr = Pelanggan.nama.desc() if is_desc else Pelanggan.nama.asc()
            sorted_query = filtered_query.order_by(order_expr)
        elif sort_by == "no_wa":
            order_expr = Pelanggan.no_hp.desc() if is_desc else Pelanggan.no_hp.asc()
            sorted_query = filtered_query.order_by(order_expr)
        elif sort_by == "total_tagihan":
            order_expr = Pelanggan.total_tagihan.desc() if is_desc else Pelanggan.total_tagihan.asc()
            sorted_query = filtered_query.order_by(order_expr)
        elif sort_by == "status_pembayaran":
            order_expr = Pelanggan.status_pembayaran.desc() if is_desc else Pelanggan.status_pembayaran.asc()
            sorted_query = filtered_query.order_by(order_expr, Pelanggan.total_tagihan.desc())
        elif sort_by == "jatuh_tempo":
            order_expr = Pelanggan.jatuh_tempo.desc() if is_desc else Pelanggan.jatuh_tempo.asc()
            sorted_query = filtered_query.order_by(order_expr)
        elif sort_by == "nomor_va":
            order_expr = Pelanggan.nomor_va.desc() if is_desc else Pelanggan.nomor_va.asc()
            sorted_query = filtered_query.order_by(order_expr)
        else:
            # Default prioritas: Overdue -> Belum Bayar -> Nominal Tertinggi -> Nama
            sorted_query = filtered_query.order_by(
                case((Pelanggan.is_overdue == True, 0), (Pelanggan.status_pembayaran != "LUNAS", 1), else_=2),
                Pelanggan.total_tagihan.desc(),
                Pelanggan.nama.asc()
            )

        total_filtered = sorted_query.count()
        offset = (page - 1) * limit
        rows = sorted_query.offset(offset).limit(limit).all()

        data_list = []
        for p in rows:
            data_list.append({
                "id_pelanggan": p.id_pelanggan,
                "nama": p.nama,
                "no_wa": p.no_hp or "-",
                "kantor": p.kantor or kantor,
                "paket": p.paket or "-",
                "ip_router": p.ip_router or "-",
                "status_pembayaran": p.status_pembayaran or "LUNAS",
                "is_overdue": bool(p.is_overdue),
                "total_tagihan": float(p.total_tagihan or 0.0),
                "periode_tagihan": p.periode_tagihan or "-",
                "jatuh_tempo": p.jatuh_tempo.strftime("%d/%m/%Y") if p.jatuh_tempo else "-",
                "nomor_va": p.nomor_va or "-",
                "network_bill_id": p.network_bill_id or (p.id_pelanggan if p.id_pelanggan.isdigit() else "-"),
                "has_fcm": bool(p.fcm_token),
                "last_sync": p.last_billing_sync.strftime("%d/%m %H:%M") if p.last_billing_sync else "-"
            })

        return {
            "summary": {
                "total_pelanggan": total_pelanggan,
                "total_lunas": total_lunas,
                "total_belum_bayar": total_belum_bayar,
                "total_overdue": total_overdue,
                "total_nominal_tunggakan": total_nominal_tunggakan,
                "terakhir_sinkron": latest_sync_str
            },
            "pagination": {
                "page": page,
                "limit": limit,
                "total_records": total_filtered,
                "total_pages": max(1, (total_filtered + limit - 1) // limit)
            },
            "data": data_list
        }

    @staticmethod
    def sync_single_customer(db: Session, id_pelanggan: str, kantor: str) -> Dict[str, Any]:
        """Sinkronisasi live 1 pelanggan tertentu ke Network Bill dan simpan snapshot-nya."""
        cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not cust:
            return {"ok": False, "message": "Pelanggan tidak ditemukan"}

        pop_slug = (cust.kantor or kantor or "slawi").strip().lower()
        if pop_slug == "cabang":
            pop_slug = "slawi"

        # Pastikan network_bill_id terpetakan
        nb_id = getattr(cust, "network_bill_id", None) or (cust.id_pelanggan if cust.id_pelanggan.isdigit() else None)
        if not nb_id:
            nb_id = BillingService._resolve_and_save_nb_id(db, cust, pop_slug)

        if not nb_id:
            return {"ok": False, "message": f"Pelanggan {cust.nama} ({cust.id_pelanggan}) belum terdaftar di Network Bill"}

        # Tarik data tagihan live dari Network Bill
        inv_res = NetworkBillService.fetch_invoices(pop_slug, nb_id, status="unpaid", limit=12)
        va_res = NetworkBillService.fetch_virtual_account(pop_slug, nb_id)

        now = get_now_wib()
        cust.last_billing_sync = now

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

        if va_res.get("ok") and isinstance(va_res.get("data"), dict):
            channels = va_res["data"].get("channels") or []
            if channels and channels[0].get("va_number"):
                cust.nomor_va = channels[0]["va_number"]

        db.commit()
        db.refresh(cust)
        return {
            "ok": True,
            "message": f"Tagihan {cust.nama} berhasil disinkronkan ({cust.status_pembayaran})",
            "status_pembayaran": cust.status_pembayaran,
            "total_tagihan": float(cust.total_tagihan or 0.0),
            "nomor_va": cust.nomor_va
        }

    @staticmethod
    def _resolve_and_save_nb_id(db: Session, cust: Pelanggan, pop_slug: str) -> Optional[str]:
        """Helper memetakan kode/nama pelanggan lokal ke ID numerik Network Bill."""
        from app.modules.billing.sync_worker import BillingSyncWorker
        return BillingSyncWorker.resolve_nb_id(db, cust, pop_slug)

    @staticmethod
    def sync_all_office_customers(db: Session, kantor: str) -> Dict[str, Any]:
        """Menyinkronkan seluruh tagihan pelanggan di kantor tertentu dengan Network Bill."""
        from app.modules.billing.sync_worker import BillingSyncWorker
        from app.core.tenant_database import TenantDatabaseManager
        pop_slug = (kantor or "slawi").strip().lower()
        if pop_slug == "cabang":
            pop_slug = "slawi"

        t_db = TenantDatabaseManager.get_tenant_session(pop_slug)
        try:
            customers = t_db.query(Pelanggan).filter(Pelanggan.is_active == True).all()
            synced_count = 0
            unpaid_count = 0
            now = get_now_wib()

            for cust in customers:
                nb_id = BillingSyncWorker.resolve_nb_id(t_db, cust, pop_slug)
                if not nb_id:
                    cust.last_billing_sync = now
                    continue

                inv_res = NetworkBillService.fetch_invoices(pop_slug, nb_id, status="unpaid", limit=12)
                if inv_res.get("ok"):
                    unpaid_list = inv_res.get("data") or []
                    if not unpaid_list:
                        cust.status_pembayaran = "LUNAS"
                        cust.total_tagihan = 0
                        cust.is_overdue = False
                        cust.periode_tagihan = None
                        cust.jatuh_tempo = None
                    else:
                        unpaid_count += 1
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

                if not cust.nomor_va or cust.nomor_va == "-":
                    va_res = NetworkBillService.fetch_virtual_account(pop_slug, nb_id)
                    if va_res.get("ok") and isinstance(va_res.get("data"), dict):
                        channels = va_res["data"].get("channels") or []
                        if channels and channels[0].get("va_number"):
                            cust.nomor_va = channels[0]["va_number"]

                cust.last_billing_sync = now
                synced_count += 1

            t_db.commit()
            return {
                "ok": True,
                "synced_count": synced_count,
                "unpaid_count": unpaid_count,
                "total_customers": len(customers),
                "message": f"Berhasil sinkronisasi tagihan {synced_count} pelanggan ({unpaid_count} belum lunas/jatuh tempo)."
            }
        finally:
            t_db.close()

    @staticmethod
    def prepare_whatsapp_message(cust: Pelanggan) -> str:
        """Menyusun draf pesan tagihan personal yang sopan dan informatif."""
        nama = cust.nama or "Pelanggan"
        total = f"Rp {int(cust.total_tagihan or 0):,}".replace(",", ".")
        periode = cust.periode_tagihan or datetime.now().strftime("%Y-%m")
        jatuh_tempo = cust.jatuh_tempo.strftime("%d/%m/%Y") if cust.jatuh_tempo else "Segera"
        va = cust.nomor_va or "Bisa ditanyakan ke petugas kantor"

        return (
            f"Halo Bapak/Ibu *{nama}*,\n\n"
            f"Kami dari tim layanan internet Tekno Indo ingin menyampaikan rincian tagihan internet Anda:\n"
            f"• Periode: *{periode}*\n"
            f"• Total Tagihan: *{total}*\n"
            f"• Batas Jatuh Tempo: *{jatuh_tempo}*\n"
            f"• Nomor Virtual Account: *{va}*\n\n"
            f"Mohon untuk melakukan pembayaran sebelum jatuh tempo agar koneksi internet tetap lancar dan tidak terisolir otomatis. "
            f"Terima kasih atas kerja samanya."
        )

    @staticmethod
    def send_bulk_reminders(
        db: Session,
        kantor: str,
        id_pelanggan_list: List[str],
        custom_message: Optional[str] = None,
        send_fcm: bool = True
    ) -> Dict[str, Any]:
        """Kirim pengingat tagihan: Push Notifikasi FCM ke MyTekno + siapkan link WA."""
        query = db.query(Pelanggan).filter(
            Pelanggan.is_active == True,
            Pelanggan.id_pelanggan.in_(id_pelanggan_list)
        )
        customers = query.all()

        fcm_tokens = []
        wa_links = []
        for c in customers:
            if send_fcm and c.fcm_token and c.fcm_token.strip():
                fcm_tokens.append(c.fcm_token.strip())

            msg = custom_message or BillingService.prepare_whatsapp_message(c)
            wa_num = (c.no_hp or "").replace("+", "").replace("-", "").replace(" ", "").strip()
            if wa_num.startswith("0"):
                wa_num = "62" + wa_num[1:]
            if wa_num:
                import urllib.parse
                wa_link = f"https://wa.me/{wa_num}?text={urllib.parse.quote(msg)}"
                wa_links.append({
                    "id_pelanggan": c.id_pelanggan,
                    "nama": c.nama,
                    "no_wa": wa_num,
                    "total_tagihan": float(c.total_tagihan or 0.0),
                    "link": wa_link,
                    "pesan": msg
                })

            # Simpan riwayat pengingat tagihan ke AlertLog agar terbaca di portal MyTekno
            try:
                from app.db.models import AlertLog
                alert = AlertLog(
                    id_pelanggan=c.id_pelanggan,
                    tipe_alert="TAGIHAN_REMINDER",
                    pesan=msg,
                    target_recipients="MyTekno Portal & WhatsApp",
                    status_kirim="SUCCESS",
                    waktu_kirim=get_now_wib()
                )
                db.add(alert)
            except Exception as e:
                logger.warning(f"Gagal simpan alert log tagihan untuk {c.id_pelanggan}: {e}")

        try:
            db.commit()
        except Exception as e:
            logger.warning(f"Gagal commit alert tagihan: {e}")
            db.rollback()

        sent_fcm_count = 0
        if fcm_tokens:
            try:
                sent_fcm_count = send_push_notification(
                    tokens=list(set(fcm_tokens)),
                    title="Pengingat Tagihan Internet",
                    body="Tagihan internet bulanan Anda telah terbit. Silakan lakukan pembayaran agar koneksi tetap lancar.",
                    data={"target_tab": "pembayaran", "level": "warning", "type": "billing_reminder"},
                    channel_id="tekno_customer_channel"
                )
            except Exception as e:
                logger.error(f"Gagal kirim FCM tagihan massal: {e}")

        return {
            "status": "success",
            "total_selected": len(customers),
            "fcm_sent": sent_fcm_count,
            "wa_targets": wa_links,
            "message": f"Berhasil memproses {len(customers)} pelanggan ({sent_fcm_count} push notifikasi terkirim)."
        }
