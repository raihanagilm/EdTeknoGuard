from datetime import datetime
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, 
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.timezone import get_now_wib

class Kantor(Base):
    __tablename__ = "kantors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    kode = Column(String(50), unique=True, nullable=False, index=True)
    nama = Column(String(100), nullable=False)
    alamat = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    pops = relationship("Pop", back_populates="kantor_ref")
    pelanggan_list = relationship("Pelanggan", back_populates="kantor_ref")
    tiket_list = relationship("TiketKendala", back_populates="kantor_ref")


class Pop(Base):
    __tablename__ = "pops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama = Column(String(100), unique=True, nullable=False, index=True)
    kantor_kode = Column(String(50), ForeignKey("kantors.kode", onupdate="CASCADE", ondelete="RESTRICT"), nullable=True, index=True)
    deskripsi = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    kantor_ref = relationship("Kantor", back_populates="pops")
    pelanggan_list = relationship("Pelanggan", back_populates="pop_ref")


class Paket(Base):
    __tablename__ = "pakets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama = Column(String(100), unique=True, nullable=False, index=True)
    kecepatan_mbps = Column(Integer, nullable=True)
    harga = Column(Numeric(12, 2), nullable=True)
    deskripsi = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    pelanggan_list = relationship("Pelanggan", back_populates="paket_ref")


class PerangkatONT(Base):
    __tablename__ = "perangkat_ont"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    ip_router = Column(String(45), unique=True, nullable=False, index=True)
    jenis_modem = Column(String(50), nullable=False, default="GM220-S", index=True)
    mac_address = Column(String(30), nullable=True)
    redaman_baseline = Column(Numeric(5, 2), nullable=True)
    nama_wifi = Column(String(100), nullable=True)
    password_wifi = Column(String(100), nullable=True)
    user_admin = Column(String(50), nullable=True)
    pass_admin = Column(String(100), nullable=True)
    status_kredensial = Column(String(20), default="UNTESTED", nullable=False, index=True)
    snmp_community = Column(String(50), default="public")
    los_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="perangkat")


