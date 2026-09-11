import logging
from datetime import datetime, timedelta
from typing import List, Optional
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import AlertLog, Pelanggan, LogPerformaONT

logger = logging.getLogger("telegram_service")

class TelegramService:

    @classmethod
    async def send_message_async(cls, chat_id: str, text: str, disable_notification: bool = False) -> bool:
        if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
            logger.warning("Telegram Bot Token atau Chat ID kosong, melewati pengiriman.")
            return False

        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "disable_notification": disable_notification
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    return True
                else:
                    logger.error(f"Gagal kirim telegram ke {chat_id}: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"Error request telegram: {e}")
            return False

    @classmethod
    def send_message_sync(cls, chat_id: str, text: str, disable_notification: bool = False) -> bool:
        if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
            return False
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "disable_notification": disable_notification
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, json=payload)
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    def is_in_night_mode(cls, db: Session, now_time: Optional[datetime] = None) -> bool:
        """Periksa apakah waktu saat ini berada dalam rentang Mode Malam (Quiet Hours)"""
        from app.db.models import SystemSetting
        s_enabled = db.query(SystemSetting).filter(SystemSetting.key_name == "telegram_night_mode_enabled").first()
        if not s_enabled or s_enabled.value_text.lower() not in ["true", "1", "yes"]:
            return False

        s_start = db.query(SystemSetting).filter(SystemSetting.key_name == "telegram_night_mode_start").first()
        s_end = db.query(SystemSetting).filter(SystemSetting.key_name == "telegram_night_mode_end").first()
        start_str = s_start.value_text if s_start and s_start.value_text else "22:00"
        end_str = s_end.value_text if s_end and s_end.value_text else "06:00"

        now = now_time or datetime.now()
        current_hm = now.strftime("%H:%M")

        if start_str <= end_str:
            return start_str <= current_hm <= end_str
        else:
            # Lewat tengah malam (misal 22:00 sampai 06:00)
            return current_hm >= start_str or current_hm <= end_str

    @classmethod
    def should_suppress_alert(cls, id_pelanggan: str, status: str, db: Session, debounce_minutes: int = 30, ref_time: Optional[datetime] = None) -> bool:
        """Cek apakah alert serupa baru saja dikirim dalam rentang debounce_minutes terakhir"""
        now = ref_time or datetime.now()
        cutoff = now - timedelta(minutes=debounce_minutes)
        recent_alert = (
            db.query(AlertLog)
            .filter(AlertLog.id_pelanggan == id_pelanggan, AlertLog.waktu_kirim >= cutoff)
            .order_by(AlertLog.waktu_kirim.desc())
            .first()
        )
        if not recent_alert:
            return False

        # Jika sebelumnya hanya WARNING dan sekarang menjadi CRITICAL/LOS, jangan suppress (eskalasi darurat)
        if recent_alert.tipe_alert == "WARNING" and status in ["CRITICAL", "LOS"]:
            return False

        return True

    @classmethod
    def format_alert_message(cls, pelanggan: Pelanggan, log_entry: LogPerformaONT, warning_th: float = -26.0, critical_th: float = -27.0) -> str:
        rx = log_entry.rx_power
        is_los = (log_entry.status_koneksi == "LOS" or rx is None)
        is_critical = is_los or (rx is not None and rx <= critical_th)

        waktu_str = log_entry.waktu_cek.strftime("%d/%m/%Y %H:%M:%S")

        if is_critical:
            # Notifikasi Merah Kritis
            rx_display = f"{rx:.2f} dBm" if rx is not None else "LOSS OF SIGNAL (LOS)"
            msg = (
                f"🚨🔴 <b>[NOTIFIKASI MERAH - SEGERA DICEK!]</b>\n\n"
                f"⚠️ <i>Terdeteksi redaman optik kritis &le; {critical_th:.1f} dBm yang berisiko tinggi pemutusan koneksi internet pelanggan!</i>\n\n"
                f"👤 <b>Pelanggan:</b> {pelanggan.nama} (ID: <code>{pelanggan.id_pelanggan}</code>)\n"
                f"📍 <b>POP:</b> {pelanggan.pop}\n"
                f"🌐 <b>IP ONT:</b> <code>{pelanggan.ip_router}</code>\n"
                f"📟 <b>Jenis Modem:</b> {pelanggan.jenis_modem}\n"
                f"📊 <b>Redaman Terukur:</b> <b>{rx_display}</b>\n"
                f"🔴 <b>Ambang Batas Kritis:</b> &le; {critical_th:.1f} dBm\n"
                f"⏰ <b>Waktu Deteksi:</b> {waktu_str} WIB\n\n"
                f"⚡ <b>INSTRUKSI TINDAKAN:</b>\n"
                f"Mohon teknisi piket lapangan untuk <b>SEGERA melakukan pengecekan fisik</b> kabel dropcore, sambungan fusion/fast connector, dan patchcord pelanggan!"
            )
        else:
            # Peringatan Ringan (Warning Dini)
            rx_display = f"{rx:.2f} dBm" if rx is not None else f"{warning_th:.1f} dBm"
            msg = (
                f"⚠️ <b>[PERINGATAN RINGAN - PERINGATAN DINI]</b>\n\n"
                f"ℹ️ <i>Sinyal optik mulai menurun menyentuh batas peringatan dini {warning_th:.1f} dBm.</i>\n\n"
                f"👤 <b>Pelanggan:</b> {pelanggan.nama} (ID: <code>{pelanggan.id_pelanggan}</code>)\n"
                f"📍 <b>POP:</b> {pelanggan.pop}\n"
                f"🌐 <b>IP ONT:</b> <code>{pelanggan.ip_router}</code>\n"
                f"📟 <b>Jenis Modem:</b> {pelanggan.jenis_modem}\n"
                f"📊 <b>Redaman Terukur:</b> <b>{rx_display}</b>\n"
                f"⚠️ <b>Ambang Peringatan Dini:</b> &le; {warning_th:.1f} dBm (Toleransi s/d {critical_th:.1f} dBm)\n"
                f"⏰ <b>Waktu Deteksi:</b> {waktu_str} WIB\n\n"
                f"<i>Catatan: Masih dalam batas operasional, mohon jadwalkan pemantauan berkala.</i>"
            )
        return msg

    @classmethod
    async def process_and_send_alert_async(cls, pelanggan: Pelanggan, log_entry: LogPerformaONT, db: Session) -> bool:
        if log_entry.status_koneksi not in ["WARNING", "CRITICAL", "LOS"]:
            return False

        # Ambil setting debounce dan ambang batas dinamis dari database jika ada
        from app.db.models import SystemSetting
        s_item = db.query(SystemSetting).filter(SystemSetting.key_name == "alert_debounce_minutes").first()
        debounce_mins = int(s_item.value_text) if s_item and s_item.value_text.isdigit() else settings.ALERT_DEBOUNCE_MINUTES

        s_warn = db.query(SystemSetting).filter(SystemSetting.key_name == "warning_threshold_dbm").first()
        s_crit = db.query(SystemSetting).filter(SystemSetting.key_name == "critical_threshold_dbm").first()
        warn_val = float(s_warn.value_text) if s_warn else -26.0
        crit_val = float(s_crit.value_text) if s_crit else -27.0

        if cls.should_suppress_alert(pelanggan.id_pelanggan, log_entry.status_koneksi, db, debounce_minutes=debounce_mins, ref_time=log_entry.waktu_cek):
            logger.info(f"Alert untuk {pelanggan.nama} di-suppress (debounce anti-spam {debounce_mins} menit).")
            return False

        recipients = settings.telegram_recipient_list
        if not recipients:
            logger.info("Tidak ada TELEGRAM_CHAT_IDS yang dikonfigurasi.")
            return False

        is_silent = cls.is_in_night_mode(db, log_entry.waktu_cek)
        message = cls.format_alert_message(pelanggan, log_entry, warning_th=warn_val, critical_th=crit_val)
        sent_any = False
        target_list_str = ",".join(recipients)

        for chat_id in recipients:
            success = await cls.send_message_async(chat_id, message, disable_notification=is_silent)
            if success:
                sent_any = True

        # Catat ke alert logs
        new_alert = AlertLog(
            id_pelanggan=pelanggan.id_pelanggan,
            tipe_alert=log_entry.status_koneksi,
            rx_power=log_entry.rx_power,
            pesan=message,
            target_recipients=target_list_str,
            status_kirim="SUCCESS" if sent_any else "FAILED",
            waktu_kirim=log_entry.waktu_cek or datetime.now()
        )
        db.add(new_alert)
        db.commit()

        return sent_any

    @classmethod
    def process_and_send_alert_sync(cls, pelanggan: Pelanggan, log_entry: LogPerformaONT, db: Session) -> bool:
        if log_entry.status_koneksi not in ["WARNING", "CRITICAL", "LOS"]:
            return False

        # Ambil setting debounce dari database jika ada
        from app.db.models import SystemSetting
        s_item = db.query(SystemSetting).filter(SystemSetting.key_name == "alert_debounce_minutes").first()
        debounce_mins = int(s_item.value_text) if s_item and s_item.value_text.isdigit() else settings.ALERT_DEBOUNCE_MINUTES

        s_warn = db.query(SystemSetting).filter(SystemSetting.key_name == "warning_threshold_dbm").first()
        s_crit = db.query(SystemSetting).filter(SystemSetting.key_name == "critical_threshold_dbm").first()
        warn_val = float(s_warn.value_text) if s_warn else -26.0
        crit_val = float(s_crit.value_text) if s_crit else -27.0

        if cls.should_suppress_alert(pelanggan.id_pelanggan, log_entry.status_koneksi, db, debounce_minutes=debounce_mins, ref_time=log_entry.waktu_cek):
            logger.info(f"Alert untuk {pelanggan.nama} di-suppress (anti-spam debounce {debounce_mins} menit).")
            return False

        recipients = settings.telegram_recipient_list
        if not recipients:
            logger.info("Tidak ada TELEGRAM_CHAT_IDS yang dikonfigurasi.")
            return False

        is_silent = cls.is_in_night_mode(db, log_entry.waktu_cek)
        message = cls.format_alert_message(pelanggan, log_entry, warning_th=warn_val, critical_th=crit_val)
        sent_any = False
        target_list_str = ",".join(recipients)

        for chat_id in recipients:
            success = cls.send_message_sync(chat_id, message, disable_notification=is_silent)
            if success:
                sent_any = True

        new_alert = AlertLog(
            id_pelanggan=pelanggan.id_pelanggan,
            tipe_alert=log_entry.status_koneksi,
            rx_power=log_entry.rx_power,
            pesan=message,
            target_recipients=target_list_str,
            status_kirim="SUCCESS" if sent_any else "FAILED",
            waktu_kirim=log_entry.waktu_cek or datetime.now()
        )
        db.add(new_alert)
        db.commit()
        return sent_any

    @classmethod
    def send_mass_outage_alert_sync(cls, pop: str, count: int, customer_names: List[str], db: Session) -> bool:
        """Kirim alert jika terdeteksi gangguan massal (>= 3 ONT LOS di POP yang sama)"""
        cutoff = datetime.utcnow() - timedelta(minutes=settings.ALERT_DEBOUNCE_MINUTES)
        existing = db.query(AlertLog).filter(
            AlertLog.id_pelanggan == f"MASS_OUTAGE_{pop}",
            AlertLog.waktu_kirim >= cutoff
        ).first()
        if existing:
            return False

        recipients = settings.telegram_recipient_list
        if not recipients:
            return False

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        names_str = ", ".join(customer_names[:5]) + ("..." if len(customer_names) > 5 else "")
        msg = (
            f"🚨🚨 <b>[EdTeknoGuard] PERINGATAN GANGGUAN MASSAL!</b>\n\n"
            f"📍 <b>POP:</b> {pop}\n"
            f"⚠️ <b>Total ONT Mati (LOS):</b> <b>{count} Pelanggan</b>\n"
            f"👥 <b>Sampel Pelanggan:</b> {names_str}\n"
            f"⏰ <b>Waktu Deteksi:</b> {now_str} WIB\n\n"
            f"<i>Indikasi: Kabel distribusi/feeder putus atau supply listrik di POP padam. Segera kirim tim patroli FO.</i>"
        )

        sent_any = False
        for cid in recipients:
            if cls.send_message_sync(cid, msg):
                sent_any = True

        log_entry = AlertLog(
            id_pelanggan=f"MASS_OUTAGE_{pop}",
            tipe_alert="MASS_OUTAGE",
            rx_power=None,
            pesan=msg,
            target_recipients=",".join(recipients),
            status_kirim="SUCCESS" if sent_any else "FAILED",
            waktu_kirim=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        return sent_any
