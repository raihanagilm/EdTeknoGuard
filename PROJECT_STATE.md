# PROJECT STATE — EdTeknoGuard

Single Source of Truth (SSOT) status fungsional, arsitektur, dan alokasi sistem EdTeknoGuard.
Mengacu pada protokol enforcement `vibe-coding-guardrails.md` dan `AGENTS.md`.

---

## 1. Registry Port Resmi Proyek (P10)
| Komponen | Port | Deskripsi |
| :--- | :--- | :--- |
| **Backend FastAPI** | `7890` | ASGI Uvicorn Server (`settings.APP_PORT`) |
| **Frontend Vite (SPA)** | `7891` | React 18 Admin NOC & Portal Pelanggan |
| **Database MySQL** | `3306` / `33070` | Multi-Tenant Database Manager |

---

## 2. Removed Features (Anti-Zombie Registry — P1-02)
> **PERINGATAN MUTLAK:** Fitur-fitur di bawah ini telah dihapus permanen atau digantikan dan **DILARANG KERAS** dibuat ulang:
1. **Telegram Bot Notification (`telegram_service.py` / Bot Token)**: 
   - *Status:* Dihapus permanen.
   - *Pengganti:* Notifikasi Native APK Android (Web Wrapper) dan polling notifikasi in-app real-time.
2. **Pendaftaran Mandiri Warga Desa (`/portal/daftar`)**:
   - *Status:* Ditiadakan.
   - *Pengganti:* Akun dibuat langsung oleh ISP saat instalasi modem (Default Password: `123456`). Rute dialihkan otomatis ke `/portal/login`.
3. **Pemberitahuan/Teks "Sisa Kuota"**:
   - *Status:* Dilarang keras di seluruh antarmuka pelanggan. Layanan internet bersifat bebas kuota / unlimited.
4. **Opsi "Semua Kantor" pada Switcher Navigasi**:
   - *Status:* Dihapus. Pemantauan dan pelaporan wajib spesifik terisolasi per wilayah kantor (`cabang`, `pusat`, `banyumas`).
5. **Penimpaan Data Pelanggan Saat Import Excel/CSV**:
   - *Status:* Dilarang keras (No Overwrite Policy). Duplikasi diselesaikan inline melalui Auto-ID, skip, atau hapus baris.

---

## 3. Fitur Utama Aktif (Active Features)
- **Monitoring Redaman Optik (ONT Scraper)**: Pemindaian otomatis ZTE GM220-S & XPON dengan batas peringatan (`-26.0 dBm`) dan kritis (`<= -27.0 dBm` / LOS).
- **Arsitektur Multi-Tenant Database**: Database master (`edteknoguard`) untuk users/kantor dan database tenant terisolasi (`edtekno_{kantor}`) untuk data operasional.
- **Normalisasi Tunggal Master Pelanggan**: CASCADE deletion otomatis ke log performa, alert, tiket kendala, dan kuota.
- **Portal Pelanggan Mandiri (TeknoCust)**: Lapor kendala mandiri, cek riwayat penggunaan kuota harian, manajemen kata sandi WiFi, dan pengujian sinyal/kecepatan.
- **Desain UI/UX Mobile-First**: Sticky bottom navigation 5-tab, semantik skeleton loading (bebas full-page spinner), ikon SVG murni (0 emoji), dan bebas dot indikator kosong.

---

## 4. Standar Format ID (P3-01)
- **ID Pelanggan**: `<prefix><YYYYMMDD><4digit>` (contoh: `cust202610314821`).
- **ID Tiket Kendala**: `tkt<YYYYMMDD><4digit>` (contoh: `tkt202610318921`).

---

## 5. Standar Arsitektur Modular Laravel (HMVC Monolith — Selesai Diterapkan)
Mengacu pada konvensi standar Laravel:

1. **Folder Gerbang Rute (`routes/`)**:
   - `routes/api.py`: Gerbang rute utama seluruh API Admin NOC (`app.include_router(...)`).
   - `routes/portal.py`: Gerbang rute utama Portal Warga (`/portal/api`).
   - `app/main.py` mendaftarkan seluruh endpoint via `routes.api.register_api_routes(app)` dan `routes.portal.register_portal_routes(app)`.