class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    no_hp = Column(String(50), nullable=True)
    pop = Column(String(100), ForeignKey("pops.nama", onupdate="CASCADE", ondelete="SET NULL"), nullable=True, default="Server Cabang", index=True)
    kantor = Column(String(50), ForeignKey("kantors.kode", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False, default="cabang", index=True) # cabang, pusat, banyumas
    paket = Column(String(50), ForeignKey("pakets.nama", onupdate="CASCADE", ondelete="SET NULL"), nullable=True)
    is_monitored = Column(Boolean, default=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    # Kredensial & Status Akses Portal Warga Mandiri
    password_hash = Column(String(255), nullable=True)
    lokasi_gps = Column(String(100), nullable=True)
    status_verifikasi = Column(String(30), default="TERVERIFIKASI", nullable=False, index=True) # TERVERIFIKASI, PENDING, DITOLAK
    last_login = Column(DateTime, nullable=True)

    # Relasi master referensi
    kantor_ref = relationship("Kantor", back_populates="pelanggan_list")
    pop_ref = relationship("Pop", back_populates="pelanggan_list")
    paket_ref = relationship("Paket", back_populates="pelanggan_list")

    # Relasi ke seluruh data anakan (Cascading Deletion)
    perangkat = relationship("PerangkatONT", back_populates="pelanggan", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    logs = relationship("LogPerformaONT", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    alerts = relationship("AlertLog", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    tiket_list = relationship("TiketKendala", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)
    kuota_list = relationship("KuotaPelanggan", back_populates="pelanggan", cascade="all, delete-orphan", passive_deletes=True)

    # Properti pembantu (Property shortcuts) untuk backward-compatibility transparan
    def _get_or_create_perangkat(self):
        if not self.perangkat:
            self.perangkat = PerangkatONT(id_pelanggan=self.id_pelanggan)
        return self.perangkat

    @property
    def ip_router(self):
        return self.perangkat.ip_router if self.perangkat else None

    @ip_router.setter
    def ip_router(self, val):
        self._get_or_create_perangkat().ip_router = val

    @property
    def jenis_modem(self):
        return self.perangkat.jenis_modem if self.perangkat else "GM220-S"

    @jenis_modem.setter
    def jenis_modem(self, val):
        self._get_or_create_perangkat().jenis_modem = val

    @property
    def user_admin(self):
        return self.perangkat.user_admin if self.perangkat else None

    @user_admin.setter
    def user_admin(self, val):
        self._get_or_create_perangkat().user_admin = val

    @property
    def pass_admin(self):
        return self.perangkat.pass_admin if self.perangkat else None

    @pass_admin.setter
    def pass_admin(self, val):
        self._get_or_create_perangkat().pass_admin = val

    @property
    def status_kredensial(self):
        return self.perangkat.status_kredensial if self.perangkat else "UNTESTED"

    @status_kredensial.setter
    def status_kredensial(self, val):
        self._get_or_create_perangkat().status_kredensial = val

    @property
    def redaman_baseline(self):
        return self.perangkat.redaman_baseline if self.perangkat else None

    @redaman_baseline.setter
    def redaman_baseline(self, val):
        self._get_or_create_perangkat().redaman_baseline = val

    @property
    def nama_wifi(self):
        return self.perangkat.nama_wifi if self.perangkat else None

    @nama_wifi.setter
    def nama_wifi(self, val):
        self._get_or_create_perangkat().nama_wifi = val

    @property
    def password_wifi(self):
        return self.perangkat.password_wifi if self.perangkat else None

    @password_wifi.setter
    def password_wifi(self, val):
        self._get_or_create_perangkat().password_wifi = val


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

    __table_args__ = (
        Index("idx_alert_pelanggan_waktu", "id_pelanggan", "waktu_kirim"),
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_name = Column(String(50), unique=True, nullable=False, index=True)
    value_text = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    nama_karyawan = Column(String(150), nullable=True)
    role = Column(String(50), default="admin", nullable=False)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, LOGOUT, LOGIN_FAILED, IMPORT_PELANGGAN, HAPUS_PELANGGAN, EDIT_PELANGGAN
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS, FAILED
    keterangan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False, index=True)

    user = relationship("User", back_populates="activity_logs")

    __table_args__ = (
        Index("idx_activity_user_action", "username", "action"),
        Index("idx_activity_action_created", "action", "created_at"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nama_karyawan = Column(String(150), nullable=True)
    no_wa = Column(String(50), nullable=True)
    role = Column(String(50), default="teknisi", nullable=False) # super admin, admin, teknisi
    allowed_kantor = Column(String(255), nullable=False, default='["cabang"]') # JSON array string: ["cabang"], ["pusat"], etc.
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    activity_logs = relationship("UserActivityLog", back_populates="user")


class TiketKendala(Base):
    __tablename__ = "tiket_kendala"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_tiket = Column(String(32), unique=True, nullable=False, index=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    kantor = Column(String(50), ForeignKey("kantors.kode", onupdate="CASCADE", ondelete="RESTRICT"), default="cabang", nullable=False, index=True)
    kategori = Column(String(100), nullable=False)
    deskripsi = Column(Text, nullable=False)
    no_wa_pelapor = Column(String(50), nullable=False)
    redaman_saat_lapor = Column(Numeric(5, 2), nullable=True)
    status_ont_saat_lapor = Column(String(20), nullable=True)
    status = Column(String(30), default="MENUNGGU", nullable=False, index=True) # MENUNGGU, DIPROSES, SELESAI, DIBATALKAN
    catatan_teknisi = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False, index=True)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="tiket_list")
    kantor_ref = relationship("Kantor", back_populates="tiket_list")

    __table_args__ = (
        Index("idx_tiket_status_kantor", "status", "kantor"),
        Index("idx_tiket_pelanggan_waktu", "id_pelanggan", "created_at"),
    )


class KuotaPelanggan(Base):
    __tablename__ = "kuota_pelanggan"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    periode_bulan = Column(String(10), nullable=False, index=True) # format YYYY-MM
    kuota_terpakai_gb = Column(Numeric(8, 2), default=0, nullable=False)
    kecepatan_paket = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="kuota_list")

    __table_args__ = (
        Index("idx_kuota_pelanggan_periode", "id_pelanggan", "periode_bulan"),
    )



