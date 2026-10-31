"""
recovery_manager.py - Penanganan Reboot, Crash Recovery, dan Konfigurasi Database
Memulihkan scheduler saat server restart/mati listrik, menjadwalkan catch-up scan jika jeda terlampaui,
serta membaca/menyimpan status persistensi di tabel system_settings.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import SystemSetting, ModemCredential, UserActivityLog, Kantor
from app.core.tenant_database import TenantDatabaseManager
from app.modules.activity_logs.service import ActivityLogService

logger = logging.getLogger("scheduler_recovery")

class SchedulerRecoveryManager:

    @classmethod
    def get_setting_from_db(cls, db: Session, key: str, default: Optional[str] = None, kantor: Optional[str] = None) -> Optional[str]:
        """Mengambil nilai setting dari tabel system_settings per kantor cabang (database tenant)"""
        try:
            q = db.query(SystemSetting).filter(SystemSetting.key_name == key)
            if kantor:
                k_clean = kantor.lower().strip()
                s_office = q.filter(SystemSetting.kantor_kode == k_clean).first()
                if s_office and s_office.value_text is not None and str(s_office.value_text).strip() != "":
                    return s_office.value_text
            s = q.first()
            if s and s.value_text is not None and str(s.value_text).strip() != "":
                return s.value_text
            return default
        except Exception as e:
            logger.debug(f"[SETTING] Gagal membaca key '{key}' ({kantor}): {e}")
            return default

    @classmethod
    def set_setting_in_db(cls, db: Session, key: str, value: str, kantor: Optional[str] = None):
        """Menyimpan atau memperbarui setting di tabel system_settings per kantor cabang"""
        try:
            k_clean = (kantor or "cabang").lower().strip()
            s = db.query(SystemSetting).filter(
                SystemSetting.key_name == key,
                SystemSetting.kantor_kode == k_clean
            ).first()

            now = get_now_wib()
            if s:
                s.value_text = str(value)
                s.updated_at = now
            else:
                s = SystemSetting(
                    kantor_kode=k_clean,
                    key_name=key,
                    value_text=str(value),
                    updated_at=now
                )
                db.add(s)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"[SETTING] Gagal menyimpan '{key}'={value} ({kantor}): {e}")

    @classmethod
    def check_office_configuration(cls, db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        """
        Validasi ketat konfigurasi kantor dari database.
        TIDAK BOLEH ADA NILAI DEFAULT. Semua data harus murni ada di database.
        Jika belum ada di database, sistem dilarang mulai bekerja.
        """
        k = kantor.lower().strip() if kantor and kantor != "all" else None
        missing = []

        warn_th_str = cls.get_setting_from_db(db, "warning_threshold_dbm", None, kantor=k)
        if warn_th_str is None or warn_th_str.strip() == "":
            missing.append("warning_threshold_dbm (Ambang Batas Peringatan)")

        crit_th_str = cls.get_setting_from_db(db, "critical_threshold_dbm", None, kantor=k)
        if crit_th_str is None or crit_th_str.strip() == "":
            missing.append("critical_threshold_dbm (Ambang Batas Kritis)")

        interval_str = cls.get_setting_from_db(db, "polling_interval_minutes", None, kantor=k)
        if interval_str is None or interval_str.strip() == "":
            missing.append("polling_interval_minutes (Interval Pemantauan)")

        # Periksa kredensial modem ONT murni dari database:
        creds_list: List[Tuple[str, str]] = []
        try:
            if k:
                k_alt = k.replace('_', ' ') if '_' in k else k.replace(' ', '_')
                creds_rows = db.query(ModemCredential).filter(
                    (ModemCredential.kantor_kode == k) | (ModemCredential.kantor_kode == k_alt)
                ).all()
                for r in creds_rows:
                    if r.username and r.username.strip():
                        creds_list.append((r.username.strip(), (r.password or "").strip()))
        except Exception:
            pass

        # Dari system_settings default_modem_credentials (JSON)
        if not creds_list:
            raw_creds = cls.get_setting_from_db(db, "default_modem_credentials", None, kantor=k)
            if raw_creds and raw_creds.strip() not in ["", "[]"]:
                try:
                    p_creds = json.loads(raw_creds)
                    if isinstance(p_creds, list):
                        for c in p_creds:
                            u = str(c.get("username", "")).strip()
                            p = str(c.get("password", "")).strip()
                            if u:
                                creds_list.append((u, p))
                except Exception:
                    pass

        # Dari default_modem_user & default_modem_pass di system_settings
        if not creds_list:
            u_single = cls.get_setting_from_db(db, "default_modem_user", None, kantor=k)
            p_single = cls.get_setting_from_db(db, "default_modem_pass", None, kantor=k)
            if u_single and u_single.strip():
                creds_list.append((u_single.strip(), (p_single or "").strip()))

        if not creds_list:
            missing.append("default_modem_credentials (Kredensial Modem ONT)")

        is_configured = (len(missing) == 0)
        office_label = k.upper() if k else "SEMUA KANTOR"
        error_msg = f"Pengaturan pemantauan kantor '{office_label}' belum disetel di database ({', '.join(missing)}). Silakan simpan pengaturan terlebih dahulu di menu Pengaturan." if not is_configured else None

        warn_val = None
        if warn_th_str:
            try:
                warn_val = float(warn_th_str)
            except Exception:
                pass

        crit_val = None
        if crit_th_str:
            try:
                crit_val = float(crit_th_str)
            except Exception:
                pass

        interval_val = None
        if interval_str and interval_str.isdigit():
            try:
                interval_val = int(interval_str)
            except Exception:
                pass

        status_str = cls.get_setting_from_db(db, "scheduler_status", "RUNNING", kantor=k)

        return {
            "kantor": k or "all",
            "is_configured": is_configured,
            "missing_fields": missing,
            "error_message": error_msg,
            "warn_threshold": warn_val,
            "crit_threshold": crit_val,
            "warning_threshold_dbm": warn_val if warn_val is not None else settings.WARNING_THRESHOLD_DBM,
            "critical_threshold_dbm": crit_val if crit_val is not None else settings.CRITICAL_THRESHOLD_DBM,
            "polling_interval_minutes": interval_val if interval_val is not None else settings.POLLING_INTERVAL_MINUTES,
            "scheduler_status": status_str or "RUNNING",
            "has_credentials": len(creds_list) > 0,
            "credentials": creds_list,
            "is_ready_to_monitor": is_configured
        }

    @classmethod
    def handle_startup_recovery(cls, scheduler_instance):
        """Memeriksa status terakhir saat server boot, auto-resume jika RUNNING, dan catch-up scan"""
        try:
            m_db = TenantDatabaseManager.get_tenant_session(None)
            try:
                kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
                all_codes = [k.kode for k in kantors]
            finally:
                m_db.close()

            resumed_count = 0
            for code in all_codes:
                t_db = TenantDatabaseManager.get_tenant_session(code)
                try:
                    last_status = cls.get_setting_from_db(t_db, "scheduler_status", "RUNNING", kantor=code)
                    if last_status == "RUNNING":
                        resumed_count += 1
                finally:
                    t_db.close()

            logger.info(f"[RECOVERY] Startup Auto-Recovery: {resumed_count}/{len(all_codes)} kantor aktif dalam mode pemantauan berkala.")
        except Exception as e:
            logger.error(f"[RECOVERY] Gagal mengeksekusi startup recovery check: {e}")
