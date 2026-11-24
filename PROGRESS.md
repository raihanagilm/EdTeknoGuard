# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: In Progress
- Test status: passing (Vite build OK, Python compile OK)
- Active module: Customer Portal Live Billing Notification & Scheduler 10:00 AM Sync
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS):
  1. Integrasi status isolir router Network Bill: penempatan label `ISOLIR` di bawah status koneksi `ONLINE` / `OFFLINE` pada tabel data pelanggan (`CustomersTable.jsx`) baik pada tampilan desktop maupun mobile card.
  2. Penggabungan filter pelanggan terisolir ke dalam kategori kartu LOS (`CustomerService.get_customers` status == 'LOS'): menyaring `LogPerformaONT.status_koneksi == "LOS" OR Pelanggan.status_isolir == True OR Pelanggan.status_pembayaran == "ISOLIR"` sehingga seluruh 8 pelanggan terisolir muncul lengkap di tabel saat kartu LOS diklik.
  3. Penghitungan `combined_los` pada `CustomerService.get_customer_stats` dan penyajian nilai kartu LOS gabungan (18 total) dengan sub-label `${stats.los} Putus • ${stats.isolated} Isolir` di `CustomersView.jsx`.
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
