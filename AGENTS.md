# AGENTS.md — Pedoman Proyek & Konfigurasi Global EdTeknoGuard

Dokumen ini adalah acuan arsitektur dan pedoman sistem (*System Instruction / Rules*) bagi seluruh AI Agent yang mengelola, memelihara, dan mengembangkan repositori **EdTeknoGuard**.

---

## 1. Ringkasan & Tujuan Proyek

**EdTeknoGuard** adalah sistem pemantauan berkala (*automated periodic monitoring*) dan deteksi dini (*early warning system*) untuk perangkat modem **ONT (Optical Network Terminal)** seperti ZTE GM220-S & XPON yang digunakan oleh penyedia layanan internet (ISP).

### Tujuan Utama:
1. Mendeteksi penurunan daya terima optik (*Optical Rx Power dBm*) sebelum pelanggan mengalami *Loss of Signal* (LOS) atau gangguan koneksi.
2. Mengirimkan notifikasi darurat secara otomatis ke grup/chat ID tim teknisi via **Bot Telegram**.
3. Menyediakan antarmuka dashboard operasional NOC yang intuitif, mobile-first, dan modular.

---

## 2. Stack Teknologi

| Komponen | Teknologi |
| :--- | :--- |
| **Backend Framework** | Python 3.10+ / FastAPI |
| **Server ASGI** | Uvicorn |
| **Database** | TiDB Cloud (MySQL-Compatible) via SQLAlchemy & PyMySQL |
| **Scheduler** | APScheduler (`BackgroundScheduler` daemon) |
| **Frontend Rendering** | Jinja2 Templates (Server-Side Rendered) |
| **Styling** | Tailwind CSS (Mobile-First responsive) |
| **Interaktivitas UI** | Alpine.js 3.x (Reaktif ringan tanpa build tools kompleks) |
| **Visualisasi Grafik** | Chart.js |
| **Ikon UI** | Standar SVG inline bersih (bebas ketergantungan library luar) |
| **Integrasi Eksternal** | Telegram Bot API (`requests` / `httpx`) & HTTP Scraper Modem ONT |

---

## 3. Ketentuan Ambang Batas Redaman Optik (SOP Baru)

Pengecekan redaman optik mengacu pada standar operasional berikut:

1. **Sinyal Optimal / Normal (`> -26.0 dBm`)**:
   - Kondisi koneksi prima, throughput lancar, tidak ada tindakan yang diperlukan.
2. **Ambang Batas Peringatan Dini (`-26.0 dBm`) — Peringatan Ringan ⚠️**:
   - Dipicu jika redaman berada pada rentang **`-26.0 dBm` s/d `-27.0 dBm`**.
   - Header notifikasi Telegram: `⚠️ [PERINGATAN RINGAN - PERINGATAN DINI]`.
   - Status koneksi: `WARNING`.
   - Menandakan koneksi pelanggan mulai mengalami penurunan kualitas (konektor kotor atau tekukan ringan), namun masih dalam batas operasional.
3. **Ambang Batas Kritis (`<= -27.0 dBm` atau LOS) — Notifikasi Merah Segera Dicek 🚨🔴**:
   - Dipicu jika redaman menyentuh atau lebih buruk dari **`-27.0 dBm`** (misal `-27.1 dBm`, `-28 dBm`, s/d LOS).
   - Header notifikasi Telegram: `🚨🔴 [NOTIFIKASI MERAH - SEGERA DICEK!]`.
   - Status koneksi: `CRITICAL` atau `LOS`.
   - Berisiko tinggi pemutusan koneksi (*drop signal*). Pesan Telegram memuat instruksi darurat: *"Mohon teknisi piket lapangan untuk SEGERA melakukan pengecekan fisik kabel dropcore, sambungan fusion/fast connector, dan patchcord pelanggan!"*

---

## 4. Multi-Kredensial Modem ONT & Mekanisme Scraper

Modem pelanggan di lapangan dapat memiliki kredensial yang bervariasi karena konfigurasi teknisi. Sistem menerapkan strategi autentikasi berlapis (*Fallback Chain*):

1. **Penyimpanan**:
   - Daftar kredensial disimpan pada tabel `system_settings` di TiDB Cloud dengan key `default_modem_credentials` berupa JSON Array:
     ```json
     [
       {"username": "admin", "password": "tekno2024"},
       {"username": "admin", "password": "admin"},
       {"username": "tekno", "password": "tekno2025"}
     ]
     ```
