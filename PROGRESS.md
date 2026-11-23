# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: In Progress
- Test status: passing (Vite build OK, Python compile OK)
- Active module: Customer Portal Live Billing Notification & Scheduler 10:00 AM Sync
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS):
  1. Sinkronisasi live tagihan pada `PortalNotificationsPage.jsx` melalui `PortalPembayaranService.getTagihan()`: jika ada tagihan aktif/tertunggak di Network Bill, Pusat Notifikasi secara deterministik menampilkan kartu "Pengingat Tagihan Belum Dibayar" (nominal & periode riil) dan dilarang menampilkan "Tagihan Lunas Terverifikasi".
  2. Pengecualian tombol hapus untuk tagihan aktif: pengingat tagihan belum lunas (`statusType === 'danger'`) tidak dapat dihapus sebelum diselesaikan agar notifikasi 10:00 selalu terpantau.
  3. Perluasan kueri scheduler harian jam 10:00 WIB (`app/services/scheduler_service.py`) mencakup status `OVERDUE`, `ISOLIR`, dan `total_tagihan > 0`, serta otomatis mencatat ke `AlertLog` in-app harian.
  4. Pengamanan `dashboard/routes.py` dan `auth/routes.py` agar pesan pengingat tagihan hanya aktif jika pelanggan berstatus belum lunas.

## Next Steps
- [x] Multi-strategy resolution (`BillingSyncWorker.resolve_nb_id`) dengan pembersihan prefix port OLT (`1/3/1:21_`) dan ID timestamp
- [x] Metode sinkronisasi massal kantor `BillingService.sync_all_office_customers` di `app/modules/billing/service.py`
- [x] Endpoint `POST /api/pembayaran/sync-all` di `routes.py` dan `controller.py`
- [x] Penambahan tombol "Sinkronkan POP" pada `BillingFilterBar.jsx` & handler `handleSyncAll` di `BillingView.jsx`
- [x] Header `Cache-Control: no-cache, no-store, must-revalidate` pada penyajian SPA `index.html` (`app/main.py`, `dashboard/controller.py`, `portal/main.py`)
- [x] Eksekusi sinkronisasi database Tengaran di VPS (146 total, 104 lunas, 42 belum bayar, 20 jatuh tempo, Rp 6.955.000 tunggakan)
- [x] Eliminasi nomor VA palsu saat `va_state !== 'payable'` di `PortalPaymentTab.jsx`
- [x] Penghapusan tombol direct link WA, menggantinya dengan pemberitahuan kontak WA yang ringkas dan bersih
- [x] Agregasi riwayat pengingat tagihan `AlertLog` (`TAGIHAN_REMINDER`) di `BillingService.get_billing_overview`
- [x] Penambahan badge pengingat (`Send` / `BellOff`) pada kolom STATUS di `BillingTable.jsx` (desktop table & mobile cards)
- [x] Auto-refresh data pembayaran setelah modal kirim pengingat diproses di `BillingView.jsx`
- [x] Pemisahan target klik kartu notifikasi: klik bodi kartu hanya menandai dibaca dan mengubah warna jadi abu-abu (`PortalNotificationsPage.jsx`)
- [x] Direct link navigasi hanya dipicu saat pengguna menekan tautan aksi mikro (`Bayar Sekarang >` / `Lihat Struk >`)
- [x] Penghapusan fake monospace `font-mono` pada baris waktu notifikasi & tiket sesuai panduan `DESIGN.md`
- [x] Penghapusan sub-header redundant ("Semua Pemberitahuan 6") dan pemindahan tombol aksi ke kanan atas kartu
- [x] Penghapusan garis samping biru (border-l) pada kartu notifikasi untuk visual yang tenang dan murni anti-slop
- [x] Pengecilan badge status notifikasi `LUNAS` menjadi title case mikro `text-[10px]`
- [x] Penghapusan kotak ikon chat hijau pastel pada kartu pembayaran non-VA
- [x] Redesain editorial bersih bebas AI-slop pada `PortalLegalModal.jsx` & `PortalLegalPage.jsx`
- [x] Penyelarasan notifikasi tagihan live di `PortalNotificationsPage.jsx` & `notificationUtils.js`
- [x] Perbaikan scheduler harian jam 10:00 WIB dan pencatatan in-app `AlertLog` di `app/services/scheduler_service.py`
- [x] Build frontend production terbaru (`index-B88f9PZh.js` & `index-Cj_nKd7e.css`)
- [ ] Push ke origin main dan restart daemon di server produksi VPS

## Blockers
- None
