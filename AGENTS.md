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
| **Ikon UI** | Standar SVG inline murni bersih (bebas ketergantungan library eksternal, DILARANG KERAS memakai emoji/font icons) |
| **Integrasi Eksternal** | HTTP Scraper Modem ONT ZTE GM220-S & Notifikasi Native APK Android (Web Wrapper) |

---

## 3. Ketentuan Ambang Batas Redaman Optik (SOP Baru)

Pengecekan redaman optik mengacu pada standar operasional berikut:

1. **Sinyal Optimal / Normal (`> -26.0 dBm`)**:
   - Kondisi koneksi prima, throughput lancar, tidak ada tindakan yang diperlukan.
2. **Ambang Batas Peringatan Dini (`-26.0 dBm`) — Peringatan Ringan ⚠️**:
   - Dipicu jika redaman berada pada rentang **`-26.0 dBm` s/d `-27.0 dBm`**.
   - Status koneksi: `WARNING`.
   - Menandakan koneksi pelanggan mulai mengalami penurunan kualitas (konektor kotor atau tekukan ringan), namun masih dalam batas operasional.
3. **Ambang Batas Kritis (`<= -27.0 dBm` atau LOS) — Notifikasi Merah Segera Dicek 🚨🔴**:
   - Dipicu jika redaman menyentuh atau lebih buruk dari **`-27.0 dBm`** (misal `-27.1 dBm`, `-28 dBm`, s/d LOS).
   - Status koneksi: `CRITICAL` atau `LOS`.
   - Berisiko tinggi pemutusan koneksi (*drop signal*). Sistem memicu instruksi darurat: *"Mohon teknisi piket lapangan untuk SEGERA melakukan pengecekan fisik kabel dropcore, sambungan fusion/fast connector, dan patchcord pelanggan!"*

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
   - Menggunakan layout **2 TAB**:
     - **Tab 1 (Parameter & Ambang Batas)**: Input manual menit interval, ambang batas -26.0 dBm (warning) dan -27.0 dBm (kritis). *Tanpa tombol preset opsi dan tanpa radio button status scheduler*.
     - **Tab 2 (Kredensial Modem ONT)**: Tabel repeater dinamis untuk menambah/menghapus pasangan username & password modem lebih dari 1 + opsi sinkronisasi massal ke pelanggan invalid.
     - *(Fitur Telegram telah dihapus bersih karena notifikasi darurat ditangani secara native melalui web wrapper APK Android Studio)*.

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

1. **Autentikasi Admin NOC & Manajemen Sesi 30 Hari**:
   - Default login: Username `admin`, Password `agiltampan`.
   - Fitur lihat password: Input password pada halaman login dilengkapi tombol toggle SVG (mata terbuka / mata tertutup) tanpa emoji.
   - Masa aktif sesi (`MAX_SESSION_AGE`): Sesi pengguna bertahan selama **30 hari** (2.592.000 detik).
   - Mekanisme *Sliding Expiration*: Selama pengguna aktif mengakses aplikasi, masa berlaku sesi otomatis diperpanjang 30 hari ke depan. Jika pengguna tidak mengakses aplikasi selama 30 hari berturut-turut, sesi otomatis kedaluwarsa dan pengguna dialihkan ke `/login`.
   - Sesi disimpan secara aman melalui session cookie terproteksi (`edteknoguard_session`).
2. **Kerahasiaan Credential**:
   - Secret key, bot token Telegram, dan kredensial TiDB Cloud **WAJIB** berada di file `.env`.
   - File `.env` **TIDAK BOLEH** di-commit ke Git.
3. **Pop-up Konfirmasi**:
   - Setiap aksi modifikasi penting (hapus data pelanggan, bulk delete, dan simpan pengaturan) **WAJIB** menampilkan modal pop-up konfirmasi sebelum eksekusi.
4. **Anti-Spam Alert Debounce**:
   - Sistem memiliki mekanisme debounce menit (default 30 menit) di `telegram_service.py` untuk mencegah pengiriman alert berulang ke teknisi jika modem masih dalam status gangguan yang sama.
5. **Standar Ikon UI Wajib SVG Inline Bersih**:
   - Seluruh ikon antarmuka (tombol, badge, header modal, indikator sorting, dan aksi tabel) **WAJIB** menggunakan standar SVG inline bersih dengan atribut stroke/fill yang konsisten.
   - **DILARANG KERAS** menggunakan emoji (seperti ⚡, 🔄, ⏭️, ⚙️, 🚨, dsb.) atau library icon eksternal sebagai ikon tombol/tabel UI.
