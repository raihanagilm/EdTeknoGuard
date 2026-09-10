import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import SystemSetting, AlertLog

logger = logging.getLogger("telegram_mgmt_service")

class TelegramMgmtService:

    @staticmethod
    def get_settings(db: Session) -> Dict[str, Any]:
        """Ambil pengaturan dari database atau fallback ke environment variables"""
        keys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_IDS", "WARNING_THRESHOLD_DBM", "ALERT_DEBOUNCE_MINUTES"]
        db_settings = {}
        rows = db.query(SystemSetting).filter(SystemSetting.key_name.in_(keys)).all()
        for r in rows:
            db_settings[r.key_name] = r.value_text

        bot_token = db_settings.get("TELEGRAM_BOT_TOKEN", settings.TELEGRAM_BOT_TOKEN or "")
        chat_ids = db_settings.get("TELEGRAM_CHAT_IDS", settings.TELEGRAM_CHAT_IDS or "")
        
        try:
            threshold = float(db_settings.get("WARNING_THRESHOLD_DBM", settings.WARNING_THRESHOLD_DBM))
        except (ValueError, TypeError):
            threshold = -26.0

        try:
            debounce = int(db_settings.get("ALERT_DEBOUNCE_MINUTES", settings.ALERT_DEBOUNCE_MINUTES))
        except (ValueError, TypeError):
            debounce = 30

        return {
            "bot_token": bot_token,
            "chat_ids": chat_ids,
            "warning_threshold_dbm": threshold,
            "debounce_minutes": debounce,
            "is_configured": bool(bot_token and chat_ids)
        }

    @staticmethod
    def update_settings(
        db: Session,
        bot_token: Optional[str],
        chat_ids: str,
        warning_threshold_dbm: float,
        debounce_minutes: int
    ) -> Dict[str, Any]:
        """Simpan pengaturan ke tabel system_settings dan update runtime settings"""
        pairs = {
            "TELEGRAM_BOT_TOKEN": bot_token.strip() if bot_token else "",
            "TELEGRAM_CHAT_IDS": chat_ids.strip() if chat_ids else "",
            "WARNING_THRESHOLD_DBM": str(warning_threshold_dbm),
            "ALERT_DEBOUNCE_MINUTES": str(debounce_minutes)
        }

        for k, v in pairs.items():
            existing = db.query(SystemSetting).filter(SystemSetting.key_name == k).first()
            if existing:
                existing.value_text = v
                existing.updated_at = datetime.utcnow()
            else:
                db.add(SystemSetting(key_name=k, value_text=v))

        db.commit()

        # Update in-memory settings
        settings.TELEGRAM_BOT_TOKEN = pairs["TELEGRAM_BOT_TOKEN"]
        settings.TELEGRAM_CHAT_IDS = pairs["TELEGRAM_CHAT_IDS"]
        settings.WARNING_THRESHOLD_DBM = warning_threshold_dbm
        settings.ALERT_DEBOUNCE_MINUTES = debounce_minutes

        return TelegramMgmtService.get_settings(db)

    @staticmethod
    async def send_test_alert(db: Session, custom_chat_id: Optional[str] = None) -> Dict[str, Any]:
        """Kirim pesan verifikasi pengujian bot telegram"""
        current_cfg = TelegramMgmtService.get_settings(db)
        token = current_cfg["bot_token"]

        if not token:
            return {
                "status": "error",
                "message": "Token Bot Telegram belum diisi. Silakan isi dan simpan terlebih dahulu."
            }

        recipients = [c.strip() for c in custom_chat_id.split(",")] if custom_chat_id else [
            c.strip() for c in current_cfg["chat_ids"].split(",") if c.strip()
        ]

        if not recipients:
            return {
                "status": "error",
                "message": "Belum ada Chat ID Telegram tujuan yang ditentukan."
            }

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        test_msg = (
            f"🧪 <b>[EdTeknoGuard] TEST NOTIFIKASI TELEGRAM BERHASIL</b>\n\n"
            f"✅ Bot Telegram NOC EdTeknoGuard telah terhubung dengan baik!\n"
            f"⚡ <b>Ambang Batas Deteksi Dini:</b> &le; <b>{current_cfg['warning_threshold_dbm']:.1f} dBm</b>\n"
            f"⏱️ <b>Anti-Spam Debounce:</b> {current_cfg['debounce_minutes']} Menit\n"
            f"⏰ <b>Waktu Uji Coba:</b> {now_str} WIB\n\n"
            f"<i>Sistem siap mengirimkan peringatan otomatis ketika redaman modem drop mendekati batas kerusakan (-27 dBm).</i>"
        )

        results = []
        sent_any = False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient(timeout=10.0) as client:
            for cid in recipients:
                if not cid:
                    continue
                try:
                    res = await client.post(url, json={
                        "chat_id": cid,
                        "text": test_msg,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True
                    })
                    if res.status_code == 200:
                        results.append({"chat_id": cid, "status": "SUCCESS"})
                        sent_any = True
                    else:
                        err_text = res.json().get("description", res.text)
                        results.append({"chat_id": cid, "status": "FAILED", "error": err_text})
                except Exception as e:
                    results.append({"chat_id": cid, "status": "ERROR", "error": str(e)})

        # Log event test
        log_entry = AlertLog(
            id_pelanggan="SYSTEM_TEST",
            tipe_alert="TEST_PROBE",
            rx_power=None,
            pesan=test_msg,
            target_recipients=",".join(recipients),
            status_kirim="SUCCESS" if sent_any else "FAILED",
            waktu_kirim=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()

        if sent_any:
            return {
                "status": "success",
                "message": f"Uji coba notifikasi berhasil dikirim ke {len([r for r in results if r['status'] == 'SUCCESS'])} penerima.",
                "details": results
            }
        else:
            return {
                "status": "error",
                "message": "Gagal mengirim notifikasi ke Telegram. Pastikan Bot Token valid dan Anda telah menekan /start pada bot.",
                "details": results
            }

    @staticmethod
    def get_alert_history(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        logs = db.query(AlertLog).order_by(AlertLog.waktu_kirim.desc()).limit(limit).all()
        return [
            {
                "id": l.id,
                "id_pelanggan": l.id_pelanggan,
                "tipe_alert": l.tipe_alert,
                "rx_power": float(l.rx_power) if l.rx_power is not None else None,
                "target_recipients": l.target_recipients,
                "status_kirim": l.status_kirim,
                "waktu_kirim": l.waktu_kirim.strftime("%Y-%m-%d %H:%M:%S")
            }
            for l in logs
        ]
