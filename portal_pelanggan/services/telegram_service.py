import requests
import logging
from app.core.config import settings

logger = logging.getLogger("portal_telegram")

class PortalTelegramService:
    @staticmethod
    def send_ticket_notification(
        id_tiket: str,
        nama_pelanggan: str,
        id_pelanggan: str,
        kantor: str,
        alamat: str,
        kategori: str,
        deskripsi: str,
        no_wa: str,
        redaman: str,
        status_koneksi: str
    ) -> bool:
        if not settings.TELEGRAM_BOT_TOKEN or not settings.telegram_recipient_list:
            logger.warning("Bot Telegram belum dikonfigurasi.")
            return False

        emoji_status = "⚠️" if status_koneksi == "WARNING" else ("🚨" if status_koneksi in ["CRITICAL", "LOS"] else "📶")

        pesan = (
            f"🎫 <b>[TIKET GANGGUAN PELANGGAN BARU]</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🆔 <b>No Tiket:</b> <code>{id_tiket}</code>\n"
            f"👤 <b>Pelanggan:</b> {nama_pelanggan} (<code>{id_pelanggan}</code>)\n"
            f"🏢 <b>Kantor:</b> {kantor.upper()}\n"
            f"📍 <b>Alamat:</b> {alamat or '-'}\n"
            f"⚠️ <b>Kategori:</b> {kategori}\n"
            f"📝 <b>Keluhan:</b> {deskripsi}\n"
            f"{emoji_status} <b>Redaman Terakhir:</b> {redaman} ({status_koneksi})\n"
            f"📞 <b>Kontak Pelapor:</b> {no_wa}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"<i>Laporan dikirim otomatis melalui Portal Pelanggan. Mohon teknisi segera merespons!</i>"
        )

        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        sukses = False

        for chat_id in settings.telegram_recipient_list:
            try:
                res = requests.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": pesan,
                        "parse_mode": "HTML"
                    },
                    timeout=5
                )
                if res.status_code == 200:
                    sukses = True
            except Exception as e:
                logger.error(f"Gagal kirim notifikasi tiket ke chat {chat_id}: {e}")

        return sukses