6. **Toggle Pemantauan ON/OFF Pelanggan (`is_monitored`)**:
   - Modem dengan `is_monitored = False` otomatis dilewati (*skipped*) oleh background scheduler pemindaian berkala dan dibungkam dari pengiriman alert Telegram.
   - Kartu statistik KPI di `/pelanggan` dan Dashboard mengecualikan modem nonaktif, menampilkan badge `(X OFF)` pada Total Terpantau.
7. **Filter Rentang Tanggal & Real-Time Auto-Refresh**:
   - Filter tanggal terpadu (`Semua Tanggal`, `Hari Ini`, `7 Hari Terakhir`, `30 Hari Terakhir`, `Kustom Tanggal` dengan picker rentang `s/d`) diterapkan pada `/logs` dan `/pelanggan`.
   - Polling latar belakang otomatis (8-10 detik) memutakhirkan DOM secara *silent* dengan proteksi pause saat modal/kalender sedang dibuka.
8. **Sistem 3 Role & Multi-Kantor Cabang**:
   - **Tiga Role Pengguna**:
     - `super admin`: Akses penuh 3 kantor, satu-satunya role yang diizinkan mengakses menu Manajemen Pengguna (`/users`) dan Pengaturan Sistem (`/settings`).
     - `admin`: Mengelola operasional teknis (CRUD pelanggan, monitoring, import) terbatas pada kantor cabang yang diizinkan (`allowed_kantor`). Tidak dapat mengakses menu User dan Pengaturan.
     - `teknisi`: Menggantikan peran `karyawan` sebelumnya, fokus pada pemantauan real-time status redaman ONT & probe on-demand terbatas pada kantor yang diizinkan. Dibatasi dari aksi manipulasi/penghapusan data pelanggan.
   - **Tiga Wilayah Kantor**: `cabang` (Kantor Cabang), `pusat` (Kantor Pusat), dan `banyumas` (Kantor Banyumas).
   - **Office Switcher**: Dropdown interaktif di navbar atas untuk Super Admin dan user multi-kantor untuk berpindah kantor aktif (`cabang`, `pusat`, `banyumas`). Opsi "Semua Kantor" telah ditiadakan agar pemantauan, scanning, dan pelaporan selalu fokus dan terisolasi per kantor yang dipilih secara spesifik.
   - **Notifikasi Telegram**: Setiap alert redaman drop, status kritis/LOS, dan batch alert wajib memuat identitas wilayah kantor pelanggan (misal: `🏢 <b>Kantor:</b> CABANG`).
9. **Model Pemantauan Hybrid 3 Kantor (Background Scheduler vs Scan Manual)**:
   - **Pemantauan Otomatis Latar Belakang (*Background Scheduler*)**:
     - Berjalan otomatis secara periodik (tiap X menit) via APScheduler daemon untuk **memindai seluruh pelanggan aktif di seluruh kantor (`cabang`, `pusat`, `banyumas`)** sekaligus tanpa intervensi manual.
   - **Pemindaian Manual (*Manual Scan / Scan All*)**:
     - **Admin Cabang**: Pemicuan tombol "Mulai Pemantauan" otomatis diisolasi hanya untuk memindai pelanggan di wilayah kantor yang diizinkan (misal: hanya ONT Kantor Cabang).
     - **Super Admin**: Memindai seluruh pelanggan pada kantor aktif yang sedang dipilih di Office Switcher (misal: memindai pelanggan Kantor Cabang saat switcher berada di Cabang).
     - **Teknisi**: Dibatasi dari pemindaian serentak (*Scan All*) dengan proteksi HTTP 403 Forbidden; teknisi tetap dapat melakukan pengujian on-demand per pelanggan (*Single Probe*) terbatas pada kantor yang diizinkan.
   - **Metrik KPI & Visualisasi Grafik Chart.js**:
     - Endpoint `/api/monitoring/kpi` dan `/api/monitoring/chart-data` terisolasi secara dinamis sesuai kantor aktif pengguna yang sedang login.
