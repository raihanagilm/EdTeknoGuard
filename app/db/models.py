from datetime import datetime
from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Numeric, 
    Boolean, DateTime, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base
from app.core.timezone import get_now_wib

class Kantor(Base):
    __tablename__ = "kantors"

    id_kantor = Column(Integer, primary_key=True, autoincrement=True)
    nama = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    alamat = Column(Text, nullable=True)
    mikrotik_host = Column(String(100), nullable=True)
    mikrotik_port = Column(Integer, nullable=True)
    mikrotik_user = Column(String(100), nullable=True)
    mikrotik_pass = Column(String(255), nullable=True)
    mikrotik_sync_interval = Column(Integer, default=3, nullable=False)
    last_mikrotik_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    id = synonym("id_kantor")

    @property
    def kode(self):
        """Backward compatibility for existing code expecting k.kode"""
        return self.nama.lower().strip() if self.nama else str(self.id_kantor)

    pelanggan_list = relationship("Pelanggan", back_populates="kantor_ref")
    tiket_list = relationship("TiketKendala", back_populates="kantor_ref")
    settings_list = relationship("SystemSetting", back_populates="kantor_ref", cascade="all, delete-orphan", passive_deletes=True)
    modem_credentials = relationship("ModemCredential", back_populates="kantor_ref", cascade="all, delete-orphan", passive_deletes=True, order_by="ModemCredential.urutan.asc()")
    user_assignments = relationship("UserKantor", back_populates="kantor_ref", cascade="all, delete-orphan", passive_deletes=True)


class Paket(Base):
    __tablename__ = "pakets"

    id_paket = Column(Integer, primary_key=True, autoincrement=True)
    nama = Column(String(100), unique=True, nullable=False, index=True)
    kecepatan_mbps = Column(Integer, nullable=True)
    harga = Column(Numeric(12, 2), nullable=True)
    deskripsi = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    id = synonym("id_paket")

    pelanggan_list = relationship("Pelanggan", back_populates="paket_ref")


class PerangkatONT(Base):
    __tablename__ = "perangkat_ont"

    id_perangkat = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    ip_router = Column(String(45), nullable=True, index=True)
    ip_ont = Column(String(45), nullable=True, index=True)
    jenis_modem = Column(String(50), nullable=True, default=None, index=True)
    mac_address = Column(String(30), nullable=True)
    redaman_baseline = Column(Numeric(5, 2), nullable=True)
    nama_wifi = Column(String(100), nullable=True)
    password_wifi = Column(String(100), nullable=True)
    user_admin = Column(String(50), nullable=True)
    pass_admin = Column(String(100), nullable=True)
    status_kredensial = Column(String(20), default="INVALID", nullable=False, index=True)
    failed_credentials = Column(Text, nullable=True) # JSON list string berisi kredensial yang sudah pernah dicoba dan gagal
    snmp_community = Column(String(50), default="public")
    los_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="perangkat")

    @property
    def id(self):
        """Backward compatibility"""
        return self.id_perangkat


