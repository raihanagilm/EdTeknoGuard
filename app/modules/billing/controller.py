"""
app/modules/billing/controller.py - Controller HTTP untuk Modul Pembayaran Admin NOC
"""
import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_active_kantor
from app.modules.activity_logs.service import ActivityLogService
from app.modules.billing.service import BillingService
from app.modules.billing.schemas import BillingBulkReminderRequest

logger = logging.getLogger("billing_controller")

class BillingController:

    @staticmethod
    def get_overview(
        request: Request,
        db: Session,
        kantor: Optional[str] = None,
        q: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_dir: Optional[str] = "asc",
        page: int = 1,
        limit: int = 15
    ) -> Dict[str, Any]:
        user = getattr(request.state, "user", None)
        active_kantor = kantor or getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        return BillingService.get_billing_overview(
            db=db,
            kantor=active_kantor,
            q=q,
            status=status,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit
        )

    @staticmethod
    def sync_single(
        request: Request,
        id_pelanggan: str,
        db: Session,
        user: dict
    ) -> Dict[str, Any]:
        active_kantor = getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        res = BillingService.sync_single_customer(db=db, id_pelanggan=id_pelanggan, kantor=active_kantor)
        if not res.get("ok"):
            raise HTTPException(status_code=400, detail=res.get("message", "Gagal sinkronisasi"))

        try:
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="SYNC_TAGIHAN_PELANGGAN",
                status="SUCCESS",
                keterangan=f"Cek live tagihan pelanggan ID '{id_pelanggan}' ({res.get('status_pembayaran')}, Total: Rp {res.get('total_tagihan', 0):,})",
                user=user
            )
        except Exception:
            pass

        return res

    @staticmethod
    def sync_all(
        request: Request,
        kantor: Optional[str],
        db: Session,
        user: dict
    ) -> Dict[str, Any]:
        active_kantor = kantor or getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        res = BillingService.sync_all_office_customers(db=db, kantor=active_kantor)
        if not res.get("ok"):
            raise HTTPException(status_code=400, detail=res.get("message", "Gagal sinkronisasi masal"))

        try:
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="SYNC_TAGIHAN_MASAL",
                status="SUCCESS",
                keterangan=f"Sinkronisasi live tagihan kantor '{active_kantor}': {res.get('synced_count', 0)} diproses, {res.get('unpaid_count', 0)} belum bayar",
                user=user
            )
        except Exception:
            pass

        return res


    @staticmethod
    def send_reminders(
        request: Request,
        payload: BillingBulkReminderRequest,
        db: Session,
        user: dict
    ) -> Dict[str, Any]:
        active_kantor = payload.kantor or getattr(request.state, "active_kantor", None) or get_active_kantor(request, user)
        if not payload.id_pelanggan_list:
            raise HTTPException(status_code=400, detail="Pilih minimal 1 pelanggan untuk dikirimi pengingat")

        res = BillingService.send_bulk_reminders(
            db=db,
            kantor=active_kantor,
            id_pelanggan_list=payload.id_pelanggan_list,
            custom_message=payload.pesan_kustom,
            send_fcm=payload.kirim_fcm
        )

        try:
            ActivityLogService.log_from_request(
                db=db,
                request=request,
                action="KIRIM_PENGINGAT_TAGIHAN",
                status="SUCCESS",
                keterangan=f"Mengirimkan pengingat tagihan ke {res.get('total_selected')} pelanggan ({res.get('fcm_sent')} via Notifikasi MyTekno, {len(res.get('wa_targets', []))} via WA)",
                user=user
            )
        except Exception:
            pass

        return res