10. **Import Multi-Kantor & Auto-Recovery Server (Crash/Reboot Persistence)**:
    - **Import Multi-Kantor & Resolusi Duplikasi Tanpa Penimpaan (No Overwrite)**:
      - Template Excel/CSV mendukung kolom `Kantor` (Cabang, Pusat, Banyumas) untuk pemetaan per baris secara otomatis.
      - **Alokasi Kantor Otomatis Sesuai Kantor Aktif**: Dropdown pemilihan kantor pada Langkah 1 ditiadakan. Data otomatis dialokasikan ke kantor aktif yang sedang dibuka di navbar (atau dipetakan otomatis per baris jika berkas memuat kolom *Kantor*).
      - **Kebijakan SOP Jangan Ditimpa**: Data pelanggan yang sudah terdaftar di database dilarang keras ditimpa saat import. Seluruh opsi "Timpa" ditiadakan dari sistem.
      - **Resolusi Duplikasi Inline**: Penanganan duplikasi (Auto-ID unik, abaikan/skip, hapus baris, atau edit manual ID/IP/Nama) dilakukan secara langsung dan interaktif pada tabel Pratinjau Langkah 3 tanpa menggunakan pop-up modal koreksi sekunder yang terpisah. Baris dengan status diabaikan (*skip*) otomatis dilewati dan tidak memblokir proses simpan ke database.
    - **Auto-Recovery & Persistence Pemantauan**:
      - Status scheduler (`RUNNING`/`STOPPED`) dan interval tersimpan permanen di tabel `system_settings` TiDB Cloud.
      - Saat server reboot / restart / hidup kembali setelah mati listrik atau putus jaringan, sistem otomatis memulihkan status scheduler ke `RUNNING` tanpa intervensi manual.
      - Jika waktu mati server telah melampaui interval pemantauan reguler, sistem otomatis menjadwalkan *Catch-Up Scan* (5 detik setelah startup) dan mencatat entri audit log `STARTUP_RECOVERY`.
      - API `/api/monitoring/status` menyediakan parameter `next_run_time` untuk kepastian visibilitas jadwal pemindaian berikutnya di antarmuka web.

11. **Portal Pelanggan Mandiri (Self-Service Mobile Web App di `/portal`)**:
    - **Arsitektur Satu Proyek & Satu Server**:
      - Terintegrasi di dalam repositori pada folder `portal_pelanggan/` dan di-mount langsung pada aplikasi utama di endpoint `/portal` (dapat juga dijalankan mandiri di port terpisah jika diinginkan).
      - Menggunakan database bersama (TiDB Cloud) dengan penambahan tabel `akun_pelanggan`, `tiket_kendala`, dan `kuota_pelanggan`.
    - **Aktivasi / Registrasi Ramah Warga Desa 2-Tahap (`/portal/daftar`)**:
      - Didesain sangat sederhana dan mudah untuk warga desa tanpa istilah teknis yang membingungkan.
      - Input hanya: **Nama Lengkap Pendaftar**, **Alamat / Dusun / Desa**, **Nomor WhatsApp**, dan **Deteksi Titik GPS Rumah Otomatis (Background)**. Input IP router ditiadakan dari formulir pendaftaran karena warga desa tidak mengetahui IP WAN jaringan ISP.
      - **Status PENDING & Keamanan Data Kantor**: Pendaftaran awal otomatis berstatus `PENDING` dengan `id_pelanggan = None`. Warga belum diberikan akses ganti WiFi / ID Pelanggan sebelum dicocokkan dan diverifikasi oleh Admin kantor.
      - **Bebas Ribet Password**: Seluruh akun otomatis disetel ke password awal `123456` dan langsung dapat masuk ke dashboard pratinjau.
    - **Autentikasi & Sesi Pelanggan (`/portal/login`)**:
      - Seluruh akun pelanggan baru menggunakan kata sandi awal: `123456`.
      - Antarmuka ramah warga menggunakan bahasa Indonesia bersih (*"Petunjuk Masuk: Kata sandi awal adalah: 123456"*), tanpa tombol preset "Isi 123456", dilengkapi toggle lihat kata sandi (ikon SVG mata terbuka/tertutup) dan tautan *"Lupa Kata Sandi?"*.
      - Sesi 30 hari via secure cookie `edtekno_pelanggan_session`.
    - **Fitur Lupa & Reset Kata Sandi Mandiri (`/portal/lupa-password`)**:
      - **Opsi Verifikasi Mandiri**:
        1. **Opsi Utama (IP Modem / Router)**: Cek stiker fisik modem ONT atau menu WiFi HP (`10.10.x.x` / `192.168.x.x`).
        2. **Opsi Alternatif (Nama & Nomor HP Terdaftar)**: Pencocokan berbasis Nama Terdaftar dan Nomor WhatsApp.
        3. **Kata Sandi Baru**: Pelanggan dapat mengatur kata sandi baru (minimal 6 karakter) atau tombol cepat *"Setel ke 123456"*.
      - **Bebas Ketergantungan WA**: Mandiri (*self-service*).
    - **Lapor Kendala Mandiri (`/portal/kendala/buat`)**:
      - Pelanggan dapat membuat tiket gangguan (Internet Lambat, LOS Lampu Merah, Sinyal Drop, ONT Mati, WiFi Lemah, dll.).
      - Sistem otomatis melampirkan redaman optik terakhir (dBm) dan status ONT dari `log_performa_ont` serta nomor WA pelapor.
    - **Cek Penggunaan Kuota & Larangan Menampilkan Sisa Kuota**:
      - Menampilkan pemakaian kuota bulan berjalan (GB), nama paket, kecepatan (Mbps), dan histori pemakaian 7 hari terakhir.
      - **KEBIJAKAN MUTLAK SOP**: DILARANG KERAS menampilkan kata atau angka "Sisa Kuota" di seluruh antarmuka pelanggan (layanan bersifat unlimited).
    - **Menu Kelola WiFi Rumah (`/portal/wifi`)**:
      - Menu khusus bagi pelanggan terverifikasi untuk melihat nama WiFi sekarang, kata sandi sekarang, dan mengganti Nama WiFi (SSID) serta Kata Sandi WiFi baru (minimal 8 karakter).
      - Dilengkapi tutorial edukasi warga desa bahwa perangkat wajib tersambung ke WiFi rumah sendiri.
    - **Menu Profil Pelanggan (`/portal/profil`)**:
      - Terfokus murni pada identitas dan status langganan terverifikasi serta form ganti password mandiri.
    - **Desain Mobile-First & Sticky Bottom Navigation 5 Tab**:
      - Dilengkapi *sticky bottom navigation bar* 5 menu (`Beranda`, `Kendala`, `WiFi`, `Kuota`, `Profil`) dengan area sentuh ramah jempol (>= 44x44 px).

