from datetime import datetime
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, 
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    no_hp = Column(String(50), nullable=True)
    pop = Column(String(100), nullable=False, default="Server Cabang", index=True)
    ip_router = Column(String(45), nullable=False, index=True)
    paket = Column(String(50), nullable=True)
    jenis_modem = Column(String(50), nullable=False, default="GM220-S", index=True)
    mac_address = Column(String(30), nullable=True)
    redaman_baseline = Column(Numeric(5, 2), nullable=True)
    nama_wifi = Column(String(100), nullable=True)
    password_wifi = Column(String(100), nullable=True)
    user_admin = Column(String(50), nullable=True)
    pass_admin = Column(String(100), nullable=True)
    status_kredensial = Column(String(20), default="UNTESTED", nullable=False, index=True) # VALID, INVALID, UNTESTED
    snmp_community = Column(String(50), default="public")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relasi ke log performa
    logs = relationship("LogPerformaONT", back_populates="pelanggan", cascade="all, delete-orphan")


class LogPerformaONT(Base):
    __tablename__ = "log_performa_ont"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    waktu_cek = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    rx_power = Column(Numeric(5, 2), nullable=True)
    suhu_ont = Column(Numeric(4, 1), nullable=True)
    uptime = Column(BigInteger, nullable=True)
    status_koneksi = Column(String(20), nullable=False, index=True)  # NORMAL, WARNING, CRITICAL, LOS
    latency_ms = Column(Integer, nullable=True)
    keterangan = Column(String(255), nullable=True)

    pelanggan = relationship("Pelanggan", back_populates="logs")

    __table_args__ = (
        Index("idx_pelanggan_waktu", "id_pelanggan", "waktu_cek"),
    )


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), nullable=False, index=True)
    tipe_alert = Column(String(30), nullable=False)  # REDAMAN_DROP, ONT_LOS, OVERHEAT
    rx_power = Column(Numeric(5, 2), nullable=True)
    pesan = Column(Text, nullable=False)
    target_recipients = Column(Text, nullable=False)
    status_kirim = Column(String(20), nullable=False, default="SUCCESS")
    waktu_kirim = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_name = Column(String(50), unique=True, nullable=False, index=True)
    value_text = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