2. **Folder Basis Data (`database/`)**:
   - `database/init_db.py`: Skrip bootstrap inisialisasi tabel master & tenant.
   - `database/migrations/`: Berkas skema & DDL SQL (`001_init_schema.sql`).
   - `database/seeders/`: Seeder database Python steril (`database_seeder.py`) untuk data kantor, akun master admin, dan kredensial default modem.
   - `database/schema.md`: Dokumentasi ERD Mermaid & relasi tabel.
   - *Catatan:* Direktori lama `db/` telah digantikan secara permanen oleh `database/`.

3. **Folder Controllers (`app/controllers/`)**:
   - `app/controllers/admin/`: AuthController, DashboardController, MonitoringController, CustomerController, LogsMgmtController, SystemSettingsController, ActivityLogController, UsersController, AdminCustomerMgmtController.
   - `app/controllers/portal/`: PortalAuthController, PortalDashboardController, PortalProfileController, PortalQuotaController, PortalTicketController, PortalWifiController.

4. **Folder Services (`app/services/`)**:
   - `app/services/admin/`: AuthService, DashboardService, MonitoringService, CustomerService, LogsMgmtService, SystemSettingsService, ActivityLogService, UsersService, AdminCustomerMgmtService.
   - `app/services/portal/`: PortalAuthService, PortalDashboardService, PortalQuotaService, PortalTicketService, PortalCustomerService.
   - External Daemon Services: `ont_scraper_service.py`, `scheduler_service.py`, `mikrotik_service.py`, `connected_device_service.py`, `snmp_service.py`, `importer_service.py`.

5. **Folder Models (`app/models/`)**:
   - `app/models/models.py`: Definisi ORM SQLAlchemy terpusat (MasterBase & TenantBase).
   - `app/models/__init__.py`: Re-export model ORM (`from app.models import User, Pelanggan, TiketKendala`).

6. **Folder Middleware (`app/middleware/`)**:
   - `app/middleware/session_middleware.py`: Handler middleware sesi pengguna (`SlidingSessionMiddleware`) untuk sliding session 30 hari.

4. **Kamus Views 1:1 Technical English (`frontend/src/views/`)**:
   - Menyediakan interface komponen Technical English seragam untuk setiap domain bisnis (`DashboardView`, `CustomersView`, `OpticalLogsView`, `TicketsView`, `QuotaView`, `SettingsView`, `UsersView`, `ActivityLogsView`).

## 8. Rename Fisik Berkas Frontend Sesuai Standar P9-01
- Seluruh berkas komponen utama Admin NOC telah diganti nama fisiknya secara langsung: DashboardView.jsx, CustomersView.jsx, OpticalLogsView.jsx, TicketsView.jsx, QuotaView.jsx, SettingsView.jsx, UsersView.jsx, ActivityLogsView.jsx, BranchOfficesView.jsx, OfficeManagementView.jsx, NotificationsView.jsx.
- Seluruh berkas tab Portal Warga telah diganti nama fisiknya secara langsung: PortalDashboardTab.jsx, PortalTicketsTab.jsx, PortalQuotaTab.jsx, PortalWifiTab.jsx, PortalProfileTab.jsx, PortalPaymentTab.jsx.
- Seluruh import di App.jsx dan PortalPelangganApp.jsx diselaraskan langsung ke nama file fisik baru.

## 9. Pembersihan Total Berkas & Subkomponen Sesuai P9-01
- **Subfolder Frontend**: components/dashboard/ (DashboardChartSection, DashboardControlBar, DashboardQuickShortcuts, dashboardUtils).
- **Subfolder Pelanggan**: components/customers/ (CustomersFilterBar, CustomersTable).
- **Komponen Modal & Login Admin**: LoginView.jsx, CustomerDetailModal.jsx, CustomerImportWizard.jsx.
- **Komponen Modal Portal**: ConnectedDevicesModal.jsx, SpeedTestModal.jsx.
- **Aplikasi Shell Portal**: PortalCustomerApp.jsx.
- **Modul Backend Portal**: tickets/, quota/, profile/.
- **Dokumen Bersih**: design.md, architecture.md, prompt_android_studio.txt, project_ont_monitoring.docx.
