"""
Stub PortalTelegramService (No-Op)
Fitur Telegram dinonaktifkan karena aplikasi menggunakan Native Android Notification.
"""
class PortalTelegramService:
    @classmethod
    def send_ticket_notification(cls, *args, **kwargs) -> bool:
        return True
