# EdTeknoGuard 🛡️

**EdTeknoGuard** adalah sistem pemantauan dan deteksi dini performa ONT/Modem pelanggan berbasis **Python FastAPI**, **TiDB Cloud (MySQL Engine)**, **Jinja2 + Tailwind CSS + Alpine.js**, dan **Telegram Alerting Multi-Recipient** untuk jaringan penyedia layanan internet (ISP lokal).

---

## 📑 Navigasi Dokumen & Standar Proyek

Seluruh dokumentasi proyek dirancang saling terhubung dan memiliki pembagian fokus yang jelas:
- 🎨 [Pedoman Tampilan & UI/UX (desain.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/desain.md) — Mengatur warna tampilan, palet status redaman (-26.0 dBm), tipografi, komponen visual, dan tata letak mobile-first.
- 🏗️ [Struktur File/Folder & Database (arsitektur.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/arsitektur.md) — Mengatur struktur direktori proyek, skema tabel TiDB Cloud (MySQL Engine), konfigurasi, dan relasi entitas.
- 📋 [Alur Kerja Sistem & Logika Bisnis (prd.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/prd.md) — Mengatur alur kerja pemantauan otomatis 5 menit, pemindaian manual on-demand, mekanisme alert Telegram multi-recipient, dan penanganan gangguan optik.

---

## 🚀 Fitur Unggulan

1. **Deteksi Dini Redaman Menurun (Threshold -26.0 dBm):**
   - Mengidentifikasi potensi gangguan sebelum pelanggan komplain (standar awal peringatan ditetapkan di `-26.0 dBm`).
2. **Mesin Pemantau Otomatis (Interval 5 Menit):**
   - Background worker berjalan secara periodik tiap 5 menit untuk mengambil metrik performa ONT (redaman dBm, uptime, suhu).
   - Dilengkapi kontrol manual runtime: Tombol **"Cek Redaman Sekarang"** (on-demand) dan **"Jeda / Lanjutkan Monitoring"**.
3. **Peringatan Instan Telegram Multi-Penerima:**
   - Mengirim notifikasi bahaya/warning otomatis ke beberapa teknisi sekaligus (daftar Chat ID) atau ke Grup Tim NOC.
   - Dilengkapi proteksi *anti-spam debounce* agar tidak membanjiri chat saat gangguan berlangsung.
4. **Visualisasi Historis & Grafik Analitik:**
   - Menyajikan grafik tren degradasi redaman pelanggan: Harian (per jam), Mingguan (7 hari), dan Bulanan (30 hari).
5. **Manajemen Data Pelanggan Terintegrasi:**
   - Mengakomodasi data dari `DAFTAR PELANGGAN TIJ.xlsx` dan `DAFTAR PELANGGAN TIJ(PELANGGAN CABANG).csv`.
   - Klasifikasi berdasarkan POP (Server Cabang, Server Pusat, Mini Server Pabelan, Mini Klero, BMS).
6. **Mobile-First NOC Interface:**
   - Antarmuka super ringan dan reaktif menggunakan **Alpine.js** dan **Tailwind CSS**, nyaman digunakan teknisi langsung dari smartphone di tiang jaringan.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+ / FastAPI / SQLAlchemy / PyMySQL / HTTPX
- **Database:** TiDB Cloud Serverless (MySQL-Compatible Engine)
- **Frontend:** HTML5 + Jinja2 + Tailwind CSS + Alpine.js + Chart.js
- **Kolektor Protokol:** SNMP v2c (pysnmp) + ICMP Latency Ping (dengan modul simulasi fallback)
- **Alert Service:** Telegram Bot API (Multi-Chat ID & Group Broadcast)

---

## ⚙️ Panduan Menjalankan Aplikasi

### 1. Prasyarat Lingkungan
Pastikan dependensi Python terpasang:
```bash
python -m pip install -r requirements.txt
```

### 2. Konfigurasi Lingkungan (`.env`)
Buat file `.env` berdasarkan template `.env.example`:
```ini
APP_NAME=
APP_ENV=
APP_PORT=

# TiDB Cloud Database
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# Telegram Bot Alerting
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_IDS=

# Monitoring Settings
POLLING_INTERVAL_MINUTES=5
WARNING_THRESHOLD_DBM=-26.0
SNMP_SIMULATION_MODE=true
```

### 3. Inisialisasi Database & Import Pelanggan
```bash
python -m app.db.init_db
```

### 4. Menjalankan Server Web
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Buka browser pada: `http://localhost:8000`