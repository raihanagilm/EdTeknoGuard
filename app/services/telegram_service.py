"""
Stub TelegramService (No-Op)
Fitur Telegram dinonaktifkan karena aplikasi menggunakan Native Android Notification.
"""
import logging

logger = logging.getLogger("telegram_service")

class TelegramService:
    @classmethod
    async def send_alert_async(cls, *args, **kwargs) -> bool:
        return True

    @classmethod
    def send_alert(cls, *args, **kwargs) -> bool:
        return True

    @classmethod
    async def process_and_send_alert_async(cls, *args, **kwargs) -> bool:
        return True

    @classmethod
    def process_and_send_alert_sync(cls, *args, **kwargs) -> bool:
        return True

    @classmethod
    def send_mass_outage_alert_sync(cls, *args, **kwargs) -> bool:
        return True

    @classmethod
    def send_batch_los_alert_sync(cls, *args, **kwargs) -> bool:
        return True

telegram_service = TelegramService()
