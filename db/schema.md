# Schema Database EdTeknoGuard (Ternormalisasi Penuh 3NF)

Dokumentasi arsitektur basis data relasional, kamus data (*data dictionary*), indeks optimasi, dan relasi antar-entitas untuk sistem **EdTeknoGuard**.

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    KANTORS ||--o{ POPS : "menaungi (1 to N)"
    KANTORS ||--o{ PELANGGAN : "mengelola (1 to N)"
    KANTORS ||--o{ TIKET_KENDALA : "wilayah tiket (1 to N)"
    POPS ||--o{ PELANGGAN : "melayani (1 to N)"
    PAKETS ||--o{ PELANGGAN : "berlangganan (1 to N)"

    PELANGGAN ||--|| PERANGKAT_ONT : "memiliki modem (1 to 1 CASCADE)"
    PELANGGAN ||--o{ LOG_PERFORMA_ONT : "memiliki riwayat (1 to N CASCADE)"
    PELANGGAN ||--o{ ALERT_LOGS : "menerima alert (1 to N CASCADE)"
    PELANGGAN ||--o{ TIKET_KENDALA : "membuat tiket (1 to N CASCADE)"
    PELANGGAN ||--o{ KUOTA_PELANGGAN : "memiliki pemakaian (1 to N CASCADE)"
    
    USERS ||--o{ USER_ACTIVITY_LOGS : "mencatat aktivitas (1 to N SET NULL)"
    
    SYSTEM_SETTINGS {
        int id PK "Key-Value Config Global"
        varchar key_name UK
        text value_text
        datetime updated_at
    }

    KANTORS {
        int id PK
        varchar kode UK "Kode Wilayah: cabang, pusat, banyumas"
        varchar nama "Nama Kantor Operasional"
        text alamat
        datetime created_at
    }

    POPS {
        int id PK
        varchar nama UK "Nama Point of Presence"
        varchar kantor_kode FK "Relasi ke kantors.kode (CASCADE/RESTRICT)"
        text deskripsi
        datetime created_at
    }

    PAKETS {
        int id PK
        varchar nama UK "Nama Paket Layanan (e.g. 20 Mbps)"
        int kecepatan_mbps "Bandwidth Download/Upload (Mbps)"
        numeric harga "Biaya Bulanan"
        text deskripsi
        datetime created_at
    }

    PELANGGAN {
        bigint id PK
        varchar id_pelanggan UK "ID Unik Pelanggan (Natural Key Relasi)"
        varchar nama "Nama Lengkap Warga / Pelanggan"
        text alamat
        varchar no_hp "No WA / Kontak Pelanggan"
        varchar pop FK "Point of Presence (Relasi pops.nama)"
        varchar kantor FK "Wilayah Kantor (Relasi kantors.kode)"
        varchar paket FK "Paket Layanan (Relasi pakets.nama)"
        boolean is_monitored "Status Pemantauan Berkala"
        boolean is_active "Status Layanan Aktif"
        varchar password_hash "Kata Sandi Portal Warga"
        varchar lokasi_gps "Koordinat Maps"
        varchar status_verifikasi "TERVERIFIKASI, PENDING, DITOLAK"
        datetime last_login
        datetime created_at
        datetime updated_at
    }

    PERANGKAT_ONT {
        bigint id PK
        varchar id_pelanggan FK "Relasi ke pelanggan.id_pelanggan (1-to-1 CASCADE)"
        varchar ip_router "IP Manajemen Modem ONT (Unik)"
        varchar jenis_modem "Tipe ONT (GM220-S, XPON, etc.)"
        varchar mac_address
        numeric redaman_baseline "Redaman Awal dBm"
        varchar nama_wifi "SSID WiFi Pelanggan"
        varchar password_wifi "Kata Sandi WiFi"
        varchar user_admin "Username Login Web GUI ONT"
        varchar pass_admin "Password Login Web GUI ONT"
        varchar status_kredensial "VALID, INVALID, UNTESTED"
        varchar snmp_community
        int los_count
        datetime created_at
        datetime updated_at
    }

    LOG_PERFORMA_ONT {
        bigint id PK
        varchar id_pelanggan FK "Relasi ke pelanggan.id_pelanggan (CASCADE)"
        datetime waktu_cek "Timestamp Pemeriksaan"
        numeric rx_power "Daya Terima Optik (dBm)"
        numeric suhu_ont "Suhu Perangkat (Celcius)"
        bigint uptime "Detik Aktif Perangkat"
        varchar status_koneksi "NORMAL, WARNING, CRITICAL, LOS"
        int latency_ms "Latensi Jaringan (ms)"
        varchar keterangan
    }

    ALERT_LOGS {
        bigint id PK
        varchar id_pelanggan FK "Relasi ke pelanggan.id_pelanggan (CASCADE)"
        varchar tipe_alert "REDAMAN_DROP, ONT_LOS, OVERHEAT"
        numeric rx_power "Nilai Redaman saat Terjadi Alert"
        text pesan "Konten Notifikasi"
        text target_recipients "ID Tujuan Telegram"
        varchar status_kirim "SUCCESS, FAILED"
        datetime waktu_kirim "Waktu Pengiriman Pesan"
    }

    TIKET_KENDALA {
        bigint id PK
        varchar id_tiket UK "Kode Tiket Laporan"
        varchar id_pelanggan FK "Relasi ke pelanggan.id_pelanggan (CASCADE)"
        varchar kantor FK "Relasi ke kantors.kode"
        varchar kategori "Jenis Kendala"
        text deskripsi "Detail Keluhan"
        varchar no_wa_pelapor "No WA Kontak Pelapor"
        numeric redaman_saat_lapor "Redaman Terakhir (dBm)"
        varchar status_ont_saat_lapor "Status ONT saat Lapor"
        varchar status "MENUNGGU, DIPROSES, SELESAI, DIBATALKAN"
        text catatan_teknisi "Tindakan Penyelesaian"
        datetime created_at
        datetime updated_at
    }

    KUOTA_PELANGGAN {
        bigint id PK
        varchar id_pelanggan FK "Relasi ke pelanggan.id_pelanggan (CASCADE)"
        varchar periode_bulan "Format YYYY-MM"
        numeric kuota_terpakai_gb "Akumulasi Kuota (GB)"
        varchar kecepatan_paket
        datetime created_at
        datetime updated_at
    }

    USERS {
        int id PK
        varchar username UK "Username Login Admin/Teknisi"
        varchar hashed_password "Bcrypt Hash"
        varchar nama_karyawan "Nama Lengkap Petugas"
        varchar no_wa "Nomor WhatsApp Petugas"
        varchar role "super admin, admin, teknisi"
        varchar allowed_kantor "JSON Array Wilayah Kantor"
        boolean is_active "Status Akun Aktif"
        datetime created_at
        datetime updated_at
    }

    USER_ACTIVITY_LOGS {
        bigint id PK
        int user_id FK "Relasi ke users.id (ON DELETE SET NULL)"
        varchar username "Username Pelaku Aksi"
        varchar nama_karyawan "Nama Petugas"
        varchar role "Role Pengguna"
        varchar action "LOGIN, LOGOUT, SCAN, EDIT_USER, etc."
        varchar ip_address "IP Asal Request"
        text user_agent "Browser/Client Info"
        varchar status "SUCCESS, FAILED"
        text keterangan "Detail Audit Log"
        datetime created_at
    }
```

---

## 2. Kamus Data & Integritas Relasional

### 2.1 Master Wilayah & Referensi
- **`kantors`**: Master entitas kantor operasional (`cabang`, `pusat`, `banyumas`).
- **`pops`**: Master Point of Presence yang terhubung ke kode kantor (`fk_pops_kantor`).
- **`pakets`**: Master paket layanan internet dan kecepatan bandwidth (Mbps).

### 2.2 Master Data Pelanggan (`pelanggan`) & Perangkat ONT (`perangkat_ont`) — 3NF Murni
- **Bebas Redundansi**: Tabel `pelanggan` murni menyimpan profil pelanggan, wilayah POP/Kantor, dan akun portal warga. Seluruh atribut teknis modem fisik telah didekomposisi ke `perangkat_ont`.
- **`perangkat_ont`**: Menyimpan IP router, jenis modem, MAC address, redaman baseline, kredensial Web GUI ONT, dan SSID/Password WiFi.
- **Relasi 1-to-1 CASCADE**: `perangkat_ont.id_pelanggan` $\rightarrow$ `pelanggan.id_pelanggan` (`ON DELETE CASCADE`).

### 2.3 Time-Series Log Redaman (`log_performa_ont`)
- **Foreign Key**: `id_pelanggan` $\rightarrow$ `pelanggan.id_pelanggan` (`ON DELETE CASCADE`).
- **Indeks**: 
  - `idx_pelanggan_waktu`: (`id_pelanggan`, `waktu_cek`) untuk query rentang grafik time-series.
  - `idx_log_status`: (`status_koneksi`) untuk filter status KPI.
  - `idx_log_waktu`: (`waktu_cek`) untuk pembersihan data usang (*retention policy*).

### 2.4 Log Notifikasi Alert (`alert_logs`)
- **Foreign Key**: `id_pelanggan` $\rightarrow$ `pelanggan.id_pelanggan` (`ON DELETE CASCADE`).
- **Indeks**:
  - `idx_alert_pelanggan_waktu`: (`id_pelanggan`, `waktu_kirim`) untuk evaluasi debounce anti-spam 30 menit.

### 2.5 Tiket Kendala Warga (`tiket_kendala`)
- **Foreign Key**: `id_pelanggan` $\rightarrow$ `pelanggan.id_pelanggan` (`ON DELETE CASCADE`) dan `kantor` $\rightarrow$ `kantors.kode` (`fk_tiket_kantor`).
- **Indeks**:
  - `idx_tiket_pelanggan_waktu`: (`id_pelanggan`, `created_at`).
  - `idx_tiket_status_kantor`: (`status`, `kantor`).

### 2.6 Monitoring Kuota (`kuota_pelanggan`)
- **Foreign Key**: `id_pelanggan` $\rightarrow$ `pelanggan.id_pelanggan` (`ON DELETE CASCADE`).
- **Indeks**:
  - `idx_kuota_pelanggan_periode`: (`id_pelanggan`, `periode_bulan`).

### 2.7 Pengguna Sistem NOC & Teknisi (`users`)
- **Fungsi**: Manajemen otentikasi admin kantor, super admin, dan teknisi lapangan.
- **Atribut Kontak**: `no_wa` menyimpan nomor WhatsApp aktif petugas untuk koordinasi dispatch kendala.

### 2.8 Audit Log Aktivitas (`user_activity_logs`)
- **Foreign Key**: `user_id` $\rightarrow$ `users.id` (`ON DELETE SET NULL`).
- **Indeks**:
  - `idx_activity_user_action`: (`username`, `action`).
  - `idx_activity_action_created`: (`action`, `created_at`).

### 2.9 Konfigurasi Sistem (`system_settings`)
- **Pola Key-Value Global**: Menyimpan konfigurasi global aplikasi (seperti interval monitoring dan default modem credentials).
