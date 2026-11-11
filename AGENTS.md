# AGENTS.md — Pedoman Proyek & Konfigurasi Global EdTeknoGuard

Dokumen ini adalah acuan arsitektur dan pedoman sistem (*System Instruction / Rules*) bagi seluruh AI Agent yang mengelola, memelihara, dan mengembangkan repositori **EdTeknoGuard**.

---

## 1. Ringkasan & Tujuan Proyek

**EdTeknoGuard** adalah sistem pemantauan berkala (*automated periodic monitoring*) dan deteksi dini (*early warning system*) untuk perangkat modem **ONT (Optical Network Terminal)** seperti ZTE GM220-S & XPON yang digunakan oleh penyedia layanan internet (ISP).

### Tujuan Utama:
1. Mendeteksi penurunan daya terima optik (*Optical Rx Power dBm*) sebelum pelanggan mengalami *Loss of Signal* (LOS) atau gangguan koneksi.
2. Mengirimkan notifikasi darurat dan alert gangguan secara otomatis ke perangkat tim teknisi via **Notifikasi Native APK Android**.
3. Menyediakan antarmuka dashboard operasional NOC yang intuitif, mobile-first, dan modular.

---

## 2. Stack Teknologi

| Komponen | Teknologi |
| :--- | :--- |
| **Backend Framework** | Python 3.10+ / FastAPI |
| **Server ASGI** | Uvicorn |
| **Database** | MySQL Local via SQLAlchemy & PyMySQL |
| **Scheduler** | APScheduler (`BackgroundScheduler` daemon) |
| **Frontend SPA** | React 18 + Vite (Admin NOC & Portal Pelanggan TeknoCust) |
| **Styling** | Tailwind CSS (Mobile-First responsive) |
| **Ikon UI** | Lucide Icons / SVG Inline Murni |
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
   - Daftar kredensial disimpan pada tabel `system_settings` di database MySQL Local dengan key `default_modem_credentials` berupa JSON Array:
     ```json
     [
       {"username": "admin", "password": "tekno2024"},
       {"username": "admin", "password": "admin"},
       {"username": "tekno", "password": "tekno2025"}
     ]
     ```
2. **Alur Pengecekan Scraper (`ONTScraperService.scrape_ont`)**:
   - **Langkah 1 (Pelanggan Baru / Belum VALID / UNTESTED)**: Menjalankan mode *Exhaustive First Scan*. Sistem menguji kredensial tersimpan pelanggan terlebih dahulu, jika gagal atau terkena lockout delay (stay-connection), thread worker akan menunggu countdown selesai dan **wajib mencoba seluruh pasangan kredensial default dari Pengaturan Sistem sampai tuntas** dalam 1 siklus pemindaian pertama.
   - **Langkah 2 (Memori Kredensial Gagal `failed_credentials`)**: Setiap kredensial yang ditolak modem dicatat pada field `failed_credentials` (tabel `perangkat_ont`). Pada pemantauan berkala berikutnya, modem yang sudah VALID hanya mencoba 1 kredensial validnya (super cepat). Jika modem masih INVALID, scraper hanya akan menguji kredensial baru yang belum pernah dicoba sebelumnya.
   - **Langkah 3 (Sinkronisasi & Kredensial Baru)**: Jika salah satu kredensial berhasil login, status pelanggan otomatis menjadi `VALID`, `user_admin` & `pass_admin` diperbarui, dan `failed_credentials` di-reset bersih. Jika di menu Pengaturan admin menambahkan kredensial baru atau mencentang opsi sinkronisasi massal, riwayat failed otomatis di-reset agar modem menguji kredensial baru tersebut.
3. **Halaman Pengaturan (`/pengaturan` atau `/settings`)**:
   - Menggunakan layout **2 TAB**:
     - **Tab 1 (Parameter & Ambang Batas)**: Input manual menit interval, ambang batas -26.0 dBm (warning) dan -27.0 dBm (kritis). *Tanpa tombol preset opsi dan tanpa radio button status scheduler*.
     - **Tab 2 (Kredensial Modem ONT)**: Tabel repeater dinamis untuk menambah/menghapus pasangan username & password modem lebih dari 1 + opsi checkbox sinkronisasi massal ke pelanggan invalid yang tersimpan permanen di database (`system_settings`) per kantor cabang aktif.
     - *(Fitur Telegram telah dihapus bersih karena notifikasi darurat ditangani secara native melalui web wrapper APK Android Studio)*.

---

## 5. Arsitektur Struktur Direktori

