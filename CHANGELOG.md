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

---

## [Unreleased]

### Added
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
