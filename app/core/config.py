import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "EdTeknoGuard"
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_URL: str = "http://localhost:8000"
    SECRET_KEY: str = "edteknoguard-secret-key"

    # Database TiDB Cloud (MySQL Engine)
    DB_HOST: str = "gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
    DB_PORT: int = 4000
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "EdTeknoGuard"

    # Telegram Bot Alerting
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_IDS: str = ""  # dipisahkan koma misal: "12345,67890,-100123"

    # Threshold & Scheduler
    POLLING_INTERVAL_MINUTES: int = 5
    WARNING_THRESHOLD_DBM: float = -26.0
    CRITICAL_THRESHOLD_DBM: float = -32.0
    ALERT_DEBOUNCE_MINUTES: int = 30
    SNMP_SIMULATION_MODE: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        # TiDB Cloud requires SSL connection with PyMySQL
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    @property
    def telegram_recipient_list(self) -> List[str]:
        if not self.TELEGRAM_CHAT_IDS:
            return []
        return [cid.strip() for cid in self.TELEGRAM_CHAT_IDS.split(",") if cid.strip()]

settings = Settings()
