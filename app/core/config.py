import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "TeknoGuard"
    APP_ENV: str = "development"
    APP_PORT: int = 7890
    APP_URL: str = "http://localhost:7890"
    SECRET_KEY: str = "edteknoguard-secret-key"

    # Database (MySQL Local - Custom Port)
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33070
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "edteknoguard"

    # Threshold & Scheduler
    POLLING_INTERVAL_MINUTES: int = 5
    WARNING_THRESHOLD_DBM: float = -26.0
    CRITICAL_THRESHOLD_DBM: float = -32.0
    ALERT_DEBOUNCE_MINUTES: int = 30
    SNMP_SIMULATION_MODE: bool = False
    MIKROTIK_SIMULATION_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        # MySQL Database URL Connection String
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

settings = Settings()

