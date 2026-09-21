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
- **Integrasi Informasi Detail ke Tabel Master Pelanggan (Gambar 4 ke Tabel)**:
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
