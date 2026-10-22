# Changelog — EdTeknoGuard 🛡️

Semua perubahan penting, penambahan fitur, peningkatan performa, dan perbaikan bug pada proyek **EdTeknoGuard** dicatat secara berkala dan terstruktur dalam dokumen ini.

Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini mematuhi standar penomoran versi [Semantic Versioning](https://semver.org/lang/id/).

---

## ⚠️ Kebijakan Perlindungan Fitur & Pencegahan Regresi (Regression Prevention)

> **ATURAN MUTLAK BAGI SELURUH PENGEMBANG & AI AGENT:**
> 1. **Dilarang Menghapus atau Merusak Fitur yang Sudah Stabil**: Setiap fitur yang telah tercatat dalam dokumen ini tidak boleh diubah secara sepihak, ditimpa, atau dihilangkan fungsinya tanpa instruksi eksplisit dari pengguna.
> 2. **Wajib Memperbarui Changelog**: Setiap kali ada penambahan fitur baru, perbaikan bug (*hotfix*), optimasi kode, maupun perubahan antarmuka, AI Agent atau developer **WAJIB** mencatatnya pada bagian `[Unreleased]` atau versi terkait.
> 3. **Cek Fitur Sebelum Modifikasi**: Sebelum memodifikasi kode atau merestrukturisasi modul, periksa daftar fitur di dokumen ini serta panduan pada [AGENTS.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/AGENTS.md) dan [designsystempro.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/designsystempro.md) untuk memastikan tidak terjadi regresi.

---

## Kategori Perubahan

- **`Added`** : Penambahan fitur, modul, atau halaman baru.
- **`Changed`** : Perubahan pada fungsi atau alur kerja fitur yang sudah ada.
- **`Deprecated`** : Fitur lama yang segera dihapus pada rilis berikutnya.
- **`Removed`** : Fitur atau dependensi yang telah dihapus resmi dari sistem.
- **`Fixed`** : Perbaikan kesalahan (*bug fix*), logika, atau error sistem.
- **`Security`** : Peningkatan keamanan, sanitasi input, token, dan proteksi sesi.

## [Unreleased]

- **Penyelarasan Segmented Status Ticker Bar, Status Kredensial INVALID & Kontrol Cepat Sorting Pelanggan**:
  - **Penghapusan Kartu "Lockout" & "Belum Cek" dari Ticker Bar ([ModulBeranda.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx), [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx), [monitoring/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/monitoring/service.py), [customers/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/service.py))**:
    - Kartu `Lockout` dan `Belum Cek` dihapus sepenuhnya dari Ticker Bar Atas di Beranda dan Pelanggan.
    - Ticker Bar kembali bersih & konsisten menampilkan 5 kartu metrik sinyal optik utama: **`TOTAL`**, **`OPTIMAL`**, **`WASPADA`**, **`KRITIS`**, dan **`LOS`** baik di desktop maupun mobile.
  - **Penyederhanaan Status Kredensial Menjadi Murni 2 Status: "VALID" & "INVALID" ([scheduler_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/scheduler_service.py), [ont_scraper_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/ont_scraper_service.py), [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx))**:
    - Menghapus badge abu-abu `BELUM UJI` dari antarmuka. Status kredensial modem di kolom *WIFI & ADMIN ONT* kini murni hanya memiliki 2 status pasti:
      1. **`VALID`** (hijau): Username & password terverifikasi cocok dan login modem berhasil.
      2. **`INVALID`** (merah): Segala bentuk kegagalan autentikasi (salah password, akun ditolak, atau modem sedang lock countdown).
    - Kolom Redaman untuk modem yang gagal login/belum terbaca tetap konsisten menampilkan tanda `-` dengan badge netral `BELUM CEK`.
  - **Dropdown Kredensial Interaktif dari Database & Auto Live Check (Opsi A) ([ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx), [customers/controller.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/controller.py))**:
    - Kolom *WIFI & ADMIN ONT* kini menyajikan dropdown interaktif berisi daftar seluruh kredensial modem yang tersimpan di database (`system_settings`) kantor terkait.
    - Admin/Super Admin dapat langsung memilih pasangan `username:password` modem secara manual. Pemilihan ini otomatis menyimpan perubahan ke database pelanggan dan seketika memicu pengujian live (*single probe*) ke modem fisik.
    - Mekanisme fallback otomatis scraper tetap aktif jika kredensial yang dipilih belum cocok.
  - **Pemindaian Massal Paralel Multi-Threading (5 Worker Pool) per Kantor ([scheduler_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/scheduler_service.py))**:
    - **Isolasi Per-Kantor Terjaga**: Arsitektur pemisahan kantor (`cabang`, `pusat`, `banyumas`) tetap mutlak independen. Paralelisme diterapkan murni di dalam lingkup satu kantor (*intra-office device concurrency*).
    - **Worker Pool 5 Thread Simultan**: Menggantikan loop sekuensial lambat dengan `ThreadPoolExecutor(max_workers=5)` sehingga waktu pemindaian ~156 modem berkurang drastis dari beberapa menit menjadi hanya dalam hitungan detik.
    - **Thread-Safe DB Session & Atomisitas**: Setiap worker mengeksekusi scraping dengan sesi SQLAlchemy independen (`SessionLocal()`) dengan blok `try ... finally: worker_db.close()`, serta sinkronisasi counter KPI dan checkpoint progress dengan `threading.Lock()`.
    - **Penyelarasan Query Relasi PerangkatONT pada Second Pass**: Memperbaiki query filter `invalid_cust_ids` yang sebelumnya salah membaca field properti Python menjadi query relasional eksplisit `join(Pelanggan.perangkat).filter(PerangkatONT.status_kredensial == "INVALID")`, sehingga seluruh modem yang lockout/invalid pada pemindaian pertama berhasil ditarik dan diproses putaran ulang rotasi kredensialnya hingga tuntas.
    - **Paralel Second Pass Retry**: Putaran kedua (SECOND PASS) untuk modem yang perlu rotasi kredensial/menunggu countdown lockout juga diproses secara simultan (3–5 workers) sehingga tidak saling memblokir antrean.
    - **Kontrol Interupsi Responsif**: Status tombol Pause dan Stop (Berhenti Paksa) di antarmuka web tetap direspons seketika oleh pool eksekusi.
  - **Peningkatan Second Pass Pemindaian Massal & Rotasi Kredensial Tuntas ([scheduler_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/scheduler_service.py), [ont_scraper_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/ont_scraper_service.py))**:
    - **Rotasi Penuh Kredensial Database**: Pada putaran kedua (SECOND PASS) setelah pemindaian pelanggan normal selesai, sistem secara otomatis menguji seluruh modem yang berstatus lockout/invalid dengan mencoba satu per satu seluruh pasangan kredensial yang ada di database settings kantor aktif.
    - **Stay Connection Lockout Recovery**: Jika modem mengalami jeda keamanan/lockout saat mencoba suatu kredensial, scraper menahan sesi HTTP (`stay connection`) hingga countdown selesai, lalu **melanjutkan pengujian ke kredensial ke-2, ke-3, hingga kredensial terakhir**.
    - **Auto-Update Kredensial Valid**: Begitu salah satu kredensial berhasil login, `user_admin` dan `pass_admin` pelanggan di database seketika diperbarui secara otomatis menjadi kredensial yang valid tersebut (`status_kredensial = VALID`).
    - **Notifikasi Kredensial Tidak Cocok**: Hanya jika seluruh kredensial di database telah dicoba dan semuanya ditolak modem, sistem menetapkan status akhir `INVALID` dengan keterangan: *"Kredensial Tidak Cocok: Seluruh pasangan kredensial di Pengaturan Sistem telah dicoba dan ditolak modem."*
  - **Penyelarasan Backend Sorting Kolom Redaman (dBm) ([customers/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/service.py))**:
    - Nilai `effective_status` pada sorting database MySQL menggunakan `case` sekarang mengembalikan `"UNTESTED"` untuk modem tanpa log (bukan lagi fallback `"NORMAL"`).
    - Menambahkan filter query eksplisit untuk status `UNTESTED` agar mencakup modem yang belum memiliki entri di `log_performa_ont`.
    - **Prioritas Tampilan BELUM CEK pada Sorting Redaman**: Saat pengguna mengklik header tabel **Redaman (dBm)** (`sort_by=rx_power`, urutan `asc`), modem dengan status `BELUM CEK` (`rx_power IS NULL`) kini secara otomatis diurutkan di baris paling atas/awal tabel, mempermudah identifikasi modem yang belum teruji tanpa mengganggu pengurutan numerik dBm.
  - **Siklus Sorting Bertahap Kolom IP & Router ([ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) & [customers/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/service.py))**:
    - Header kolom gabungan **IP & Router** menerapkan sistem siklus 4 status berurutan per klik:
      1. **Klik 1**: Mengurutkan berdasarkan **IP Router** (`ip_router asc`). Label header berubah menjadi *IP Router*.
      2. **Klik 2**: Mengurutkan berdasarkan **IP ONT** (`ip_ont asc`). Label header berubah menjadi *IP ONT*.
      3. **Klik 3**: Mengurutkan berdasarkan **Jenis Modem** (`jenis_modem asc`). Label header berubah menjadi *Modem*.
  - **Penambahan Card Shortcut & Sorting Kredensial INVALID ([ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx), [ModulBeranda.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx), [customers/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/service.py), [monitoring/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/monitoring/service.py))**:
    - **Card Shortcut `Invalid`**: Menambahkan segmen kartu `Invalid` (warna oranye kontras) pada Segmented Status Ticker Bar di halaman Data Pelanggan dan Beranda untuk menampilkan jumlah riil modem dengan kredensial gagal/invalid. Mengklik kartu ini langsung menyaring tabel menampilkan seluruh pelanggan berstatus kredensial `INVALID`.
    - **Sorting Header `WiFi & Admin ONT`**: Mengklik header tabel `WiFi & Admin ONT` (`sort_by=status_kredensial`) pada arah `asc` kini memprioritaskan dan mengumpulkan seluruh modem `INVALID` di posisi paling atas tabel, memudahkan teknisi/admin langsung mengevaluasi dan mengganti pasangan kredensial modem yang bermasalah.

- **Peningkatan Scraper ONT: Adaptasi Karakteristik Vendor, 1-3 Percobaan per Kredensial, Stay-Connection Lockout & Status LOCKOUT**:
  - **Deteksi Karakteristik Vendor Modem ([ont_scraper_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/ont_scraper_service.py))**:
    - Menambahkan `detect_ont_vendor_behavior` dan `parse_lockout_info` untuk mengenali karakteristik modem (ZTE GM220/XPON, Huawei, FiberHome, dan Generic XPON) secara heuristik.
    - Menetapkan kebutuhan sesi HTTP dan durasi lockout spesifik vendor (ZTE: 60 detik dengan `require_stay_connection=True`, vendor lain: 30–60 detik).
  - **Mekanisme 1-3 Percobaan per Kredensial & Stay-Connection Lockout**:
    - Setiap pasangan username & password dicoba secara adaptif maksimal 3 kali berturut-turut pada sesi HTTP aktif (`keep-alive`).
    - Jika memicu countdown lockout:
      - **Cek Redaman Mandiri (Single Probe di Data Pelanggan)**: Scraper **mempertahankan koneksi HTTP (stay connection)** tanpa menutup socket TCP/sesi, menunggu sisa countdown selesai (`time.sleep(lock_secs + 1)`), menyegarkan form token, lalu melanjutkan percobaan kredensial berikutnya.
      - **Pemantauan Massal (Background Scheduler)**: Mengaktifkan parameter `is_mass_scan=True` sehingga jika mendeteksi lockout, sistem langsung menandai status `LOCKOUT` dan segera memindai pelanggan berikutnya agar antrian scan massal tidak terhenti.
  - **Penyelarasan Status `LOCKOUT` di Database & Frontend**:
    - Status `LOCKOUT` disimpan secara resmi di tabel [log_performa_ont](file:///d:/databaru/Magang/EdTeknoGuard/app/db/models.py) database MySQL Local.
    - Tabel [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) menampilkan badge status **`LOCKOUT`** berwarna oranye kontras yang jelas dan otomatis mengaktifkan countdown timer cooldown di UI.

- **Pembersihan Data Statis & Redundansi Modul Arsitektur Frontend & Backend**:
  - **Pembersihan File Duplikat [ModulManajemenPengguna.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulManajemenPengguna.jsx)**: Menghapus permanen berkas duplikat lama berukuran 61 KB yang tidak pernah dipakai dan memastikan sistem terpusat pada [ModulPenggunaNOC.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPenggunaNOC.jsx).
  - **Pembersihan Komponen Usang [Modals.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/Modals.jsx)**: Menghapus komponen `OntDetailModal` yang sudah tidak terpakai sehingga [Modals.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/Modals.jsx) terfokus murni pada `ConfirmSaveModal`.
  - **Pembersihan Data Mock di App.jsx**: Menghapus total array statis `ontData` (Bpk. Hendro, Siti Aminah, dll.) serta rendering canvas waveform manual di [App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx).
  - **Penyelarasan Seluruh Fallback Paket & Sinyal**: Menghapus seluruh asumsi hardcoded `'20 Mbps Unlimited'`, `'ZTE GM220-S'`, serta angka dummy signal/kuota (`-26.38 dBm`, `163.7 GB`, `random.uniform()`) di portal pelanggan dan backend admin, mengubahnya menjadi pembacaan database riil atau `-`/`0.0`.
  - **Pembaruan Dokumen [AGENTS.md](file:///d:/databaru/Magang/EdTeknoGuard/AGENTS.md)**: Memutakhirkan bagan pohon struktur direktori agar mencerminkan seluruh modul baru (`admin_customer_mgmt`, `users`, `activity_logs`, `mikrotik`, dan `portal_pelanggan`).

- **Navigasi Form Edit Pelanggan & Menu Aksi Titik Tiga ([ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx))**:
  - **Kembali ke Detail Pelanggan dari Form Edit**: Menambahkan tombol panah navigasi `<ArrowLeft />` ("Detail") pada header modal Edit Pelanggan dan mengintegrasikan tombol "Batal" agar pengguna dapat langsung kembali ke Modal Detail Pelanggan tanpa harus mencari ulang baris pelanggan.
  - **Aksi Baris Tabel Titik Tiga (...)**: Mengembalikan aksi baris tabel menjadi tombol popover titik tiga (`MoreVertical`) rapi yang memuat: Detail Pelanggan, Hubungi WA, Isolir/Buka Isolir Akses, Edit Data, dan Hapus Data, dengan penyesuaian posisi pintar (`bottom-full` pada baris bawah) dan backdrop transparan agar tidak terpotong.

- **Pusat Notifikasi Mandiri, Agregasi Batching (>5), & Isolasi Status Baca Antar User ([ModulNotifikasi.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulNotifikasi.jsx), [App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx), [service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/admin_customer_mgmt/service.py))**:
  - **Pusat Notifikasi Popover Flyout Mandiri (`ModulNotifikasi.jsx`)**:
    - Tombol lonceng di navbar kini membuka panel notifikasi mandiri yang modern, cepat, dan responsif tanpa memaksa navigasi langsung ke halaman tiket keluhan.
    - Mengintegrasikan dua kategori informasi utama secara real-time: **Hasil Pemantauan Redaman ONT** (LOS, Critical, Warning) dan **Tiket Keluhan Pelanggan** (Menunggu, Diproses), serta pengingat status scheduler terjeda khusus Super Admin.
  - **Agregasi Batching Otomatis (> 5 Item)**:
    - Jika notifikasi LOS, Warning redaman, atau tiket keluhan berjumlah **lebih dari 5**, sistem otomatis menggabungkannya (*batch*) menjadi 1 kartu ringkasan pintar (misal: `"142 Modem ONT Terputus (LOS)"` atau `"7 Tiket Keluhan Masuk"`).
    - Mencegah *notification flooding* agar performa browser dan aplikasi HP tetap ringan dan responsif.
  - **Isolasi Status Baca Per Akun / Role di Database MySQL Local (`user_notification_reads`)**:
    - Dibuat tabel baru `user_notification_reads` di MySQL Local (`user_id`, `notification_type`, `reference_id`, `read_at`).
    - Setiap pengguna memiliki status baca masing-masing: jika teknisi membuka atau menandai notifikasi sudah dibaca, notifikasi tersebut hilang dari akun teknisi tersebut, tetapi **tetap ada** pada Admin dan Super Admin sampai mereka sendiri yang menandainya.
    - Tiket keluhan warga yang belum selesai (`status != 'SELESAI'`) akan tetap dimunculkan sesuai interval pengulangan notifikasi di database.
  - **Navigasi Cepat Sesuai Jenis Notifikasi**:
    - Klik pada item notifikasi **Hasil Pemantauan ONT** langsung mengarahkan ke tab **Riwayat Redaman (`/logs`)** dan otomatis memfilter ID/Nama pelanggan atau status terkait.
    - Klik pada item notifikasi **Tiket Keluhan** langsung mengarahkan ke tab **Tiket Keluhan (`/admin/tiket`)** dan otomatis memfilter ID tiket terkait.
  - **Pembersihan Bersih Dependensi Telegram**:
    - Menghapus berkas `app/services/telegram_service.py` serta seluruh atribut dan variabel konfigurasi Telegram dari `app/core/config.py`, `init_db.py`, dan schemas, sepenuhnya beralih ke Native Android Notification & Web Notification Center.

- **Pengaturan Sistem Nyata dari Database MySQL Local & Terisolasi Per Kantor Aktif ([ModulPengaturan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPengaturan.jsx), [App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx), [service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/settings/service.py))**:
  - **Data Riil Langsung dari Database MySQL Local**: Seluruh form konfigurasi di Modul Pengaturan membaca dan menulis data nyata ke tabel `system_settings` pada database MySQL Local (`127.0.0.1:3306`, db `edteknoguard`), sepenuhnya meniadakan data dummy/palsu.
  - **Isolasi Pengaturan Mandiri Per Kantor Aktif (`activeOffice`)**:
    - Nilai default interval pemantauan yang aman adalah **20 menit**.
    - Interval pemantauan, ambang batas redaman (*Warning -26.0 dBm* / *Kritis -27.0 dBm*), dan kredensial modem ONT (multi-fallback) kini disimpan dan dimuat secara mandiri per kantor menggunakan kunci spesifik: `polling_interval_minutes_{kantor}`, `warning_threshold_dbm_{kantor}`, `critical_threshold_dbm_{kantor}`, `default_modem_credentials_{kantor}`, dll.
    - Tidak ada aturan global yang dipaksakan; masing-masing kantor (Cabang, Pusat, Banyumas, atau kantor baru) dapat memiliki pengaturan ambang batas, interval, dan kredensial modem yang berbeda sesuai karakteristik lapangannya.
  - **Sinkronisasi Otomatis dengan Switcher Navbar**:
    - Saat pengguna mengganti kantor aktif di switcher navbar, form Pengaturan otomatis me-refresh dan memuat data konfigurasi spesifik kantor tersebut dari API backend (`GET /api/pengaturan?kantor=${activeOffice}`).
    - Saat Super Admin atau Admin menyimpan pengaturan, payload otomatis menyertakan `{ kantor: activeOffice }` (`POST /api/pengaturan`), mengunci perubahan hanya pada kantor aktif tersebut.
    - Sinkronisasi kredensial modem massal ke pelanggan invalid dibatasi hanya untuk pelanggan di kantor aktif terkait.
  - **Penyelarasan UI & Badge Visual**:
    - Menampilkan badge kantor aktif `🏢 Kantor: {activeOffice}` di header Tab 1 (Parameter & Ambang Batas) dan Tab 2 (Kredensial Modem ONT).

- **Arsitektur Pemantauan Paralel Multi-Kantor & Jeda Jadwal Mandiri Per Kantor (Backend & Frontend)**:
  - **Dukungan Multi-Threading Paralel Penuh Antar Kantor ([scheduler_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/scheduler_service.py))**:
    - Merestrukturisasi engine singleton `MonitoringScheduler` dari status tunggal global menjadi `OfficeScanState` yang thread-safe dengan `threading.Lock` per kantor.
    - Setiap kantor kini dapat menjalankan pemindaian secara bersamaan (*true parallel multi-office scanning*) tanpa memblokir kantor lainnya: Banyumas, Cabang, Pusat, maupun kantor baru yang ditambahkan di masa mendatang dapat dipindai serentak.
    - Pemindaian manual (`POST /api/monitoring/scan-all`) dieksekusi secara asinkron di latar belakang menggunakan thread terpisah per kantor dan langsung mengembalikan respons `status: "started"`.
    - Latar belakang scheduler berkala (`scheduled_job_wrapper`) kini mengiterasi seluruh kantor aktif terdaftar dari tabel `kantors` dan meluncurkan thread pemindaian mandiri secara paralel untuk setiap kantor yang status scheduler-nya `RUNNING`.
  - **Pembaruan Database MySQL Local untuk Status Jadwal Per Kantor (`system_settings`)**:
    - Menyimpan status jadwal per kantor secara permanen dengan kunci dinamis: `scheduler_status_{kode_kantor}` (misal: `scheduler_status_cabang`, `scheduler_status_pusat`, `scheduler_status_banyumas`).
    - Menjeda jadwal pemantauan pada kantor tertentu (misal Banyumas) hanya akan mengubah `scheduler_status_banyumas` menjadi `STOPPED`, sementara jadwal kantor lain (Cabang dan Pusat) tetap aktif `RUNNING`.
    - Jika dijeda tanpa menentukan kantor (secara global), sistem secara otomatis menyinkronkan status ke seluruh kantor terdaftar di database.
  - **Dukungan Kantor Baru Dinamis Tanpa Batasan Hardcode**:
    - Seluruh logika pembacaan status kantor, scheduler wrapper, dan checkpoint JSON (`data/scan_state_{kantor}.json`) mendukung penambahan kantor baru secara dinamis dari tabel `kantors`.
  - **Sinkronisasi Antarmuka Pengguna Frontend ([ModulBeranda.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))**:
    - Tombol "Jeda Jadwal" / "Aktifkan Jadwal" pada Beranda kini mengirimkan parameter `{ kantor: activeOffice }` sehingga aksi Super Admin hanya menjeda jadwal untuk kantor aktif yang sedang dibuka.
    - Status mesin pemantau di Control Bar ("Pemantauan Otomatis: Aktif" vs "Dijeda") secara dinamis mencerminkan status jadwal spesifik kantor yang sedang dibuka (`activeOffice`).
    - Aksi Jeda Pemindaian, Lanjutkan, dan Stop Pemindaian kini mengirimkan parameter `{ kantor: activeOffice }` secara akurat.

- **Isolasi Pemindaian Multi-Kantor & Proteksi Hak Akses Kontrol (Beranda & Backend)**:
  - **Perbaikan Independensi Tombol Pemindaian Antar Kantor**:
    - Tombol pemindaian kantor aktif (misal *"Pindai Cabang"*) kini **bebas diklik** dan tidak lagi terkunci/disabled saat kantor lain (seperti Banyumas) sedang melakukan pemindaian.
    - Kondisi disabled pada tombol pemindaian sekarang diperketat hanya jika kantor yang sedang aktif dibuka itu sendiri yang sedang memindai: `disabled={isToggling || (isScanning && isCurrentOfficeScan)}`.
  - **Sinkronisasi Otomatis Status & Metrik KPI Berdasarkan Kantor Aktif**:
    - `fetchStatus()` dan `fetchKpi()` kini otomatis meneruskan parameter `{ kantor: activeOffice }` ke backend, dan langsung dieksekusi secara instan saat pengguna berpindah kantor di dropdown navbar atas tanpa tertahan timer polling.
    - Endpoint `/api/monitoring/status` di backend diperbarui untuk menghitung data `total_customers` dan status pemantauan secara terisolasi per kantor yang diminta.
  - **Isolasi Visual Pemindaian Real-Time ([ModulBeranda.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx))**:
    - Progress bar pemindaian aktif dan status jeda kini terisolasi 100% per kantor aktif (`activeOffice`). Jika kantor yang sedang dipindai adalah `Banyumas`, tampilan kantor `Pusat` dan `Cabang` tetap bersih dalam kondisi standby tanpa menampilkan progress bar Banyumas yang membingungkan.
    - **Opsi B Khusus Super Admin**: Super Admin saat membuka kantor lain disajikan banner informasi kompak latar belakang (*"Informasi: Pemindaian Kantor [BANYUMAS] sedang berjalan di latar belakang: X/Y ONT"*), memberikan visibilitas penuh tanpa merusak ruang kerja kantor aktif.
    - Admin Cabang dan Teknisi hanya melihat proses pemindaian yang relevan dengan kantor yang ditugaskan kepada mereka.
  - **Pengetatan Hak Akses Kontrol Pemindaian & Jadwal Scheduler**:
    - **Jeda Jadwal Otomatis (Scheduler Toggle)**: Dibatasi eksklusif hanya untuk `super admin` baik di UI maupun di endpoint backend `POST /api/monitoring/toggle-scheduler`.
    - **Jeda, Lanjutkan, & Batalkan Pemindaian Aktif**: Super Admin berhak mengontrol pemindaian di seluruh kantor, sedangkan Admin Cabang dibatasi ketat hanya untuk mengontrol pemindaian yang menargetkan kantor yang diizinkannya (`_validate_scan_control_permission`). Teknisi dilarang mengontrol pemindaian massal.
  - **Form Login Bersih & Aman ([HalamanLogin.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/HalamanLogin.jsx))**:
    - Menghapus nilai hardcoded username `admin` dan password `agiltampan` pada initial state form login.
    - Input login kini selalu bersih/kosong dengan placeholder netral demi keamanan sistem.
  - **Modul Pengguna NOC ([ModulPenggunaNOC.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPenggunaNOC.jsx))**: Tombol aksi langsung edit dan hapus pada setiap baris tabel kini dikemas ke dalam tombol menu titik tiga (`MoreVertical`), menyajikan opsi popover elegan *"Edit Akun"* dan *"Hapus"* (dengan proteksi terhadap akun master `admin`).
  - **Modul Kantor Cabang ([ModulKantorCabang.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulKantorCabang.jsx))**: Tombol aksi langsung (*Sync MikroTik*, *Edit*, *Hapus*) kini diringkas ke dalam tombol menu titik tiga (`MoreVertical`), menyajikan pilihan popover *"Sync MikroTik"* (khusus router yang memiliki host), *"Edit Kantor"*, dan *"Hapus Kantor"* (terproteksi untuk kantor default sistem).

- **Penyelarasan Pengaturan Sistem Real Database & Eliminasi Tab Redundan Router MikroTik**:
  - **Sinkronisasi Otomatis Data Pengaturan Real Database**: [ModulPengaturan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPengaturan.jsx) kini otomatis memanggil `fetchBackendSettings()` saat komponen pertama kali di-mount, memastikan nilai interval pemantauan, ambang batas redaman (-26 dBm / -27 dBm), kredensial ONT multi-fallback, dan preferensi notifikasi selalu terisi langsung dari database (tabel `system_settings`), bukan nilai template/placeholder bawaan.
  - **Sertifikasi Data Profil Nyata**: Endpoint `GET /api/auth/me` pada [app/main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) diperbarui untuk menyertakan `no_wa` dari database, sehingga data pengguna yang tampil di tab Personal (Profil & Kata Sandi) memuat ID, Nama, No. WhatsApp, Kantor Layanan, dan Hak Akses riil.
  - **Penghapusan Tab Redundan Router MikroTik**: Tab "Router MikroTik" dihilangkan dari navigasi mobile switcher (grid 3 tab) dan desktop tree menu [ModulPengaturan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPengaturan.jsx) karena konfigurasi router MikroTik telah dikonsolidasikan secara penuh per kantor cabang di [ModulKantorCabang.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulKantorCabang.jsx).

- **Fitur Ekstraksi & Pembaruan Kredensial WiFi ONT (Live Web GUI ZTE GM220-S)**:
  - **Ekstraksi SSID & WPA Password Otomatis**: Layanan [ont_scraper_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/ont_scraper_service.py) kini otomatis membuka path `/getpage.gch?pid=1002&nextpage=net_wlan_essid_t.gch` dan `net_wlan_secrity_t.gch` untuk membaca SSID (`Transfer_meaning('ESSID')`) dan kata sandi WPA (`Transfer_meaning('KeyPassphrase'/'PreSharedKey')`).
  - **Sinkronisasi Otomatis ke Database**: Pada pemindaian berkala (`scheduled_job_wrapper`) maupun *Single Probe Check* (`single_ont_check`), SSID dan Password WiFi yang berhasil diekstrak otomatis disimpan ke entitas `PerangkatONT` / `Pelanggan` di database.
  - **Fungsi Update WiFi Berproteksi Safe Mode (`dry_run=True`)**:
    - Disiapkan metode `ONTScraperService.update_wifi_credentials(ip, user, password, new_ssid, new_password, dry_run=True)` untuk mengirim perubahan WiFi ke modem.
    - Sesuai instruksi pengguna, mode aman aktif secara default (`dry_run=True`) sehingga perubahan tersimpan di database dan tervalidasi tanpa mengeksekusi request fisik yang merusak perangkat modem.
    - Endpoint REST API baru: `POST /api/customers/{id_pelanggan}/change-wifi`.
  - **Antarmuka Form Edit Pelanggan**: Modal edit data pelanggan di [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) telah dilengkapi kolom input **Nama WiFi (SSID)** dan **Password WiFi** font monospace.

- **Konsolidasi Monitoring MikroTik & Eliminasi Perangkat Kantor Internal**:
  - **Eksklusi Perangkat Kantor Internal**: Seluruh perangkat internal kantor (`SERVER-NOC-LOCAL`, `Modem Office`, `CCTV-NVR-OFFICE`, `DESKTOP-F0AS19V`, dsb.) otomatis difilter keluar dari pemantauan Simple Queues MikroTik sehingga data monitoring murni berisi pelanggan ISP.
  - **Pembersihan Modul MikroTik Terpisah**: Menghapus `ModulMikroTikNOC.jsx` dan navigasi tab `/mikrotik` di Sidebar dan router aplikasi.
  - **Integrasi Single Source of Truth ke Modul Pelanggan**:
    - **Data Kuota & Traffic Real-Time**: Endpoint `GET /api/customers` dan `GET /api/customers/{id_pelanggan}` kini langsung melakukan *outer join* ke `KuotaPelanggan` periode bulan berjalan (`YYYY-MM`), menyajikan `kuota_terpakai_gb`, `upload_bytes`, `download_bytes`, `status_isolir`, dan `queue_name` secara presisi dan real-time.
    - **Kolom Kuota & Badge Isolir di Tabel**: Tabel pelanggan di [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) kini memuat kolom **Kuota (Bln Ini)** dengan rincian total GB, breakdown ▲ Upload • ▼ Download, serta label **DIISOLIR** jika akses pelanggan diputus.
    - **Tombol Sync MikroTik**: Menambahkan tombol pemicu sinkronisasi manual langsung pada toolbar tabel pelanggan (`POST /api/mikrotik/sync-quota`).
    - **Aksi Isolir / Buka Isolir Cepat**: Menambahkan opsi isolir / unblock langsung pada menu titik tiga setiap baris pelanggan (`POST /api/mikrotik/toggle-isolir`).
    - **Informasi Jaringan MikroTik di Modal Detail**: Menampilkan status isolir, rincian traffic, nama rule Simple Queue, dan timestamp sinkronisasi pada pop-up detail pelanggan.
  - **Monitoring Simple Queues & Trafik**: Menampilkan seluruh 173 rule Simple Queues dengan pemetaan otomatis ke 142 data pelanggan TeknoGuard, deteksi perangkat internal kantor (Modem Office, CCTV, Desktop NOC), Max Limit Up/Down, dan akumulasi kuota GB.
  - **Sinkronisasi Kuota Otomatis ke Database**: Counter akumulasi `bytes` dari Simple Queues otomatis disinkronkan ke tabel `kuota_pelanggan` pada periode bulan berjalan (`YYYY-MM`) melalui background worker tiap 3 menit atau tombol on-demand `Sync MikroTik`.
  - **Aksi Kontrol Isolir Pelanggan 1-Klik**: Dukungan isolir/unblock akses internet pelanggan langsung dari TeknoGuard via API MikroTik (`Address List` / Queue toggle) lengkap dengan audit log aktivitas.
  - **Antarmuka Modul MikroTik NOC Modern**: Komponen `ModulMikroTikNOC.jsx` dibangun mengikuti standar `designsystempro.md` dengan Segmented Status Bar, filter tipe (Semua, Pelanggan, Kantor, Isolir), live search, dan paginasi tabel.

- **Perbaikan Masalah Filter, Sorting, dan Pagination Tabel Pelanggan ([ModulPelanggan.jsx](file:///d:/databaru\Magang\EdTeknoGuard\frontend\src\components\ModulPelanggan.jsx) & [service.py](file:///d:/databaru\Magang\EdTeknoGuard\app\modules\customers\service.py))**:
  - **Penyebab Bug Pencarian**: Sebelumnya pencarian menggunakan `Pelanggan.ip_router.ilike()`, padahal `ip_router` dan `ip_ont` adalah properti shortcut ke relasi `PerangkatONT`. Hal ini memicu error internal 500 (`AttributeError: 'property' object has no attribute 'ilike'`), sehingga pencarian data gagal dan mengosongkan tabel.
  - **Solusi Query SQL Terpadu**: Dilakukan `outerjoin(PerangkatONT)` pada query SQLAlchemy dan pencarian `q` diperluas ke `Pelanggan.nama`, `Pelanggan.id_pelanggan`, `Pelanggan.alamat`, `PerangkatONT.ip_router`, `PerangkatONT.ip_ont`, `PerangkatONT.mac_address`, dan `PerangkatONT.nama_wifi`.
  - **Dukungan Debounce Input Pencarian (350ms)**: Menambahkan state `debouncedSearch` di React agar pencarian tidak spamming API setiap karakter diketik dan otomatis mereset halaman ke `page: 1`.
  - **Perbaikan Sorting Terpadu & Indikator Visual**:
    - Memetakan field sorting tabel ke kolom SQL yang valid (`PerangkatONT.ip_router`, `LogPerformaONT.rx_power`, `LogPerformaONT.status_koneksi`, dll.).
    - Menghapus klausa non-standar MySQL `NULLS LAST` yang sebelumnya menyebabkan SQL syntax error 1064.
    - Menambahkan visual panah aktif (`▲` untuk asc dan `▼` untuk desc) serta sorotan warna background header kolom saat sedang aktif diurutkan.
  - **Perbaikan Navigasi Pagination**:
    - Memastikan `DataTableContainer` memicu perubahan halaman secara mulus dan mempertahankan filter yang sedang aktif.
    - Server POP kini disajikan secara dinamis dari database, bukan hardcoded.

- **Dukungan Dua IP Terpisah Pelanggan: IP ONT (10.10.x.x) & IP Router (192.168.x.x)**:
  - **Arsitektur Basis Data Multi-IP**: Ditambahkan kolom `ip_ont` pada tabel `perangkat_ont` di database serta shortcut property di model `Pelanggan` ([app/db/models.py](file:///d:/databaru/Magang/EdTeknoGuard/app/db/models.py)).
  - **Pemetaan Otomatis MikroTik**: Pada [mikrotik_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/mikrotik_service.py), sistem memetakan perangkat dengan IP `10.10.x.x` (dari ARP Table/VLAN optik) ke `ip_ont` dan IP `192.168.x.x` (dari DHCP Lease) ke `ip_router`. Jika satu pelanggan (berdasarkan MAC atau Comment identik) memiliki kedua IP, sistem menyatukannya ke 1 data pelanggan yang sama.
  - **Tampilan Tabel Pelanggan Bertingkat Bersih Tanpa Ikon**: Kolom *IP & Wilayah* di [ModulPelanggan.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) menyajikan kedua data IP secara bertingkat bersih dengan badge teks monospaced (`ONT: 10.10.x.x` dan `Router: 192.168.x.x`) tanpa menggunakan emoji atau ikon grafis.
  - **Penamaan Menu Sidebar**: Menu navigasi diubah menjadi **"Kantor"** (bukan *Kantor Cabang*) untuk menyelaraskan cakupan multi-kantor (Pusat, Cabang, Banyumas).

- **Pemisahan Halaman Mandiri Pengguna NOC & Kantor Serta Tombol Sync WinBox On-Demand**:
  - **Pemisahan Modul Navigasi**: Tab Pengguna dan Kantor pada Manajemen Pengguna kini dipecah menjadi dua file page mandiri:
    - [ModulPenggunaNOC.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPenggunaNOC.jsx): Khusus akun petugas NOC, peran (super admin, admin, teknisi), dan izin multi-kantor.
    - [ModulKantorCabang.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulKantorCabang.jsx): Khusus master data kantor operasional dan konfigurasi router MikroTik per wilayah.
  - **Tombol "Sync WinBox Sekarang"**: Disediakan tombol aksi sinkronisasi langsung di setiap baris kantor pada tabel Kantor.
  - **Pesan Status Jaringan Informatif & Dinamis**: Jika router tidak dapat dijangkau, sistem memberikan pesan: *"Router MikroTik (<IP>:<Port>) tidak dapat dijangkau. Pastikan jaringan server terhubung ke jaringan router."*
  - **Auto-Sync Mandiri Latar Belakang (*Decoupled Daemon*)**: Auto-sync MikroTik dipisahkan menjadi job mandiri `mikrotik_auto_sync_job` di [scheduler_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/scheduler_service.py) yang berjalan setiap 3 menit terpisah dari siklus pemantauan redaman ONT, sehingga tetap aktif memindai walaupun data pelanggan sedang kosong (0) atau pemantauan redaman sedang dijeda.

- **Perluasan Auto-Sync MikroTik: Pengambilan Otomatis IP 10.10.x.x (ARP Table & PPPoE Active)**:
  - **Dukungan Multi-Source MikroTik**: Selain membaca `/ip/dhcp-server/lease`, service [mikrotik_service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/services/mikrotik_service.py) kini otomatis memindai `/ip/arp` (ARP Table) dan `/ppp/active` (PPPoE Sessions).
  - **Penangkapan IP Statis & VLAN ONT 10.10.x.x**: Modem pelanggan atau ONT yang dikonfigurasi dengan IP statis `10.10.x.x` (yang tidak muncul di DHCP lease dinamis) kini secara otomatis tertangkap dan tersinkronisasi ke database lengkap dengan MAC Address dan Comment.
  - **Siklus Eksekusi**: Berjalan otomatis di latar belakang setiap 5 menit via APScheduler bersamaan dengan siklus sinkronisasi berkala per kantor.

- **Pembaruan Alur Data Pelanggan: Penghapusan Tombol Tambah Manual & Penyempurnaan Fitur "Lengkapi Data" Berbasis IP Router**:
  - **Penghapusan Tombol Tambah Manual**: Tombol "Tambah" pada toolbar [`ModulPelanggan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx) dihapus bersih karena seluruh data pelanggan baru telah tersinkronisasi otomatis dari DHCP Leases router MikroTik.
  - **Transformasi Wizard Import Menjadi "Lengkapi Data Pelanggan"**:
    - Tombol "Import" diubah label dan ikonnya menjadi **"Lengkapi Data"** (ikon spreadsheet cyan) tanpa kata *Wizard*.
    - Fokus utama import adalah pengayaan data (*enrichment*) untuk melengkapi kolom yang tidak ada di MikroTik: **Nomor WhatsApp**, **Alamat Pemasangan Fisik**, dan **Kredensial WiFi Rumah (SSID & Password)**.
    - Pencocokan utama wajib menggunakan **`IP Router / ONT`** yang berformat `10.10.x.x (Standar ONT)` atau `192.168.x.x (IP Lokal)`.
  - **Pencegahan Penimpaan & Tampilan Perbandingan Data Lama vs Data Baru (Conflict Resolution)**:
    - Jika data pelanggan di database kolomnya masih kosong / null / placeholder, sistem langsung mengisinya secara aman (*non-destructive update*).
    - Jika kolom di database sudah memiliki data dan berbeda dengan berkas Excel/CSV, sistem menampilkan tabel perbandingan visual (**Data Database vs Data Berkas**) dengan pilihan tombol: **"Pakai Baru"** atau **"Pakai Lama"**, serta bulk action di atas tabel.
  - **Penanganan IP Belum Terdaftar**:
    - Baris dengan IP yang belum tercatat di database diberi penanda khusus dengan tombol fleksibel: **Lewati (Skip)** atau **Daftarkan Offline (Status Waiting / Belum Dipantau)**.
  - **Perbaikan Koneksi Vite HMR WebSocket**:
    - Menambahkan konfigurasi `hmr: { clientPort: 7891 }` pada [`vite.config.js`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/vite.config.js) untuk mengatasi error koneksi WebSocket Hot Module Replacement.

- **Penambahan Manajemen Kantor & Konfigurasi MikroTik per Wilayah di Modul Manajemen Pengguna (Tab Kantor Cabang)**:
  - **Sistem Multi-Tab di Manajemen Pengguna (`ModulManajemenPengguna.jsx`)**: Mengelompokkan antarmuka menjadi 2 sub-tab ergonomis:
    - **Tab 1: Pengguna NOC** — Mengelola akun petugas (Super Admin, Admin Cabang, Teknisi), izin multi-kantor, status aktif/nonaktif, dan hapus akun.
    - **Tab 2: Kantor Cabang** — Manajemen lengkap (*CRUD*) master data wilayah kantor operasional ISP (Kode Kantor, Nama Wilayah, Alamat/Deskripsi, dan Konfigurasi Router MikroTik).
  - **Input Kredensial MikroTik Melekat per Kantor (Tanpa Nilai Bawaan Statis Global)**:
    - Menambahkan kolom `mikrotik_host`, `mikrotik_port`, `mikrotik_user`, dan `mikrotik_pass` pada tabel `kantors` MySQL dan model SQLAlchemy.
    - Formulir Tambah/Edit Kantor kini menyediakan seksi khusus: **IP Router / Host** (contoh: `192.168.202.50`), **Port API** (custom sesuai router, misal `8728`), **Username Router** (`tekno`), dan **Password Router** (`tekno2025` untuk Kantor Banyumas).
    - Kolom baru pada tabel kantor: *MikroTik RouterOS* (menampilkan IP:Port dan Username router).
  - **Auto-Sync Otomatis Latar Belakang (Tanpa Tombol Manual Tambahan)**:
    - Latar belakang scheduler APScheduler otomatis mengiterasi seluruh kantor yang memiliki konfigurasi MikroTik dan menarik DHCP bound leases secara berkala untuk masing-masing wilayah kantor.
  - **Kapabilitas CRUD Kantor & Proteksi**:
    - Tombol "Tambah Kantor" dengan modal formulir terpadu (Identitas Kantor + Konfigurasi MikroTik).
    - Aksi "Edit Kantor" untuk memperbarui parameter wilayah dan kredensial router.
    - Aksi "Hapus Kantor" dengan proteksi ketat (kantor default `pusat`, `cabang`, dan `banyumas` dilindungi agar tidak terhapus).
    - Sinkronisasi instan ke dropdown *Office Switcher* di navbar via event `edtekno_kantor_updated`.
  - **Mekanisme Sinkronisasi Dinamis Bound (Online) vs Waiting (Offline)**:
    - Seluruh perangkat DHCP leases di router (baik `bound` maupun `waiting`) disimpan lengkap ke database agar master pelanggan tidak hilang.
    - Kolom `status_lease` (`bound` vs `waiting`) ditambahkan pada tabel `pelanggan`.
    - Perangkat `bound` otomatis disetel sebagai **ONLINE** (`is_monitored = True`) dan dipantau redaman optiknya secara berkala.
    - Perangkat `waiting` otomatis disetel sebagai **OFFLINE** (`is_monitored = False`) dan dilewati dari pemindaian redaman berkala agar tidak memicu error timeout.
    - Siklus scheduler otomatis menyelaraskan transisi status: saat pelanggan yang tadinya `waiting` menyala menjadi `bound`, sistem langsung menyalakan kembali pemantauannya; sebaliknya saat `bound` mati menjadi `waiting`, pemantauan redamannya otomatis diistirahatkan.
    - Tabel Data Pelanggan kini memuat badge status konektivitas `ONLINE` dan `OFFLINE (WAITING)`.
  - **Penghapusan Fitur Telegram**: Sesuai keputusan arsitektur, seluruh pengiriman notifikasi darurat Telegram telah ditiadakan dan sepenuhnya digantikan oleh Notifikasi Native OS Android/iOS (Push Banner, Alarm Ringtone & Haptic Vibration via Web Wrapper APK).
  - **API Endpoint Backend**: Endpoint `/users/api/kantor/list`, `/users/api/kantor/add`, `/users/api/kantor/edit/{id}`, dan `/users/api/kantor/delete/{id}` dengan otorisasi Super Admin.

  - **Inisialisasi Tabel Bersih Tanpa Migrasi**: Tabel `system_settings` diinisialisasi langsung dengan konfigurasi router MikroTik (`192.168.202.50:8728`), ambang batas redaman (-26.0 dBm & -27.0 dBm), dan interval pemantauan 5 menit.
  - **Pelepasan Ketergantungan Impor CSV Otomatis**: Menghapus pemanggilan impor otomatis file CSV lama (`DAFTAR PELANGGAN TIJ(PELANGGAN CABANG).csv`) dari startup lifecycle backend dan `init_db.py`, sehingga terbebas dari kendala *Foreign Key Constraint Violation*.
  - **Preservasi Fitur Tambah & Import Pelanggan**: Tombol Tambah manual dan Wizard Import Pelanggan di antarmuka frontend tetap dipertahankan utuh untuk kebutuhan operasional darurat teknisi/admin.

- **Kesiapan Deploy Server Lokal, Port Custom Non-Umum & Migrasi Penuh Database MySQL Lokal (Tanpa TiDB Cloud & Tanpa Ngrok)**:
  - **Port Custom Non-Umum untuk Keamanan Server**: Mengganti port default umum `8000` menjadi **`7890`** (aplikasi backend FastAPI/Uvicorn), port dev server frontend Vite `3000` menjadi **`7891`**, dan port database MySQL `3306` menjadi **`33070`** di `docker-compose.yml`, `Dockerfile`, `.env`, `.env.example`, `config.py`, `package.json`, dan `vite.config.js` guna menghindari tabrakan port layanan bawaan OS/web server lain serta memperkuat isolasi keamanan.
  - **Pelepasan TiDB Cloud**: Mengubah konfigurasi koneksi database di `.env`, `.env.example`, `config.py`, dan `database.py` ke MySQL lokal (`DB_PORT=33070`) tanpa ketergantungan cloud.
  - **Pelepasan Ngrok**: Menghapus service container `ngrok` dari `docker-compose.yml`, membersihkan token/domain ngrok, dan menyetel `APP_URL` default ke `http://localhost:7890`.
  - **Docker Compose Siap Deploy Lokal**: Menambahkan service container `mysql:8.0` (port `33070:3306`) dengan persistent volume `mysql_data`, healthcheck otomatis, konfigurasi charset `utf8mb4`, dan dependency linking yang aman ke service `edteknoguard` (port `7890:7890`).
  - **Skrip Migrasi Basis Data MySQL Lokal (`db/init.sql`)**: Menyediakan skrip DDL SQL lengkap (3NF) dengan foreign key cascade deletion, indexing optimal, dan initial seed data (kantor pusat/cabang/banyumas, POP, paket layanan, system settings default, dan akun super admin) yang dimount langsung ke `/docker-entrypoint-initdb.d/init.sql` pada container MySQL.
  - **Skrip Eksekutor Migrasi Mandiri Python (`migrate.py`)**: Membuat CLI script migrasi berbasis Python dengan fitur auto-detect database, pembuatan schema otomatis, seed data master, opsi `--fresh` (drop & rebuild dari awal), dan opsi `--sql` (eksekusi langsung berkas `db/init.sql`).
  - **Integrasi Notifikasi Native Murni OS Android & iOS**: Memperbarui berkas panduan [`PROMTBUATKEANDROIDSTUDIO.txt`](file:///d:/databaru/Magang/EdTeknoGuard/PROMTBUATKEANDROIDSTUDIO.txt) dan kode `MainActivity.kt` dengan `JavascriptInterface` (`AndroidBridge.showNativeNotification`) serta framework `UNUserNotificationCenter` pada iOS Swift. Notifikasi darurat (alarm drop redaman / tiket baru) kini bersumber langsung dari sistem operasi smartphone (Notification Bar / Push Banner OS dengan ringtone & haptic vibration), baik saat aplikasi aktif maupun saat HP dalam kondisi standby/layar mati.
  - **Auto-Migration Startup Lifecycle**: Menambahkan eksekusi `init_db()` pada startup lifecycle `app/main.py` agar pembuatan skema tabel relasional otomatis berjalan saat aplikasi pertama kali boot jika dijalankan di luar docker.


- **Penyelarasan Seluruh Tab Portal TeknoCust (`TabKendalaPelanggan.jsx` & `TabProfilPelanggan.jsx`)**:
  - **Header Biru Penuh (Full-Width)**: Seluruh tab portal pelanggan kini seragam menggunakan header biru `#2563eb` dengan ornamen lingkaran gradasi, maskot interaktif di kiri atas, brand `TeknoCust`, deskripsi *"Portal Layanan Mandiri Pelanggan TeknoIndonet"*, dan tombol lonceng notifikasi di kanan atas.
  - **Card Putih Menimpa Header (`-mt-3`)**: Konten utama di dalam `scroll-area` diatur dengan margin negatif `-mt-3 mx-3` berbalut `rounded-2xl shadow-lg border border-gray-100 overflow-hidden`, memberikan efek floating modern yang konsisten di semua tab.
  - **Tab Kendala (`TabKendalaPelanggan.jsx`)**: Header biru penuh, card Lapor Gangguan menimpa header, modal lapor kendala, realtime search, filter status badge, pagination 5 item/halaman, dan modal konfirmasi hapus tiket tetap berfungsi utuh.
  - **Tab Profil (`TabProfilPelanggan.jsx`)**: Header biru penuh, card Identitas Pelanggan menimpa header lengkap dengan edit data diri inline, card expandable ganti kata sandi akun, serta tombol logout bertema rapi.

- **Pembaruan Tab Kelola WiFi Rumah (`TabWifiPelanggan.jsx`)**:
  - **Header Biru Penuh (Full-Width)**: Membentang penuh dengan background biru `#2563eb`, ornamen lingkaran gradasi, maskot dinamis cerdas di kiri atas, brand `TeknoCust`, dan deskripsi *"Portal Layanan Mandiri Pelanggan TeknoIndonet"*, serta tombol lonceng notifikasi di kanan.
  - **Card Form Kelola WiFi Menimpa Header (`-mt-3`)**: Menggunakan `bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden` di dalam `scroll-area`, menimpa background biru secara rapi.
  - **Fitur Form Lengkap**: Input nama WiFi (SSID) baru, input kata sandi baru (minimal 8 karakter) dengan toggle intip/sembunyikan password, konfirmasi kata sandi, tombol simpan berlatar biru `#2563eb`, notifikasi feedback alert (sukses/gagal), dan kotak edukasi warga berlatar `#eff6ff`.

- **Penyelarasan Header Biru & Model Card Tab Kuota (`TabKuotaPelanggan.jsx`)**:
  - **Preservasi Maskot & Brand TeknoCust**: Header atas biru membentang penuh (`shrink-0 relative overflow-hidden bg-[#2563eb]`) mempertahankan maskot dinamis `PortalActiveMascot` di kiri atas, judul brand `TeknoCust`, dan deskripsi resmi *"Portal Layanan Mandiri Pelanggan TeknoIndonet"*, serta tombol lonceng notifikasi di kanan atas.
  - **Model Card Pertama Identik Card Beranda**: Bagian atas Card Total Pemakaian kini menggunakan styling identik Card Kualitas Sinyal Beranda:
    - Background gradient `linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(255, 255, 255) 100%)`.
    - Radial glow biru halus di sudut kanan atas.
    - Maskot interaktif kompak (`w-20 h-16`) di pojok kanan atas yang bereaksi dinamis sesuai kondisi pelanggan.
    - Judul di sebelah kiri dengan icon bar chart biru berlatar `bg-blue-100` dan padding `pr-24`.
    - Bagian bawah menampilkan metrik angka GB, progress bar pemakaian, paket aktif, dan strip edukasi bebas FUP.

- **Pembaruan Beranda Pelanggan & Mesin Maskot Dinamis Berbasis Event & Rotasi (`TabBerandaPelanggan.jsx` & `PortalActiveMascot.jsx`)**:
  - **Header Navigasi Utuh**: Mempertahankan header navbar atas `TeknoCust` bersama sticky bottom navigation 5-tab.
  - **Kartu Kualitas Sinyal Presisi & Maskot Kompak**: Kartu utama menampilkan metrik real-time (*Daya Terima dBm, Suhu ONT °C, Latensi ms*) dengan maskot berukuran kompak dan manis di pojok kanan atas berlatar radial glow.
  - **Mesin Maskot Dinamis 7 Event Aktivitas**:
    1. `gangguan.html` aktif otomatis jika redaman optik >= -28.0 dBm (kondisi redaman drop/kritis/LOS).
    2. `marah.html` disiapkan untuk status pelanggan yang menunggak/belum bayar tagihan.
    3. `gembira.html` aktif saat status tagihan sudah lunas.
    4. `sedih.html` aktif jika akun pelanggan berstatus nonaktif.
    5. `pelanggan.html` aktif ketika pelanggan baru saja melaporkan tiket kendala (`MENUNGGU`).
    6. `layanan-pelanggan.html` aktif ketika keluhan sedang dicek oleh admin CS NOC (`DICEK_ADMIN`).
    7. `teknisi.html` aktif saat laporan keluhan sedang ditangani oleh teknisi di lapangan (`DIPROSES`).
  - **Rotasi Otomatis 5 Menit Sekali**: Jika tidak ada event darurat, sistem otomatis merotasi 6 varian maskot santai bergantian setiap 5 menit (`menyapa` -> `rekomendasi` -> `analisis-redaman` -> `percaya-diri` -> `tersipu` -> `bosan`).
  - **Optimasi Ukuran Maskot Global**: Memperkecil skala maskot pada halaman Login, Lupa Password, dan Beranda agar proporsional dan tidak menutupi informasi penting formulir.

- **Modularisasi & Pemisahan File CSS Maskot (`frontend/src/styles/mascots/`)**:
  - **Ekstraksi CSS Mandiri Per Maskot**: Seluruh stylesheet animasi dan rigging dari 33 maskot HTML di `media/` dipisahkan menjadi file CSS mandiri di `frontend/src/styles/mascots/` (seperti `mascot-menyapa.css`, `mascot-pusing.css`, `mascot-teknisi.css`, dsb.) dengan index barrel loader.
  - **Sanitasi `frontend/src/index.css`**: Menghapus seluruh ratusan baris keyframes dan class rigging maskot dari `index.css` agar styling global aplikasi tetap ramping, bersih, dan mudah dikelola.
  - **Import Terisolasi Pada Komponen**: Komponen portal seperti [PortalAuthView.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/portal/components/PortalAuthView.jsx) dan [PortalResetPasswordView.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/portal/components/PortalResetPasswordView.jsx) kini mengimpor file CSS maskot masing-masing secara terpisah tanpa saling mempengaruhi komponen lain.

- **Redesain Antarmuka Login Portal Pelanggan TeknoCust (`PortalAuthView.jsx`)**:
  - **Arsitektur Dual-Panel Mobile Shell Kompak & Terfokus Pada Form**:
    - **Panel Atas Kompak (Header & Identitas Visual)**: Dibuat lebih ringkas (`h-[175px] sm:h-[195px]`) agar prioritas visual utama berfokus penuh pada formulir login tanpa terpotong di layar HP.
    - **Logo Resmi Frame 36**: Menambahkan logo resmi ISP `Frame 36.png` di sisi kiri teks brand `TeknoCust` pada top bar mini, berdampingan dengan badge status *Portal Pelanggan*.
    - **Maskot Animasi "Si Router Menyapa" (`menyapa.html`)**: Menggantikan logo statis di tengah panel biru dengan karakter maskot SVG interaktif berbasis rigging mulus 3 detik yang melambaikan tangan kanan menyapa pelanggan, mata melirik & berkedip, antena bergerak, serta lampu indikator LED hijau yang berdenyut aktif.
    - **Panel Bawah (Card Putih Overlapping & Form Login)**: Formulir login, tombol masuk bergradien, toggle lihat sandi, checkbox *Ingat Saya*, serta accordion *Informasi Masuk Pelanggan* kini tampil utuh dan pas 1 layar penuh (*above the fold*) pada berbagai resolusi perangkat seluler.

- **Redesain Antarmuka Bantuan Lupa Password (`PortalResetPasswordView.jsx`)**:
  - **Penyelarasan Desain dengan Halaman Login**: Mengadopsi arsitektur dual-panel yang selaras, memuat header brand `Frame 36.png`, teks `TeknoCust`, dan subtitle *"Layanan Mandiri Khusus Pelanggan TeknoIndonet"*.
  - **Maskot Animasi "Si Router Pusing" (`pusing.html`)**: Menampilkan karakter router SVG interaktif berekspresi pusing (mata berputar spiral, mulut bergelombang, tangan menempel di kepala, LED oranye, serta animasi bintang-bintang kuning melayang dan berputar di atas kepala).
  - **Judul Terpusat & Konten Panduan**: Mengusung judul **`Lupa Password`**, panduan pemulihan akun oleh Admin NOC, serta tombol *"Kembali ke Halaman Masuk"* yang responsif dan interaktif.

- **Pemisahan Halaman Login Mandiri (`HalamanLogin.jsx`) & Fitur Ingat Saya (30 Hari Inaktivitas)**:
  - **Modularisasi Komponen Mandiri**: Memisahkan antarmuka login dari [App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx) ke file mandiri [HalamanLogin.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/HalamanLogin.jsx) di folder `frontend/src/components/`, merapikan hierarki kode dan menyederhanakan maintainability komponen root.
  - **Fitur Checkbox Ingat Saya**:
    - Menambahkan checkbox *Ingat Saya* di form login dengan keterangan: *"Sesi aktif otomatis selama 30 hari sejak akses terakhir"*.
    - Terintegrasi dengan backend FastAPI via parameter `remember_me` di `POST /api/auth/login`. Jika dicentang, cookie sesi disetel dengan masa berlaku 30 hari (`max_age=2.592.000` detik); jika tidak, disetel sebagai *session cookie* (otomatis kedaluwarsa begitu browser ditutup).
  - **Proteksi Inaktivitas 30 Hari (Auto Logout)**:
    - Melacak waktu terakhir aplikasi dibuka (`edtekno_last_active_time`).
    - Jika pengguna tidak pernah membuka aplikasi selama 30 hari berturut-turut (`> 30 * 24 * 3600 * 1000` ms), sistem otomatis menghanguskan sesi lokal dan cookie serta mengarahkan pengguna kembali ke halaman login.
    - Setiap kali pengguna aktif membuka atau me-refresh aplikasi, waktu aktif diperbarui secara otomatis (*Sliding Expiration Window*).

- **Penyelarasan URL Browser & REST API Sesuai Nama Navigasi**:
  - **Kesesuaian 100% Nama Navigasi ke URL Browser (SPA Routing)**:
    - `Beranda` -> `/`
    - `Riwayat Redaman` -> `/riwayat` (sebelumnya `/logs`)
    - `Pemakaian Kuota` -> `/kuota` (sebelumnya `/admin/kuota`)
    - `Data Pelanggan` -> `/pelanggan` (tetap `/pelanggan`)
    - `Tiket Keluhan` -> `/tiket` (sebelumnya `/admin/tiket`)
    - `Log Aktivitas Audit` -> `/log` (sebelumnya `/activity-logs`)
    - `Manajemen Pengguna` -> `/pengguna` (sebelumnya `/users`)
    - `Pengaturan Sistem` -> `/pengaturan` (sebelumnya `/settings`)
    - Path lama tetap didukung di [App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx) sebagai alias/fallback agar tidak memutus tautan yang sudah tersimpan atau bookmark.
  - **Kesesuaian Endpoint REST API Backend**:
    - Data Pelanggan: `/api/pelanggan` (di [routes.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/routes.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Riwayat Redaman: `/api/riwayat` (di [routes.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/logs_mgmt/routes.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Pemakaian Kuota: `/api/kuota` (di [main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Tiket Gangguan: `/api/tiket` (di [main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Log Aktivitas: `/api/log` (di [main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Pengguna: `/api/pengguna/list` (di [main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
    - Pengaturan: `/api/pengaturan` (di [routes.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/settings/routes.py) & [api.js](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/services/api.js))
  - **Pembersihan Modul Pengaturan**: Menghapus badge counter pada tab sidebar Kredensial ONT dan menampilkan Kantor Layanan sebagai teks biasa tanpa uppercase penuh.

  - Memastikan seluruh modul aplikasi web NOC (`TeknoGuard`) dan Portal Mandiri Pelanggan (`TeknoCust`) secara konsisten menggunakan keluarga huruf **Roboto Flex** (`--font-sans: 'Roboto Flex', sans-serif`).
  - Menetapkan deklarasi eksplisit `font-family: 'Roboto Flex'` pada `:root`, `html`, `body`, serta elemen formulir (`button`, `input`, `select`, `textarea`) di [index.css](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/index.css), menjamin perenderan tipografi seragam dan presisi di seluruh browser dan perangkat.

- **Penyelarasan Tipografi Roboto Flex & Audit Impeccable Modul Pengaturan (`ModulPengaturan.jsx`)**:
  - **Eliminasi AI Tell Warna Gradien & AI Palette**: Mengubah seluruh tombol simpan (Tab 1, Tab 2, Tab 3, dan Tab 4) dari gradien multi-stop (`bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600`) menjadi warna solid profesional `bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm`. Mengganti latar avatar pengguna pada profil dari gradien menjadi `bg-cyan-700 text-white`.
  - **Eliminasi Total Pola Nested Cards (AI Tell)**:
    - Menyederhanakan kontainer ketentuan ambang batas redaman pada Tab 1 menjadi seksi border-left semantik (`border-emerald-500`, `border-amber-500`, `border-rose-500`) tanpa kotak kartu bertingkat di dalam kartu (`card inside card`).
    - Menyederhanakan kotak panduan fallback multi-kredensial Tab 2 menjadi divider `border-t` dengan list indent rapi.
    - Menghilangkan kontainer kartu bertingkat pada opsi notifikasi & jam tenang Tab 3 menjadi baris divider form semantik.
    - Menghapus kontainer kartu sekunder pada Profil & Ubah Sandi Tab 4 menjadi seksi terpadu langsung pada kontainer form utama.
  - **Peningkatan Kontras & Keterbacaan Teks (WCAG AA >= 4.5:1)**:
    - Menaikkan heading sidebar menu dan judul seksi dari `text-slate-400 font-extrabold` (2.6:1) menjadi `text-slate-700 font-black` (> 5.5:1).
    - Memperbaiki teks deskripsi, petunjuk form, dan helper text dari warna pudar `text-slate-400` menjadi `text-slate-600 font-sans` atau `text-slate-700 font-bold`.
    - Menaikkan label identitas profil (ID Pengguna, Username, Kantor, WA, Hak Akses) dari `text-slate-500` menjadi `text-slate-600 font-medium`.
  - **Peningkatan Tipografi Fungsional & Eliminasi Tiny Body Text**:
    - Menaikkan sublabel pada mobile tabs switcher (`30m • -26dBm`, `1 Akun`, `Getar Aktif`) dari `text-[10px]` ke `text-[11px] font-mono font-medium text-slate-600` (memenuhi standar minimum 11px floor).
    - Menaikkan teks hint jam tenang notifikasi (`Default: 22:00 WIB`, `Default: 06:00 WIB`) dari `text-[10px]` ke `text-[11px] font-mono font-medium text-slate-600`.
    - Menaikkan teks hint dropdown ubah kata sandi dari `text-[10px]` ke `text-[11px] font-medium text-slate-600`.
    - Mengupgrade seluruh body text deskriptif redaman dan panduan fallback dari `11px` ke ukuran standar minimum body text `text-xs` (12px).

- **Integrasi Pagination, Tipografi Roboto Flex & Audit Impeccable Modul Manajemen Pengguna (`ModulManajemenPengguna.jsx`)**:
  - **Eliminasi AI Tell Warna Gradien**: Mengubah tombol aksi `"Tambah User"` dari gradien multi-stop (`bg-gradient-to-r from-cyan-600 to-sky-600`) menjadi warna solid profesional `bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm`.
  - **Integrasi Penuh Bar Navigasi Pagination**: Mengintegrasikan bar navigasi paginasi pada `DataTableContainer` lengkap dengan props `page`, `totalPages`, `totalCount`, `onPrevPage`, dan `onNextPage` (15 baris per halaman), memberikan kontrol paginasi standar penuh bagi data master pengguna sistem.
  - **Resolusi Z-Index Stacking Context Popover Filter**: Membungkus seluruh wadah filter dengan `relative z-30` dan menaikkan popover dropdown ke `z-50 border-slate-300 shadow-xl` dengan penutup backdrop klik-luar (`fixed inset-0 z-40`), memastikan menu filter melayang mulus di atas header dan baris tabel tanpa tertumpuk ke bawah.
  - **Peningkatan Tipografi Fungsional Header Kolom (Undersized Functional Text)**: Menaikkan seluruh label header kolom tabel (`No`, `Username / Nama`, `Kontak WA`, `Role Sistem`, `Wilayah Kantor`, `Status`, `Aksi`) dari `text-[10px]` ke `text-[11px] font-mono font-bold text-slate-700` (memenuhi standar minimum 11px floor).
  - **Perbaikan Kontras & Keterbacaan Teks Sel Tabel (WCAG AA >= 4.5:1)**:
    - Menaikkan heading dropdown filter `"Role Pengguna:"` dan `"Status Akun:"` dari warna pudar `text-[10px] text-slate-400` (2.6:1) menjadi `text-[11px] font-black uppercase text-slate-700` (> 5.5:1).
    - Menaikkan tombol filter status (`Semua`, `Aktif`, `Nonaktif`) dan tombol aksi popover (`Reset Filter`, `Terapkan`) ke `text-[11px] font-bold` dengan kontras tinggi.
    - Menaikkan teks nama lengkap karyawan dari `text-[10px] text-slate-500` menjadi `text-xs text-slate-600 font-sans`.
    - Menaikkan badge kontak WA dari `text-[11px] px-2 py-0.5` menjadi `text-xs px-2.5 py-1 border-emerald-300 font-semibold`.
    - Menaikkan badge role sistem (`super admin`, `admin`, `teknisi`) dari `text-[10px]` ke `text-[11px] font-bold uppercase px-2.5 py-1 border-purple-300 / border-cyan-300`.
    - Menaikkan badge status (`AKTIF`, `NONAKTIF`) dari `text-[10px]` ke `text-[11px] font-black uppercase px-2.5 py-1` dengan kontras tinggi.
  - **Tata Letak Kolom Presisi**: Menerapkan kelas `table-auto md:table-fixed` dengan lebar kolom proporsional untuk mencegah horizontal overflow.

- **Penyelarasan Tipografi Roboto Flex & Audit Impeccable Modul Log Aktivitas (`ModulLogAktivitas.jsx`)**:
  - **Peningkatan Tipografi Fungsional Header Kolom (Undersized Functional Text)**: Menaikkan seluruh label header kolom tabel (`No`, `Waktu Kejadian`, `Pengguna`, `Aksi / Tindakan`, `Keterangan Audit`, `Alamat IP`, `Status`) dari `text-[10px]` ke `text-[11px] font-mono font-bold text-slate-700` (memenuhi standar minimum 11px floor).
  - **Perbaikan Kontras & Keterbacaan Teks Sel Tabel (WCAG AA >= 4.5:1)**:
    - Menaikkan teks nama pengguna / daemon sistem dari warna pudar `text-[10px] text-slate-400` (2.6:1) menjadi `text-xs text-slate-600 font-sans` (> 5.2:1).
    - Menaikkan teks timestamp kejadian dan alamat IP dari `text-[11px] text-slate-500` menjadi `text-xs text-slate-600 font-mono`.
    - Menaikkan badge aksi audit dari `text-[10px] px-2 py-0.5` menjadi `text-xs font-bold font-mono px-2.5 py-1 border-slate-300`.
    - Menaikkan badge status (`SUCCESS`, `ERROR`) dari `text-[10px]` ke `text-[11px] font-black uppercase px-2.5 py-1` dengan kontras tinggi (`text-emerald-800 border-emerald-300`, `text-rose-800 border-rose-300`).
  - **Penyelarasan Popover Filter Rentang Waktu**: Menggantikan border difus dan heading `text-[10px]` pada popover dropdown dengan border terdefinisi (`border-slate-300`), heading `text-[11px] font-black uppercase text-slate-700`, dan tombol opsi aktif solid (`bg-cyan-700 text-white font-bold`).
  - **Tata Letak Kolom Presisi**: Menerapkan kelas `table-auto md:table-fixed` dengan lebar kolom terdefinisi untuk mencegah horizontal overflow.

- **Integrasi Pagination, Tipografi Roboto Flex & Audit Impeccable Modul Tiket Keluhan (`ModulTiketKeluhan.jsx`)**:
  - **Integrasi Bar Navigasi Pagination Terpadu**: Mengintegrasikan bar navigasi paginasi pada `DataTableContainer` lengkap dengan props `page`, `totalPages`, `totalCount`, `onPrevPage`, dan `onNextPage` (15 baris per halaman), memberikan kontrol paginasi standar penuh bagi daftar tiket keluhan warga.
  - **Peningkatan Tipografi Fungsional Header Kolom (Undersized Functional Text)**: Menaikkan seluruh label header kolom tabel (`No`, `No. Tiket / Waktu`, `Pelanggan`, `Kategori Kendala`, `Deskripsi Keluhan`, `Rx Saat Lapor`, `Status`, `Aksi`) dari `text-[10px]` ke `text-[11px] font-mono font-bold text-slate-700` (memenuhi standar minimum 11px floor).
  - **Perbaikan Kontras & Keterbacaan Teks Sel Tabel (WCAG AA >= 4.5:1)**:
    - Menaikkan teks timestamp pembuatan tiket dari `text-[10px] text-slate-400` (2.6:1) menjadi `text-xs text-slate-600 font-mono` (> 5.2:1).
    - Menaikkan teks ID pelanggan dan nomor WhatsApp dari `text-[10px] text-slate-500` menjadi `text-xs text-slate-600 font-mono font-medium`.
    - Menaikkan badge kategori kendala dari `text-[10px] px-2 py-0.5` (cramped padding) menjadi `text-xs font-bold font-mono px-2.5 py-1 border-slate-300` (memenuhi standar padding >= 4px).
    - Menaikkan badge status (`MENUNGGU`, `DICEK_ADMIN`, `DIPROSES`, `SELESAI`) dari `text-[10px]` ke `text-[11px] font-black uppercase px-2.5 py-1` dengan kontras warna teks dan border terdefinisi.
  - **Tata Letak Kolom Presisi**: Menerapkan kelas `table-auto md:table-fixed` dengan lebar kolom proporsional untuk mencegah horizontal overflow.

- **Penyelesaian Audit Impeccable, Filter Stacking & Integrasi Pagination Modul Pelanggan (`ModulPelanggan.jsx`)**:
  - **Eliminasi AI Tell Warna Gradien**: Mengubah tombol aksi `"Tambah"` dari gradien multi-stop (`bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600`) menjadi warna solid profesional `bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm`.
  - **Integrasi Penuh Bar Navigasi Pagination**: Mengintegrasikan bar navigasi pagination pada `DataTableContainer` dengan props `page`, `totalPages`, `totalCount`, `onPrevPage`, dan `onNextPage` (15 baris per halaman), memberikan kontrol paginasi standar penuh bagi daftar master pelanggan.
  - **Resolusi Z-Index Stacking Context Popover Filter**: Membungkus seluruh wadah filter dengan `relative z-30` dan menaikkan popover dropdown ke `z-50 border-slate-300 shadow-xl` dengan penutup backdrop klik-luar (`fixed inset-0 z-40`), memastikan menu filter selalu melayang mulus di atas header dan baris tabel tanpa tertumpuk ke bawah.
  - **Peningkatan Tipografi Fungsional Header Kolom (Undersized Functional Text)**: Menaikkan seluruh label header kolom tabel (`No`, `ID Pelanggan`, `Nama Pelanggan`, `IP & Wilayah`, `WiFi & Admin ONT`, `Redaman (dBm)`, `Status`, `Aksi`) dari `text-[10px]` ke `text-[11px] font-mono font-bold text-slate-700` (memenuhi standar minimum 11px floor).
  - **Perbaikan Kontras & Keterbacaan Teks Sel Tabel (WCAG AA >= 4.5:1)**:
    - Menaikkan teks sublabel alamat pelanggan dari `text-[10px] text-slate-400` (2.6:1) menjadi `text-xs text-slate-600 font-sans` (> 5.2:1).
    - Menaikkan teks POP, kantor cabang, dan kredensial modem dari `text-[10px] text-slate-400` menjadi `text-[11px] text-slate-600 font-mono font-medium`.
    - Menaikkan badge status (`NORMAL`, `WARNING`, `CRITICAL`, `LOS`) dari `text-[10px]` ke `text-[11px] font-black uppercase` dengan kontras warna teks dan border terdefinisi.
    - Menaikkan tombol *"Uji Sinyal"* dari `text-[10px]` ke `text-[11px] font-bold text-cyan-900 bg-cyan-50 border-cyan-300 hover:bg-cyan-700 hover:text-white`.

- **Penyelarasan Navigasi, Stacking & Impeccable Audit Modul Pemantauan Kuota (`ModulPemantauanKuota.jsx` & `App.jsx`)**:
  - **Eliminasi AI Tell Nested Card pada Header**: Meratakan wadah office switcher di top navigation [`App.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx) (`bg-white/60 border border-sky-200`) untuk menghilangkan tumpukan kartu ganda di dalam header.
  - **Integrasi Bar Navigasi Pagination**: Mengintegrasikan bar pagination terpadu pada `DataTableContainer` lengkap dengan props `page`, `totalPages`, `totalCount`, `onPrevPage`, dan `onNextPage` (15 baris per halaman), selaras dengan modul tabel lainnya di TeknoGuard NOC.
  - **Resolusi Stacking Context & Text Occlusion Filter Popover**: Membungkus filter bar dengan `relative z-30` dan popover dropdown dengan `z-50` agar melayang di atas tabel tanpa menutupi atau tertumpuk di bawah header tabel.
  - **Peningkatan Tipografi Fungsional & Kontras WCAG AA**:
    - Menaikkan teks alamat pelanggan dari warna pudar `text-slate-400` (2.6:1) menjadi `text-xs text-slate-600` (kontras > 5.2:1).
    - Menaikkan badge status `UNLIMITED` dari `text-[10px]` ke `text-[11px] font-black uppercase bg-emerald-50 text-emerald-800 border-emerald-200` (memenuhi 11px floor).
    - Memastikan font Roboto Flex terdistribusi secara konsisten ke seluruh teks body dan tabel.
  - **Tata Letak Kolom Presisi**: Menerapkan kelas `table-auto md:table-fixed` dengan lebar kolom proporsional untuk mencegah horizontal overflow.

- **Penyelesaian Audit Impeccable Modul Riwayat Redaman (`ModulRiwayatRedaman.jsx` & `CommonUI.jsx`)**:
  - **Eliminasi Hairline Border with Wide Shadow**: Menggantikan border tipis 0.8px dan efek bayangan terlalu difus (`shadow-2xl` 50px blur) pada popover dropdown dengan border tegas terdefinisi (`border-slate-300`) dan bayangan natural (`shadow-lg`).
  - **Eliminasi Glowing Shadow Accents**: Merapikan active indicator glow menjadi solid ring (`ring-1 ring-black/5` dan border solid) yang ramah kontras tanpa efek pendar neon buatan.
  - **Pencegahan Teks Terhalang (Text Occlusion)**: Memperbaiki backdrop overlay (`fixed inset-0 z-40`) dan menaikkan container popover ke `z-50` dengan styling button item yang solid (`hover:bg-slate-100`, text `font-medium`) sehingga teks rentang waktu terbaca utuh dan tidak terdistorsi elemen tabel di bawahnya.
  - **Eliminasi Nested Cards di Footer Tabel**: Meratakan wadah navigasi pagination `DataTableContainer` pada [`CommonUI.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/CommonUI.jsx) dengan menghapus background `bg-cyan-50/30`, menjadikannya bagian seamless dari kontainer tabel tanpa kesan kartu bertumpuk.
  - **Peningkatan Ukuran Teks Fungsional (Undersized Functional Text)**: Menaikkan seluruh label header kolom tabel (`No`, `Waktu Cek`, `ID Pelanggan`, `Nama Pelanggan`, `IP Router ONT`, `Daya Rx (dBm)`, `Suhu`, `Latency`, `Status`) dari `text-[10px]` ke `text-[11px] font-mono font-bold text-slate-700` (memenuhi batas minimum 11px floor).
  - **Perbaikan Kontras Popover Filter (Low Contrast Text)**: Memperbaiki kontras teks heading popover `"Pilih Rentang Waktu:"` dari warna pudar `#90a1b9` (2.6:1) menjadi `text-[11px] font-black uppercase text-slate-700` dengan rasio kontras > 5.5:1 (lolos WCAG AA >= 4.5:1).

- **Pembersihan Nested Cards & Border Stacking Modul Beranda (Impeccable Audit)**:
  - **Eliminasi Nested Cards di Kontrol Chart**: Meratakan kontainer pembungkus filter tanggal dan tombol segmented range grafik di [`ModulBeranda.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx) menjadi kontrol inline flat tanpa wadah border bertumpuk.
  - **Eliminasi Nested Cards di Grid Pintasan Bawah**: Meratakan dua kartu pintasan master pelanggan dan tiket aduan (`div.grid.grid-cols-2`) menjadi tile interaktif solid (`bg-white border border-sky-200`) tanpa penumpukan elevasi kartu ganda.

- **Migrasi Tipografi ke Google Fonts Roboto Flex (Material You / Wear OS Design)**:
  - **Penyelarasan Font Utama Sistem**: Menggantikan font keluarga `Inter` dengan **`Roboto Flex`** (`wght@100..1000` variable font) pada [`index.html`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/index.html), mendaftarkan token `--font-sans` pada `@theme` Tailwind CSS v4 di [`index.css`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/index.css), dan menetapkannya sebagai fallback utama sistem.
  - **Dukungan Tipografi Grafik Telemetri**: Mengintegrasikan `Roboto Flex` ke sumbu ordinat dan absis serta tooltip Chart.js di [`ModulBeranda.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx) untuk konsistensi pembacaan data telemetri optik.

- **Penyelesaian Audit Impeccable & Anti-Slop (Konsistensi Kontras WCAG AA, Tipografi Fungsional, & Eliminasi AI Palette)**:
  - **Resolusi Masalah Missing Module Backend**:
    - Menambahkan file konfigurasi [`.vscode/settings.json`](file:///d:/databaru/Magang/EdTeknoGuard/.vscode/settings.json) dengan parameter `python.defaultInterpreterPath` yang mengarah ke instalasi Python 3.14 sistem pengguna, memperbaiki deteksi interpreter bawaan Inkscape yang menyebabkan error `Cannot find module` pada FastAPI, SQLAlchemy, dan bcrypt.
  - **Penyelesaian Temuan Impeccable Refinement**:
    - **Undersized Functional Text**: Badge `Batas: -26.0 dBm` dinaikkan dari `9px/10px` ke `text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border-amber-300` dengan rasio kontras 6.2:1.
    - **Low Contrast Buttons**: Tombol segmented range grafik (`Hari Ini`, `Kemarin`, `7 Hari`) di [`ModulBeranda.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx) diperbarui dari `#0092b8` menjadi `bg-cyan-700 text-white` (rasio kontras 5.1:1, lolos WCAG AA).
    - **Eliminasi Nested Cards (Card Inside Card)**: Meratakan header dan footer profil sidebar pada [`Navigation.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/Navigation.jsx), serta meratakan blok standby telemetri dan kartu navigasi cepat di [`ModulBeranda.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulBeranda.jsx).
  - **Eliminasi AI Gradient & Penegasan Palet Brand**:
    - Mengganti gradien artifisial (`from-cyan-600 to-sky-600`, `from-cyan-600 via-sky-600 to-blue-600`) pada tombol utama, icon wrapper, progress bar, dan mobile navigation center button dengan warna solid terarah (`bg-cyan-700`, `text-cyan-900`) yang memiliki kontras tinggi dan konsisten.
  - **Peningkatan Batas Minimum Ukuran Teks Fungsional (>= 11px)**:
    - Seluruh elemen teks fungsional mikro yang sebelumnya berukuran 9px dan 10px (header sidebar `NOC RESMI NOC`, status badge `AKTIF`, judul seksi menu, role user, label kantor di header, 8 tombol Menu Layanan mobile, badge indikator threshold, chip summary telemetri, zoom controls, dan legend footer chart) dinaikkan ke standar minimum `text-[11px]` font-mono/sans tebal.
  - **Peningkatan Rasio Kontras Teks (WCAG AA >= 4.5:1)**:
    - Memperbaiki kontras teks di atas permukaan terang dari `#90a1b9` (2.6:1) dan `#ffffff` pada background cyan muda menjadi warna solid berbobot tinggi seperti `text-slate-800`, `text-cyan-950`, `text-emerald-800`, `text-rose-800`, dan `text-amber-800` (rasio kontras > 5:1).
  - **Kerapian Touch Target Mobile Nav (>= 48px)**:
    - Mengoptimalkan ketinggian Sticky Bottom Navigation mobile di [`Navigation.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/Navigation.jsx) menjadi `h-16` dengan touch target tombol `min-h-[48px]` dan ikon `w-5 h-5` ramah jempol.

- **Penyusunan Rapi Kolom Tabel Pelanggan, Modal Detail Pribadi & Integrasi Pesan WhatsApp**:
  - **Tata Letak Tabel Ringkas & Fungsional NOC** ([`ModulPelanggan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx)):
    - Kolom tabel disederhanakan dan disusun proporsional: `No`, `ID Pelanggan`, `Nama Pelanggan` (dengan alamat ringkas), `IP & Wilayah` (IP Router + POP + Badge Kantor), `WiFi & Admin ONT` (Nama SSID WiFi & Akun Modem), `Redaman (dBm)`, `Status`, dan `Aksi`.
    - **Modal Detail Pelanggan & Kontak WhatsApp**: Aksi dropdown "Detail Pelanggan" dan klik nama pelanggan membuka modal detail lengkap (Nomor WhatsApp, Paket Layanan, Server POP, Alamat Fisik + Titik GPS Maps, Kredensial WiFi SSID/Password, IP ONT & Jenis Modem) dilengkapi tombol langsung **"Kirim Pesan WA"** (`https://wa.me/62...`).
  - **Aksi Hubungi Pelanggan di Tiket Keluhan** ([`ModulTiketKeluhan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulTiketKeluhan.jsx)):
    - Menu dropdown aksi titik tiga (`...`) dilengkapi opsi **"Hubungi WA"** dengan template pesan WhatsApp terformat otomatis memuat nomor tiket, kategori, dan deskripsi gangguan pelanggan.
  - **Navigasi Silang Nama Pelanggan Antar-Modul**:
    - Di modul **Riwayat Redaman** ([`ModulRiwayatRedaman.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulRiwayatRedaman.jsx)), **Pemantauan Kuota** ([`ModulPemantauanKuota.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPemantauanKuota.jsx)), dan **Tiket Keluhan** ([`ModulTiketKeluhan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulTiketKeluhan.jsx)), seluruh nama pelanggan yang tampil dapat diklik langsung untuk mengarahkan pengguna ke halaman **Data Pelanggan** dengan filter pencarian otomatis sesuai nama pelanggan terkait.

- **Sorting Kolom Interaktif & Bulk Action Bar (Hapus Terpilih & Batal)**:
  - **Tabel Tanpa Checkbox**:
    - [`ModulRiwayatRedaman.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulRiwayatRedaman.jsx): Checkbox dibersihkan, sorting kolom terintegrasi ke backend (`sort_by`, `sort_dir`), kolom `No` urut rapi.
    - [`ModulPemantauanKuota.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPemantauanKuota.jsx): Checkbox dibersihkan, sorting kolom ID Pelanggan, Nama, Paket, Total GB, kolom `No` urut rapi.
    - [`ModulTiketKeluhan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulTiketKeluhan.jsx): Checkbox dibersihkan, sorting kolom ID Tiket, Nama Pelanggan, Kategori, Redaman, Status Tiket, kolom `No` urut rapi.
    - [`ModulLogAktivitas.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulLogAktivitas.jsx): Checkbox dibersihkan, sorting kolom Waktu, User, Aksi, Status terhubung ke backend, kolom `No` urut rapi.
  - **Tabel Dengan Checkbox & Bulk Action Bar**:
    - [`ModulPelanggan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPelanggan.jsx): Sorting kolom ID, Nama, IP, POP, Redaman, Status; saat baris dicentang muncul Bar Aksi di atas tabel dengan tombol **"Hapus Terpilih (X)"** (dengan konfirmasi bahaya CASCADE) dan **"Batal"**.
    - [`ModulManajemenPengguna.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulManajemenPengguna.jsx): Sorting kolom Username, Role, Status; saat baris dicentang muncul Bar Aksi di atas tabel dengan tombol **"Hapus Terpilih (X)"** (proteksi akun super admin) dan **"Batal"**.

- **Standardisasi Tabel Data (No Urut, Checkbox Seleksi Baris, & Menu Aksi Titik Tiga)**:
  - **Penambahan Kolom Nomor Urut (`No`)**: Menambahkan kolom penomoran urut otomatis dinamis di seluruh tabel data:
    1. *Riwayat Redaman* (`ModulRiwayatRedaman.jsx`)
    2. *Pemantauan Kuota* (`ModulPemantauanKuota.jsx`)
    3. *Data Master Pelanggan* (`ModulPelanggan.jsx`)
    4. *Tiket Keluhan Warga* (`ModulTiketKeluhan.jsx`)
    5. *Log Audit Aktivitas* (`ModulLogAktivitas.jsx`)
    6. *Manajemen Pengguna* (`ModulManajemenPengguna.jsx`)
  - **Penambahan Checkbox Seleksi Baris**: Menyediakan *select all* di header tabel serta checkbox individual di setiap baris data untuk konsistensi seleksi.
  - **Menu Aksi Titik Tiga (Three Dots Menu)**: Menggantikan deretan tombol aksi langsung dengan menu dropdown titik tiga (Edit, Hapus, Kelola Status) yang bersih, modular, dan rapi pada modul Pelanggan, Tiket Keluhan, dan Manajemen Pengguna.

- **Penyempurnaan Hak Akses Switcher Multi-Kantor & Penambahan Kantor Dinamis**:
  - **Penyederhanaan Label Office Switcher**: Label opsi dropdown kantor di navbar diubah menjadi ringkas (`Pusat`, `Cabang`, `Banyumas`, dsb.) tanpa kata redundant "Kantor".
  - **Role-Based Office Switching (SOP Multi-Kantor)**:
    - `super admin`: Memiliki akses penuh ke seluruh kantor yang terdaftar di database.
    - `admin` & `teknisi`: Dropdown kantor di navbar dibatasi murni hanya pada kantor yang diizinkan oleh Super Admin (`allowed_kantor`). Kantor di luar izin tidak muncul di dropdown.
  - **Fitur Tambah Kantor Baru (Khusus Super Admin)**:
    - Menyediakan endpoint API `POST /users/api/kantor/add` dan tombol/modal UI *"Tambah Kantor"* di modul Manajemen Pengguna.
    - Kantor baru yang ditambahkan langsung aktif, tersimpan di database, dan otomatis memicu event pembaruan dropdown switcher di seluruh antarmuka secara instan dan aman.
    - Penyediaan endpoint `GET /users/api/kantor/list` untuk sinkronisasi dinamis daftar kantor di frontend dan backend.

- **Modularisasi & Peningkatan Wizard Import Data Pelanggan (`WizardImportPelanggan.jsx`)**:
  - **Pemisahan Komponen Mandiri**: Mengekstraksi wizard import data pelanggan dari `ModulPelanggan.jsx` menjadi file komponen mandiri [`WizardImportPelanggan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/WizardImportPelanggan.jsx).
  - **Penghapusan Opsi Kantor Wilayah Manual**: Menghapus field pemetaan kantor pada Langkah 2 karena kantor otomatis mengikuti kantor aktif yang sedang dibuka pengguna di navbar atas sesuai standar SOP multi-cabang.
  - **4 Kartu Metrik Filter Interaktif pada Langkah 3**: Menjadikan kartu metrik *Total Baris*, *Siap Diimpor (Valid)*, *Duplikat Terdeteksi*, dan *Tidak Lengkap (Error)* dapat diklik untuk menyaring tampilan baris pada tabel pratinjau secara instan.
  - **Logika Cerdas Toolbar Aksi Baris Terpilih**:
    - Toolbar hanya muncul ketika ada minimal 1 baris yang dicentang.
    - Jika ada baris duplikat yang tercentang: Tombol *"Generate ID Unik Otomatis"* dan *"Abaikan Baris Terpilih"* aktif untuk menyelesaikan konflik duplikasi. Tombol simpan baris dicegah/disembunyikan karena baris duplikat belum aman diproses.
    - Jika seluruh baris yang tercentang valid/aman: Hanya menampilkan tombol *"Simpan Baris Terpilih"*.
  - **Penyelarasan Kolom Tabel Pratinjau**: Menghilangkan kolom dropdown aksi redundant di tabel dan menambahkan kolom **No WA** di sebelah Nama Pelanggan untuk kejelasan informasi kontak.
  - **Step Indicator Header**: Penanda langkah di header modal diselaraskan menggunakan 3 kartu progres horizontal yang dinamis.


- **Normalisasi Database 3NF, Dekomposisi Entitas Perangkat ONT & Relasi Terpadu**:
  - **Dekomposisi Tabel Modem (`perangkat_ont`)**: Memecah atribut fisik modem (IP router, jenis modem, MAC address, redaman baseline, kredensial Web GUI ONT, dan password WiFi) dari tabel master `pelanggan` ke entitas baru `perangkat_ont` dengan relasi 1-to-1 dan `ON DELETE CASCADE`.
  - **Master Data Referensi**: Membuat tabel `kantors`, `pops`, dan `pakets` untuk normalisasi master wilayah operasional, POP jaringan, dan paket bandwidth layanan.
  - **Dokumentasi ERD 3NF Resmi**: Memperbarui berkas [db/schema.md](file:///d:/databaru/Magang/EdTeknoGuard/db/schema.md) yang memuat diagram Mermaid ERD ternormalisasi, kamus data lengkap untuk seluruh entitas, serta aturan integritas referensial.
  - **Integritas Relasi Berjenjang (*Cascade Deletion*)**: Memastikan seluruh tabel anakan pelanggan (`perangkat_ont`, `log_performa_ont`, `alert_logs`, `tiket_kendala`, `kuota_pelanggan`) terikat `ForeignKey("pelanggan.id_pelanggan", ondelete="CASCADE")` dan `cascade="all, delete-orphan", passive_deletes=True`.
  - **Optimasi Indexing Query Database**: Menambahkan indeks komposit pada tabel berukuran besar (`idx_pelanggan_waktu`, `idx_alert_pelanggan_waktu`, `idx_tiket_status_kantor`, `idx_tiket_pelanggan_waktu`, `idx_kuota_pelanggan_periode`, `idx_activity_user_action`, `idx_activity_action_created`).
  - **Penambahan Kontak WhatsApp Petugas (`no_wa`)**: Menambahkan kolom `no_wa VARCHAR(50) NULL` pada tabel `users`, model SQLAlchemy [`User`](file:///d:/databaru/Magang/EdTeknoGuard/app/db/models.py), endpoint backend API (`/users/api/list`, `/users/api/add`, `/users/api/edit`), serta antarmuka tabel dan form modal pada [`ModulManajemenPengguna.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulManajemenPengguna.jsx).

- **Pembaruan Top Header Bar (Ikon Lonceng Notifikasi & Menu Titik Tiga dengan Logout)**:
  - **Ikon Lonceng Notifikasi Cepat**: Menambahkan tombol lonceng di header atas dengan counter badge real-time untuk jumlah tiket keluhan yang belum dibaca (`unreadTickets`).
  - **Menu Dropdown Titik Tiga (`MoreVertical`)**: Menambahkan tombol menu titik tiga di pojok kanan header yang menyajikan ringkasan identitas akun (nama, username, role) dan tombol **Keluar Akun (Logout)** secara eksklusif dan terfokus.
  - **Pembaruan Status Sistem**: Menghapus teks "TiDB Cloud Aktif" dan menggantinya dengan indikator status dot hijau "Sistem Aktif" yang bersih dan netral.
  
- **Transformasi Halaman Personal / Akun Petugas (Desain Identik TeknoCust)**:
  - **Card Identitas Profil Modern**: Menyelaraskan tab *Personal* pada [`ModulPengaturan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/ModulPengaturan.jsx) agar menggunakan layout card rounded-3xl bergradien identik dengan antarmuka TeknoCust (Avatar huruf inisial gradien cyan-blue, badge hijau *"Akun Terverifikasi"*, dan tombol *"Edit Data"*).
  - **Daftar Ringkasan Rapi (Key-Value List)**: Menampilkan ID Pengguna, Username Login, Badge Wilayah Kantor Layanan (`bg-cyan-50 text-cyan-800`), Nomor WhatsApp petugas, dan Hak Akses / Peran.
  - **Inline Mode Edit Data Diri**: Tombol *"Edit Data"* membuka form inline untuk mengubah Nama Lengkap dan Nomor WhatsApp petugas secara cepat dengan feedback visual responsif.
  - **Expandable Card Ganti Kata Sandi**: Kartu accordion mandiri dengan header *"Ganti Kata Sandi Akun"* dan toggle *"Ubah Sandi / Tutup"* (animasi rotasi chevron) yang dapat dibuka/tutup tanpa membebani halaman.
  - **Tombol Logout Bersih Full-Width**: Tombol *"Keluar dari Akun TeknoGuard"* diposisikan di kartu bawah dengan aksen rose lembut (`bg-rose-50 border-rose-200 text-rose-700`).
  - **Desktop Tree Menu Bersarang (Sidebar Kolom Kiri)**: Pada layar desktop (`lg:block`), menu pengaturan tersaji dalam struktur pohon (*Tree Menu*) modular yang elegan dengan hierarki cabang *Personal* (`account`) dan *Pengaturan NOC* (`thresholds`, `credentials`, `notifications`) lengkap dengan badge jumlah kredensial dan indikator aktif.
  - **Integrasi Panduan Kontekstual & Logout Footer**: Card ketentuan ambang batas redaman dan cara kerja multi-kredensial fallback disematkan rapi di dalam masing-masing form tab, sementara tombol *"Keluar dari Sesi TeknoGuard"* diposisikan secara konsisten di bagian paling bawah halaman untuk semua pengguna.

- **Fitur Pembaruan Data Diri Mandiri Pelanggan (TeknoCust Portal)**:
  - **Edit Nomor WhatsApp / Telepon & Alamat Domisili**: Pelanggan kini dapat langsung mengubah nomor WhatsApp aktif dan alamat lengkap secara mandiri melalui tab Profil pada portal TeknoCust ([`TabProfilPelanggan.jsx`](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/portal/components/TabProfilPelanggan.jsx)).
  - **Penyimpanan Langsung ke Database Master**: Endpoint backend `POST /portal/api/profil/update` di [`api_router.py`](file:///d:/databaru/Magang/EdTeknoGuard/portal_pelanggan/api_router.py) memvalidasi dan memperbarui data master pelanggan di database TiDB / MySQL dengan respon status sukses dan auto-update state lokal frontend tanpa perlu refresh.
  - **Penyederhanaan Form Profil & Password**: Menghilangkan field ID Pelanggan redundan, menampilkan identitas kantor ISP terdaftar, mengintegrasikan toggle show/hide mata pada kedua inputan kata sandi baru, dan accordion collapsible "Klik untuk Ganti Kata Sandi".

- **Resolusi Penuh Konektivitas Vite Proxy & REST API Endpoints (Pemantauan Kuota, Tiket Keluhan, Manajemen Pengguna)**:
  - **Penyebab Utama Teridentifikasi & Diperbaiki**: Vite dev server (`frontend/vite.config.js`) sebelumnya hanya mem-proxy `/api` dan belum mendaftarkan prefix `/admin` serta `/users`, sehingga request data kuota, tiket, dan user di-intercept oleh Vite SPA port 3000 dan mengembalikan file HTML alih-alih data JSON FastAPI port 8000.
  - **Pembaruan Konfigurasi Proxy Vite (`vite.config.js`)**: Mendaftarkan `/admin` dan `/users` ke proxy target `http://127.0.0.1:8000`.
  - **Penyediaan Endpoint Alias Mandiri (`app/main.py`)**: Menambahkan rute alias `/api/kuota`, `/api/tiket`, dan `/api/users/list` agar dapat diakses baik melalui prefix `/api/*` maupun `/admin/api/*` dan `/users/api/*`.
  - **Pengujian Port 3000 & 8000 Terverifikasi 100% OK**: Seluruh request ke `/api/kuota` (112 data kuota), `/api/tiket` (4 tiket gangguan), dan `/users/api/list` (4 user NOC) sukses mengembalikan `HTTP 200 JSON`.

- **Sinkronisasi Beranda (Dashboard) dengan Style Visual & Design Tokens Baru**:
  - **Penyelarasan Style Warna & Font Card Baru**: Mengintegrasikan komponen token `ModuleHeader` dan `MetricCard` dari `CommonUI.jsx` pada `ModulBeranda.jsx` dengan estetika *frost cyan/sky glass*, tipografi `font-mono` & `font-black`, rounded `rounded-2xl`, border `border-sky-200/80`, serta badge status modern yang seragam dengan 7 modul lainnya.
  - **Kelengkapan Fitur Tetap 100% Utuh**: Command control bar, live progress bar ONT, 4 kartu metrik KPI, visualisasi Chart.js telemetri redaman dengan skala piecewise, filter rentang tanggal, quick shortcuts, dan integrasi penuh REST API backend.

- **Standarisasi Penamaan File Berbahasa Indonesia (Selaras dengan Antarmuka & Kaidah Antislop)**:
  - Mengubah seluruh nama berkas komponen frontend agar seragam 100% dengan istilah antarmuka sistem:
    1. `ModulBeranda.jsx` (sebelumnya `DashboardModule.jsx`)
    2. `ModulPelanggan.jsx` (sebelumnya `CustomersModule.jsx`)
    3. `ModulPengaturan.jsx` (sebelumnya `SettingsModule.jsx`)
    4. `ModulRiwayatRedaman.jsx` (sebelumnya `LogsModule.jsx`)
    5. `ModulTiketKeluhan.jsx` (sebelumnya `TicketsModule.jsx`)
    6. `ModulPemantauanKuota.jsx` (sebelumnya `QuotaModule.jsx`)
    7. `ModulLogAktivitas.jsx` (sebelumnya `ActivityLogsModule.jsx`)
    8. `ModulManajemenPengguna.jsx` (sebelumnya `UsersModule.jsx`)
  - **Penyelarasan Desain (CommonUI Tokens)**: Seluruh modul menggunakan `CommonUI.jsx` (`ModuleHeader`, `MetricCard`, `FilterContainer`, `DataTableContainer`) sehingga jenis font (*font-mono, font-bold, font-black*), ukuran kartu, border, dan padding seragam di semua menu.
  - Menghapus seluruh berkas komponen lama yang berbahasa Inggris agar repositori bersih dan mudah dimaintain.

- **Transformasi Penuh Nuansa & Arsitektur Visual (Optical Network Surveillance Identity — Impeccable Standards)**:
  - **Arsitektur Baru & Berbeda Total**: Mengganti template kartu lama dengan sistem pemantauan **Optical Network Surveillance** yang memuat **Kendali Sesi Pemantauan (Scan Control Deck)** dengan progress bar real-time, status OLT-ONLINE aktif, jam telemetri real-time, dan **Grafik Fluktuasi Redaman Optik (Rx Power dBm)** 24 jam.
  - **8 Pilar Navigasi Lengkap**: Mengintegrasikan 8 domain fungsional NOC (*Beranda, Riwayat Redaman, Pemantauan Kuota, Data Pelanggan, Tiket Keluhan, Log Aktivitas, Management Pengguna, Pengaturan Sistem*) dengan transisi instan.
  - **Drawer Navigasi Mobile Penuh & 5-Fast Bottom Dock**: Menyediakan drawer geser (*slide-in mobile drawer*) untuk akses seluruh menu sistem di ponsel, berdampingan dengan 5 tombol aksi cepat di dock bawah.
  - **Detail Telemetri Lapangan**: Bottom sheet inspeksi cepat yang menampilkan daya Rx, suhu ONT, POP ODP, alamat pasang, serta aksi telepon langsung teknisi ke pelanggan.
- **Pembaruan Gaya Tema: Emerald Mint & Crisp White (Impeccable Color System)**:
  - Mengubah identitas visual menjadi nuansa sistem telekomunikasi stabil dan segar berbasis **Emerald Mint (`#059669`)**, **Teal (`#0d9488`)**, dan **Crisp White (`#ffffff`)** dengan gradasi halus pada latar belakang (`from-emerald-50/40 via-white to-slate-50`).
  - Menyelaraskan seluruh aksen tombol utama, ikon shield brand lockup, pill switcher kantor, highlight filter status aktif, dan tombol tengah dock bawah ke spektrum warna Emerald Mint yang harmonis.
- **Optimasi Skala & Proporsi Kompak Mobile (Mobile Ergonomic Proportions)**:
  - **Perampingan Skala Elemen**: Menghilangkan kartu raksasa yang boros ruang vertikal. Tinggi navbar disesuaikan ke `h-14` (56px), padding kontainer dipadatkan ke `p-3`, dan margin disederhanakan (`space-y-3`).
  - **Bilah Aksi Kompak (Action Bar)**: Mengubah hero bar besar menjadi *inline status bar* ramping (`min-h-[36px]`) yang memuat scheduler status dan tombol scan cepat.
  - **4-Pill KPI Padat**: Ukuran kartu indikator status diringkas (`p-2.5`, font angka `text-xl`/`text-2xl`), muat 4 kartu tanpa mendorong konten ke bawah.
  - **Bottom Dock 5-Tab Ergonomis**: Tinggi dock disesuaikan ke `h-14` (56px) dengan tombol tengah *Beranda* `w-10 h-10` yang pas dan proporsional di layar ponsel.
- **Integrasi Penuh Tampilan Login & Dashboard/Beranda (React 19 + Impeccable Mobile-First)**:
  - **Halaman Login Cerah & Modern**: Desain form autentikasi berlatar putih bersih dengan ikon perisai heroik (`Shield`), input berlabel jelas, toggle lihat/sembunyikan kata sandi (`Eye`/`EyeOff`), validasi interaktif instan, dan tautan pintas ke Portal Pelanggan Warga (`TeknoCust`).
  - **Dashboard/Beranda NOC Terintegrasi**: Memuat bilah komando hero, 4 kartu KPI status filter interaktif, pencarian cepat, card stack telemetri mobile, bottom sheet detail pelanggan dengan aksi telepon langsung, dan sticky 5-tab dock.
  - **Sesi Otentikasi Interaktif**: Menyediakan mekanisme login/logout mulus dengan transisi instan tanpa reload halaman penuh.
- **Implementasi Desain Mobile-First Adaptif (Impeccable & Thumb-Zone Ergonomics)**:
  - **Responsive Layout Adaptation**: Otomatis mentransformasi tabel lebar di desktop menjadi tumpukan kartu telemetri (*card stack view*) di mobile dengan informasi padat dan mudah dipindai jempol.
  - **Area Sentuh Ramah Jempol (Touch Target >= 44x44 px)**: Seluruh tombol aksi, tab filter status, trigger scan (`min-h-[48px]`), dan bottom navigation bar memenuhi standar ergonomis sentuhan tanpa salah sentuh (*mis-tap*).
  - **Mobile Bottom Sheet Modal**: Modal detail teknis ONT membuka dari bawah (*slide-in from bottom*) dengan aksi cepat hubungi pelanggan langsung via telepon seluler.
  - **Office Switcher Mobile Dropdown**: Pemilih kantor cabang yang ringkas di navbar atas agar tidak memakan ruang horizontal layar HP.
  - **Notch & Safe Area Support**: Mengintegrasikan `env(safe-area-inset-bottom)` untuk tampilan sempurna di perangkat modern (iOS/Android).
- **Perombakan UI Total ke React 19 + Tailwind CSS (Tema Cerah / Bright Vibrant Enterprise & Impeccable Standards)**:
  - Mengganti tema gelap monoton lama menjadi **Bright Vibrant NOC Command Canvas** (`#f8fafc` / `#ffffff`) dengan aksen warna royal blue (`#2563eb`), emerald high-throughput (`#10b981`), amber warning (`#f59e0b`), dan rose critical (`#ef4444`).
  - Merancang ulang tata letak komponen: **Hero NOC Command Strip**, **Interactive 4-Pill Status Filter Gauges**, **Live Search & Telemetry Explorer Table**, **Interactive Slide-over / Modal Detail ONT**, dan **Dock Mobile 5-Tab Ergonomis**.
  - Menghilangkan layout klise lama dan menerapkan standar craft floor Impeccable (kontras rasio WCAG AA >= 4.5:1, tipografi tegas, natural elevations, dan zero-emoji SVG pure icons).
- **Pembaruan & Penyelarasan UI Impeccable Design System (Craft Floor & Antislop)**:
  - Mengimplementasikan standar kualitas antarmuka **Impeccable Design System** & **Antislop** secara komprehensif pada aplikasi TeknoGuard.
  - **Keterbacaan Tipografi (Typography Floor >= 11px)**: Memperbaiki seluruh teks fungsional mikro (label mobile dock, badge tag, dan sub-caption) dari 9px/10px ke standar floor minimal `>= 11px` (`text-[11px]`).
  - **Peningkatan Rasio Kontras (WCAG AA >= 4.5:1)**: Memperbaiki kontras teks placeholder form login (`#475569` pada latar putih, rasio 4.8:1) dan skala warna teks Tailwind (`text-50` s/d `text-950`).
  - **Eliminasi AI Design Clichés**: Menghilangkan efek *zero-offset chromatic halo glow* pada bayangan elemen gelap, mengganti transisi ke *natural exponential easing* (`cubic-bezier(0.16, 1, 0.3, 1)`), dan menyelaraskan struktur *branding lockup* pada header login.
- **Hak Akses & Otorisasi Pengaturan Sistem (`/settings` & `/pengaturan`)**:
  - Membuka akses menu dan endpoint **Pengaturan Sistem** (`/settings`, `/pengaturan`, `GET /api/settings`, `POST /api/settings`) untuk role **`admin`** di samping **`super admin`**, memungkinkan Admin Cabang/Pusat/Banyumas mengatur parameter monitoring, ambang batas redaman, dan kredensial modem ONT.
  - Mempertahankan menu **Manajemen Pengguna (`/users`)** eksklusif hanya untuk role **`super admin`**.
  - Mengimplementasikan helper dependency `require_admin_role` di [`app/core/security.py`](file:///d:/databaru/Magang/EdTeknoGuard/app/core/security.py) yang membatasi role `teknisi` dari akses pengaturan dengan proteksi HTTP 303/403.
  - Memperbarui visibilitas menu sidebar di [`templates/layouts/base.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/layouts/base.html) dan tombol cepat di Dashboard [`templates/dashboard/index.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/dashboard/index.html) agar muncul untuk role `admin` dan `super admin`.
- **Penyelarasan & Perapian Tata Letak Kontrol Pemindaian (`Control Bar`)**:
  - Merapikan posisi dan ukuran tombol kontrol pemindaian (**Jeda Pemindaian** & **Hentikan Stop**) pada tampilan mobile agar berjajar simetris secara 2-kolom seimbang dengan target sentuh ergonomis (`min-h-[36px]`).
  - Merapikan susunan teks status pemindaian, badge counter ONT, indikator durasi berjalan, estimasi waktu total, dan progress bar visual agar terstruktur rapi, proporsional, dan tidak bertumpuk.
- **Mobile Global Layout (Edge-to-Edge Full-Bleed Cards)**:
  - Menerapkan tata letak *edge-to-edge full-bleed* (tanpa margin samping/horizontal) secara global pada seluruh kartu aplikasi di tampilan ponsel (*mobile viewport* `< 640px`) meliputi halaman **Dashboard**, **Manajemen Pelanggan (`/pelanggan`)**, **Tiket Keluhan (`/admin/tiket`)**, **Pemantauan Kuota (`/admin/kuota`)**, **Riwayat Redaman (`/logs`)**, **Log Aktivitas (`/user-logs`)**, **Pengaturan Sistem (`/settings`)**, dan **Manajemen Pengguna (`/users`)**.
  - Mengecualikan kartu **Menu Layanan & Operasional** di Dashboard agar tetap mempertahankan margin samping dan lekukan sudut melengkung (*rounded card*) yang proporsional.

- **Mobile Bottom Navigation Styling**:
  - Mengubah tab aktif pada bottom navigation (Pelanggan, Redaman, Tiket, Pengaturan) menjadi **latar putih dengan ikon dan teks berwarna hitam tegas (`#0f172a`)** untuk kontras dan visibilitas yang tajam.
  - Mempertahankan tombol tengah **Beranda** (`.tabler-dock-item-center`) dengan **warna biru aksen elektrik (`#0909f6`)** dan ikon/teks putih solid yang menonjol (*elevated center button*).
- **Visual Design & Canvas Optimization (Clean White/Slate-50 Canvas Background & Dark Text)**:
  - Mengubah latar belakang dasar aplikasi (`--tblr-body-bg`, `html`, `body`) menjadi **latar terang / putih bersih (`#f8fafc`)** dengan kontras teks gelap (`#0f172a` / `#334155`).
  - Menyelaraskan teks judul header hero dashboard (`#dashboardHeroSection`) agar menggunakan warna teks gelap tegas dengan aksen indigo (`text-indigo-600` / `text-slate-900` / `text-slate-600`).
  - Mempertahankan kartu komponen putih solid (`#ffffff`) dengan bayangan halus (*soft subtle shadow*), topbar & sidebar navy elegan (`#031f6d`), serta badge indikator status redaman (Normal Hijau, Warning Kuning, Kritis/LOS Merah).




### Fixed
- **Resolusi 500 Internal Server Error saat Simpan Pengaturan Sistem (`POST /api/settings`)**:
  - Menambahkan atribut field `telegram_alert_interval_hours` pada [`SystemSettingsSchema`](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/settings/schemas.py) untuk mencegah kegagalan `AttributeError` di `SystemSettingsService.update_settings` saat membaca parameter debounce notifikasi.
- **Resolusi 404 Not Found pada Polling Status Tiket Pelanggan (`GET /api/portal/ticket-status`)**:
  - Menyediakan endpoint API `/api/portal/ticket-status` pada router utama [`app/main.py`](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py) dan [`portal_pelanggan/modules/kendala/routes.py`](file:///d:/databaru/Magang/EdTeknoGuard/portal_pelanggan/modules/kendala/routes.py) untuk menyajikan status tiket keluhan aktif pelanggan secara aman.
- **Perbaikan Efek Hover pada Navigasi Mobile (Bottom Dock)**:
  - Memperbaiki efek *hover* pada menu navigasi bawah agar teks dan ikon tidak pudar/hilang ketika kursor diarahkan atau disentuh. Mengganti variabel warna hover menjadi warna putih tegas (`#ffffff`) dengan *background highlight* transparan halus (`rgba(255,255,255,0.12)`).
  - Memastikan tab yang sedang aktif tetap mempertahankan warna teks dan ikon hitam (`#0f172a`) di atas latar putih meskipun sedang di-hover.




### Fixed
- **Perbaikan Error 500 pada Manajemen Pengguna (`/users` & `/users/`)**:
  - Memperbaiki kesalahan sintaksis Jinja2 berupa tag penutup `{% endblock %}` untuk blok `content` yang hilang sebelum `{% block scripts %}` pada berkas `templates/users/index.html`.
  - Menambahkan rute alias `@router.get("")` dan `@router.get("/")` agar permintaan ke `/users` dan `/users/` langsung merespons dengan **HTTP 200 OK** tanpa redirect 307.

  - Memverifikasi secara visual hasil render menggunakan **Chrome DevTools MCP** dengan tangkapan layar beresolusi tinggi ([`static/dashboard_polished.png`](file:///d:/databaru/Magang/EdTeknoGuard/static/dashboard_polished.png)).
  - Memperbarui file token terpusat [`static/css/components.css`](file:///d:/databaru/Magang/EdTeknoGuard/static/css/components.css), layout master [`templates/layouts/base.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/layouts/base.html), serta komponen [`templates/components/control_bar.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/control_bar.html), [`templates/components/kpi_cards.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/kpi_cards.html), [`templates/components/charts.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/charts.html), dan [`templates/dashboard/index.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/dashboard/index.html).

- **Audit Konsolidasi Palet 1 Warna Utama pada Dashboard**:
  - Menyeragamkan seluruh elemen antarmuka halaman Dashboard (`/`) ke **1 warna tema utama** (Tabler Azure Primary `#206bc4`):
    - Seluruh tombol interaktif, header, navigasi shortcut, icon card, dan garis kurva telemetri Chart.js menggunakan `#206bc4`.
    - Chip data statistik grafik diubah menjadi warna netral profesional (`slate-100` / `slate-700`).
    - Warna khusus (Hijau/Emerald, Kuning/Amber, Merah/Rose) diisolasi **HANYA** untuk status sinyal optik, status engine berjalan/dijeda, error jaringan, dan notifikasi/alert darurat.
- **Pembaruan Aksi Tabel dengan Menu Titik Tiga (3-Dot Action Dropdown)**:
  - Mengubah seluruh baris aksi tabel yang padat dengan tombol inline menjadi tombol ikon titik tiga vertikal (`...` / Tabler `dots-vertical`) yang bersih dan ergonomis pada:
    - **Tabel Data Pelanggan (`templates/customers/index.html`)**: Memadukan aksi *Cek Live Sinyal*, *Detail Pelanggan*, *Edit Data*, dan *Hapus Pelanggan* ke dalam satu popover menu dropdown terproteksi.
    - **Tabel Manajemen Pengguna (`templates/users/index.html`)**: Memadukan aksi *Edit Akun*, *Aktifkan/Nonaktifkan Akun*, dan *Hapus Pengguna* ke dalam menu dropdown titik tiga dengan penanganan hak akses role.
- **Penerapan Penuh Standar Copywriting & Human Clarity (`antislop-copywriting` & `antislop-human`)**:
  - **Eliminasi Karakter Em Dash (`—`)**: Mengganti seluruh tanda `—` pada tag `<title>` dan judul halaman menjadi titik dua (`:`) atau koma (`,`) di seluruh template **TeknoGuard** (NOC) dan **TeknoCust** (Portal Warga).
  - **Standardisasi Terminologi Lintas Halaman**:
    - Menyeragamkan seluruh label pintasan menu mobile (`dashboardServiceGridContainer`) agar **100% identik** dengan nama menu sidebar desktop:
      - `Pelanggan` &rarr; **`Data Pelanggan`**
      - `Tiket Warga` &rarr; **`Tiket Keluhan`**
      - `Kuota GB` &rarr; **`Pemantauan Kuota`**
      - `Log Redaman` &rarr; **`Riwayat Redaman`**
      - `Log Audit` &rarr; **`Log Aktivitas`**
      - `Pengaturan` &rarr; **`Pengaturan Sistem`**
      - `Pengguna` / `Manajemen User` &rarr; **`Manajemen Pengguna`**
      - `TeknoCust` &rarr; **`TeknoCust`**
    - Menyeragamkan sebutan kredensial menjadi **`Kata Sandi`** secara konsisten di seluruh form login, reset mandiri, ubah kata sandi profil, dan WiFi (menghapus campur aduk istilah `password`).
    - Menyeragamkan menu akun menjadi **`Manajemen Pengguna`** (menggantikan inkonsistensi `Manajemen User` dan `Karyawan`).
    - Menyeragamkan modul pelaporan warga menjadi **`Laporan Kendala`** dan **`Tiket Kendala`**.
  - **Peningkatan Keterbacaan Kalimat Operasional**:
    - Menyederhanakan kalimat instruksi jaringan, panduan VLAN IP gateway, dan subjudul kartu KPI agar aktif, lugas, dan mudah dipahami manusia tanpa kalimat berbelit.

### Added
- **Standarisasi Penuh Tipografi & Ikon Tabler UI (`D:\UI_Panduan\UI1`) pada TeknoGuard**:
  - **Sistem Font Tabler (`Plus Jakarta Sans`)**: Mengadopsi skala ukuran font Tabler (`0.875rem` body base, line-height `1.4285714286`, `h1: 1.5rem`, `h2: 1.25rem`, `h3: 1rem`, `h4: 0.875rem`, `h5: 0.75rem`, `h6: 0.625rem`) dengan tracking tebal (`font-black`, `font-extrabold`).
  - **Standar Ukuran & Ketebalan Ikon Tabler (`stroke-width="2"` / `1.5`)**:
    - `.icon`: `1.25rem` (20px) stroke width 2 untuk navigasi utama dan header.
    - `.icon-xs` / `.icon-sm`: `0.75rem` - `1rem` (12px - 16px) untuk badge, dropdown item, dan tabel audit.
    - `.icon-md` / `.icon-lg` / `.icon-xl`: `1.5rem` - `2.5rem` (24px - 40px) untuk kartu KPI metrik dan action box.
  - **Mobile Sticky Bottom Navigation Dock (5-Tab)**:
    - Target sentuh ergonomis $\ge 48\times 48\text{ px}$ (`h-15 / 60px` dock), ukuran ikon presisi `20px` (`w-5 h-5` / `.tabler-dock-icon`), label tipografi `10px` (`text-[10px]` / `0.625rem` Tabler scale), dan indikator dot aktif dengan background `#e9f1fa` & tekstur glow pada tombol tengah Beranda.
- **Pemisahan Total Seluruh CSS & JS ke Outline Berkas Terpisah (Clean Separation of Concerns)**:
  - **Single Consolidated Master CSS (`static/css/components.css`)**:
    - Seluruh style, utility, dan komponen desain Tabler disatukan ke dalam 1 file master CSS terpusat (`static/css/components.css`), bebas dari inline `<style>` di seluruh template HTML.
    - Dilengkapi penamaan class semantik dan ID terstruktur untuk tiap komponen (Cards, Buttons, Badges, Modals, Tables, KPI Metrik, Action Grid, Toasts, Login Portal, dan Tabler Status Ribbons).
  - **Pemisahan Logika JavaScript ke Berkas Outline Khusus (`static/js/`)**:
    - `static/js/app.js`: Master layout application handler (navbar, notifications polling, sound context, haptic feedback, snooze modal, global page loader).
    - `static/js/customers.js`: Logika reaktif modul manajemen pelanggan (live search, filter POP, status chip, sorting, modal detail, modal CRUD, dan wizard import Excel/CSV multi-langkah).
    - `static/js/tiket.js`: Logika reaktif tiket keluhan pelanggan (filter status, kategori, rentang tanggal hari ini/7d/30d/kustom, live search, sorting, dan modal update status).
    - `static/js/kuota.js`: Logika reaktif pemantauan pemakaian kuota pelanggan (kalkulasi total GB, rata-rata trafik, filter paket, filter level konsumsi, live search, sorting).
    - `static/js/logs.js`: Logika audit time-series redaman ONT (filter status, rentang tanggal real-time, live search, single probe ONT, sorting).
    - `static/js/activity_logs.js`: Logika audit log aktivitas login/logout/operasional karyawan NOC.
    - `static/js/settings.js`: Logika 2-tab pengaturan sistem (ambang batas -26/-27 dBm, interval scan, drag-and-drop kredensial modem repeater, notifikasi aplikasi & jam malam).
    - `static/js/users.js`: Logika modul manajemen hak akses pengguna multi-kantor.
    - `static/js/dashboard.js` & `static/js/login.js`: Dashboard charts telemetri dan form login admin NOC.
- **Implementasi Sistem Desain Tabler UI pada Portal Pelanggan Mandiri (TeknoCust `/portal`)**:
  - **Single Master CSS Khusus Pelanggan (`portal_pelanggan/static/css/portal.css`)**:
    - Menyatukan seluruh class komponen desain Tabler UI untuk portal pelanggan (`.card-tabler`, `.card-status-top`, `.card-status-azure`, `.card-status-teal`, `.btn-tabler`, `.badge-tabler`, `.form-input-tabler`, `.status-dot`, `.dock-nav-tabler`).
  - **Standar Ikon Tabler SVG Inline Bersih**:
    - Seluruh halaman TeknoCust bebas emoji dan menggunakan ikon standar SVG Tabler murni (`stroke-width="2"`).
  - **Refactor Seluruh Halaman TeknoCust**:
    - `layouts/base.html`: Modern header bar, Plus Jakarta Sans, dan sticky 5-tab bottom navigation dock dengan touch target $\ge 48\times 48\text{ px}$.
    - `dashboard/index.html`: Banner sapaan pelanggan dengan avatar Tabler, kartu telemetri ONT dengan status dots, kartu ringkasan kuota tanpa batas, dan action cards grid 2 kolom.
    - `auth/login.html` & `auth/lupa_password.html`: Form login & reset kata sandi mandiri berbasis Tabler card.
    - `kendala/index.html` & `kendala/create.html`: Riwayat tiket kendala dengan status ribbon dan form pelaporan gangguan.
    - `wifi/index.html`: Banner edukasi warga, info WiFi saat ini, dan form ganti SSID/password WiFi.
    - `kuota/index.html`: Kartu telemetri pemakaian kuota bulan berjalan, riwayat trafik 7 hari, dan kepatuhan SOP tanpa istilah sisa kuota.
    - `profil/index.html`: Kartu rincian identitas langganan, tombol peta GPS, collapsible ganti password akun portal, dan tombol logout.
- **Implementasi Penuh Tabler UI & Authentic Tabler Icons (preview.tabler.io & D:\UI_Panduan)**:
  - **Aset Resmi Lokal**: Mengintegrasikan `tabler.min.css` dan `tabler.min.js` dari `D:\UI_Panduan\tabler-dist` serta seluruh pustaka ikon SVG murni dari `D:\UI_Panduan\tabler-icons`.
  - **Navigasi Base & Shell Aplikasi ([templates/layouts/base.html](file:///d:/databaru/Magang/EdTeknoGuard/templates/layouts/base.html))**:
    - **Header & Top Bar Tabler**: Mengadopsi header putih bersih dengan border 1px `#e6e8eb`, status LED real-time beranimasi pulse, breadcrumb portal yang rapi, dropdown Kantor Switcher, dan popover notifikasi aduan/tiket masuk.
    - **Sidebar Desktop**: Desain modular Tabler dengan pengelompokan seksi (`NOC & JARINGAN`, `MANAJEMEN PELANGGAN`, `SISTEM & AUDIT`), highlight aktif warna Azure Blue `#206bc4` dengan left border strip, badge counter tiket, dan profil pengguna bawah yang terintegrasi.
    - **Sticky Bottom Navigation (5-Tab)**: Navigasi mobile ergonomis dengan tombol tengah Beranda menonjol (elevated center), badge unread tiket, dan area sentuh >= 44px ramah jempol.
    - **Authentic Tabler SVG Icons**: Seluruh ikon antarmuka (dashboard, logs, users, tickets, kuota, audit, settings, building, bell, logout, chevrons) dikonversi ke standar resmi Tabler Icons (`viewBox="0 0 24 24" stroke-width="2"`).
  - **Halaman Dashboard Utama ([templates/dashboard/index.html](file:///d:/databaru/Magang/EdTeknoGuard/templates/dashboard/index.html))**:
    - **Tabler Page Header**: Pretitle `PUSAT KOMANDO JARINGAN ISP`, judul tebal `Monitoring & Deteksi Dini ONT`, dan status badges.
    - **Action Grid Layanan & Operasional**: Grid kartu aksi modular Tabler dengan micro-hover interaction dan unread counter.
    - **Control Bar ([templates/components/control_bar.html](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/control_bar.html))**: Status ribbon atas 3-kondisi (Running/Green, Stopped/Amber, Network Error/Red), timestamp pengecekan terakhir, dan tombol aksi Tabler (Player Play, Pause, Stop).
    - **KPI Cards ([templates/components/kpi_cards.html](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/kpi_cards.html))**: 4 kartu metrik Tabler dengan status top ribbon (`.card-status-azure`, `.card-status-green`, `.card-status-amber`, `.card-status-red`), ikon Tabler router/wifi-off/alert-triangle, angka tebal dan unit jelas.
    - **Telemetry & Chart Redaman ([templates/components/charts.html](file:///d:/databaru/Magang/EdTeknoGuard/templates/components/charts.html))**: Telemetry card dengan 4 data summary chips (Rata-rata, Terbaik, Terendah, Total Sampel), date picker, range button (Hari Ini, Kemarin, 7 Hari), dan Chart.js bertema Tabler Azure Blue.
  - **Design System Tokens ([static/css/components.css](file:///d:/databaru/Magang/EdTeknoGuard/static/css/components.css))**:
    - Standarisasi token Tabler: canvas background `#f4f6fa`, kartu `#ffffff` dengan border `#e6e8eb`, status ribbon, status dot pulsing, dan tombol hierarki Tabler.
- **Penerapan Tema Warna 60% Biru Laut Dominan (Ocean Blue) & Outline CSS**:
  - Mengimplementasikan aturan rasio warna **60-30-10** secara ketat:
    - **60% Dominan (Biru Laut / Ocean Atmosphere)**: Latar belakang seluruh halaman aplikasi menggunakan `#f0f7ff` (soft ocean mist), seluruh kartu dan panel menggunakan outline border biru laut presisi `1.5px solid #bae6fd` (*Sky 200*) dengan ring focus `rgba(14, 165, 233, 0.2)`.
    - **30% Permukaan (Pure White & Clean Typography)**: Kartu putih bersih `#ffffff`, tipografi Slate tegas `#0f172a` & `#334155` untuk keterbacaan tinggi.
    - **10% Aksen Khusus Status & Peringatan**: Amber/Kuning khusus peringatan redaman drop (`-26 dBm`), Merah/Rose khusus status kritis/LOS (`-27 dBm`), dan Hijau khusus sinyal normal.
  - Mengadopsi **Outline CSS System** pada seluruh tombol (`.apple-btn`), kontrol tersegmentasi (`.apple-segmented-control`), input tanggal, dan kartu metrik KPI (`.kpi-metric-card`).
- **Penerapan Apple Human Interface Guidelines (HIG) Design System pada Dashboard**:
  - Mengadopsi bahasa desain resmi Apple HIG pada seluruh elemen Dashboard NOC: material translucent frosted glass (`.apple-card` dengan `backdrop-filter: blur(20px)` dan hairline border `rgba(60, 60, 67, 0.12)`), Apple Health Metric Widgets (`.kpi-metric-card`), Apple Segmented Controls (`.apple-segmented-control`), Apple System Buttons (`.apple-btn`), serta Squircle Action Grid Cards (`.action-grid-card`).
  - **Penyederhanaan Palet Warna (Neutral Monochromatic with Alert-Only Highlights)**: Mengeliminasi warna-warni berlebih pada kartu, grid ikon, badge informasi umum, dan summary chips ke warna abu-abu netral Apple (*Apple System Gray* `#f2f2f7` & `#1c1c1e`). Warna aksen (hijau, kuning/amber, merah/rose) diisolasi khusus untuk indikator status sistem, peringatan redaman kritis/warning, dan notifikasi tiket darurat.
  - Memisahkan CSS secara modular berbasis OOP di [`static/css/components.css`](file:///d:/databaru/Magang/EdTeknoGuard/static/css/components.css) dan JS di [`static/js/dashboard.js`](file:///d:/databaru/Magang/EdTeknoGuard/static/js/dashboard.js).
  - Memberikan penamaan ID dan class semantik per elemen (`#dashboardServiceGridSection`, `#kpiCardTotal`, `#dashboardControlBar`, `#dashboardQuickShortcuts`, `#dashboardChartCard`, dll.) sehingga mudah dipelihara dan dapat langsung digunakan kembali (*reusable*) pada halaman lain.
- **Sistem Desain Komponen Modular OOP & Pemisahan CSS/JS Dashboard (`components.css`)**:
  - Membuat stylesheet sistem desain terpusat di [`static/css/components.css`](file:///d:/databaru/Magang/EdTeknoGuard/static/css/components.css) yang mengelompokkan komponen secara OOP: Card Container (`.tekno-card`), Button System (`.tekno-btn` dengan varian primary, success, warning, danger, secondary), Status Badges (`.tekno-badge`), Action Grid Cards (`.action-grid-card`), KPI Cards (`.kpi-metric-card`), dan Toast Notifications (`.tekno-toast`).
  - Memperbarui halaman Dashboard ([`templates/dashboard/index.html`](file:///d:/databaru/Magang/EdTeknoGuard/templates/dashboard/index.html)), Control Bar, KPI Cards, dan Charts dengan penamaan elemen semantik (`#dashboardServiceGridSection`, `#kpiCardTotal`, `#dashboardControlBar`, `#dashboardQuickShortcuts`) sehingga dapat langsung digunakan kembali (*reusable*) pada modul halaman lain dengan konsistensi penuh.
- **Pembaruan Halaman Login Admin (Clean White Theme & Ingat Saya)**:
  - Mengubah desain halaman login menjadi tema putih bersih (*clean white theme* `#ffffff` / `#f8fafc`) dengan rasio kontras WCAG 4.5:1.
  - Memisahkan CSS murni ke [`static/css/login.css`](file:///d:/databaru/Magang/EdTeknoGuard/static/css/login.css) dan JavaScript modular ke [`static/js/login.js`](file:///d:/databaru/Magang/EdTeknoGuard/static/js/login.js) dengan penamaan class/id elemen yang semantik dan terstruktur untuk mempermudah pemeliharaan jangka panjang.
  - Menambahkan komponen checkbox **"Ingat saya"** (`#remember_me`) yang menyimpan username ke local storage peramban pengguna secara otomatis.
- **Fitur Photo-Style Zoom & Pan Khusus Mobile pada Grafik Chart.js (Gambar 1)**:
  - Tombol kontrol zoom (+, -, Reset) kini disembunyikan di desktop dan diisolasi khusus tampilan mobile (`sm:hidden`).
  - Mengganti mekanisme step zoom data scale yang kaku dengan sistem pembesaran foto optikal (*optical photo-style zoom*): mendukung pinch-to-zoom dengan dua jari (`touchstart`/`touchmove`), satu jari untuk menggeser (*drag/pan*) saat diperbesar, tombol plus/minus dengan perbesaran halus (`1.0x` s/d `3.5x`), serta tombol Reset instan.
- **Indikator Loading Transisi Antar Halaman & Menu Global (Anti-Lag & Responsif)**:
  - Menghadirkan progress bar animasi gradien bercahaya di puncak halaman (`#global-page-loader`) yang langsung aktif seketika saat pengguna mengklik menu atau tautan navigasi.
  - Memberikan umpan balik visual instan sehingga aplikasi terasa cepat, responsif, dan tidak terasa "hang", lambat, atau membeku (*freeze*) saat menunggu render halaman baru.
- **Filter Hak Akses Role pada Menu Navigasi & Action Cards Mobile**:
  - Menyembunyikan menu "Pengaturan" dan "Karyawan" dari kartu aksi cepat Dashboard (`templates/dashboard/index.html`) untuk pengguna selain `super admin`.
  - Mengalihkan Tab 5 pada Sticky Bottom Navigation (`templates/layouts/base.html`) secara dinamis: menampilkan "Pengaturan" bagi `super admin`, dan menampilkan "Log Audit" bagi role `admin` & `teknisi` untuk mencegah akses 403 atau menu terlarang.
- **Pengaturan Notifikasi Aplikasi, Getaran & Jam Malam (Android & Web)**:
  - Tab 3 baru di `/settings`: "Notifikasi & Jam Malam" yang mencakup toggle getaran haptic (`app_vibration_enabled`), pengaturan pengulangan alert aduan pelanggan berstatus MENUNGGU (`alert_waiting_interval_minutes`, default 5 menit), serta pengaturan mode senyap jam malam (`telegram_night_mode_enabled`, `telegram_night_mode_start`, `telegram_night_mode_end`).
  - Payload konfigurasi notifikasi terintegrasi pada endpoint polling `/api/notifications/poll` (`notification_config`), siap dikonsumsi langsung oleh client web browser dan service background native Android.
- **Dokumentasi Arsitektur Android Studio Dual Flavors di PRD (`prd.md`)**:
  - Menyimpan spesifikasi teknis lengkap project Android Studio (Kotlin) dengan Gradle Product Flavors (`guard` untuk karyawan NOC dan `cust` untuk pelanggan warga), persistent background service + WakeLock, auto-restart BootReceiver, serta trigger notifikasi darurat.

### Fixed
- **Penyelesaian Masalah Tombol Filter Tertutup Bottom Navigation Mobile**:
  - Memperbaiki seluruh modal lembaran bawah (*bottom sheet drawer*) filter di seluruh modul (`/admin/tiket`, `/pelanggan`, `/logs`, `/admin/kuota`, `/user-logs`, `/users`).
  - Menaikkan `z-index` drawer filter menjadi `z-[70]` sehingga berada di atas layer sticky bottom navigation (`z-50`).
  - Menambahkan padding bawah responsif `pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]` dan batas tinggi `max-h-[90vh]` pada wadah tombol aksi (Reset Filter & Terapkan Filter), sehingga tombol aksi tidak pernah tertutup oleh bilah navigasi bawah dan leluasa diklik oleh pengguna.
- **Stabilitas & Presisi Sticky Bottom Navigation Mobile (Gambar 2)**:
  - Memperbaiki posisi bar navigasi bawah mobile menjadi `fixed bottom-0 left-0 right-0 z-50 w-full` dengan tinggi presisi `h-[58px]` dan perataan `items-end` dengan dukungan `safe-area-inset-bottom`.
  - Merapikan proporsi tombol tengah "Beranda" (`-mt-3.5`, `h-11 w-11 sm:h-12 sm:w-12`) sehingga tidak lagi terpotong di tepi bawah, bergoyang, atau keluar dari batas layar ponsel saat scroll.
- **Filter Khusus Mobile & Bottom Sheet Drawer di Log Aktivitas (`/user-logs`) (Gambar 1)**:
  - Mengganti susunan filter 4-kolom desktop yang memenuhi layar mobile dengan baris pencarian terpadu dan tombol filter ber-badge jumlah filter aktif.
  - Menghadirkan drawer slide-up lembaran bawah (*bottom sheet*) modern dengan seleksi User/Karyawan, Rentang Tanggal (termasuk kustom tanggal), Jenis Aktivitas, serta tombol Reset Filter.
- **Tabel Responsif & Filter Mobile di Manajemen Pengguna (`/users`) (Gambar 2)**:
  - Mengaktifkan tampilan tabel penuh dengan scroll horizontal halus di mobile (`overflow-x-auto`) dan menghapus kartu-kartu duplikat yang membingungkan.
  - Menambahkan baris pencarian dan tombol filter ber-badge dengan drawer slide-up lembaran bawah (*bottom sheet*) untuk menyaring berdasarkan Role (Super Admin, Admin, Teknisi), Status Akun (Aktif/Nonaktif), dan Akses Kantor Wilayah, lengkap dengan penomoran baris dinamis.
- **Pusat Notifikasi Popover Anchored Dropdown (Bukan Popup Modal Tengah) (Gambar 4)**:
  - Mengubah tampilan notifikasi dari modal popup di tengah layar menjadi menu dropdown popover elegan yang menempel (*anchored*) tepat di bawah ikon lonceng header.
  - Memuat daftar 5 tiket kendala darurat/terbaru secara mendetail (ID Tiket, Nama Pelanggan, Jenis Gangguan, dan Waktu Aduan) dengan link langsung ke halaman tiket.
- **Proteksi Anti-Spam Polling & Eliminasi Flash Popup Saat Pindah Halaman**:
  - Menambahkan deteksi tab aktif (`document.hidden` & event `visibilitychange`) sehingga polling notifikasi seketika dijeda saat tab browser diminimalkan atau berpindah tab, melonggarkan interval polling ke 15 detik untuk menghentikan spam log di terminal.
  - Memasang aturan `[x-cloak]` dan style `display: none;` pada elemen floating alert agar banner notifikasi tidak lagi berkedip (*flash*) sesaat setiap kali pengguna berpindah halaman/menu.

### Fixed
- **Sinkronisasi Kartu KPI & Status Pelanggan (`/pelanggan` & Dashboard Utama) (Gambar 2)**:
  - Memperbaiki kalkulasi agregasi KPI di `CustomerService.get_customer_stats` dan `MonitoringService.get_kpi_metrics` yang sebelumnya memfilter `is_monitored == True`, sehingga kartu tampak kosong/bernilai 0 jika pelanggan sedang di-OFF-kan pemantauannya.
  - Kartu Total Terpantau, Sinyal Normal, Warning, dan Kritis/LOS kini 100% akurat merefleksikan seluruh data pelanggan aktif yang tersimpan di database (misal: Total: 1 (1 OFF), Sinyal Normal: 1).
- **Adaptasi Popover Notifikasi Khusus Mobile Anti-Clipping (Gambar 1)**:
  - Mengubah positioning dropdown notifikasi pada layar ponsel pintar menjadi `fixed inset-x-3 top-16` (sementara pada desktop tetap `sm:absolute sm:right-0`).
  - Mengeliminasi bug popover yang terpotong di luar batas kiri layar (*viewport clipping*) pada perangkat mobile sehingga antarmuka tampak rapi, terpusat, dan nyaman dibaca.
- **Penambahan Aturan Wajib Paritas UI Mobile vs Desktop di AGENTS.md**:
  - Menetapkan aturan mutlak bagi seluruh AI Agent bahwa setiap penambahan, modifikasi, atau penghapusan fitur wajib dievaluasi dan diimplementasikan secara selaras pada tampilan mobile maupun desktop.

### Added
- **Filter Khusus Mobile & Bottom Sheet Drawer di Log Aktivitas (`/user-logs`) (Gambar 1)**:
  - Memperbaiki tag penutup sintaks yang berlebih (`</span></div></div>`) yang merusak *scoping* reaktivitas Alpine.js dan sempat membuat tabel tiket tampak kosong/hilang. Data tiket kini kembali tampil normal dan reaktif.
- **Penyembunyian Kartu Panduan Teknis di Mobile (`/settings`) (Gambar 5)**:
  - Menyembunyikan kartu informasi "Ketentuan Ambang Batas Redaman" dan "Cara Kerja Multi-Kredensial" pada viewport mobile menggunakan utility `hidden lg:block` agar halaman pengaturan di layar ponsel tetap bersih dan fokus pada formulir input.
- **Penyempurnaan Alur Tambah/Edit Pelanggan (Tahap 1 & 2) di Modal Pelanggan (`/pelanggan`)**:
  - Tombol *"Simpan Data"* kini hanya dimunculkan pada Tahap 2 (Modem & WiFi) dengan `x-show="customerFormTab === 'modem'"`, mencegah pengguna menekan simpan terlalu dini di Tahap 1.
  - Menghilangkan dropdown pilihan kantor pada modal tambah pelanggan, secara otomatis mengalokasikan data ke kantor aktif yang sedang dibuka di navbar (`activeOffice`).
- **Penyederhanaan Modal Detail Pelanggan (Hanya Riwayat Log)**:
  - Menghapus kartu Alamat/GPS, Parameter Modem, dan Kredensial WiFi yang redundan pada modal pratinjau detail (karena sudah tampil di tabel utama), memfokuskan modal 100% pada riwayat log performa 20 sesi terakhir dengan viewport tabel diperluas (`max-h-[60vh]`).

### Added
- **Isolasi Menu Layanan & Operasional Hanya untuk Mobile (`lg:hidden`)**:
  - Menu akses cepat "Menu Layanan & Operasional" (8 kartu ikon grid) disetel khusus hanya muncul pada tampilan layar seluler/mobile (`lg:hidden`). Pada layar desktop, navigasi berfokus penuh pada sidebar permanen di sebelah kiri sehingga antarmuka desktop menjadi sangat bersih dan lega.
- **Pengingat Berkala 1 Jam Pemantauan Terjeda untuk Super Admin**:
  - Jika Super Admin menjeda jadwal pemantauan (`STOPPED`), sistem melacak waktu jeda dan memicu pengingat melayang (*floating alert*) setiap 1 jam via `/api/notifications/poll`.
  - Banner dilengkapi tombol interaktif: *"Aktifkan Jadwal"* (langsung mengaktifkan scheduler) dan *"Lanjut Jeda"* (snooze pengingat untuk 1 jam ke depan via endpoint `/api/monitoring/snooze-pause-reminder`).
- **Smart Scheduler Recovery Pasca Reboot / Server Mati**:
  - Mengembangkan algoritma pemulihan scheduler cerdas di `scheduler_service.py` saat server menyala kembali:
    - Menghitung waktu jeda server mati sejak pemindaian terakhir (`elapsed_seconds`).
    - Jika server mati lebih lama dari interval pemantauan otomatis (`elapsed >= interval * 60`): Sistem langsung mengeksekusi *Catch-Up Scan* seketika dalam 5 detik.
    - Jika server hanya mati sebentar (`elapsed < interval * 60`): Sistem secara presisi menjadwalkan pemindaian berikutnya sesuai sisa durasi interval asli (`next_run_time`) tanpa mereset hitungan interval dari awal.
- **Standarisasi Universal Antarmuka Mobile di Seluruh Menu (`/admin/tiket`, `/pelanggan`, `/admin/kuota`, `/logs`)**:
  - **Horizontal Chips untuk Kartu Metrik/Statistik**: Mengubah susunan grid/tumpukan kartu stat yang memakan tinggi layar di mobile (`sm:hidden`) menjadi baris *horizontal scrolling chips* yang ringkas, modern, dan ramah geser satu tangan (`no-scrollbar`).
  - **Deduplikasi Kartu Stat**: Mengeliminasi kartu metrik redundan (seperti kartu "Semua Tiket" yang menduplikasi info header tiket).
  - **Penyederhanaan Baris Filter Mobile (Search + Tombol Filter Ber-Badge)**: Menyembunyikan seluruh dropdown filter dan pemilih tanggal yang memenuhi layar mobile. Hanya menampilkan 1 baris bersih: `[ 🔍 Input Cari... ]` dan `[ ⚙️ Tombol Filter ]` yang menampilkan badge merah/indigo jumlah filter yang sedang aktif.
  - **Slide-Up Bottom Sheet Drawer Filter**: Mengklik tombol filter memunculkan modal lembaran bawah (*bottom sheet*) bergaya native iOS/Android (`rounded-t-3xl` dengan backdrop blur, handle drag, tombol Reset Filter, dan Terapkan Filter).
- **Pembatasan Hak Akses Tombol Jeda/Aktifkan Jadwal Khusus Super Admin**:
  - Tombol aksi "Jeda Jadwal" dan "Aktifkan Jadwal" pada Control Bar hanya ditampilkan untuk role `super admin`.
  - Endpoint backend `/api/monitoring/toggle-scheduler` kini secara ketat memverifikasi hak akses `super admin` dan mengembalikan respon `403 Forbidden` jika diakses oleh role non-superadmin.

- **Navigasi Mobile 5-Tab Ergonomis & Premium (Gaya Aplikasi Mobile BCA / Shopee)**:
  - Menerapkan *sticky bottom navigation bar* 5 tab utama di layar ponsel (mobile viewport):
    - 👥 **Tab 1: Pelanggan** (`/pelanggan`)
    - 📉 **Tab 2: Redaman** (`/logs`)
    - 🏠 **Tab 3: Beranda (Posisi Tengah)** (`/`) dengan desain elevated dock button / pill menonjol aktif dan ring bayangan modern.
    - 🎫 **Tab 4: Tiket** (`/admin/tiket`) dengan badge counter realtime tiket baru masuk.
    - ⚙️ **Tab 5: Pengaturan** (`/settings`) menggantikan menu lama.
  - **Peningkatan Skala Tipografi Menu Navigasi**: Seluruh teks label navigasi dibesarkan secara signifikan menjadi `text-[13px] sm:text-sm font-extrabold tracking-tight` dengan icon `w-6 h-6 sm:w-7 sm:h-7`.
  - **Penghapusan Bersih Menu Burger di Mobile**: Drawer off-canvas dan tombol burger di header mobile telah dihapus total demi pengalaman native bottom navigation yang terpadu.
- **Menu Layanan & Operasional Paling Atas (Quick Action Cards)**:
  - Diposisikan di bagian paling atas Dashboard Utama (`/`) di atas Control Bar dan KPI Cards.
  - Skala tipografi dan box diperbesar: Box icon `h-14 w-14 sm:h-16 sm:w-16` dengan ikon `w-7 h-7`, serta teks judul kartu menjadi `text-sm sm:text-base font-extrabold text-slate-800`.
- **Notifikasi Real-Time Floating Overlay Anti-Spam**:
  - Banner popup notifikasi tiket darurat diubah menjadi **floating fixed overlay** (`fixed top-4 right-4 z-[999]`) di atas seluruh layer viewport, sehingga sama sekali tidak menggeser atau mendorong layout UI halaman ke bawah.
  - **Proteksi Anti-Spam**: Penyimpanan status tiket terakhir di `sessionStorage` (`tekno_last_alerted_ticket`) dan penanda `isInitialized` memastikan notifikasi tidak berulang atau spam saat halaman di-reload/navigasi; suara alarm dan getaran hanya dipicu tepat 1 kali ketika ada tiket baru yang benar-benar masuk.
- **Peningkatan Font Sidebar Menu Desktop**:
  - Menu sidebar desktop ditingkatkan menjadi `text-sm sm:text-base font-extrabold` dengan ikon `w-5 h-5` dan padding `py-3 px-3.5` agar nyaman dibaca dan tidak kekecilan.

### Changed
- **Rebranding Nama Aplikasi Web**:
  - Web Karyawan & NOC ISP: **TeknoGuard** (sebelumnya EdTeknoGuard).
  - Web Portal Pelanggan Warga: **TeknoCust** (sebelumnya EdTekno Pelanggan / EdTeknoCust).
- **Peningkatan Skala Tipografi Khusus Mobile**:
  - Membesarkan seluruh ukuran font kecil di perangkat mobile: teks badge, KPI, sub-label, dan menu navigasi dari `text-[10px]` / `text-[11px]` menjadi `text-xs` (12px) dan `text-sm` (14px) semibold/bold agar mudah dibaca di lapangan di bawah terik matahari.
  - Penambahan ruang vertikal `<main>` dengan `pb-28 lg:pb-8` agar elemen konten tidak tertutup oleh bottom navigation bar.
  - Menampilkan informasi yang sebelumnya hanya ada di modal detail langsung di tabel pelanggan:
    - 📍 **Titik Koordinat GPS**: Menampilkan koordinat GPS dengan tombol cepat buka Google Maps langsung di kolom pelanggan & alamat.
    - 📶 **Kredensial WiFi**: Kolom kredensial ONT kini diperluas memuat kotak SSID dan Password WiFi pelanggan lengkap dengan tombol intip/sembunyikan kata sandi.
    - ⏱️ **Indikator Metrik Redaman & Waktu**: Menampilkan waktu cek terakhir, status koneksi (NORMAL/WARNING/CRITICAL/LOS), redaman dBm, serta badge metrik suhu ONT (°C) dan latensi ping (ms).
- **Penambahan 4 Status Tiket Keluhan Pelanggan (SOP NOC Terpadu)**:
  - Mendukung 4 status tiket keluhan: `MENUNGGU`, `DICEK_ADMIN` (Diproses / Cek oleh Admin), `DIPROSES` (Teknisi Sedang Cek Lapangan), dan `SELESAI`.
  - Penambahan tombol KPI widget 5 kolom di `/admin/tiket` untuk filter cepat status `DICEK_ADMIN` (warna ungu/purple).
  - Penambahan opsi `DICEK_ADMIN` pada filter dropdown dan modal *"Ubah Status Tiket"*.
  - Penambahan endpoint JSON `@router.post("/admin/api/tiket/{ticket_id}/status")` di backend untuk pembaruan status reaktif tanpa delay reload.
  - Penyelarasan tampilan di portal pelanggan (`/portal/kendala`) dan penghitungan tiket aktif (`service.py`) agar mendukung status `DICEK_ADMIN`.
- **Relasi Database Berjenjang & ON DELETE CASCADE Wajib**:
  - Penambahan constraint Foreign Key `ON DELETE CASCADE` di TiDB Cloud dan relasi SQLAlchemy ORM (`cascade="all, delete-orphan", passive_deletes=True`) yang menghubungkan entitas utama `pelanggan` dengan seluruh 4 data anakannya:
    - 📊 `log_performa_ont` (Histori performa redaman optik)
    - 🚨 `alert_logs` (Riwayat alert & notifikasi)
    - 🎫 `tiket_kendala` (Laporan keluhan & gangguan pelanggan)
    - 📦 `kuota_pelanggan` (Catatan pemakaian kuota bulanan)
- **Normalisasi Basis Data (Single Source of Truth Pelanggan)**:
  - Konsolidasi entitas akun portal langsung ke dalam tabel master `pelanggan` dengan penambahan kolom `password_hash`, `lokasi_gps`, `status_verifikasi`, dan `last_login`.
  - Mengeliminasi ID ganda, redundansi tabel `akun_pelanggan`, dan memastikan satu entitas pelanggan tunggal untuk operasional NOC dan portal pelanggan warga desa.
- **Modal Peringatan Penghapusan Berjenjang (CASCADE Deletion Warning)**:
  - Pembaruan modal konfirmasi hapus tunggal dan hapus massal di `/pelanggan` dengan kotak peringatan bahaya yang merinci daftar seluruh data anakan yang akan ikut terhapus permanen.
- Penambahan file panduan riwayat perubahan [CHANGELOG.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/CHANGELOG.md) dan integrasi aturan wajib pencatatan pada [AGENTS.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/AGENTS.md) dan [README.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/README.md).

### Changed
- **Penyempurnaan Form Modal Pelanggan (Tambah & Edit Data) dengan Layout 2-Tab Ergonomis**:
  - Mengatasi masalah form inputan yang terlalu panjang dan terpotong di layar desktop serta ponsel pintar (mobile viewport).
  - Menerapkan arsitektur modal fleksibel dengan **Sticky Header**, **Body Form Scrollable Terisolasi (`max-h-[92vh] sm:max-h-[88vh] overflow-y-auto`)**, dan **Sticky Footer** sehingga tombol aksi *"Simpan Data"* dan *"Batal"* selalu 100% terlihat tanpa terpotong di bagian bawah.
  - Membagi 14+ input ke dalam 2 sub-tab segmented yang rapi:
    - **Tab 1 (Profil & Jaringan)**: ID Pelanggan, Nama Lengkap, POP, Kantor Wilayah, IP Router ONT, Paket Bandwidth, No HP/WhatsApp, Alamat, dan Toggle Status Pemantauan Otomatis (ON/OFF).
    - **Tab 2 (Modem & WiFi)**: Tipe/Model ONT, Username Admin Modem, Password Admin Modem, MAC Address, SSID WiFi, Password WiFi, dan informasi fallback multi-kredensial.
  - Menambahkan validasi antar-tab otomatis yang memindahkan fokus tab secara cerdas jika ada kolom wajib (`required`) yang belum diisi.
- Refactor alur penghapusan pelanggan di `CustomerService.delete_customer` dan `CustomerService.bulk_delete_customers` untuk mengeksekusi penghapusan berjenjang fisik (hard delete CASCADE) pada data utama dan seluruh anakannya secara konsisten tanpa menyisakan data yatim (*orphaned records*).
- Pembaruan sistem autentikasi dan ganti password mandiri portal pelanggan di `AuthService` dan `ProfilController` agar membaca serta memperbarui langsung ke tabel `pelanggan`.
- Pembaruan tampilan `/portal/login` dengan panduan ramah warga bahwa kredensial (ID Pelanggan / No HP / IP Router dan kata sandi) diberikan langsung oleh petugas kantor ISP saat pemasangan modem.
### Fixed
- **Perbaikan Pembacaan Data Redaman Terakhir di Tabel Pelanggan (Gambar 1)**:
  - Memperbaiki ketidaksesuaian kunci kamus (*dictionary keys*) di `CustomerService.get_customers` dan ekspresi Alpine.js pada `templates/customers/index.html`.
  - Menghubungkan pembacaan `status_terakhir`, `redaman_terakhir`, `waktu_terakhir`, `suhu_ont`, dan `latency_ms` sehingga status tidak lagi berstatus `UNKNOWN` atau bertanda strip `-` melainkan menampilkan data aktual pembacaan modem ONT (misal: `-25.52 dBm`, status `NORMAL`, `49 °C`, dan `210 ms`).
  - Menambahkan metode `formatDate(val)` di `customerApp()` untuk pemformatan waktu yang aman dari error runtime.
- **Peniadaan Scrollbar Kaku & Optimalisasi Responsif Modal (Gambar 3 & Gambar 4)**:
  - Menerapkan utilitas `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` pada container modal Edit Data Pelanggan dan Modal Detail Pelanggan sehingga scrollbar abu-abu yang mengganggu dihilangkan.
  - Membatasi tinggi modal maksimal (`max-h-[90vh]`) dengan tata letak vertikal `flex-col`, header dan footer yang sticky, serta padding yang proporsional sehingga antarmuka otomatis menyesuaikan panjang dan lebar layar (laptop maupun ponsel/tablet) tanpa terpotong di tepi layar.

### Removed
- **Penghapusan Fitur Pendaftaran Mandiri Warga (`/portal/daftar`)**:
  - Alur pendaftaran mandiri warga desa ditiadakan karena kebijakan operasional di mana akun dan kredensial langsung dibuat dan diserahkan oleh kantor ISP saat pemasangan modem.
  - Template `portal_pelanggan/templates/auth/register.html` dihapus bersih.
  - Rute `/portal/daftar` dialihkan secara otomatis (*HTTP 303 Redirect*) ke `/portal/login`.
  - Tabel fisik `akun_pelanggan` di-drop bersih dari TiDB Cloud setelah seluruh data dimigrasikan ke tabel `pelanggan`.

---

## [1.5.0] - 2026-09-20

### Added
- **Modul Tiket Keluhan Pelanggan Admin NOC (`/admin/tiket`)**:
  - Filter interaktif status tiket (`Semua`, `Menunggu`, `Diproses`, `Selesai`, `Ditolak`).
  - Filter jenis kendala gangguan optik/jaringan (LOS, Lambat, WiFi, Mati, dll.).
  - Filter rentang tanggal terpadu (`Semua`, `Hari Ini`, `7 Hari`, `30 Hari`, `Kustom Rentang Tanggal s/d`).
  - Live search debounced dan header kolom sortable (ID, Waktu, Pelanggan, Redaman, Status).
  - Modal responsif update status dan catatan tindak lanjut teknisi.
- **Modul Pemantauan Kuota Pelanggan Admin NOC (`/admin/kuota`)**:
  - Kartu metrik KPI ringkas dinamis (Total Pelanggan, Total GB Digunakan, Rata-rata GB/user).
  - Filter berdasarkan level pemakaian: Sangat Tinggi (>150GB), Tinggi (100-150GB), Sedang (50-100GB), Ringan (<50GB), dan Nol (0GB).
  - Filter paket internet dan pengurutan numerik pemakaian GB.
- **Modul Verifikasi Pendaftar Baru (`/admin/verifikasi-pelanggan`)**:
  - Validasi pendaftar mandiri berstatus `PENDING` dengan pencocokan data kantor dan titik koordinat GPS Google Maps.

### Changed
- Penurunan batas default pagination tabel menjadi 15 data per halaman dengan opsi dinamis (15, 25, 50, 100) untuk meningkatkan kecepatan render data.
- Refactor mekanisme sinkronisasi data pelanggan agar lebih aman dan efisien saat memperbarui status ONT.

---

## [1.4.0] - 2026-09-15

### Added
- **Portal Pelanggan Mandiri Self-Service (`/portal`)**:
  - Aktivasi ramah warga desa 2-tahap di `/portal/daftar` (Nama, Alamat/Dusun, WhatsApp, dan GPS otomatis background).
  - Autentikasi ramah warga desa di `/portal/login` dengan kata sandi awal seragam `123456` dan toggle lihat kata sandi SVG.
  - Fitur lupa kata sandi mandiri di `/portal/lupa-password` (verifikasi IP modem atau pencocokan Nama + WhatsApp).
  - Lapor kendala mandiri di `/portal/kendala/buat` yang otomatis melampirkan redaman terakhir pelanggan dan status ONT.
  - Menu ganti Nama WiFi (SSID) dan Kata Sandi WiFi baru di `/portal/wifi`.
  - Cek pemakaian kuota di `/portal/kuota` dengan **larangan keras menampilkan kata atau angka "Sisa Kuota"** (layanan internet bersifat unlimited).
  - Mobile-first layout dengan *sticky bottom navigation bar* 5 tab (Beranda, Kendala, WiFi, Kuota, Profil) dengan area sentuh ramah jempol (>= 44x44 px).
- Database tables baru: `akun_pelanggan`, `tiket_kendala`, dan `kuota_pelanggan`.

### Removed
- **Bot Telegram Pengirim Alert**: Fitur alert via bot Telegram dihapus dan digantikan secara penuh dengan notifikasi native melalui Web Wrapper APK Android Studio.

---

## [1.3.0] - 2026-09-08

### Added
- **Sistem 3 Role Pengguna & Pembagian Akses Wilayah**:
  - `super admin`: Akses penuh 3 kantor, kelola user (`/users`), dan pengaturan sistem (`/settings`).
  - `admin`: Operasional teknis (CRUD pelanggan, monitoring, import) terbatas pada kantor cabang yang diizinkan (`allowed_kantor`).
  - `teknisi`: Fokus pemantauan real-time status redaman ONT & probe on-demand terbatas pada kantor yang diizinkan (dilarang manipulasi data dan dilarang scan all serentak).
- **Multi-Kantor Wilayah**: Dukungan 3 kantor (`cabang`, `pusat`, `banyumas`) dengan *Office Switcher* dropdown terisolasi di navbar atas.
- **Sesi Admin 30 Hari**: Session cookie `edteknoguard_session` dengan *sliding expiration* 30 hari.

### Fixed
- **Standardisasi Timezone WIB (Asia/Jakarta)**:
  - Standardisasi timezone UTC+7 di seluruh query database, format logging time-series, background worker, dan environment image Docker.

---

## [1.2.0] - 2026-08-25

### Added
- **Ambang Batas Redaman Baru (SOP Redaman Optik)**:
  - Normal: `> -26.0 dBm` (Aman / Prima).
  - Warning (Peringatan Ringan): `-26.0 dBm` s/d `-27.0 dBm`.
  - Critical / LOS (Bahaya Segera Dicek): `<= -27.0 dBm` atau Loss of Signal.
- **Fallback Chain Kredensial Modem ONT**:
  - Penyimpanan multi-kredensial JSON array pada tabel `system_settings`.
  - Scraper otomatis mencoba kredensial tersimpan pelanggan terlebih dahulu, jika gagal mencoba daftar default satu per satu dan otomatis mengoreksi kredensial yang valid di database.
- **Pengaturan Berbasis 2 Tab**:
  - Tab 1: Parameter & Ambang Batas (interval menit, threshold -26.0 & -27.0 dBm).
  - Tab 2: Kredensial Modem ONT (repeater dinamis tambah/hapus akun dan tombol sinkronisasi massal).
- **Auto-Recovery Scheduler**:
  - Deteksi restart/reboot server dengan pemulihan status worker otomatis ke `RUNNING` dan pelaksanaan *Catch-Up Scan* (5 detik setelah startup) jika server sempat mati.
- **Import Multi-Kantor Bebas Penimpaan**:
  - Alokasi kantor otomatis sesuai kantor aktif di navbar.
  - Resolusi duplikasi inline (Auto-ID unik, abaikan/skip, hapus baris, koreksi manual ID/IP/Nama) tanpa penimpaan data existing.

---

## [1.1.0] - 2026-08-10

### Added
- Fitur kontrol runtime background worker pemindaian: endpoint `pause`, `resume`, dan `stop` scan on-demand.
- Filter rentang tanggal terpadu dan fitur silent auto-refresh (8-10 detik) pada tabel `/logs` dan `/pelanggan`.
- Toggle pemantauan ON/OFF per pelanggan (`is_monitored`) dengan pengecualian otomatis pada scheduler dan badge `(X OFF)` pada KPI dashboard.
- Indikator riwayat LOS count per pelanggan.

### Security
- Standardisasi semua ikon antarmuka wajib menggunakan SVG inline murni bersih tanpa emoji (seperti ⚡, 🔄, ⚙️, 🚨 dilarang keras).
- Pop-up modal konfirmasi untuk semua aksi destruktif (hapus data, bulk delete, simpan pengaturan).

---

## [1.0.0] - 2026-07-20

### Added
- Inisialisasi arsitektur dasar sistem EdTeknoGuard berbasis FastAPI, SQLAlchemy, PyMySQL, TiDB Cloud, dan Jinja2 SSR.
- HTTP Web Scraper ONT ZTE GM220-S & modul pembaca metrik optik (Rx Power dBm, uptime, suhu).
- Background scheduler periodik otomatis via APScheduler.
- Visualisasi analitik degradasi sinyal dengan Chart.js (Harian, 7 Hari, 30 Hari).
- Master layout responsif mobile-first dengan Tailwind CSS dan Alpine.js.
