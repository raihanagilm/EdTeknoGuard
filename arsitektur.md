# Struktur File/Folder & Database: EdTeknoGuard

Dokumen ini mendefinisikan secara spesifik **struktur file/folder direktori modular dan rancangan skema database TiDB Cloud** untuk aplikasi **EdTeknoGuard**.

> 🔗 **Tautan Dokumen Terkait:**
> - 📋 [Alur Kerja Sistem & Logika Bisnis (prd.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/prd.md) — Alur monitoring 5 menit, manual check, dan alerting.
> - 🎨 [Pedoman Desain & Tampilan (desain.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/desain.md) — Acuan warna, komponen visual, dan mobile-first.
> - 📖 [README Utama Proyek](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/README.md) — Gambaran umum dan panduan menjalankan sistem.

---

## 1. Diagram Aliran Data & Komponen

```
+-----------------------------------------------------------------------------------+
|                              JARINGAN ISP / WIREGUARD VPN                         |
+-----------------------------------------------------------------------------------+
           |                                                      ^
           | (Akses Web Admin)                                    | (SNMP UDP 161)
           v                                                      |
+--------------------------------------------------------+        |
|                  SERVER EdTeknoGuard                   |        |
|                                                        |        |
|  +--------------------------------------------------+  |        |
|  | Frontend: Jinja2 + Tailwind CSS + Alpine.js       |  |        |
|  | - Dashboard KPI & Kontrol Engine (Cek/Jeda)       |  |        |
|  | - Tabel Data Pelanggan (Search & Filter POP)      |  |        |
|  | - Grafik Riwayat Redaman (Hari/Minggu/Bulan)      |  |        |
|  +--------------------------------------------------+  |        |
|                            ^                           |        |
|                            | (Internal API / SSR)      |        |
|                            v                           |        |
|  +--------------------------------------------------+  |        |
|  | Backend: Python FastAPI                          |  |        |
|  | - Auth Module (Admin Session)                    |  |        |
|  | - Customer & Monitoring Controller               |  |        |
|  | - Background Worker / Scheduler (Tiap 5 Menit)   |==========+
|  +--------------------------------------------------+  |
|          |                                  |          |
|          v (PyMySQL / SQLAlchemy)           v (HTTPX)  |
|  +---------------------------+   +-------------------+ |
|  | TiDB Cloud (MySQL Engine) |   | Telegram Bot API  | |
|  | - Master Pelanggan        |   | - Multi-Recipient | |
|  | - Log Historis Redaman    |   |   (Teknisi & Grup)| |
|  | - Riwayat Notifikasi Alert|   +-------------------+ |
|  +---------------------------+                         |
+--------------------------------------------------------+
                               |
                               v
               +-------------------------------+
               |    ONT / Modem Pelanggan      |
               | - GM220-S XPON / G609-XPON    |
               | - ZTE F663NV3a / F477V2       |
               | - Huawei HG8546M              |
               | - ZL-2113X                    |
               +-------------------------------+
```

---

## 2. Struktur Direktori Proyek (Modular Architecture)

Sesuai standar antarmuka dan backend bersih, proyek disusun secara modular:

```text
EdTeknoGuard/
├── app/
│   ├── main.py                     # Entry point FastAPI & lifespans
│   ├── core/
│   │   ├── config.py               # Settings (Pydantic Settings & env loading)
│   │   ├── security.py             # Auth helper & session management
│   │   └── database.py             # SQLAlchemy engine & session factory
│   │
│   ├── db/
│   │   ├── models.py               # Definisi Tabel SQLAlchemy (TiDB)
│   │   └── init_db.py              # Skrip inisialisasi tabel & seeder awal
│   │
│   ├── modules/
│   │   ├── dashboard/              # Modul antarmuka utama NOC (MVC)
│   │   │   ├── routes.py           # Routing endpoint /
│   │   │   ├── controller.py       # Controller pengatur render HTML view
│   │   │   └── service.py          # Service agregasi data dashboard
│   │   │
│   │   ├── customers/              # Modul data pelanggan (MVC)
│   │   │   ├── routes.py           # Routing endpoint /api/customers
│   │   │   ├── controller.py       # Controller request/response pelanggan
│   │   │   └── service.py          # Service query database pelanggan
│   │   │
│   │   └── monitoring/             # Modul pemantauan, scanner & grafik (MVC)
│   │       ├── routes.py           # Routing endpoint /api/monitoring
│   │       ├── controller.py       # Controller API monitoring & scan
│   │       └── service.py          # Service kalkulasi threshold & time-series
│   │
│   └── services/
│       ├── snmp_service.py         # Engine query SNMP (Huawei, ZTE, Fiberhome)
│       ├── scheduler_service.py    # Loop background 5 menit (APScheduler/Asyncio)
│       ├── telegram_service.py     # Pengiriman alert multi-recipient
│       └── importer_service.py     # Parser CSV & Excel pelanggan
│
├── templates/
│   ├── layouts/
│   │   └── base.html               # Shell HTML, Google Fonts, Tailwind, Alpine.js
│   ├── components/
│   │   ├── kpi_cards.html          # Komponen 4 kartu KPI
│   │   ├── control_bar.html        # Bar kontrol (Cek Sekarang, Stop, Status)
│   │   ├── customer_table.html     # Tabel data & kartu mobile pelanggan
│   │   └── charts.html             # Komponen grafik riwayat redaman
│   └── dashboard/
│       └── index.html              # Halaman utama aplikasi
│
├── static/
│   ├── css/
│   │   └── custom.css              # Custom styling penunjang
│   └── js/
│       └── dashboard.js            # Inisialisasi Chart.js & helper
│
├── tests/
│   ├── test_snmp.py
│   └── test_telegram.py
│
├── .env.example
├── .env                            # Konfigurasi lokal (Diabaikan git)
├── .gitignore
├── requirements.txt
├── README.md
├── desain.md
└── arsitektur.md
```

---

## 3. Skema Basis Data Relasional (TiDB / MySQL)

TiDB Cloud menggunakan dialek MySQL dengan dukungan penuh engine InnoDB, collation `utf8mb4_unicode_ci`, dan UUID/BIGINT indexing.

### 3.1 Tabel `pelanggan` (Master Data)
```sql
CREATE TABLE IF NOT EXISTS pelanggan (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan VARCHAR(64) NOT NULL UNIQUE,       -- Contoh: 2072026320 / 260620000000
    nama VARCHAR(150) NOT NULL,
    alamat TEXT,
    no_hp VARCHAR(30),
    pop VARCHAR(80) NOT NULL DEFAULT 'Server Cabang', -- Server Cabang, Pusat, Pabelan, Klero, BMS
    ip_router VARCHAR(45) NOT NULL,                 -- IP Manajemen ONT (misal: 10.10.2.15)
    paket VARCHAR(50),                              -- Misal: 10MB CAB, 5MB Residential
    jenis_modem VARCHAR(50) NOT NULL,               -- GM220-S, F663NV3a, HG8546M, ZL-2113X
    mac_address VARCHAR(30),
    redaman_baseline NUMERIC(5,2),                  -- Redaman awal saat instalasi (dBm)
    nama_wifi VARCHAR(100),
    password_wifi VARCHAR(100),
    user_admin VARCHAR(50),
    pass_admin VARCHAR(100),
    snmp_community VARCHAR(50) DEFAULT 'public',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pelanggan_pop (pop),
    INDEX idx_pelanggan_ip (ip_router),
    INDEX idx_pelanggan_modem (jenis_modem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Tabel `log_performa_ont` (Time-Series Log)
```sql
CREATE TABLE IF NOT EXISTS log_performa_ont (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan VARCHAR(64) NOT NULL,
    waktu_cek DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rx_power NUMERIC(5,2) NULL,                     -- Nilai redaman (dBm), NULL jika LOS
    suhu_ont NUMERIC(4,1) NULL,                     -- Derajat Celcius
    uptime BIGINT UNSIGNED NULL,                    -- Detik aktif
    status_koneksi VARCHAR(20) NOT NULL,            -- NORMAL, WARNING, CRITICAL, LOS
    latency_ms INT NULL,                            -- Latensi ping/SNMP (ms)
    keterangan VARCHAR(255) NULL,
    INDEX idx_log_pelanggan_waktu (id_pelanggan, waktu_cek),
    INDEX idx_log_status (status_koneksi),
    INDEX idx_log_waktu (waktu_cek),
    FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 Tabel `alert_logs` (Histori Peringatan & Anti-Spam)
```sql
CREATE TABLE IF NOT EXISTS alert_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan VARCHAR(64) NOT NULL,
    tipe_alert VARCHAR(30) NOT NULL,                -- REDAMAN_DROP, ONT_LOS, OVERHEAT
    rx_power NUMERIC(5,2) NULL,
    pesan TEXT NOT NULL,
    target_recipients TEXT NOT NULL,                -- Chat ID penerima di Telegram
    status_kirim VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED
    waktu_kirim DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_pelanggan (id_pelanggan),
    INDEX idx_alert_waktu (waktu_kirim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.4 Tabel `system_settings` (Konfigurasi Dinamis)
```sql
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(50) NOT NULL UNIQUE,
    value_text TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
*Pengaturan default:*
- `scheduler_status`: `'RUNNING'` (atau `'STOPPED'`)
- `polling_interval_minutes`: `'5'`
- `warning_threshold_dbm`: `'-26.0'`
- `telegram_chat_ids`: `'12345678,87654321,-100123456789'`

---

## 4. Mesin Kolektor & Ambang Batas Redaman

### 4.1 Pemetaan OID Berdasarkan Jenis Modem
Dari data inventaris modem (Huawei, ZTE, OEM Fiberhome GM220-S / G609, ZL-2113X):

| Merek / Tipe | OID Rx Optical Power | Formula Kalkulasi |
| :--- | :--- | :--- |
| **Huawei (HG8546M)** | `1.3.6.1.4.1.2011.6.128.1.1.2.43.1.9` | Nilai mentah integer / 100 (misal: `-2450` $\rightarrow$ `-24.50 dBm`) |
| **ZTE (F663NV3a / F477V2)** | `1.3.6.1.4.1.3902.1012.3.50.1.1.2` | Nilai mentah dikonversi sesuai spesifikasi MIB vendor |
| **Fiberhome / OEM (GM220-S / G609)** | `1.3.6.1.4.1.5888.1.1.2.1.1.1` *(atau spesifik MIB vendor)* | Disesuaikan dengan MIB perangkat |

*Catatan:* Aplikasi dilengkapi **Simulation Mode Switch** (`SNMP_SIMULATION_MODE=true`) saat dijalankan di luar jaringan WireGuard ISP, sehingga seluruh fungsionalitas UI, alert, dan database tetap dapat diuji secara realistis.

### 4.2 Logika Peringatan (Warning Rule)
- Jika `rx_power >= -25.99 dBm` $\rightarrow$ **NORMAL** (Log database disimpan, tidak ada alert).
- Jika `rx_power <= -26.00 dBm` dan `rx_power >= -31.99 dBm` $\rightarrow$ **WARNING** (Picu alert Telegram ke seluruh tim teknisi).
- Jika `rx_power < -32.00 dBm` $\rightarrow$ **CRITICAL** (Picu alert darurat).
- Jika SNMP timeout / Host unreachable $\rightarrow$ **LOS / MODEM MATI**.
- **Anti-Spam Filter (Debounce):** Jika sebuah ONT sudah dikirimkan alert dalam rentang 30 menit terakhir dan statusnya belum pulih, sistem tidak akan mengirim pesan berulang setiap 5 menit agar tidak membanjiri grup Telegram teknisi.

---

## 5. Layanan Telegram Multi-Recipient

Modul `telegram_service.py` mendukung pengiriman ke:
1. **Chat Pribadi Beberapa Teknisi** (misal: `12345678`, `87654321`)
2. **Grup / Channel Telegram NOC** (misal: `-100123456789`)

Format Pesan Alert HTML yang Dikirim:
```html
🚨 <b>[EdTeknoGuard] PERINGATAN REDAMAN DROP!</b>

👤 <b>Pelanggan:</b> Mas Andi (ID: 2072026320)
📍 <b>POP:</b> Mini Klero
🌐 <b>IP ONT:</b> <code>10.10.2.15</code>
📟 <b>Jenis Modem:</b> GM220-S XPON
📊 <b>Redaman Terdeteksi:</b> <b>-27.40 dBm</b>
⚠️ <b>Batas Aman:</b> &gt; -26.00 dBm
⏰ <b>Waktu Cek:</b> 10/09/2026 11:45:00 WIB

<i>Tindakan: Mohon tim teknisi mengecek bending dropcore atau kebersihan adapter optik di pelanggan terkait.</i>
```

---

## 6. Antarmuka Pengguna & Interaktivitas Alpine.js

1. **Dashboard KPI & Kontrol Engine:**
   - Menampilkan status polling berjalan atau berhenti secara realtime.
   - Tombol manual: `Cek Redaman Sekarang` (menjalankan task async di FastAPI dan mengupdate data tanpa refresh halaman).
   - Tombol `Jeda Monitoring` / `Lanjutkan Monitoring`.
2. **Grafik Visualisasi Tren (Chart.js):**
   - Menampilkan tren historis rata-rata redaman dari tabel `log_performa_ont`.
   - Toggle rentang waktu: Hari Ini (per jam), 7 Hari Terakhir (per hari), 30 Hari Terakhir (per minggu).
   - Terdapat threshold limit line pada `-26.0 dBm`.
3. **Filter Tabel Cepat:**
   - Filter instan berdasarkan POP dan Status tanpa reload halaman berkat reaktivitas Alpine.js.

---

## 7. Integrasi Dokumen Spesifikasi

Untuk memahami alur logika operasional dan standar tampilan antarmuka:
- 📋 [Alur Kerja Sistem & Logika Bisnis (prd.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/prd.md) — Alur monitoring 5 menit, on-demand scan, debounce alert, dan penanganan gangguan massal.
- 🎨 [Pedoman Tampilan & UI/UX (desain.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/desain.md) — Acuan warna, komponen visual, tipografi, dan standar mobile-first.
- 📖 [Panduan Menjalankan Sistem (README.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/README.md) — Ringkasan proyek dan cara menjalankan aplikasi.
