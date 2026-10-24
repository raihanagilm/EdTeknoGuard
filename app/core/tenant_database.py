import logging
import re
from typing import Dict, Optional, List
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.database import Base, engine as master_engine, SessionLocal as MasterSessionLocal

logger = logging.getLogger("tenant_database")

# Tabel-tabel yang dicopy skemanya dari master (termasuk kantors sebagai local reference)
TENANT_TABLE_NAMES = [
    "kantors",
    "pakets",
    "pelanggan",
    "perangkat_ont",
    "log_performa_ont",
    "alert_logs",
    "tiket_kendala",
    "kuota_pelanggan",
    "system_settings",
    "modem_credentials",
]

def sanitize_db_name(kode_kantor: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', kode_kantor.strip().lower())
    return f"edtekno_{cleaned}"

class TenantDatabaseManager:
    _engines: Dict[str, any] = {}
    _sessionmakers: Dict[str, any] = {}

    @classmethod
    def get_database_url_for_tenant(cls, db_name: str) -> str:
        return f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{db_name}?charset=utf8mb4"

    @classmethod
    def get_engine_for_kantor(cls, kode_kantor: Optional[str]):
        if not kode_kantor or kode_kantor.lower() in ["master", "global", "all"]:
            return master_engine

        db_name = sanitize_db_name(kode_kantor)
        if db_name not in cls._engines:
            connect_args = {}
            if settings.DB_HOST not in ["127.0.0.1", "localhost", "::1"]:
                connect_args["ssl_verify_cert"] = False

            tenant_url = cls.get_database_url_for_tenant(db_name)
            engine = create_engine(
                tenant_url,
                connect_args=connect_args,
                pool_pre_ping=True,
                pool_recycle=1800,
                pool_size=15,
                max_overflow=30
            )
            cls._engines[db_name] = engine
            cls._sessionmakers[db_name] = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        return cls._engines[db_name]

    @classmethod
    def get_sessionmaker_for_kantor(cls, kode_kantor: Optional[str]):
        if not kode_kantor or kode_kantor.lower() in ["master", "global", "all"]:
            return MasterSessionLocal

        db_name = sanitize_db_name(kode_kantor)
        if db_name not in cls._sessionmakers:
            cls.get_engine_for_kantor(kode_kantor)
        return cls._sessionmakers[db_name]

    @classmethod
    def get_tenant_session(cls, kode_kantor: Optional[str]) -> Session:
        sm = cls.get_sessionmaker_for_kantor(kode_kantor)
        return sm()

    @classmethod
    def create_database_if_not_exists(cls, kode_kantor: str) -> str:
        db_name = sanitize_db_name(kode_kantor)
        with master_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
            logger.info(f"[TENANT_DB] Database '{db_name}' berhasil dipastikan ada di MySQL.")
        return db_name

    @classmethod
    def init_tenant_schema(cls, kode_kantor: str):
        db_name = cls.create_database_if_not_exists(kode_kantor)
        tenant_engine = cls.get_engine_for_kantor(kode_kantor)

        from app.db import models

        tables_to_create = [
            models.Base.metadata.tables[tbl_name]
            for tbl_name in TENANT_TABLE_NAMES
            if tbl_name in models.Base.metadata.tables
        ]

        models.Base.metadata.create_all(bind=tenant_engine, tables=tables_to_create)
        logger.info(f"[TENANT_DB] Skema {len(tables_to_create)} tabel berhasil dibuat di database '{db_name}'.")

    @classmethod
    def provision_new_office(cls, kode_kantor: str, id_kantor: Optional[int] = None, nama_kantor: Optional[str] = None):
        cls.init_tenant_schema(kode_kantor)
        session = cls.get_tenant_session(kode_kantor)
        try:
            from app.db.models import Kantor, SystemSetting
            # Sinkronkan entri kantor lokal ke tenant DB
            if nama_kantor:
                k_local = session.query(Kantor).filter(Kantor.nama == nama_kantor).first()
                if not k_local:
                    k_obj = Kantor(id_kantor=id_kantor, nama=nama_kantor, is_active=True)
                    session.add(k_obj)
                    session.commit()

            existing = session.query(SystemSetting).first()
            if not existing:
                default_settings = [
                    SystemSetting(id_kantor=id_kantor, kantor_kode=kode_kantor, key_name="polling_interval_minutes", value_text=str(settings.POLLING_INTERVAL_MINUTES)),
                    SystemSetting(id_kantor=id_kantor, kantor_kode=kode_kantor, key_name="warning_threshold_dbm", value_text=str(settings.WARNING_THRESHOLD_DBM)),
                    SystemSetting(id_kantor=id_kantor, kantor_kode=kode_kantor, key_name="critical_threshold_dbm", value_text=str(settings.CRITICAL_THRESHOLD_DBM)),
                    SystemSetting(id_kantor=id_kantor, kantor_kode=kode_kantor, key_name="scheduler_status", value_text="RUNNING"),
                ]
                session.add_all(default_settings)
                session.commit()
                logger.info(f"[TENANT_DB] Pengaturan awal berhasil diinisialisasi untuk '{kode_kantor}'.")
        except Exception as e:
            session.rollback()
            logger.error(f"[TENANT_DB] Gagal menginisialisasi default settings untuk '{kode_kantor}': {e}")
        finally:
            session.close()
