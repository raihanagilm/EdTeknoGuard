# EdTeknoGuard 🛡️

**EdTeknoGuard** adalah sistem terpadu pemantauan berkala (*automated periodic monitoring*) dan deteksi dini (*early warning system*) performa modem ONT (Optical Network Terminal) seperti ZTE GM220-S & XPON serta manajemen operasional jaringan untuk penyedia layanan internet (ISP lokal).

---

```text
               ┌────────────────────────────────────────────────────────┐
               │                  SERVER TEKNOGUARD                     │
               └───────────────┬────────────────────────┬───────────────┘
                               │                        │
       JALUR 1: MIKROTIK ROUTEROS API            JALUR 2: LIVE ONT HTTP SCRAPER
      (Ke Router Utama ISP MikroTik)            (Ke Modem ONT ZTE GM220-S / XPON)
                               │                        │
             ┌─────────────────┴──────────┐   ┌─────────┴───────────────────────┐
             │ • IP & MAC Address Leases  │   │ • Redaman Optik Rx Power (dBm)  │
             │ • Simple Queue Bandwidth   │   │ • Suhu Modem (°C) & Uptime      │
             │ • Limit Upload & Download  │   │ • Tx Power & GPON Link State    │
             │ • Akumulasi Kuota (GB)     │   │ • Nama SSID & Password WiFi     │
             │ • Status Dial PPPoE/Isolir │   │ • Deteksi Perangkat Terhubung   │
             └────────────────────────────┘   └─────────────────────────────────┘
```

## 📑 Navigasi Dokumen & Standar Proyek

Dokumentasi proyek tersimpan terstruktur di direktori `docs/`:
- 🤖 [Pedoman AI Agent (AGENTS.md)](AGENTS.md) — Arsitektur sistem, SOP redaman, dan instruksi wajib AI Agent.
- 📜 [Riwayat Perubahan & Changelog (CHANGELOG.md)](CHANGELOG.md) — Acuan riwayat perubahan sistem (*regression shield*).
- 📐 [Design System Pro — Rulebook UI/UX (docs/designsystempro.md)](docs/designsystempro.md) — Single Source of Truth antarmuka, tata letak, dan interaktivitas UI/UX.
- 🏗️ [Arsitektur Sistem & Direktori (docs/arsitektur.md)](docs/arsitektur.md) — Arsitektur multi-tenant, model database, dan alur data.
- 📋 [Alur Kerja Sistem & PRD (docs/prd.md)](docs/prd.md) — Alur monitoring berkala, on-demand probe, dan SOP penanganan gangguan.
- 🚀 [Panduan Deployment VPS (docs/DEPLOY_VPS.md)](docs/DEPLOY_VPS.md) — Prosedur deployment ke server produksi.

---

## 🚀 Fitur Unggulan

1. **Deteksi Dini Redaman Menurun (SOP Threshold -26.0 dBm & -27.0 dBm):**
   - Normal: `> -26.0 dBm` (Aman / Optimal).
   - Warning: `-26.0 dBm` s/d `-27.0 dBm` (Peringatan Dini kualitas drop).
   - Kritis / LOS: `<= -27.0 dBm` atau LOS (Segera Dicek Lapangan).
2. **Mesin Pemantau Multi-Kantor & Auto-Recovery:**
   - Background worker APScheduler memindai seluruh kantor cabang secara periodik.
   - Persistent scheduler state di MySQL & otomatis menjadwalkan *Catch-Up Scan* saat server reboot/restart.
3. **Multi-Kredensial Modem ONT (Exhaustive Scan & Fallback Chain):**
   - Mendukung multi-pasangan username & password modem per kantor dengan memori kegagalan (*failed_credentials*) untuk scanning super cepat.
4. **Portal Pelanggan Mandiri (TeknoCust):**
   - Sub-aplikasi mandiri untuk warga (`/portal`) dengan fitur cek redaman, pemantauan kuota, kelola nama & password WiFi rumah, serta tiket lapor kendala.
5. **Integrasi MikroTik RouterOS API:**
   - Sinkronisasi otomatis DHCP Leases, status isolir pelanggan, dan penghitungan kuota pemakaian riil dari Simple Queues.
6. **Notifikasi Native APK Android (Web Wrapper):**
   - Notifikasi darurat ditangani langsung melalui web push / native Android Studio wrapper.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+ / FastAPI / SQLAlchemy 2.x / PyMySQL / Uvicorn / HTTPX / APScheduler
- **Database:** MySQL Local (Arsitektur Multi-Database: `MasterBase` untuk master global, `TenantBase` terisolasi per kantor)
- **Frontend Admin (TeknoGuard):** React 18 + Vite + Tailwind CSS + Lucide Icons + Chart.js
- **Frontend Portal Warga (TeknoCust):** React 18 SPA terintegrasi di `/portal` (Mobile-First)

---

## ⚙️ Panduan Menjalankan Aplikasi

### 1. Prasyarat Lingkungan
Pastikan Python 3.10+ dan Node.js 18+ sudah terpasang.

Pasang dependensi Python backend:
```bash
python -m pip install -r requirements.txt
```

Pasang dependensi frontend React:
```bash
cd frontend
npm install
cd ..
```

### 2. Konfigurasi Lingkungan (`.env`)
Salin file template `.env.example` menjadi `.env` lalu sesuaikan konfigurasi database MySQL:
```ini
APP_NAME=EdTeknoGuard
APP_ENV=development
APP_PORT=7890

# Database MySQL Lokal
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edteknoguard

# Default Monitoring Parameters
POLLING_INTERVAL_MINUTES=5
WARNING_THRESHOLD_DBM=-26.0
CRITICAL_THRESHOLD_DBM=-27.0
```

### 3. Inisialisasi Database
Jalankan script inisialisasi skema tabel master dan tenant default:
```bash
python -m app.db.init_db
```

### 4. Menjalankan Aplikasi

**Mode Pengembangan (Backend & Frontend):**

Jalankan FastAPI Backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 7890
```

Jalankan Vite Frontend (pada terminal terpisah):
```bash
cd frontend
npm run dev
```

Akses aplikasi di browser:
- **Dashboard Admin NOC (TeknoGuard):** `http://localhost:5173` (atau port 7890 jika build terdistribusi)
- **Portal Pelanggan (TeknoCust):** `http://localhost:5173/portal` (atau `http://localhost:7890/portal`)
- **Dokumentasi API Swagger:** `http://localhost:7890/docs`
