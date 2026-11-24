# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 3184d8f
- Test status: passing (Vite build OK, 87+ pytest passed)
- Active module: Harmonize WhatsApp Contact Button, Icon-Only Refresh, and Unified Pagination on Status Tagihan
- Baseline: Green (Deploying to VPS Production https://portal.teknoindo.net/)

## In Progress
- Selesai & Terverifikasi (PASS):
  1. Penyelarasan Tombol Kontak WhatsApp di Status Tagihan ([BillingTable.jsx](file:///d:/databaru/Magang/EdTeknoGuard/frontend/src/components/billing/BillingTable.jsx)):
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
- [x] Status ISOLIR di bawah status ONLINE/OFFLINE pada kolom STATUS tabel pelanggan
- [x] Sub-label kartu ringkasan KPI LOS menampilkan jumlah isolir (`Putus • X Isolir`)
- [x] Filter status ISOLIR di backend (`CustomerService.list_customers`)
- [x] Sinkronisasi `status_isolir` dari Network Bill `fetch_connection_status`
- [x] Build frontend production terbaru (`index-DLQ29H0d.js`)
- [x] Rangkaian 87 pengujian unit lulus 100% (`pytest tests/`)
- [ ] Push ke origin main dan jalankan sinkronisasi / restart di VPS produksi

## Blockers
- None
