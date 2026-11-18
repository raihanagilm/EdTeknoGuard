"""
customer_activity_service.py - Layanan Audit Trail & Log Aktivitas Pelanggan MyTekno
Mencatat aksi mandiri warga (ganti password, ubah wifi, blokir perangkat, tiket)
dan menyediakan pembersihan otomatis (retensi 60 hari).
"""

import logging
from datetime import timedelta
from typing import Optional, Dict, Any, Tuple
from fastapi import Request
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib
from app.db.models import LogAktivitasPelanggan, Kantor
from app.core.tenant_database import TenantDatabaseManager

logger = logging.getLogger("customer_activity_service")


class CustomerActivityService:

    @staticmethod
    def extract_meta(request: Optional[Request] = None) -> Tuple[Optional[str], Optional[str]]:
        """Mengekstrak alamat IP klien dan user agent dari objek HTTP Request"""
        if not request:
            return None, None
        ip = None
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client and request.client.host:
            ip = request.client.host
        ua = request.headers.get("user-agent")
        return ip, ua

    @classmethod
    def record(
        cls,
        db: Session,
        id_pelanggan: str,
        aksi: str,
        keterangan: str,
        kategori: str = "PORTAL",
        status: str = "SUCCESS",
        request: Optional[Request] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[LogAktivitasPelanggan]:
        """
        Mencatat entri log aktivitas pelanggan ke tabel log_aktivitas_pelanggan di basis data tenant
        """
        try:
            req_ip, req_ua = cls.extract_meta(request)
            final_ip = ip_address or req_ip or "127.0.0.1"
            final_ua = user_agent or req_ua

            entry = LogAktivitasPelanggan(
                id_pelanggan=id_pelanggan,
                aksi=aksi.upper().strip(),
                kategori=kategori.upper().strip(),
                status=status.upper().strip(),
                keterangan=keterangan.strip(),
                ip_address=final_ip,
                user_agent=final_ua,
                created_at=get_now_wib()
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as e:
            db.rollback()
            logger.error(f"[CUSTOMER_LOG] Gagal mencatat aksi {aksi} untuk {id_pelanggan}: {e}")
            return None

    @classmethod
    def cleanup_old_logs(cls, days: int = 60) -> int:
        """
        Menghapus riwayat log_aktivitas_pelanggan yang berusia lebih dari X hari (default 60 hari)
        di seluruh database tenant aktif.
        """
        total_deleted = 0
        cutoff = get_now_wib() - timedelta(days=days)
        master_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = master_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                try:
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        deleted = t_db.query(LogAktivitasPelanggan).filter(
                            LogAktivitasPelanggan.created_at < cutoff
                        ).delete(synchronize_session=False)
                        t_db.commit()
                        if deleted > 0:
                            total_deleted += deleted
                            logger.info(f"[CLEANUP] Berhasil menghapus {deleted} log aktivitas pelanggan (> {days} hari) di kantor {k.nama}.")
                    finally:
                        t_db.close()
                except Exception as e:
                    logger.error(f"[CLEANUP] Gagal membersihkan log aktivitas pelanggan kantor {k.nama}: {e}")
        finally:
            master_db.close()
        return total_deleted
