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
    def _clear_fcm_token_from_other_customers(
        token: str,
        exclude_cust_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> None:
        """
        Membersihkan token FCM yang sama dari akun pelanggan lain (lintas tenant)
        agar satu perangkat HP hanya terikat ke satu akun pelanggan aktif.
        """
        if not token:
            return

        def _clear_in_session(session: Session) -> None:
            query = session.query(Pelanggan).filter(Pelanggan.fcm_token == token)
            if exclude_cust_id:
                query = query.filter(Pelanggan.id_pelanggan != exclude_cust_id)
            updated = query.update({"fcm_token": None}, synchronize_session=False)
            if updated:
                session.commit()

        if db is not None:
            try:
                _clear_in_session(db)
            except Exception as e:
                logger.warning(f"FCM: Gagal membersihkan token duplikat di DB utama: {e}")

        for k_code in get_all_kantor_codes():
            k_db = None
            try:
                k_db = TenantDatabaseManager.get_tenant_session(k_code)
                _clear_in_session(k_db)
            except Exception as e:
                logger.debug(f"FCM: Gagal membersihkan token duplikat di tenant {k_code}: {e}")
            finally:
                if k_db is not None:
                    k_db.close()

    @staticmethod
    def reassign_fcm_token(
        cust_id: str,
        token: str,
        db: Optional[Session] = None,
        hint_kantor: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Mengikat token FCM perangkat ke akun pelanggan aktif sambil mencabut
        token tersebut dari akun pelanggan lain yang sebelumnya memakai perangkat sama.
        """
        if not cust_id or not token:
            return False, None, None

        PortalCustomerService._clear_fcm_token_from_other_customers(
            token=token,
            exclude_cust_id=cust_id,
            db=db
        )

        cust, target_db = PortalCustomerService.get_customer_by_id(
            cust_id,
            db=db,
            hint_kantor=hint_kantor
        )
        if not cust or not target_db:
            return False, None, None

        try:
            cust.fcm_token = token
            target_db.commit()
            return True, cust.nama, cust.kantor or hint_kantor
        finally:
            if target_db != db:
                target_db.close()

    @staticmethod
    def clear_fcm_token_on_logout(
        cust_id: str,
        platform: str = "WEB",
        fcm_token: Optional[str] = None,
        db: Optional[Session] = None,
        hint_kantor: Optional[str] = None
    ) -> None:
        """
        Menghapus token FCM saat pelanggan logout dari aplikasi Android (APP)
        atau saat token perangkat dikirim eksplisit, tanpa memutus token Android
        jika pelanggan hanya logout dari Web Browser.
        """
        clean_platform = (platform or "WEB").upper().strip()
        clean_token = (fcm_token or "").strip()

        if not clean_token and clean_platform != "APP":
            return

        if clean_token:
            PortalCustomerService._clear_fcm_token_from_other_customers(
                token=clean_token,
                exclude_cust_id=None,
                db=db
            )

        if cust_id:
            cust, target_db = PortalCustomerService.get_customer_by_id(
                cust_id,
                db=db,
                hint_kantor=hint_kantor
            )
            if cust and target_db:
                try:
                    if clean_platform == "APP" or (clean_token and cust.fcm_token == clean_token):
                        cust.fcm_token = None
                        target_db.commit()
                finally:
                    if target_db != db:
                        target_db.close()

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
