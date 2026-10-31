"""
PortalCustomerService - Layer Service Terpusat untuk Operasional Pelanggan Portal TeknoCust.
Mematuhi Protokol P2-02 (vibe-coding-guardrails):
Memisahkan kueri database (SQL/ORM) dari layer Route/Controller ke Service/Repository.
"""
import json
import logging
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, SystemSetting, LogPerformaONT
from app.core.tenant_database import TenantDatabaseManager
from app.core.security import get_all_kantor_codes

logger = logging.getLogger("portal_customer_service")

class PortalCustomerService:

    @staticmethod
    def get_customer_by_id(
        id_pel: str,
        db: Optional[Session] = None,
        hint_kantor: Optional[str] = None
    ) -> Tuple[Optional[Pelanggan], Optional[Session]]:
        """
        Mencari data pelanggan dengan mekanisme multi-tenant lookup:
        1. Cek pada session `db` yang diberikan
        2. Cek pada tenant session sesuai `hint_kantor` jika ada
        3. Fallback scan ke seluruh database tenant kantor
        Mengembalikan tuple: (Pelanggan, TargetSession).
        """
        if not id_pel:
            return None, None

        if db:
            pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
            if pelanggan:
                return pelanggan, db

        if hint_kantor:
            try:
                t_db = TenantDatabaseManager.get_tenant_session(hint_kantor)
                pelanggan = t_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
                if pelanggan:
                    return pelanggan, t_db
                t_db.close()
            except Exception as e:
                logger.debug(f"Gagal kueri tenant hint {hint_kantor}: {e}")

        for k_code in get_all_kantor_codes():
            try:
                k_db = TenantDatabaseManager.get_tenant_session(k_code)
                p_found = k_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pel).first()
                if p_found:
                    return p_found, k_db
                k_db.close()
            except Exception as e:
                logger.debug(f"Gagal kueri tenant {k_code}: {e}")

        return None, None

    @staticmethod
    def get_default_modem_credentials(db: Session) -> List[Tuple[str, str]]:
        """
        Mengambil default modem credentials dari tabel system_settings.
        """
        setting = db.query(SystemSetting).filter(
            SystemSetting.key_name == "default_modem_credentials"
        ).first()

        default_creds = []
        if setting and setting.value_text:
            try:
                raw_creds = json.loads(setting.value_text)
                if isinstance(raw_creds, list):
                    for item in raw_creds:
                        if isinstance(item, dict):
                            default_creds.append((item.get("username", ""), item.get("password", "")))
            except Exception:
                default_creds = []
        return default_creds

    @staticmethod
    def get_latest_signal_log(db: Session, id_pel: str) -> Optional[LogPerformaONT]:
        """
        Mengambil log performa ONT terakhir dari pelanggan tertentu.
        """
        return db.query(LogPerformaONT).filter(
            LogPerformaONT.id_pelanggan == id_pel
        ).order_by(LogPerformaONT.waktu_cek.desc()).first()

    @staticmethod
    def save_speedtest_results(
        db: Session,
        id_pelanggan: str,
        download: Optional[float] = None,
        upload: Optional[float] = None,
        ping: Optional[float] = None,
        jitter: Optional[float] = None
    ) -> Optional[Pelanggan]:
        """
        Menyimpan metrik pengujian kecepatan ke data pelanggan.
        """
        pel = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not pel:
            return None

        if download is not None:
            pel.last_speed_download = round(float(download), 2)
        if upload is not None:
            pel.last_speed_upload = round(float(upload), 2)
        if ping is not None:
            pel.last_speed_ping = round(float(ping), 2)
        if jitter is not None:
            pel.last_speed_jitter = round(float(jitter), 2)

        from app.core.timezone import get_now_wib
        pel.last_speed_test_at = get_now_wib()
        db.commit()
        db.refresh(pel)
        return pel
