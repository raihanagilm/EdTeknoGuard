# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: In Progress
- Test status: passing (Vite build OK)
- Active module: Customer Portal Anti-Slop (Badge Notifikasi, Kartu Non-VA, Redesain Editorial Legal Modal & Page)
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS):
  1. Penyesuaian ukuran badge status notifikasi: font mikro `text-[10px] font-medium`, title case `Lunas`/`Belum bayar`, icon `w-3 h-3`.
  2. Penghapusan kotak ikon chat hijau pastel di kartu pemberitahuan non-VA `PortalPaymentTab.jsx`.
  3. Redesain menyeluruh `PortalLegalModal.jsx` dan `PortalLegalPage.jsx` ke tata letak dokumen editorial murni bebas AI-slop (tanpa kotak icon pastel bertumpuk, tanpa callout bergaris samping biru, tanpa `font-mono`, dan segmented tab netral minimalis).

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
- [x] Build frontend production terbaru (`index-Ddlp0CA8.js` & `index-DhnQKq5G.css`)
- [ ] Push ke origin main dan restart daemon di server produksi VPS

## Blockers
- None