class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id_pelanggan = Column(String(64), primary_key=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    no_hp = Column(String(50), nullable=True)
    pop = Column(String(100), nullable=True, default="Server Cabang", index=True)
    id_kantor = Column(Integer, ForeignKey("kantors.id_kantor", onupdate="CASCADE", ondelete="RESTRICT"), nullable=True, index=True)
    kantor = Column(String(50), nullable=True, default="cabang", index=True) # cabang, pusat, banyumas
    paket = Column(String(50), ForeignKey("pakets.nama", onupdate="CASCADE", ondelete="SET NULL"), nullable=True)
    is_monitored = Column(Boolean, default=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    status_lease = Column(String(20), default="bound", nullable=False, index=True) # bound (online), waiting (offline)
    status_isolir = Column(Boolean, default=False, nullable=False, index=True) # True jika diisolir di MikroTik
    queue_name = Column(String(150), nullable=True, index=True) # Nama rule di Simple Queues MikroTik
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    # Kredensial & Status Akses Portal Warga Mandiri
    password_hash = Column(String(255), nullable=True)
    lokasi_gps = Column(String(100), nullable=True)
    status_verifikasi = Column(String(30), default="TERVERIFIKASI", nullable=False, index=True) # TERVERIFIKASI, PENDING, DITOLAK
    last_login = Column(DateTime, nullable=True)

    # Relasi master referensi
    kantor_ref = relationship("Kantor", back_populates="pelanggan_list")
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
    def ip_ont(self):
        return self.perangkat.ip_ont if self.perangkat else None

    @ip_ont.setter
    def ip_ont(self, val):
        self._get_or_create_perangkat().ip_ont = val

    @property
    def jenis_modem(self):
        return self.perangkat.jenis_modem if self.perangkat else None

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
    def failed_credentials(self):
        return self.perangkat.failed_credentials if self.perangkat else None

    @failed_credentials.setter
    def failed_credentials(self, val):
        self._get_or_create_perangkat().failed_credentials = val

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

    @property
    def mac_address(self):
        return self.perangkat.mac_address if self.perangkat else None

    @mac_address.setter
    def mac_address(self, val):
        self._get_or_create_perangkat().mac_address = val

    @property
    def snmp_community(self):
        return self.perangkat.snmp_community if self.perangkat else "public"

    @snmp_community.setter
    def snmp_community(self, val):
        self._get_or_create_perangkat().snmp_community = val

    @property
    def los_count(self):
        return self.perangkat.los_count if self.perangkat else 0

    @los_count.setter
    def los_count(self, val):
        self._get_or_create_perangkat().los_count = val

    @property
    def no_wa(self):
        return self.no_hp

    @no_wa.setter
    def no_wa(self, val):
        self.no_hp = val

    id = synonym("id_pelanggan")


class LogPerformaONT(Base):
    __tablename__ = "log_performa_ont"

    id_log = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    waktu_cek = Column(DateTime, default=get_now_wib, nullable=False, index=True)
    rx_power = Column(Numeric(5, 2), nullable=True)
    suhu_ont = Column(Numeric(4, 1), nullable=True)
    uptime = Column(BigInteger, nullable=True)
    status_koneksi = Column(String(20), nullable=False, index=True)  # NORMAL, WARNING, CRITICAL, LOS, LOCKOUT
    latency_ms = Column(Integer, nullable=True)
    keterangan = Column(String(255), nullable=True)

    pelanggan = relationship("Pelanggan", back_populates="logs")

    id = synonym("id_log")

    __table_args__ = (
        Index("idx_pelanggan_waktu", "id_pelanggan", "waktu_cek"),
    )


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id_alert = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    tipe_alert = Column(String(30), nullable=False)  # REDAMAN_DROP, ONT_LOS, OVERHEAT
    rx_power = Column(Numeric(5, 2), nullable=True)
    pesan = Column(Text, nullable=False)
    target_recipients = Column(Text, nullable=False)
    status_kirim = Column(String(20), nullable=False, default="SUCCESS")
    waktu_kirim = Column(DateTime, default=get_now_wib, nullable=False, index=True)

    pelanggan = relationship("Pelanggan", back_populates="alerts")

    id = synonym("id_alert")

    __table_args__ = (
        Index("idx_alert_pelanggan_waktu", "id_pelanggan", "waktu_kirim"),
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id_setting = Column(Integer, primary_key=True, autoincrement=True)
    id_kantor = Column(Integer, ForeignKey("kantors.id_kantor", onupdate="CASCADE", ondelete="CASCADE"), nullable=True, index=True)
    kantor_kode = Column(String(50), nullable=True, index=True)
    key_name = Column(String(50), nullable=False, index=True)
    value_text = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    kantor_ref = relationship("Kantor", back_populates="settings_list")

    id = synonym("id_setting")

    __table_args__ = (
        UniqueConstraint("key_name", "kantor_kode", name="uq_setting_key_kantor"),
    )


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id_activity = Column(BigInteger, primary_key=True, autoincrement=True)
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

    id = synonym("id_activity")

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

    activity_logs = relationship("UserActivityLog", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    notification_reads = relationship("UserNotificationRead", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    kantor_assignments = relationship("UserKantor", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    @property
    def allowed_kantor_list(self) -> list:
        """Mengambil list kode kantor dari relasi user_kantors, fallback ke parsed allowed_kantor jika kosong"""
        if self.kantor_assignments:
            return [ka.kantor_kode for ka in self.kantor_assignments if ka.kantor_kode]
        if self.allowed_kantor:
            try:
                import json
                parsed = json.loads(self.allowed_kantor)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
        return ["banyumas"]


class TiketKendala(Base):
    __tablename__ = "tiket_kendala"

    id_tiket = Column(String(32), primary_key=True, nullable=False, index=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    id_kantor = Column(Integer, ForeignKey("kantors.id_kantor", onupdate="CASCADE", ondelete="RESTRICT"), nullable=True, index=True)
    kantor = Column(String(50), nullable=False, default="cabang", index=True)
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

    id = synonym("id_tiket")

    __table_args__ = (
        Index("idx_tiket_status_kantor", "status", "kantor"),
        Index("idx_tiket_pelanggan_waktu", "id_pelanggan", "created_at"),
    )


class KuotaPelanggan(Base):
    __tablename__ = "kuota_pelanggan"

    id_kuota = Column(BigInteger, primary_key=True, autoincrement=True)
    id_pelanggan = Column(String(64), ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE"), nullable=False, index=True)
    periode_bulan = Column(String(10), nullable=False, index=True) # format YYYY-MM
    kuota_terpakai_gb = Column(Numeric(8, 2), default=0, nullable=False)
    upload_bytes = Column(BigInteger, default=0, nullable=False) # Akumulasi Upload byte dari Simple Queue
    download_bytes = Column(BigInteger, default=0, nullable=False) # Akumulasi Download byte dari Simple Queue
    last_sync_mikrotik = Column(DateTime, nullable=True) # Waktu sinkronisasi counter MikroTik terakhir
    kecepatan_paket = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    pelanggan = relationship("Pelanggan", back_populates="kuota_list")

    id = synonym("id_kuota")

    __table_args__ = (
        Index("idx_kuota_pelanggan_periode", "id_pelanggan", "periode_bulan"),
    )


class UserNotificationRead(Base):
    __tablename__ = "user_notification_reads"

    id_read = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False, index=True) # "alert_log", "tiket_batch", "alert_batch", dll
    reference_id = Column(String(100), nullable=False, index=True) # id_alert, id_tiket, atau batch key
    read_at = Column(DateTime, default=get_now_wib, nullable=False, index=True)

    user = relationship("User", back_populates="notification_reads")

    id = synonym("id_read")

    __table_args__ = (
        Index("idx_user_notif_lookup", "user_id", "notification_type", "reference_id"),
    )


class UserKantor(Base):
    __tablename__ = "user_kantors"

    id_user_kantor = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", onupdate="CASCADE", ondelete="CASCADE"), nullable=False, index=True)
    id_kantor = Column(Integer, ForeignKey("kantors.id_kantor", onupdate="CASCADE", ondelete="CASCADE"), nullable=True, index=True)
    kantor_kode = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)

    user = relationship("User", back_populates="kantor_assignments")
    kantor_ref = relationship("Kantor", back_populates="user_assignments")

    id = synonym("id_user_kantor")

    __table_args__ = (
        Index("idx_user_kantor_lookup", "user_id", "id_kantor"),
    )


class ModemCredential(Base):
    __tablename__ = "modem_credentials"

    id_credential = Column(Integer, primary_key=True, autoincrement=True)
    id_kantor = Column(Integer, ForeignKey("kantors.id_kantor", onupdate="CASCADE", ondelete="CASCADE"), nullable=True, index=True)
    kantor_kode = Column(String(50), nullable=True, index=True)
    username = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    urutan = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=get_now_wib, nullable=False)
    updated_at = Column(DateTime, default=get_now_wib, onupdate=get_now_wib, nullable=False)

    kantor_ref = relationship("Kantor", back_populates="modem_credentials")

    id = synonym("id_credential")




