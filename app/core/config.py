import os
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRET_KEYS = {
    "",
    "edteknoguard-secret-key",
    "edteknoguard-noc-secret-key-2026",
    "change-me",
}


class Settings(BaseSettings):
    APP_NAME: str = "TeknoGuard"
    APP_ENV: str = "development"
    APP_PORT: int = 7890
    APP_URL: str = "http://localhost:7890"
    SECRET_KEY: str = "edteknoguard-secret-key"
    CORS_ORIGINS: str = ""

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

    # Integrasi API Network Bill (Tekno Bill)
    NETWORK_BILL_BASE_URL: str = "https://pop.teknoindo.net/api/v1"
    NETWORK_BILL_API_TOKEN: str = ""
    NETWORK_BILL_BILLING_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production_secret(self):
        if str(self.APP_ENV).lower().strip() == "production":
            key = (self.SECRET_KEY or "").strip()
            if key in _WEAK_SECRET_KEYS or len(key) < 32:
                raise ValueError(
                    "SECRET_KEY produksi tidak boleh memakai nilai bawaan dan minimal harus 32 karakter."
                )
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        origins = []
        if self.APP_URL:
            origins.append(self.APP_URL.rstrip("/"))
        origins.append("https://portal.teknoindo.net")
        if self.CORS_ORIGINS:
            for item in self.CORS_ORIGINS.split(","):
                cleaned = item.strip().rstrip("/")
                if cleaned:
                    origins.append(cleaned)
        if str(self.APP_ENV).lower().strip() != "production":
            origins.extend([
                "http://localhost:7890",
                "http://127.0.0.1:7890",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ])
        return list(dict.fromkeys(origins))

    @property
    def database_url(self) -> str:
        # MySQL Database URL Connection String
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

settings = Settings()

