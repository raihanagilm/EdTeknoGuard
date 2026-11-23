# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 2de0245
- Test status: passing (85 unit tests passing)
- Active module: Account Lockout by Identifier (MyTekno)
- Baseline: Green

## In Progress
- Selesai & Terverifikasi (PASS): Proteksi Account Lockout per Nomor WhatsApp pada Portal MyTekno

## Next Steps
- [x] Modul `AccountLockoutManager` di `app/core/account_lockout.py` (Maks. 5 percobaan gagal / 15 menit lockout, normalisasi kanonikal format nomor WA `tel:...`)
- [x] Integrasi lockout pada `AuthService.authenticate` di `app/portal/modules/auth/service.py`
- [x] Status respons HTTP 423 (Locked) dan pesan sisa waktu di `app/portal/modules/auth/routes.py`
- [x] Auto-unlock akun saat permintaan reset password berhasil di `/minta-reset-password`
- [x] Tampilan pesan peringatan sisa kesempatan dan masa kunci di `frontend/src/portal/components/auth/PortalAuthView.jsx`
- [x] Unit test lengkap 6 kasus uji di `tests/test_account_lockout.py` (85 unit tests passing)
- [ ] Commit atomik, push origin main, dan deploy ke server VPS produksi

## Blockers
- None
