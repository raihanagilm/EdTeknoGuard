from datetime import datetime
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, 
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.timezone import get_now_wib

class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    no_hp = Column(String(50), nullable=True)
    pop = Column(String(100), nullable=False, default="Server Cabang", index=True)
    kantor = Column(String(50), nullable=False, default="cabang", index=True) # cabang, pusat, banyumas
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
    los_count = Column(Integer, default=0, nullable=False)
    is_monitored = Column(Boolean, default=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    # Kredensial & Status Akses Portal Warga Mandiri
    password_hash = Column(String(255), nullable=True)
    lokasi_gps = Column(String(100), nullable=True)
    status_verifikasi = Column(String(30), default="TERVERIFIKASI", nullable=False, index=True) # TERVERIFIKASI, PENDING, DITOLAK
    last_login = Column(DateTime, nullable=True)

    # Relasi ke seluruh data anakan (Cascading Deletion)
    logs = relationship("LogPerformaONT", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    alerts = relationship("AlertLog", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    tiket_list = relationship("TiketKendala", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    kuota_list = relationship("KuotaPelanggan", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)


class LogPerformaONT(Base):
    __tablename__ = "log_performa_ont"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    waktu_cek = Column(DateTime, default=get_now_wib, nullable=False, index=True)
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
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    tipe_alert = Column(String(30), nullable=False)  # REDAMAN_DROP, ONT_LOS, OVERHEAT
    rx_power = Column(Numeric(5, 2), nullable=True)
    pesan = Column(Text, nullable=False)
    target_recipients = Column(Text, nullable=False)
    status_kirim = Column(String(20), nullable=False, default="SUCCESS")
    waktu_kirim = Column(DateTime, default=get_now_wib, nullable=False, index=True)

    pelanggan = relationship("Pelanggan", back_populates="alerts")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_name = Column(String(50), unique=True, nullable=False, index=True)
    value_text = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False, index=True)
    nama_karyawan = Column(String(150), nullable=True)
    role = Column(String(50), default="admin", nullable=False)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, LOGOUT, LOGIN_FAILED, IMPORT_PELANGGAN, HAPUS_PELANGGAN, EDIT_PELANGGAN
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS, FAILED
    keterangan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False, index=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nama_karyawan = Column(String(150), nullable=True)
    role = Column(String(50), default="teknisi", nullable=False) # super admin, admin, teknisi
    allowed_kantor = Column(String(255), nullable=False, default='["cabang"]') # JSON array string: ["cabang"], ["pusat"], etc.
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)


class TiketKendala(Base):
    __tablename__ = "tiket_kendala"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_tiket = Column(String(32), unique=True, nullable=False, index=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    kantor = Column(String(50), default="cabang", nullable=False)
    kategori = Column(String(100), nullable=False)
    deskripsi = Column(Text, nullable=False)
    no_wa_pelapor = Column(String(50), nullable=False)
    redaman_saat_lapor = Column(Numeric(5, 2), nullable=True)
    status_ont_saat_lapor = Column(String(20), nullable=True)
    status = Column(String(30), default="MENUNGGU", nullable=False, index=True) # MENUNGGU, DIPROSES, SELESAI, DIBATALKAN
    catatan_teknisi = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="tiket_list")


class KuotaPelanggan(Base):
    __tablename__ = "kuota_pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    periode_bulan = Column(String(10), nullable=False) # format YYYY-MM
    kuota_terpakai_gb = Column(Numeric(8, 2), default=0, nullable=False)
    kecepatan_paket = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="kuota_list")

