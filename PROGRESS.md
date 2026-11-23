# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 7a4bf76
- Test status: passing (86 unit tests passing)
- Active module: Billing Table Multi-Column Sorting
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS): Fitur Sorting Kolom Tabel Status Tagihan & Bayar (BillingTable)

## Next Steps
- [x] Parameter query `sort_by` dan `sort_dir` pada route `/api/pembayaran` (`app/modules/billing/routes.py`)
- [x] Logika pengurutan data di `BillingService.get_billing_overview` (`app/modules/billing/service.py`)
- [x] Penambahan argumen sorting pada `BillingService.getOverview` (`frontend/src/services/api.js`)
- [x] State dan handler sorting `sortField` & `sortDir` pada `BillingView.jsx`
- [x] Header sortable interaktif dengan `ArrowUpDown`, indikator arah (▲/▼), dan styling aktif di `BillingTable.jsx`
- [x] Kontrol sorting adaptif untuk mobile card stack di `BillingTable.jsx`
- [x] Suite pengujian unit `test_billing_overview_sorting` di `tests/test_billing_module.py` (86 unit tests passing)
- [x] Build frontend production lolos tanpa error
- [ ] Commit atomik, push origin main, dan deploy ke VPS produksi

## Blockers
- None
