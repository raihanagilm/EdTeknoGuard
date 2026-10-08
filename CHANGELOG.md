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

### Changed
- **Mobile Bottom Navigation Styling**:
  - Mengubah tab aktif pada bottom navigation (Pelanggan, Redaman, Tiket, Pengaturan) menjadi **latar putih dengan ikon dan teks berwarna hitam tegas (`#0f172a`)** untuk kontras dan visibilitas yang tajam.
  - Mempertahankan tombol tengah **Beranda** (`.tabler-dock-item-center`) dengan **warna biru aksen elektrik (`#0909f6`)** dan ikon/teks putih solid yang menonjol (*elevated center button*).
- **Visual Design & Canvas Optimization (Clean White/Slate-50 Canvas Background & Dark Text)**:
  - Mengubah latar belakang dasar aplikasi (`--tblr-body-bg`, `html`, `body`) menjadi **latar terang / putih bersih (`#f8fafc`)** dengan kontras teks gelap (`#0f172a` / `#334155`).
  - Menyelaraskan teks judul header hero dashboard (`#dashboardHeroSection`) agar menggunakan warna teks gelap tegas dengan aksen indigo (`text-indigo-600` / `text-slate-900` / `text-slate-600`).
  - Mempertahankan kartu komponen putih solid (`#ffffff`) dengan bayangan halus (*soft subtle shadow*), topbar & sidebar navy elegan (`#031f6d`), serta badge indikator status redaman (Normal Hijau, Warning Kuning, Kritis/LOS Merah).

### Fixed
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
