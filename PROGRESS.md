# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 6132b3b
- Test status: passing (87 unit tests passing)
- Active module: Portal Customer Payment VA State & WhatsApp Fallback
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS): Penanganan Akurat Status VA Non-Aktif & Direct WhatsApp Admin Contact di Portal Pelanggan

## Next Steps
- [x] Multi-strategy resolution (`BillingSyncWorker.resolve_nb_id`) dengan pembersihan prefix port OLT (`1/3/1:21_`) dan ID timestamp
- [x] Metode sinkronisasi massal kantor `BillingService.sync_all_office_customers` di `app/modules/billing/service.py`
- [x] Endpoint `POST /api/pembayaran/sync-all` di `routes.py` dan `controller.py`
- [x] Penambahan tombol "Sinkronkan POP" pada `BillingFilterBar.jsx` & handler `handleSyncAll` di `BillingView.jsx`
- [x] Header `Cache-Control: no-cache, no-store, must-revalidate` pada penyajian SPA `index.html` (`app/main.py`, `dashboard/controller.py`, `portal/main.py`)
- [x] Eksekusi sinkronisasi database Tengaran di VPS (146 total, 104 lunas, 42 belum bayar, 20 jatuh tempo, Rp 6.955.000 tunggakan)
- [x] Sanitasi murni numerik pada `paymentUtils.getDefaultChannels`
- [x] Eliminasi fallback nomor VA palsu saat `va_state !== 'payable'` di `PortalPaymentTab.jsx`
- [x] Penambahan kartu info tagihan non-VA dan tombol CTA "Hubungi Admin via WA" terformat rapi
- [x] Build frontend production terbaru (`index-BiRa_Nos.js` & `index-CUbl-PTy.css`)
- [ ] Push ke origin main dan restart daemon di server produksi

## Blockers
- None