```text
EdTeknoGuard/
├── app/
│   ├── core/                  # Konfigurasi aplikasi, env loader, security, db engine
│   │   ├── config.py
│   │   ├── database.py        # MasterBase & TenantBase declarative engine
│   │   ├── tenant_database.py # Multi-tenant MySQL manager & dynamic session routing
│   │   ├── timezone.py        # Zona waktu WIB terpusat
│   │   └── security.py        # Proteksi sesi admin NOC (30 hari sliding expiration)
│   ├── db/
│   │   ├── models.py          # SQLAlchemy models: MasterBase (Kantor, User, UserKantor, UserActivityLog)
│   │   │                      # & TenantBase (Pelanggan, PerangkatONT, LogPerformaONT, SystemSetting, dsb.)
│   │   └── init_db.py         # Skrip bootstrap inisialisasi tabel master & tenant (lokasi tunggal)
│   ├── middleware/            # Middleware sesi pengguna (SlidingSessionMiddleware)
│   ├── modules/               # Modular berbasis domain FastAPI
│   │   ├── auth/              # REST endpoint autentikasi admin NOC
│   │   ├── dashboard/         # Dashboard KPI & visualisasi
│   │   ├── customers/         # CRUD master pelanggan, live check, import Excel/CSV
│   │   ├── monitoring/        # Engine trigger full scan, single probe, status, & chart-data
│   │   ├── optical_logs/      # Histori time-series pembacaan redaman optik ONT
│   │   ├── tickets/           # Manajemen tiket kendala pelanggan NOC
│   │   ├── quota/             # Pemantauan akumulasi kuota bulanan pelanggan
│   │   ├── notifications/     # Real-time polling & penandaan notifikasi NOC
│   │   ├── settings/          # Pengaturan sistem: parameter interval, threshold redaman, & kredensial ONT
│   │   ├── mikrotik/          # Integrasi RouterOS MikroTik: test koneksi & sinkronisasi DHCP Leases
│   │   ├── users/             # Manajemen pengguna NOC & kantor cabang (Super Admin)
│   │   └── activity_logs/     # Audit trail histori aktivitas pengguna NOC
│   ├── portal/                # Sub-aplikasi backend Portal Pelanggan TeknoCust (/portal)
│   │   ├── main.py            # Bootstrap sub-app FastAPI portal
│   │   ├── core/              # Security, session token, & helper validasi wifi_check
│   │   ├── modules/           # Modul REST API: auth, dashboard, quota, tickets, wifi, profile, speedtest, payment
│   │   └── api_router.py      # Aggregator router portal (/portal/api)
│   ├── services/              # External service layer
│   │   ├── scraper/           # Scraper modular: credential_chain, optical_parser, zte, xpon
│   │   ├── scheduler/         # Scheduler modular: state_manager, recovery_manager, scan_runner
│   │   ├── ont_scraper_service.py   # Gateway HTTP Scraper ONT
│   │   ├── scheduler_service.py     # Gateway APScheduler Background Daemon
│   │   ├── mikrotik_service.py      # RouterOS API client & sinkronisasi otomatis
│   │   ├── connected_device_service.py # Scanner perangkat terhubung WiFi/LAN
│   │   └── snmp_service.py          # Engine SNMP polling
│   └── main.py                # FastAPI app bootstrap, middleware sesi, & static mount
├── database/                  # Migrasi skema & seeder basis data
│   ├── migrations/            # DDL SQL (001_init_schema.sql)
│   ├── seeders/               # Python database seeder (database_seeder.py)
│   └── schema.md              # Dokumentasi ERD & skema tabel
├── docs/                      # Dokumentasi sistem, panduan teknis, dan mockups
│   ├── architecture.md
│   ├── prd.md
│   ├── designsystempro.md
│   ├── design.md
│   ├── DEPLOY_VPS.md
│   ├── PROMPT_ANDROID_STUDIO.md # Master prompt & panduan arsitektur Android Studio (TeknoGuard & MyTekno)
│   └── mockups/
├── frontend/                  # Single Page Application React 18 (NOC & Portal Warga)
│   ├── src/
│   │   ├── components/        # Modular per Menu/Domain (Co-location: View + Subkomponen)
│   │   │   ├── dashboard/     # DashboardView, ControlBar, ChartSection, QuickShortcuts
│   │   │   ├── customers/     # CustomersView, CustomersTable, FilterBar, DetailModal, ImportWizard
│   │   │   ├── settings/      # SettingsView, ThresholdTab, CredentialsTab, NotificationsTab, ProfileTab
│   │   │   ├── tickets/       # TicketsView (Manajemen tiket gangguan NOC)
│   │   │   ├── quota/         # QuotaView (Monitoring kuota pelanggan)
│   │   │   ├── optical_logs/  # OpticalLogsView (Histori time-series redaman optik)
│   │   │   ├── notifications/ # NotificationsView (Notifikasi alert NOC)
│   │   │   ├── offices/       # OfficeManagementView & BranchOfficesView (Manajemen kantor cabang)
│   │   │   ├── users/         # UsersView (Manajemen pengguna & hak akses)
│   │   │   ├── activity_logs/ # ActivityLogsView (Audit trail aktivitas sistem)
│   │   │   ├── auth/          # LoginView (Autentikasi login admin NOC)
│   │   │   ├── layout/        # AppHeader & Navigation (Sidebar desktop & dock mobile)
│   │   │   ├── common/        # CommonUI, ToastNotification, ConfirmDialogModal, Modals, ErrorView
│   │   │   └── import_wizard/ # Step wizard upload, mapping, & preview import
│   │   ├── portal/            # Sub-aplikasi TeknoCust untuk warga pelanggan mandiri
│   │   │   ├── components/    # Modular per Domain Portal Warga (Co-location)
│   │   │   │   ├── dashboard/ # Tab Beranda (PortalDashboardTab)
│   │   │   │   ├── payment/   # Tab Bayar Tagihan (PortalPaymentTab)
│   │   │   │   ├── tickets/   # Tab Tiket Kendala (PortalTicketsTab)
│   │   │   │   ├── quota/     # Tab Kuota (PortalQuotaTab)
│   │   │   │   ├── wifi/      # Tab Kelola WiFi (PortalWifiTab)
│   │   │   │   ├── profile/   # Tab Profil (PortalProfileTab)
│   │   │   │   ├── notifications/ # Tab Notifikasi (PortalNotificationsPage)
│   │   │   │   ├── auth/      # Login & Reset Password (PortalAuthView, PortalResetPasswordView)
│   │   │   │   ├── layout/    # PortalHeader & PortalNavigation (BottomNav)
│   │   │   │   ├── modals/    # ConnectedDevicesModal & SpeedTestModal
│   │   │   │   └── common/    # PortalActiveMascot, PortalSemanticSkeleton, PortalToastNotification, PortalErrorView
│   │   │   ├── services/      # REST API client portal (portalApi.js)
│   │   │   ├── utils/         # Helper notifikasi (notificationUtils.js)
│   │   │   └── PortalCustomerApp.jsx # Shell utama portal warga
│   │   ├── services/          # HTTP API client layer terpusat (api.js & portalApi.js)
│   │   ├── App.jsx            # Shell aplikasi utama NOC & navigasi tab
│   │   └── main.jsx
│   └── package.json
├── routes/                    # Gerbang rute aplikasi
│   ├── api.py                 # Pendaftaran router modul admin NOC
│   └── portal.py              # Pendaftaran mount portal pelanggan
├── tests/                     # Automated unit & integration tests (pytest)
├── AGENTS.md                  # Pedoman arsitektur agen AI (dokumen ini)
├── CHANGELOG.md               # Catatan riwayat perubahan & perlindungan fitur sistem
├── README.md
├── requirements.txt           # Dependensi produksi
├── requirements-dev.txt       # Dependensi development & testing (pytest)
├── pytest.ini                 # Konfigurasi pythonpath & asyncio pytest
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
   - Secret key dan kredensial database MySQL **WAJIB** berada di file `.env`.
3. **Pop-up Konfirmasi & Penghapusan Berjenjang (CASCADE Deletion) & Normalisasi Data**:
   - **Normalisasi Tunggal Master Pelanggan**: Entitas akun portal telah digabung langsung ke dalam tabel master `pelanggan` (`password_hash`, `lokasi_gps`, `status_verifikasi`, `last_login`), mengeliminasi tabel redundan `akun_pelanggan`.
   - **Database CASCADE Wajib**: Seluruh 4 tabel anakan pelanggan (`log_performa_ont`, `alert_logs`, `tiket_kendala`, `kuota_pelanggan`) **WAJIB** memiliki constraint ForeignKey dengan `ON DELETE CASCADE` di database dan `cascade="all, delete-orphan", passive_deletes=True` pada model SQLAlchemy.
   - **Peringatan Penghapusan Data Utama**: Modal pop-up konfirmasi hapus data pelanggan (baik tunggal maupun massal) **WAJIB** menampilkan kotak peringatan bahaya yang merinci secara eksplisit bahwa menghapus data utama pelanggan akan menghapus permanen seluruh data anakannya yang terkait dari database.
   - **Pembersihan Bersih Tanpa Orphan**: Aksi hapus data utama pelanggan langsung mengeksekusi penghapusan berjenjang fisik (hard delete CASCADE) sehingga tidak ada data yatim (*orphaned records*) yang tersisa di sistem.
   - Sistem memiliki mekanisme debounce menit (default 30 menit) untuk mencegah pencatatan alert berulang ke teknisi jika modem masih dalam status gangguan yang sama.
5. **Standar Ikon UI Wajib SVG Inline Bersih & Larangan Dot Indikator Kosong**:
   - Seluruh ikon antarmuka (tombol, badge, header modal, indikator status, sorting, dan aksi tabel) **WAJIB** menggunakan standar SVG inline bersih / Lucide icons dengan atribut stroke/fill yang konsisten.
   - **DILARANG KERAS** menggunakan emoji (seperti 🏢, ⚡, 🔄, ⏭️, ⚙️, 🚨, 📁, dsb.) di seluruh antarmuka web (UI). Seluruh indikator wilayah, kantor, tombol, badge, dan modal **WAJIB** menggunakan ikon SVG murni / Lucide icons (contoh: `<Building2 />` untuk kantor/gedung).
   - **DILARANG KERAS** menggunakan dot indikator buatan elemen HTML kosong seperti:
     `<span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>` atau variasi `<span class="... rounded-full bg-*-500 ..."></span>`.
     Setiap penanda status (seperti Terverifikasi, Aktif, Terisolir, Normal, Warning, Kritis) **WAJIB** menggunakan ikon SVG semantik yang jelas (misalnya `<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />`, `<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />`, `<AlertTriangle />`, `<XCircle />`) yang dibungkus dalam badge teks yang rapi dan mudah dipahami, bukan sekadar bulatan dot warna polos tanpa bentuk.
6. **Toggle Pemantauan ON/OFF Pelanggan (`is_monitored`)**:
   - Modem dengan `is_monitored = False` otomatis dilewati (*skipped*) oleh background scheduler pemindaian berkala dan dibungkam dari pencatatan/pengiriman alert.
   - Kartu statistik KPI di `/pelanggan` dan Dashboard mengecualikan modem nonaktif, menampilkan badge `(X OFF)` pada Total Terpantau.
7. **Filter Rentang Tanggal & Real-Time Auto-Refresh**:
   - Filter tanggal terpadu (`Semua Tanggal`, `Hari Ini`, `7 Hari Terakhir`, `30 Hari Terakhir`, `Kustom Tanggal` dengan picker rentang `s/d`) diterapkan pada `/logs` dan `/pelanggan`.
   - Polling latar belakang otomatis (8-10 detik) memutakhirkan DOM secara *silent* dengan proteksi pause saat modal/kalender sedang dibuka.
8. **Sistem 3 Role & Multi-Kantor Cabang**:
   - **Tiga Role Pengguna**:
     - `super admin`: Akses penuh 3 kantor, satu-satunya role yang diizinkan mengakses menu Manajemen Pengguna (`/users`), serta memiliki akses penuh ke Pengaturan Sistem (`/settings`).
     - `admin`: Mengelola operasional teknis (CRUD pelanggan, monitoring, import) terbatas pada kantor cabang yang diizinkan (`allowed_kantor`), serta dapat mengakses dan mengubah Pengaturan Sistem (`/settings` - Parameter & Ambang Batas dan Kredensial Modem ONT). Tidak dapat mengakses menu Manajemen Pengguna (`/users`).
     - `teknisi`: Menggantikan peran `karyawan` sebelumnya, fokus pada pemantauan real-time status redaman ONT & probe on-demand terbatas pada kantor yang diizinkan. Dibatasi dari aksi manipulasi/penghapusan data pelanggan serta dibatasi dari menu Pengaturan Sistem dan Manajemen Pengguna.
   - **Tiga Wilayah Kantor**: `cabang` (Kantor Cabang), `pusat` (Kantor Pusat), dan `banyumas` (Kantor Banyumas).
   - **Office Switcher**: Dropdown interaktif di navbar atas untuk Super Admin dan user multi-kantor untuk berpindah kantor aktif (`cabang`, `pusat`, `banyumas`). Opsi "Semua Kantor" telah ditiadakan agar pemantauan, scanning, dan pelaporan selalu fokus dan terisolasi per kantor yang dipilih secara spesifik.
   - **Notifikasi Darurat & Alert Log**: Setiap alert redaman drop, status kritis/LOS, dan batch alert wajib memuat identitas wilayah kantor pelanggan (misal: `Kantor: CABANG`).
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
      - Status scheduler (`RUNNING`/`STOPPED`) dan interval tersimpan permanen di tabel `system_settings` database MySQL.
      - Saat server reboot / restart / hidup kembali setelah mati listrik atau putus jaringan, sistem otomatis memulihkan status scheduler ke `RUNNING` tanpa intervensi manual.
      - Jika waktu mati server telah melampaui interval pemantauan reguler, sistem otomatis menjadwalkan *Catch-Up Scan* (5 detik setelah startup) dan mencatat entri audit log `STARTUP_RECOVERY`.
      - API `/api/monitoring/status` menyediakan parameter `next_run_time` untuk kepastian visibilitas jadwal pemindaian berikutnya di antarmuka web.

11. **Portal Pelanggan Mandiri (Self-Service Mobile Web App di `/portal`)**:
    - **Arsitektur Satu Proyek & Satu Server**:
      - Terintegrasi di dalam repositori pada folder `app/portal/` dan di-mount langsung pada aplikasi utama di endpoint `/portal` (dapat juga dijalankan mandiri di port terpisah jika diinginkan).
      - Menggunakan basis data terpadu (MySQL Local) langsung pada tabel master `pelanggan` serta tabel anak `tiket_kendala` dan `kuota_pelanggan`.
    - **Pemberian Akun & Kredensial Langsung oleh Petugas (Bebas Pendaftaran Mandiri)**:
      - Alur pendaftaran mandiri warga desa ditiadakan demi kemudahan warga dan kepastian otentikasi data ISP.
      - Akun pelanggan dibuat langsung oleh kantor ISP saat pemasangan modem dengan kata sandi awal `123456`.
      - Rute `/portal/daftar` otomatis mengalihkan pengguna ke `/portal/login`.
    - **Autentikasi & Sesi Pelanggan (`/portal/login` & TeknoCust)**:
      - Seluruh akun pelanggan masuk menggunakan **Nomor WhatsApp Terdaftar** (sebagai data identitas unik pelanggan) dengan kata sandi awal: `123456`.
      - Sistem backend mengimplementasikan normalisasi digit nomor WA fleksibel (mendukung format `08...`, `628...`, `+628...`, maupun digit lokal) dengan fallback ke ID Pelanggan/Nama jika diperlukan.
      - Antarmuka ramah warga menggunakan bahasa Indonesia bersih, dilengkapi icon SVG Phone murni, toggle lihat kata sandi (ikon SVG mata terbuka/tertutup), dan tautan *"Lupa Kata Sandi?"*.
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
    - **Tagihan & Pembayaran Virtual Account (`/portal/pembayaran`)**:
      - Sumber data tunggal: **Network Bill API v1** ([api-v1.md](api-v1.md)), dibaca **live** tiap halaman dibuka. DILARANG KERAS menyalin tagihan atau nomor VA ke database lokal lalu menampilkannya dari salinan: pelanggan yang baru membayar di kasir akan tetap melihat "belum bayar".
      - **Portal tidak berada di jalur uang**: pelanggan membayar ke bank, Faspay meneruskan ke Network Bill, Network Bill melunasi tagihan. Portal hanya menampilkan nomor dan nominal lalu membaca ulang hasilnya. Portal DILARANG memanggil Faspay, dan tidak ada webhook masuk ke portal.
      - **Identitas pelanggan = slug PoP (kolom `kantor`) + `id` numerik (kolom `id_pelanggan`)**. Kode pelanggan (`PLG-0012` / `BMS-0001`) DILARANG dipakai sebagai kunci API: kode bisa berulang antar-PoP, bisa berganti, dan angkanya tidak selalu sama dengan `id`.
      - **Satu bayar, satu tagihan, selalu yang tertua**. Tidak ada cicilan dan pelanggan DILARANG diberi pilihan tagihan mana yang dibayar atau input nominal bebas.
      - **Nominal tertutup**: `amount_to_pay` ditampilkan apa adanya dari API dan DILARANG dihitung ulang di portal. Nomor VA wajib tersalin sebagai 16 digit bersih walau tampilannya dikelompokkan 4-4-4-4.
      - **Empat keadaan wajib dibedakan**: `not_linked` (belum tertaut), `inactive` (HTTP 404, VA belum aktif di PoP, bayar lewat petugas), `not_issued` (`channels: []`, nomor VA belum diterbitkan admin), dan `no_bill` (`next_bill: null`).
      - **Sesudah bayar**: baca ulang tiap 10 detik maksimal 2 menit lalu BERHENTI total, berhenti juga saat HTTP 429 (batas 120 request per menit berlaku untuk SELURUH portal). Belum lunas sesudah 2 menit WAJIB disebut *sedang diproses*, DILARANG disebut gagal; ajakan menghubungi petugas baru muncul sesudah 15 menit.
      - **Lunas bukan berarti internet menyala**: selama `router_isolated` pada `/connections/status` masih `true`, tampilkan bahwa koneksi menunggu dibuka petugas. Sistem ini hanya membaca status tersebut; isolir dikerjakan di aplikasi Network Bill.
      - **QRIS belum tersedia** dan DILARANG ditampilkan (termasuk sebagai placeholder) sampai endpoint resminya terbit.
    - **Menu Kelola WiFi Rumah (`/portal/wifi`)**:
      - Menu khusus bagi pelanggan terverifikasi untuk melihat nama WiFi sekarang, kata sandi sekarang, dan mengganti Nama WiFi (SSID) serta Kata Sandi WiFi baru (minimal 8 karakter).
      - Dilengkapi tutorial edukasi warga desa bahwa perangkat wajib tersambung ke WiFi rumah sendiri.
    - **Menu Profil Pelanggan (`/portal/profil`)**:
      - Terfokus murni pada identitas dan status langganan terverifikasi serta form ganti password mandiri.
    - **Desain Mobile-First & Sticky Bottom Navigation 5 Tab**:
      - Dilengkapi *sticky bottom navigation bar* 5 menu (`Kendala`, `Bayar`, `Beranda`, `Kuota`, `Profil`) dengan area sentuh ramah jempol (>= 44x44 px). Menu WiFi terintegrasi langsung di dalam halaman Profil.

12. **Navigasi Admin NOC & Modul Manajemen Pelanggan**:
    - **Sidebar Tetap Kiri Desktop (`w-64`) & Off-Canvas Burger Drawer Mobile**:
      - Desktop: Sidebar permanen di sisi kiri dengan pengelompokan seksi: *NOC & Jaringan*, *Manajemen Pelanggan*, dan *Sistem & Audit*.
      - Mobile: Tampilan mobile murni menggunakan Sticky Bottom Navigation 5-Tab tanpa drawer samping (off-canvas burger menu telah ditiadakan).
    - **Modul Manajemen Pelanggan Admin NOC**:
      - **Data Pelanggan & Kredensial Portal (`/pelanggan`)**: Pengelolaan data master pelanggan terpadu yang memuat profil jaringan (IP, POP, redaman) dan kredensial akses portal warga desa.
      - **Tiket Keluhan Pelanggan (`/admin/tiket`)**: Daftar tiket keluhan warga desa dengan 4 status terpadu (`MENUNGGU`, `DICEK_ADMIN` / Diproses Cek Admin, `DIPROSES` / Teknisi Cek Lapangan, `SELESAI`), kapabilitas tabel audit log: filter status, filter jenis kendala, filter rentang tanggal (Hari Ini, 7 Hari, 30 Hari, Kustom s/d), live search dengan debounce, header kolom sortable (ID, Waktu, Pelanggan, Kendala, Redaman, Status), pagination bar (10, 25, 50, 100), dan modal kelola status tiket responsif.
      - **Pemantauan Pemakaian Kuota (`/admin/kuota`)**: Monitoring akumulasi GB yang telah digunakan pelanggan pada bulan berjalan dengan kapabilitas tabel audit log: kartu KPI ringkas dinamis (Total Pelanggan, Total GB, Rata-rata GB/user), filter paket, filter level pemakaian (sangat tinggi >150GB, tinggi 100-150GB, sedang 50-100GB, ringan <50GB, nol 0GB), live search, header kolom sortable numerik, dan pagination bar lengkap.
      - **Penyelarasan Data Detail ke Tabel Pelanggan**: Titik koordinat GPS dengan link Google Maps, kredensial WiFi (SSID & Password dengan toggle lihat/sembunyikan), serta metrik pembacaan redaman terakhir, suhu ONT (°C), dan latency (ms) terintegrasi langsung pada tabel master `/pelanggan`.

13. **Navigasi Mobile 5-Tab Ergonomis (Center Beranda & Pengaturan), Action Cards Paling Atas, Font Besar & Notifikasi Anti-Spam**:
    - **Branding Resmi Proyek**:
      - Web Karyawan & NOC: **TeknoGuard**.
      - Web Pelanggan Warga: **TeknoCust**.
    - **Sticky Bottom Navigation 5 Tab (Mobile Viewport `lg:hidden`)**:
      - Menyajikan 5 tab utama di layar mobile dengan tipografi besar & tebal (`text-[13px] sm:text-sm font-extrabold tracking-tight`):
        1. `Pelanggan` (`/pelanggan`)
        2. `Redaman` (`/logs`)
        3. `Beranda` (`/`) — **Posisi Tengah** dengan tombol menonjol (*elevated center button / ring glow active*)
        4. `Tiket` (`/admin/tiket`) dengan badge counter unread realtime
        5. `Pengaturan` (`/settings`)
      - Tombol memiliki target sentuh minimal `>= 52px` dengan ikon `w-6 h-6 sm:w-7 sm:h-7`.
    - **Layanan & Akses Cepat di Beranda (Action Cards Grid) Paling Atas**:
      - Diposisikan di puncak halaman Dashboard Utama (`/`) di atas Control Bar.
      - Skala kartu & box diperbesar (`h-14 w-14 sm:h-16 sm:w-16`, ikon `w-7 h-7`), tipografi judul diperbesar ke `text-sm sm:text-base font-extrabold text-slate-800`.
    - **Notifikasi In-App Real-Time Tiket Baru Anti-Spam (Floating Overlay Layer)**:
      - Polling berkala (6 detik) ke endpoint `/api/notifications/poll`.
      - **Floating Fixed Overlay**: Banner notifikasi melayang di atas semua layer (`fixed top-4 right-4 z-[999]`) tanpa pernah menggeser atau mendorong konten UI halaman ke bawah.
      - **Anti-Spam State**: Menyimpan riwayat tiket di `sessionStorage` (`tekno_last_alerted_ticket`) dan proteksi initial load agar tidak memutar suara/getaran spam saat halaman dibuka atau di-refresh. Nada audio (Web Audio API) dan getaran (`navigator.vibrate`) hanya aktif saat tiket baru benar-benar masuk.
    - **Tipografi Sidebar Menu Desktop**:
      - Seluruh menu di sidebar desktop menggunakan `text-sm sm:text-base font-extrabold` dengan ikon `w-5 h-5` dan padding `py-3 px-3.5` agar mudah dibaca.

## 7. Standar Agen AI & Manajemen Dokumen

1. **Sinkronisasi Dokumen Markdown**:
   - Setiap AI Agent **WAJIB** membaca dan memahami file markdown (`.md`) seperti `AGENTS.md`, `CHANGELOG.md`, `README.md`, `designsystempro.md`, `prd.md`, dan dokumen lainnya di proyek untuk menjaga konteks tetap konsisten antar sesi.
   - Jika ada perubahan arsitektur, fitur, atau aturan baru, agen **WAJIB** memperbarui dokumen `.md` ini agar saling terhubung dan selalu *up-to-date*.
2. **Kepatuhan Mutlak Design System Pro (`designsystempro.md`)**:
   - File [`designsystempro.md`](docs/designsystempro.md) adalah **Sumber Kebenaran Tunggal (*Single Source of Truth* / SSOT)** untuk seluruh antarmuka, tata letak, komponen, dan interaktivitas UI/UX di proyek EdTeknoGuard (baik aplikasi admin NOC maupun portal pelanggan).
   - Setiap AI Agent **WAJIB SELALU MENGECEK DAN MEMATUHI** seluruh aturan di `designsystempro.md` sebelum dan saat merancang, membuat, memodifikasi, atau mereview UI/UX (termasuk spacing 8pt/4pt, color ratio 60-30-10, kontras WCAG 4.5:1, touch target minimal 44x44 px, button hierarchy, form patterns, modal/drawer, dan UX principles).
   - Prinsip dasar yang wajib dipegang: *"Terlihat rapi" ≠ "Terstruktur dengan benar."* Setiap angka padding/margin, warna, elevasi, dan komponen harus memiliki landasan aturan dari rulebook tersebut.
3. **Implementasi Mobile-First**:
   - Setiap kali pengguna menginstruksikan pendekatan **mobile first**, agen **WAJIB** mengacu pada `designsystempro.md` serta menggunakan MCP atau skill dari `appllama-skills` sebagai referensi dan alat bantu.
4. **Kewajiban Pencatatan & Perlindungan Fitur di CHANGELOG.md**:
   - File [`CHANGELOG.md`](CHANGELOG.md) adalah acuan riwayat perubahan sistem yang berfungsi sebagai **benteng pencegahan regresi (*regression shield*)**.
   - **Perlindungan Fitur Existing**: Sebelum menambahkan atau memodifikasi kode, AI Agent **WAJIB** meninjau `CHANGELOG.md` untuk memahami fitur apa saja yang sudah berjalan stabil. DILARANG KERAS merusak, menimpa (*overwrite*), atau menghilangkan fitur lama tanpa instruksi eksplisit dari pengguna.
   - **Pencatatan Wajib**: Setiap kali selesai melakukan perbaikan bug, penambahan fitur, perubahan fungsi, atau pembaruan konfigurasi, AI Agent **WAJIB** mencatat perubahan tersebut di `CHANGELOG.md` pada seksi `[Unreleased]` atau versi terkait menggunakan kategori baku (`Added`, `Changed`, `Fixed`, `Removed`, `Security`).
5. **Kewajiban Paritas Fitur & Adaptasi Desain UI Mobile vs Desktop (Prinsip Non-Negosiasi)**:
   - Setiap kali menambahkan fitur baru, memodifikasi alur, atau menghapus fitur, AI Agent **WAJIB** mengevaluasi dan menerapkannya secara konsisten pada **KEDUA tampilan (Mobile dan Desktop)**.
   - **Paritas Fungsional Penuh**: Seluruh kapabilitas fitur (seperti filter pencarian, pusat notifikasi/aduan, modal dialog, pagination, dan manipulasi data) **HARUS** tersedia dan dapat diakses dengan mudah baik di perangkat seluler/mobile maupun komputer desktop.
   - **Adaptasi Ergonomi Sesuai Viewport (Bukan Menjiplak Mentah-Mentah)**:
     - *Desktop*: Menggunakan popover dropdown anchored langsung di bawah tombol pemicu, tabel baris lebar, sidebar kiri permanen, dan inline grid filters.
     - *Mobile*: Komponen harus diadaptasi secara ergonomis agar nyaman digunakan satu tangan (misal: slide-up bottom sheet drawer untuk filter, popover dengan posisi aman `fixed inset-x-3` agar tidak terpotong keluar layar / *no viewport clipping*, tabel dengan scroll horizontal halus `overflow-x-auto`, dan area sentuh minimal 44x44 px).
   - **Dilarang Keras**: Mengubah atau menambahkan fitur hanya pada satu viewport (misalnya hanya merombak desktop lalu membiarkan mobile rusak, terpotong/clipping, atau tanpa filter yang setara).
6. **Standar Penulisan, Copywriting & Konsistensi Terminologi (Anti-Slop & Human Clarity)**:
   - **Keseragaman Terminologi Baku**:
     - Kredensial Keamanan Akun/WiFi **WAJIB** memakai istilah **`Kata Sandi`** (`Kata Sandi Baru`, `Kata Sandi WiFi`, `Ulangi Kata Sandi`). Dilarang mencampuradukkan dengan kata `Password`.
     - Manajemen Akun Admin/Teknisi **WAJIB** memakai istilah **`Manajemen Pengguna`** (label pintasan mobile: **`Pengguna`**). Dilarang memakai `Manajemen User` atau `Karyawan`.
     - Modul Pelaporan Warga **WAJIB** memakai istilah **`Laporan Kendala`** dan **`Tiket Kendala`**.
     - Layanan Internet Warga **WAJIB** memakai istilah **`Akses Bebas Kuota (Unlimited)`**. **DILARANG KERAS** menampilkan kata atau angka *"Sisa Kuota"*.
   - **Larangan Tanda Em Dash (`—`)**: Seluruh tag `<title>` dan header halaman dilarang menggunakan karakter em dash (`—`). Gunakan tanda titik dua (`:`) atau koma (`,`) dengan format: `Nama Halaman: Nama Aplikasi`.
   - **Keterbacaan Manusia & Kalimat Aktif**: Kalimat petunjuk operasional, panduan jaringan, dan deskripsi sistem wajib disusun ringkas, aktif, dan langsung pada poin tanpa istilah berbelit.

7. **Standar Transisi State & Navigasi: Larangan Full-Page Spinner & Kewajiban Semantik Skeleton Loading (Global)**:
   - **Kebijakan Wajib Mutlak**: DILARANG KERAS menggunakan spinner lingkaran kosong di tengah layar (RefreshCw animate-spin full-screen / blocking screen spinner) saat inisialisasi awal, perpindahan tab, atau navigasi halaman, baik di Dashboard NOC TeknoGuard maupun Portal Pelanggan TeknoCust.
   - **Kewajiban Skeleton Semantik (Layout Preservation)**:
     - Seluruh status pemuatan data (*loading state*) saat pertama kali membuka halaman atau berpindah tab **WAJIB** menggunakan **Skeleton Loading Semantik** (nimate-pulse bg-slate-200/70 atau g-gray-200/80 rounded-...).
     - Struktur skeleton **HARUS** mencerminkan tata letak asli halaman yang sedang dimuat (misal: bentuk kartu profil, bar kuota, deretan daftar tiket, atau tabel baris riwayat data) guna mengeliminasi lonjakan tata letak visual (*Cumulative Layout Shift / CLS*).
   - **Shell Tetap Utuh (Persistent Shell)**:
     - Saat berpindah tab, header/top bar dan bottom navigation bar **HARUS TETAP UTUH DI POSISINYA (PERSISTENT)**, hanya area konten utama (*content area*) yang menampilkan blok skeleton shimmer sebelum data siap.
   - **Silent Background Refresh on Stale Data**:
     - Jika halaman/tab sudah pernah dimuat sebelumnya dan memiliki data cache/state lokal, perpindahan kembali ke tab tersebut dilarang memunculkan skeleton ulang dari nol. Tampilkan data yang ada terlebih dahulu, lalu lakukan sinkronisasi data terbaru di latar belakang (*silent background fetch*) dengan indikator pembaruan non-intrusif.

8. **Arsitektur Database Multi-Tenant & Script Inisialisasi (init_db)**:
   - **Database Master (edteknoguard) HANYA memuat 4 Tabel Master**:
     - kantors (Master daftar kantor cabang/wilayah)
     - users (Master akun pengguna NOC & Teknisi)
     - user_kantors (Relasi penugasan user ke kantor yang diizinkan)
     - user_activity_logs (Audit trail global aktivitas pengguna NOC)
   - **Database Tenant Per-Kantor (edtekno_{kode_kantor})**:
     - Memuat 12 tabel operasional terisolasi per kantor: pelanggan, perangkat_ont, log_performa_ont, lert_logs, 	iket_kendala, kuota_pelanggan, pakets, system_settings, modem_credentials, user_notification_reads, perangkat_terhubung, dan kantors (referensi lokal).
   - **Aturan Eksekusi Inisialisasi (python -m app.db.init_db)**:
     - DILARANG KERAS mengeksekusi Base.metadata.create_all(bind=engine) tanpa filter tabel master di database master.
     - Script inisialisasi wajib membatasi pembuatan tabel master hanya pada 4 tabel tersebut dan mendelegasikan pembuatan tabel operasional ke masing-masing database tenant via TenantDatabaseManager.init_tenant_schema.


9. **Standar Pengujian Otomatis & Relevansi Test terhadap Data Baru (Test Relevancy & Freshness Protocol)**:
   - **Kewajiban Sinkronisasi Test**: Setiap kali terjadi penambahan fitur baru, perombakan modul/arsitektur, atau pembaruan skema data, seluruh berkas pengujian otomatis di direktori 	ests/ **WAJIB** diperbarui dan diselaraskan agar tetap relevan, akurat, dan mencerminkan logika bisnis nyata terkini.
   - **Larangan Test Usang & Mock Dummy Asal Hijau**: DILARANG KERAS mempertahankan pengujian yang sudah usang (*obsolete*), pengujian dengan data/struktur lama yang sudah tidak dipakai, atau sekadar membuat tes 'asal hijau/pass' menggunakan mock kosong yang tidak menguji alur kerja nyata.
   - **Cakupan Pengujian Komprehensif**: Suite pengujian 	ests/ wajib mencakup:
     1. Integritas model MasterBase dan TenantBase beserta aturan non-cross-database foreign key di [app/db/models.py](app/db/models.py).
     2. Modul domain admin baru: tiket ([app/modules/tickets](app/modules/tickets)), kuota ([app/modules/quota](app/modules/quota)), notifikasi ([app/modules/notifications](app/modules/notifications)), dan log optik ([app/modules/optical_logs](app/modules/optical_logs)).
     3. Router aggregator REST API portal pelanggan ([app/portal/api_router.py](app/portal/api_router.py)) yang mendaftarkan endpoint 8 domain modular ([app/portal/modules](app/portal/modules): auth, dashboard, quota, tickets, wifi, profile, speedtest, payment).
     4. Logika validasi bisnis krusial (ambang batas redaman optik SOP -26.0 dBm warning dan -27.0 dBm kritis, keamanan strict IP check WiFi rumah, dan cascade deletion).


---

## 8. Discovery & Input Evaluation Protocol (Anti-Assumption)

Seluruh AI Agent yang bekerja pada repositori ini **WAJIB MEMATUHI PROTOKOL ANTI-ASUMSI** berikut sebelum merancang, memodifikasi kode, atau mengeksekusi instruksi:

1. **Evaluasi Prompt:** Cek apakah permintaan pengguna singkat, ambigu, umum, atau kurang spesifik (contoh: *"buatkan tampilan kasir cafe"*).
2. **Dilarang Langsung Eksekusi:** Jangan pernah menebak-nebak asumsi sendiri atau langsung membuat kode/desain dari prompt yang belum jelas konteksnya.
3. **Wajib Riset Rujukan Nyata & Bedah Alur Lengkap (End-to-End Workflow Mapping):**
   - Rujuk standar industri produk nyata (contoh: *Square/Toast untuk kasir, Linear/Stripe untuk SaaS dashboard, Shopify untuk toko online*).
   - Bedah tahapan alur operasional end-to-end secara komprehensif dari awal interaksi hingga transaksi/proses selesai.
   - Buat **pemetaan zonasi layar (*screen zone mapping*)** yang jelas sebelum eksekusi visual atau kode.
4. **Antisipasi Celah & Future-Proof Layout:**
   - Wajib menganalisa potensi celah operasional atau kebutuhan masa depan yang relevan dengan domain aplikasi yang sedang dibangun (misal: metadata tambahan, aksi sekunder, filter lanjutan, status transisi).
   - Pastikan wadah dan tata letak memiliki fleksibilitas ruang (*slot-based elasticity*) sehingga penambahan fitur baru di masa depan tidak merusak atau membongkar layout dasar.
5. **Larangan Elemen Dekoratif Khas AI (Anti-AI Clichés):**
   - Dilarang keras menggunakan bullet dekoratif (`●`, `■`), badge hiasan tanpa fungsi interaksi, atau emoji keyboard berlebihan di setiap baris teks. Gunakan kontras warna yang natural, teks lugas, dan tipografi hierarkis.
6. **Sistem 1 Warna Monokromatik & Shade Ramp (Anti-Rainbow Slop):**
   - Dilarang keras mewarnai kartu atau tombol dengan warna-warni pelangi pastel yang berbeda-beda (kuning, pink, mint, ungu dalam satu layar) — ini adalah ciri khas AI slop paling kentara.
   - Wajib memilih **HANYA 1 warna identitas utama (Hue)** dengan netral (slate/zinc) sebagai fondasi, lalu turunkan menjadi **skala shade ramp** (50 tint s/d 900 shade) untuk seluruh komponen. Semua kartu produk wajib memiliki warna permukaan yang seragam dan konsisten.
7. **Larangan Pembungkusan Kotak Berlebihan (Anti Box-in-Box):**
   - Dilarang membungkus setiap teks status/keterangan dengan border pill bertingkat di dalam kartu yang sudah memiliki border. Biarkan teks bernapas dengan tipografi bersih (*Let Content Be the Interface*).
8. **Konsistensi Kapitalisasi Teks (Strict Text Casing):**
   - Wajib konsisten dalam penggunaan huruf kapital/kecil pada elemen selevel. Dilarang mencampuradukkan gaya (contoh: satu Title case `Tersedia` tetapi lainnya ALL CAPS `HABIS TERJUAL`). Gunakan format konsisten (Sentence case / Title case) di seluruh keterangan status.
9. **Isolasi Warna Semantik Khusus Status/Notifikasi:**
   - Warna kromatik (hijau, merah, amber) DILARANG dijadikan pewarna bodi kartu atau background komponen utama. Warna-warna ini HANYA boleh digunakan secara hemat untuk status fungsional, badge notifikasi, atau toast (hijau = sukses/berhasil, merah = gagal/error/habis, kuning/amber = peringatan).
10. **Struktur Direktori Baku FigCraft:**
   - Direktori utama: `C:\Users\agil\Documents\FigCraft\`.
   - File `.figcraft` WAJIB berada di luar (root) direktori tersebut dan DILARANG dimasukkan ke dalam subfolder.
   - Berkas pendukung WAJIB dikelompokkan rapi ke dalam subfolder: `renders/` untuk hasil render grafis (`.png`), dan `scripts/` untuk generator/skrip (`.js`, `.json`).
11. **Prinsip 1 Proyek = 1 Canvas Tunggal (Single .figcraft File):**
   - Seluruh layar ekosistem, perbaikan, dan pembaruan fitur WAJIB dikerjakan di dalam **1 FILE `.figcraft` TUNGGAL** pada kanvas yang sama.
   - Dilarang keras membuat banyak file `.figcraft` baru yang terfragmentasi (seperti versi v1, v2, v3, atau memecah fitur ke file berbeda).
12. **Live Visual Canvas & Cursor Interaction (Figma CLI Experience):**
   - Setiap ada permintaan desain visual, aplikasi desktop FigCraft WAJIB dibuka langsung di layar pengguna dengan file kanvas aktif.
   - Eksekusi desain wajib menampilkan interaktivitas visual bertahap (pergerakan pointer/seleksi node layaknya Figma CLI), sehingga pengguna dapat menyaksikan proses pembentukan dan pengubahan elemen secara langsung di kanvas desktop.
13. **Hierarki Penataan Kanvas Figma Berdasarkan Prosedur & Perangkat (Sequential Procedural Flow):**
   - Desain antarmuka di kanvas Figma WAJIB diorganisir berurutan mengikuti **alur prosedur operasional nyata (User Journey)** per perangkat dari kiri ke kanan.
   - Dilarang menempatkan modal/state pendukung secara acak atau terlempar di baris terpisah tanpa konteks alur.
   - Susunan baku baris (Row-based Storyboard):
     - **Jalur Utama 1 (Row 1)**: Layar Tablet / Desktop (Input -> Tahan Pesanan/State Transisi -> Verifikasi/Guard Pembayaran -> Transaksi Sukses & Struk Fisik).
     - **Jalur Utama 2 (Row 2)**: Layar Mobile tepat di bawah jalur tablet dengan urutan tahapan yang identik.
     - **Jalur Pengelola (Row 3)**: Layar Admin / Back-Office (Laporan Omzet/Analitik & Pengelolaan Produk/Stok).
   - **Pemisahan Konfirmasi & Struk (Payment Guard)**: Aksi penyelesaian transaksi dan cetak struk WAJIB dipisah; harus ada tahap verifikasi pembayaran (tunai/QRIS) serta tombol pembatalan sebelum transaksi final dan cetak struk dieksekusi.
14. **Kesesuaian & Pembaruan Pengujian Otomatis Terhadap Data Baru (*Test Relevancy & Data Freshness*):**
   - Setiap kali terjadi penambahan fitur baru, pembaruan modul/arsitektur, atau perubahan skema data, seluruh pengujian otomatis di direktori `tests/` WAJIB diperbarui agar tetap relevan, akurat, dan mencerminkan logika bisnis nyata terkini.
   - DILARANG KERAS mempertahankan tes yang sudah usang (*obsolete*), tes dengan data/struktur lama, atau sekadar membuat tes 'asal hijau/pass' menggunakan mock kosong yang tidak menguji alur kerja nyata.
   - Suite test wajib mencakup pengujian regresi untuk endpoint API aktif, model database, service bisnis, dan alur otentikasi/otorisasi yang benar-benar digunakan sistem.
15. **Kewajiban Sinkronisasi Master Dokumen Android (`PROMPT_ANDROID_STUDIO.md`):**
   - File [`docs/PROMPT_ANDROID_STUDIO.md`](docs/PROMPT_ANDROID_STUDIO.md) adalah berkas instruksi dan konteks master yang selalu disalin dan dikirimkan ke AI Agent di **Android Studio**.
   - Setiap kali ada **perubahan, perbaikan bug, penyesuaian fungsional, penambahan channel notifikasi, perubahan kode Gradle/Kotlin, atau update fitur native di sisi Android**, AI Agent **WAJIB LANGSUNG MEMPERBARUI** berkas `PROMPT_ANDROID_STUDIO.md` ini secara menyeluruh dan terperinci.
   - Dilarang menunda atau melewatkan pembaruan `PROMPT_ANDROID_STUDIO.md` agar AI di Android Studio selalu menerima instruksi yang 100% sinkron dengan status kode dan arsitektur terbaru.
