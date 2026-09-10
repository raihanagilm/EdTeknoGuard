from typing import Optional
from pydantic import BaseModel, Field

class TelegramSettingsSchema(BaseModel):
    bot_token: Optional[str] = Field(None, description="Token Bot Telegram dari @BotFather")
    chat_ids: str = Field(..., description="Daftar Chat ID Telegram (dipisahkan koma)")
    warning_threshold_dbm: float = Field(-26.0, description="Ambang batas deteksi dini redaman (dBm)")
    debounce_minutes: int = Field(30, ge=1, le=1440, description="Interval anti-spam (menit)")

class TelegramTestAlertRequest(BaseModel):
    custom_chat_id: Optional[str] = Field(None, description="Chat ID spesifik untuk uji coba (opsional)")