12. **Navigasi Admin NOC & Modul Manajemen Pelanggan**:
    - **Sidebar Tetap Kiri Desktop (`w-64`) & Off-Canvas Burger Drawer Mobile**:
      - Desktop: Sidebar permanen di sisi kiri dengan pengelompokan seksi: *NOC & Jaringan*, *Manajemen Pelanggan*, dan *Sistem & Audit*.
      - Mobile: Header ringkas dengan tombol burger (ikon SVG 3 garis) yang membuka slide-over drawer dari kiri dengan backdrop blur gelap.
    - **Modul Manajemen Pelanggan Admin NOC**:
      - **Verifikasi Pendaftar Baru (`/admin/verifikasi-pelanggan`)**: Admin mencocokkan pendaftar mandiri (status `PENDING`) dengan data pelanggan database kantor, melihat titik lokasi GPS di Google Maps, dan menghubungkannya dengan aman.
      - **Tiket Keluhan Pelanggan (`/admin/tiket`)**: Daftar tiket keluhan yang dikirimkan warga desa melalui portal, dilengkapi filter status (*Semua, Menunggu, Diproses, Selesai*) dan modal update status + catatan teknisi.
      - **Pemantauan Pemakaian Kuota (`/admin/kuota`)**: Monitoring akumulasi GB yang telah digunakan pelanggan pada bulan berjalan.

---

## 7. Standar Agen AI & Manajemen Dokumen

1. **Sinkronisasi Dokumen Markdown**:
   - Setiap AI Agent **WAJIB** membaca dan memahami file markdown (`.md`) seperti `AGENTS.md`, `README.md`, `designsystempro.md`, `prd.md`, dan dokumen lainnya di proyek untuk menjaga konteks tetap konsisten antar sesi.
   - Jika ada perubahan arsitektur, fitur, atau aturan baru, agen **WAJIB** memperbarui dokumen `.md` ini agar saling terhubung dan selalu *up-to-date*.
2. **Kepatuhan Mutlak Design System Pro (`designsystempro.md`)**:
   - File [`designsystempro.md`](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/designsystempro.md) adalah **Sumber Kebenaran Tunggal (*Single Source of Truth* / SSOT)** untuk seluruh antarmuka, tata letak, komponen, dan interaktivitas UI/UX di proyek EdTeknoGuard (baik aplikasi admin NOC maupun portal pelanggan).
   - Setiap AI Agent **WAJIB SELALU MENGECEK DAN MEMATUHI** seluruh aturan di `designsystempro.md` sebelum dan saat merancang, membuat, memodifikasi, atau mereview UI/UX (termasuk spacing 8pt/4pt, color ratio 60-30-10, kontras WCAG 4.5:1, touch target minimal 44x44 px, button hierarchy, form patterns, modal/drawer, dan UX principles).
   - Prinsip dasar yang wajib dipegang: *"Terlihat rapi" ≠ "Terstruktur dengan benar."* Setiap angka padding/margin, warna, elevasi, dan komponen harus memiliki landasan aturan dari rulebook tersebut.
3. **Implementasi Mobile-First**:
   - Setiap kali pengguna menginstruksikan pendekatan **mobile first**, agen **WAJIB** mengacu pada `designsystempro.md` serta menggunakan MCP atau skill dari `appllama-skills` sebagai referensi dan alat bantu.
