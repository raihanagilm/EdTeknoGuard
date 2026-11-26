# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 050229e
- Test status: passing (Vite build OK `index-DsadI07J.js`, 18 pytest passed untuk `test_portal_fcm_token_binding.py` + `make check`)
- Active module: Perbaikan Notifikasi Lokasi Senyap & Pengikatan Token FCM Portal MyTekno
- Baseline: Green (Siap deploy/sinkronisasi ke VPS Produksi https://portal.teknoindo.net/)

## In Progress
- Selesai & Terverifikasi (PASS):
  - Penambahan pembedaan pelanggan **Prabayar** vs **Pascabayar** (`billing_mode`, *read-only* mengikuti Network Bill API v1):
    - Menambahkan kolom `billing_mode` (`VARCHAR(20) NULL`, terindeks) pada model `Pelanggan` ([app/db/models.py](file:///d:/databaru/Magang/EdTeknoGuard/app/db/models.py)) serta *auto-alter* multi-tenant di [app/core/tenant_database.py](file:///d:/databaru/Magang/EdTeknoGuard/app/core/tenant_database.py).
    - Menambahkan normalisasi & sinkronisasi `billing_mode` hemat kuota API pada [NetworkBillService](file:///d:/databaru/Magang/EdTeknoGuard/app/services/network_bill_service.py), [CustomerImporter](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/customers/importer.py), [BillingSyncWorker](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/billing/sync_worker.py), dan [BillingService](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/billing/service.py).
    - Menambahkan filter & field `billing_mode` pada REST API `/api/pembayaran`, `/api/customers`, `/api/pelanggan`, serta endpoint Portal MyTekno (`/portal/api/auth/*`, `/portal/api/dashboard`, `/portal/api/pembayaran`).
    - Memperbarui UI Admin NOC ([BillingFilterBar.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingFilterBar.jsx), [BillingTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingTable.jsx) — mengganti kolom `Nomor VA` dengan kolom `Jenis Tagihan` yang dapat diurutkan, [CustomersFilterBar.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/customers/CustomersFilterBar.jsx), [CustomersTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/customers/CustomersTable.jsx), [CustomerDetailModal.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/customers/CustomerDetailModal.jsx)) dan Portal MyTekno ([PortalPaymentTab.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/portal/components/payment/PortalPaymentTab.jsx), [PortalProfileTab.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/portal/components/profile/PortalProfileTab.jsx)) dengan label teks inline bersih tanpa *pill soup* maupun emoji (`-` jika belum tertaut/diset).
  0. Pengerasan Keamanan (Security Hardening) TeknoGuard, Portal MyTekno, & VPS:
     - Mengunci endpoint admin/monitoring yang sebelumnya terbuka tanpa autentikasi (`GET /api/kantor/list`, `GET /api/customers`, `GET /api/pelanggan`, `GET /api/customers/{id_pelanggan}`, `GET /api/customers/{id_pelanggan}/billing`, `GET /api/monitoring/*`) dengan `require_admin`, membatasi `mikrotik_pass` khusus `super admin`, membatasi `password_portal` khusus `admin`/`super admin`, dan menyesuaikan `frontend/src/App.jsx` agar memuat daftar kantor setelah login.
     - Menutup celah IDOR pada `POST /portal/api/auth/register-fcm` agar wajib memakai cookie sesi pelanggan terverifikasi.
     - Mengamankan `POST /portal/api/auth/minta-reset-password` agar tidak langsung menimpa `password_hash` aktif sebelum disetujui Admin NOC pada tiket `RESET_PASSWORD`, mencegah enumerasi nomor HP/nama, dan mencegah duplikasi tiket `MENUNGGU`.
     - Mencegah spoofing IP dan bypass validasi WiFi rumah pada `check_is_home_wifi` serta `LoginRateLimitMiddleware` lewat helper `get_trusted_client_ip` (`_TRUSTED_PROXY_NETWORKS`) dan menghapus kepercayaan terhadap header tak terverifikasi `X-Client-SSID`/`X-Client-Gateway-MAC`.
     - Menambahkan validasi `SECRET_KEY` produksi (`APP_ENV=production`), pembatasan `CORS_ORIGINS`, flag cookie `Secure` dinamis (`is_https_request`), pengamanan identifier SQL di `tenant_database.py`, serta pengerasan `docker-compose.yml` (`127.0.0.1` binding) dan panduan Nginx/Uvicorn di `docs/DEPLOY_SERVER_LINUX.md`.
     - Menutup celah Cross-Role Token Confusion antara sesi pelanggan dan admin dengan memisahkan `salt` kriptografis + klaim `token_type` (`app/core/security.py`, `app/portal/core/security.py`), mengunci scope `kantor` sesuai `allowed_kantor` di `get_db`/`customers/routes.py`, dan menambahkan validasi magic bytes WebP/PNG/JPEG pada unggahan foto profil portal (`app/portal/modules/profile/routes.py`).
     - Mengunci akses lintas kantor pada `activity_logs/controller.py` & `notifications/routes.py` (`403` jika di luar `allowed_kantor`), mewajibkan sesi pelanggan + batas byte (16 MB download / 10 MB upload) di `portal/modules/speedtest/routes.py` (+ `credentials: 'include'` di `SpeedTestModal.jsx`), serta menghapus password bawaan hardcoded di `app/db/init_db.py` dan `docs/DEPLOY_SERVER_LINUX.md`.
     - Perbaikan UI: menghapus blok/pill berwarna pada status `Diingatkan` / `Belum Diingatkan` di [BillingTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingTable.jsx) agar polos inline bebas *pill soup*, dan menambahkan toggle ikon mata lihat/sembunyikan password pada modal Tambah/Edit Pengguna di [UsersView.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/users/UsersView.jsx) (+ build produksi Vite `dist/assets/index-Dvo7CeHG.js`).
  1. Penyelarasan Notifikasi Desktop Windows / Chrome dengan Format Mobile ([app/modules/notifications/service.py](file:///d:/databaru/Magang/EdTeknoGuard/app/modules/notifications/service.py)):
     - Memformat seluruh judul notifikasi secara deterministik menggunakan pola standar mobile: `[KATEGORI] Kantor: {KANTOR}` (contoh: `[SINYAL TERPUTUS] Kantor: KARANGGEDE`, `[REDAMAN KRITIS] Kantor: TENGARAN`, `[TIKET BARU] Kantor: KARANGGEDE`, `[SCHEDULER] Kantor: PUSAT`, `[TAGIHAN JATUH TEMPO] Kantor: TENGARAN`).
     - Menyederhanakan isi pesan notifikasi (*concise messages*) agar padat, akurat, dan 100% identik dengan push notification FCM di Android: `{count} modem LOS (terputus)...`, `{count} modem Kritis...`, `{count} tiket MENUNGGU...`.
     - Menyematkan atribut `target_kantor` dan `kantor` di seluruh objek notifikasi agar routing direct link bekerja tanpa ambigu.
  2. Perbaikan Sistem Direct Link Per Kantor Backend & Frontend ([app/main.py](file:///d:/databaru/Magang/EdTeknoGuard/app/main.py), [frontend/src/App.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/App.jsx)):
     - **Inisialisasi Cerdas di Frontend:** `activeOffice` di `App.jsx` kini membaca query parameter URL `?kantor=` / `?target_kantor=` terlebih dahulu, dilanjutkan dengan cookie `active_kantor`, dan terakhir `localStorage`.
     - **Sinkronisasi Address Bar Real-Time:** Setiap kali kantor aktif berganti (baik via dropdown switcher, klik notifikasi desktop/lonceng, atau deep link `window.navigateToTab`), URL browser otomatis disinkronkan dengan `?kantor={cleanOffice}` secara real-time tanpa refresh halaman (`history.replaceState`).
     - **Preservasi Direct Link saat Navigasi Tab:** Saat berpindah tab (`handleTabChange`), parameter `?kantor=` dipertahankan di address bar browser, sehingga tautan halaman mana pun dapat langsung di-copy atau di-bookmark dengan wewenang kantor yang tepat.
     - **Navigasi Klik Notifikasi Desktop:** Klik pada notifikasi Windows/Chrome langsung mengarahkan user ke kantor terkait (`targetKantor`), tab terkait (`target_tab`), dan filter status/pencarian pelanggan terkait (`target_status`, `target_filter`).
     - **Perbaikan Endpoint `/switch-kantor`:** Backend kini menyertakan `?kantor={kantor_clean}` pada redirect URL selain menyetel cookie `active_kantor`.
  3. Penyelarasan Tombol Kontak WhatsApp di Status Tagihan ([BillingTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingTable.jsx)):
     - Menggantikan link teks raw (`628xxxx ↗`) dengan komponen tombol interaktif `[📞 Hubungi WA]` bergaya emerald (`bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200`) yang 100% konsisten dengan tabel Tiket Keluhan.
     - Menyediakan template pesan WhatsApp otomatis yang memuat rincian nama pelanggan, total tagihan, periode tagihan, tanggal jatuh tempo, dan nomor Virtual Account (VA).
     - Menambahkan tombol kontak WhatsApp serupa pada kartu seluler (mobile card stack) untuk aksesibilitas smartphone teknisi/admin.
  2. Standardisasi Komponen Pagination ([BillingTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingTable.jsx), [BillingView.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingView.jsx)):
     - Menghapus pagination bar manual kustom dan menggantikannya dengan komponen standar repositori `<DataTableContainer>` dari `CommonUI.jsx`.
     - Menghubungkan state `limit` (default: 15) dan callback `onLimitChange` sehingga pengguna dapat memilih jumlah baris per halaman (10, 15, 25, 50) layaknya tabel Tiket Keluhan dan Data Pelanggan.
  3. Penyelarasan Tombol Segarkan ([BillingFilterBar.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingFilterBar.jsx)):
     - Mengubah tombol "Segarkan" menjadi tombol berbasis ikon saja (`RefreshCw`) tanpa teks label, dengan ukuran touch-target terkalibrasi (`min-h-[34px] sm:min-h-[36px] min-w-[34px] sm:min-w-[36px]`) yang selaras 100% dengan filter bar Tiket Keluhan.
  4. Fitur Visibilitas, Reset & Ganti Sandi Akun Portal Pelanggan ([CustomerDetailModal.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/customers/CustomerDetailModal.jsx)):
     - Penambahan kartu khusus **"Akun Portal Pelanggan (MyTekno)"** pada tab Profil & Kontak modal Detail Pelanggan.
     - **Koreksi Username & Kata Sandi Kosong:** Jika pelanggan belum memiliki nomor WhatsApp atau sandi belum terdaftar, nilai ditampilkan kosong sebagai strip (`-`) dengan tipografi subtle abu-abu (`text-slate-400 font-sans`), bukan string literal `null`.
     - **Badge Status Cerdas:** Jika pelanggan belum memiliki nomor WA dan sandi, badge menampilkan `Belum Terdaftar` (abu-abu netral). Hanya menampilkan badge `Default (No. WA)` jika nomor WA valid tersedia.
     - **Proteksi Tombol Reset:** Tombol "Reset ke No. WA" dinonaktifkan (*disabled*) secara otomatis jika nomor WA pelanggan belum terdaftar.
     - Menyediakan visibilitas kata sandi dengan toggle mata (Show/Hide) dan tombol Salin (Copy).
     - **Penyelarasan Desain Tombol (Anti-Slop & Visual Parity):** Mengubah tombol "Reset ke No. WA" dan dialog konfirmasi dari warna oranye mencolok (`amber-500`) menjadi **Biru Primer Konsisten (`#026AA7` / `#035388`)** yang selaras 100% dengan tombol *Kirim Pesan WA* dan *Edit Informasi*.
     - **Fitur Ganti Sandi Kustom (Ramah Orang Tua):** Menambahkan tombol "Ganti Sandi" dan dialog modal popup untuk menyetel kata sandi kustom manual (minimal 6 karakter bebas) ramah pelanggan lansia.
     - Status indikator dinamis: badge hijau `Default (No. WA)` jika sandi masih nomor WA bawaan, atau badge amber `Sandi Kustom` jika sudah diubah sendiri oleh pelanggan atau disetel admin.
  2. Implementasi Backend & Proteksi Role RBAC:
     - Penambahan kolom `password_portal` pada model `Pelanggan` ([app/db/models.py](file:///d:/databaru/Magang/EdTeknoGuard/app/db/models.py)) dan auto-alter skema pada seluruh database tenant ([app/core/tenant_database.py](file:///d:/databaru/Magang/EdTeknoGuard/app/core/tenant_database.py)).
     - Endpoint `POST /api/customers/{id_pelanggan}/reset-portal-password` dengan proteksi ketat: khusus Super Admin & Admin (Teknisi ditolak HTTP 403 Forbidden).
     - Endpoint `POST /api/customers/{id_pelanggan}/change-portal-password` dengan validasi minimal 6 karakter dan proteksi RBAC Admin/Super Admin.
     - Saat reset/ganti sandi dijalankan: status lockout akun otomatis dibuka (*unfreeze*), dan dicatat ke log audit sistem (`ActivityLog`).
     - Sinkronisasi nilai `password_portal` saat pelanggan mengganti sandi mandiri di portal maupun saat registrasi baru.
  3. Verifikasi & Pengujian:
     - Penambahan unit test `test_reset_portal_password_and_view_credentials` dan `test_change_portal_password_custom` pada [tests/test_customers_module.py](file:///d:/databaru/Magang/EdTeknoGuard/tests/test_customers_module.py).
     - Seluruh **89 unit tests** lulus 100%.
     - Kompilasi build frontend Vite sukses tanpa error.
  4. Dokumentasi Komprehensif Aplikasi Mobile MyTekno (Layanan Mandiri Pelanggan):
     - Pengambilan 16 tangkapan layar beresolusi mobile smartphone (390x844 px) mencakup: Login (Maskot Si Router Menyapa), Lupa Sandi, Beranda, Modal Speed Test, Modal Perangkat Terhubung, Tab Kuota FUP, Tab Pembayaran (Tagihan & Riwayat), Modal Panduan Bank VA, Tab Kendala & Form Lapor Tiket, Tab Kelola WiFi ONT, Tab Profil, Form Ganti Sandi, Pusat Notifikasi, dan Modal Kebijakan Privasi.
     - Dihasilkan berkas master PDF: `C:\Users\agil\Documents\EdTeknoGuard_Docs\Dokumentasi_MyTekno\Dokumentasi_Lengkap_Aplikasi_MyTekno.pdf` (18 Halaman A4 &bull; 3.38 MB).
     - Dihasilkan berkas web interaktif HTML: `C:\Users\agil\Documents\EdTeknoGuard_Docs\Dokumentasi_MyTekno\Dokumentasi_Lengkap_Aplikasi_MyTekno.html`.
     - Seluruh aset dan berkas dokumen MyTekno disimpan secara aman 100% di luar Git/GitHub.
  2. Pembersihan Root Repositori Git:
     - Direktori `reports/`, `extracted_*/`, dan berkas `.zip` serta `.pdf` di root dan `docs/` telah dibersihkan secara aman.
  3. Penguatan Proteksi `.gitignore`:
     - Ditambahkan aturan proteksi deterministik untuk `reports/`, `dokumentasi_internal/`, `*.pdf`, `*.zip`, `extracted_*/`, dan folder screenshot, sehingga Git tidak akan pernah melacak atau mengunggah berkas-berkas tersebut ke GitHub.
  1. Perbaikan validasi jaringan WiFi rumah di portal pelanggan (`check_is_home_wifi` di `app/portal/core/security.py`): menambahkan pengenalan subnet IP publik ISP PT Tekno Indo Jaya (AS153729: `38.253.120.0/24`, `38.253.121.0/24`, `163.223.112.0/24`) melalui CGNAT saat pelanggan mengakses portal via browser laptop/HP ketika tersambung ke modem WiFi rumah, sehingga fitur Speed Test dan Pengaturan WiFi tidak lagi terblokir oleh pesan proteksi keliru.
  2. Penyederhanaan info tunggakan: menghapus akumulasi total nominal rupiah dari notifikasi backend (`NotificationService.get_realtime_notifications`) dan kartu KPI ringkasan tagihan (`BillingView.jsx`), difokuskan murni pada jumlah pelanggan/orang tertunggak.
  2. Penerapan Matriks Notifikasi Desktop (Chrome/Edge) & Polling In-App berbasis Role dan Kantor (`App.jsx`, `service.py`, `routes.py`):
     - `teknisi`: Khusus notifikasi Tiket Kendala dan Sinyal Terputus (LOS) / Redaman Kritis sesuai `allowed_kantor`.
     - `admin` (Kantor): Khusus notifikasi Tiket Kendala, Kredensial Modem Invalid, dan Tagihan Jatuh Tempo/Isolir sesuai `allowed_kantor` (terbebas dari alarm redaman optik teknis).
     - `super admin`: Menerima seluruh jenis notifikasi secara komprehensif dari seluruh kantor.
  2. Isolasi wilayah kantor (`allowed_kantor`) deterministik: notifikasi pop-up desktop Chrome dan polling backend dilarang keras membocorkan notifikasi lintas cabang di luar wewenang user.
  3. Integrasi status isolir router Network Bill: penempatan label `ISOLIR` di bawah status koneksi `ONLINE` / `OFFLINE` pada tabel data pelanggan (`CustomersTable.jsx`) baik pada tampilan desktop maupun mobile card.
  4. Penggabungan filter pelanggan terisolir ke dalam kategori kartu LOS (`CustomerService.get_customers` status == 'LOS'): menyaring `LogPerformaONT.status_koneksi == "LOS" OR Pelanggan.status_isolir == True OR Pelanggan.status_pembayaran == "ISOLIR"` sehingga seluruh 8 pelanggan terisolir muncul lengkap di tabel saat kartu LOS diklik.
  5. Penghitungan `combined_los` pada `CustomerService.get_customer_stats` dan penyajian nilai kartu LOS gabungan (18 total) dengan sub-label `${stats.los} Putus • ${stats.isolated} Isolir` di `CustomersView.jsx`.
  3. Penambahan pemetaan `status_isolir` pada model `Pelanggan` (`app/db/models.py`), payload return `list_customers`, dan penghitungan agregasi `isolated` pada `get_customer_stats` (`app/modules/customers/service.py`).
  4. Sinkronisasi status isolir otomatis via `NetworkBillService.fetch_connection_status` di `BillingService.sync_all_office_customers` dan pembaruan berkala ber-cache pada `BillingSyncWorker.sync_customer_billing`.
  5. Sinkronisasi live tagihan pada `PortalNotificationsPage.jsx` melalui `PortalPembayaranService.getTagihan()`: jika ada tagihan aktif/tertunggak di Network Bill, Pusat Notifikasi secara deterministik menampilkan kartu "Pengingat Tagihan Belum Dibayar" (nominal & periode riil) dan dilarang menampilkan "Tagihan Lunas Terverifikasi".
  6. Pengecualian tombol hapus untuk tagihan aktif: pengingat tagihan belum lunas (`statusType === 'danger'`) tidak dapat dihapus sebelum diselesaikan agar notifikasi 10:00 selalu terpantau.
  7. Perluasan kueri scheduler harian jam 10:00 WIB (`app/services/scheduler_service.py`) mencakup status `OVERDUE`, `ISOLIR`, dan `total_tagihan > 0`, serta otomatis mencatat ke `AlertLog` in-app harian.
  8. Pengamanan `dashboard/routes.py` dan `auth/routes.py` agar pesan pengingat tagihan hanya aktif jika pelanggan berstatus belum lunas.

## Next Steps
- [x] Hapus notifikasi & toast GPS di Beranda MyTekno (`syncGpsLocation` berjalan senyap di latar belakang)
- [x] Perbaiki pengikatan & pembersihan `fcm_token` lintas akun saat `register-fcm` dan `logout` aplikasi Android
- [x] Build frontend production terbaru (`index-DsadI07J.js`) & verifikasi unit test (`test_portal_fcm_token_binding.py`)
- [ ] Push ke origin main dan jalankan sinkronisasi / restart di VPS produksi

## Blockers
- None
