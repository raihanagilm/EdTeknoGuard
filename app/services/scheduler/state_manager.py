"""
state_manager.py - Manajemen State Pemindaian & Persistensi File
Mengelola state per-kantor (OfficeScanState), pencatatan progres scan file JSON (.tmp/scan_state_*.json),
serta retensi pembersihan log berkala (logs_mgmt, alert_logs, user_activity_logs).
"""

import os
import json
import logging
import threading
from datetime import timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.timezone import get_now_wib
from app.db.models import LogPerformaONT, AlertLog, UserActivityLog, Kantor
from app.core.tenant_database import TenantDatabaseManager

logger = logging.getLogger("scheduler_state")

class OfficeScanState:
    """Menyimpan status pemantauan spesifik per kantor cabang"""
    def __init__(self, kantor: str):
        self.kantor = kantor
        self.is_scanning: bool = False
        self.is_paused: bool = False
        self.is_stopped: bool = False
        self.last_scan_time = None
        self.last_scan_result: Dict[str, Any] = {}
        self.lock = threading.Lock()
        self.current_scan_index: int = 0
        self.total_customers_in_scan: int = 0
        self.current_scan_customer: Optional[str] = None
        self.last_sync_stats: Dict[str, Any] = {
            "total_checked": 0,
            "success": 0,
            "failed": 0,
            "warning": 0,
            "critical": 0,
            "los": 0,
            "unreachable": 0,
            "retried": 0,
            "recovered": 0,
            "batch_alerts_sent": 0
        }


class SchedulerStateManager:
    _office_states: Dict[str, OfficeScanState] = {}
    _state_lock = threading.Lock()

    @classmethod
    def get_office_state(cls, kantor: Optional[str] = None) -> OfficeScanState:
        k = (kantor or "cabang").lower().strip()
        with cls._state_lock:
            if k not in cls._office_states:
                cls._office_states[k] = OfficeScanState(k)
            return cls._office_states[k]

    @classmethod
    def get_state_file_path(cls, kantor: Optional[str] = None) -> str:
        k = (kantor or "cabang").lower().strip()
        tmp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        return os.path.join(tmp_dir, f"scan_state_{k}.json")

    @classmethod
    def save_scan_state(cls, current_index: int, total: int, kantor: Optional[str] = None):
        try:
            k = (kantor or "cabang").lower().strip()
            path = cls.get_state_file_path(k)
            data = {
                "kantor": k,
                "current_index": current_index,
                "total": total,
                "updated_at": get_now_wib().isoformat()
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"[STATE] Gagal menyimpan checkpoint scan {kantor}: {e}")

    @classmethod
    def load_scan_state(cls, kantor: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            path = cls.get_state_file_path(kantor)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"[STATE] Gagal membaca checkpoint scan {kantor}: {e}")
        return None

    @classmethod
    def delete_scan_state(cls, kantor: Optional[str] = None):
        try:
            path = cls.get_state_file_path(kantor)
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

    @classmethod
    def cleanup_old_logs(cls, db: Session, days: int = 30) -> int:
        """Menghapus entri log_performa_ont yang berusia lebih dari X hari"""
        cutoff = get_now_wib() - timedelta(days=days)
        deleted = db.query(LogPerformaONT).filter(LogPerformaONT.waktu_cek < cutoff).delete(synchronize_session=False)
        db.commit()
        return deleted

    @classmethod
    def cleanup_alert_logs(cls, days: int = 7) -> int:
        """Menghapus riwayat alert_logs yang berusia lebih dari X hari di seluruh tenant DB"""
        total_deleted = 0
        cutoff = get_now_wib() - timedelta(days=days)
        master_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = master_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                try:
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        deleted = t_db.query(AlertLog).filter(AlertLog.waktu_kirim < cutoff).delete(synchronize_session=False)
                        t_db.commit()
                        total_deleted += deleted
                    finally:
                        t_db.close()
                except Exception as e:
                    logger.error(f"[CLEANUP] Gagal membersihkan alert_logs untuk kantor {k.nama}: {e}")
        finally:
            master_db.close()
        return total_deleted

    @classmethod
    def cleanup_activity_logs(cls, days: int = 60) -> int:
        """Menghapus user_activity_logs yang berusia lebih dari X hari di database master"""
        cutoff = get_now_wib() - timedelta(days=days)
        master_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            deleted = master_db.query(UserActivityLog).filter(UserActivityLog.created_at < cutoff).delete(synchronize_session=False)
            master_db.commit()
            return deleted
        except Exception as e:
            master_db.rollback()
            logger.error(f"[CLEANUP] Gagal membersihkan user_activity_logs: {e}")
            return 0
        finally:
            master_db.close()