2. **Alur Pengecekan Scraper (`ONTScraperService.scrape_ont`)**:
   - **Langkah 1**: Mencoba kredensial tersimpan pada data pelanggan (`user_admin` & `pass_admin`).
   - **Langkah 2**: Jika gagal (`AUTH_FAILED`), scraper mencoba seluruh daftar kredensial default dari pengaturan satu per satu secara berurutan.
   - **Langkah 3**: Jika salah satu kredensial default berhasil login, kredensial pelanggan yang tadinya `INVALID` otomatis diperbarui menjadi `VALID` di database.
3. **Halaman Pengaturan (`/pengaturan` atau `/settings`)**:
   - Menggunakan layout **3 TAB**:
     - **Tab 1 (Parameter & Ambang Batas)**: Input manual menit interval, ambang batas -26.0 dBm (warning) dan -27.0 dBm (kritis). *Tanpa tombol preset opsi dan tanpa radio button status scheduler*.
     - **Tab 2 (Kredensial Modem ONT)**: Tabel repeater dinamis untuk menambah/menghapus pasangan username & password modem lebih dari 1 + opsi sinkronisasi massal ke pelanggan invalid.
     - **Tab 3 (Integrasi Bot Telegram)**: Konfigurasi token @BotFather, recipient chat ID, dan tombol uji coba alert instan.

---

## 5. Arsitektur Struktur Direktori

```text
EdTeknoGuard/
├── app/
│   ├── core/                  # Konfigurasi aplikasi, env loader, security, db engine
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py        # Proteksi sesi admin NOC
│   ├── db/
│   │   └── models.py          # SQLAlchemy models: Pelanggan, LogPerformaONT, SystemSetting, AlertLog
│   ├── modules/               # Modular berdasarkan domain/fitur
│   │   ├── auth/              # Halaman & endpoint autentikasi admin
│   │   ├── dashboard/         # Dashboard KPI & visualisasi Chart.js
│   │   ├── customers/         # CRUD pelanggan, live check, import CSV
│   │   ├── monitoring/        # Trigger full scan & single scan
│   │   ├── telegram_mgmt/     # Manajemen Bot Telegram & log notifikasi
│   │   ├── settings/          # Pengaturan sistem (berbasis tab)
│   │   └── logs_mgmt/         # Histori time-series pembacaan redaman
│   ├── services/              # External service layer
│   │   ├── ont_scraper_service.py   # Live HTTP Web Scraper ONT ZTE GM220-S
│   │   ├── scheduler_service.py     # Background worker interval
│   │   ├── telegram_service.py      # Pengiriman pesan Telegram + debounce
│   │   └── snmp_service.py          # Simulasi / SNMP polling engine
│   └── main.py                # FastAPI app bootstrap & router registry
├── templates/                 # Jinja2 Layouts & Views
│   ├── layouts/
│   │   └── base.html          # Shell HTML utama, navigasi desktop & mobile
│   ├── auth/
│   ├── dashboard/
│   ├── customers/
│   ├── settings/              # Antarmuka pengaturan sistem berbasis Tab
│   ├── telegram/              # Antarmuka bot Telegram
│   └── logs/
├── static/                    # Aset statis (CSS, JS, Gambar)
├── AGENTS.md                  # Pedoman arsitektur agen AI (dokumen ini)
├── README.md
├── requirements.txt
└── .env.example
```

---

## 6. Standar Keamanan & Kode

1. **Autentikasi Admin NOC**:
   - Default login: Username `admin`, Password `agiltampan`.
   - Sesi disimpan secara aman melalui session cookie terproteksi (`edteknoguard_session`).
2. **Kerahasiaan Credential**:
   - Secret key, bot token Telegram, dan kredensial TiDB Cloud **WAJIB** berada di file `.env`.
   - File `.env` **TIDAK BOLEH** di-commit ke Git.
3. **Pop-up Konfirmasi**:
   - Setiap aksi modifikasi penting (hapus data pelanggan, bulk delete, dan simpan pengaturan) **WAJIB** menampilkan modal pop-up konfirmasi sebelum eksekusi.
4. **Anti-Spam Alert Debounce**:
   - Sistem memiliki mekanisme debounce menit (default 30 menit) di `telegram_service.py` untuk mencegah pengiriman alert berulang ke teknisi jika modem masih dalam status gangguan yang sama.
