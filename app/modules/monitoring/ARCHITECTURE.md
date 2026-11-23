# Architecture & Constraints — Monitoring Module

## 1. Overview
Modul `monitoring` bertanggung jawab atas pemindaian optik periodik ONT (Optical Network Terminal) pelanggan, kalkulasi KPI redaman, dan pemicuan alert darurat.

## 2. Architectural Seams & Boundaries
- **Controller Layer (`controller.py`)**: Menerima request HTTP dari frontend NOC. Dilarang menulis raw query database langsung.
- **Service Layer (`service.py`)**: Mengorkestrasi background scan via `ONTScraperService` dan `SchedulerService`.
- **Threshold Rules**:
  - Normal: `> -26.0 dBm` (source: SOP ISP 2026)
  - Warning: `-26.0 dBm` s/d `-27.0 dBm` (why: deteksi dini penurunan redaman)
  - Critical/LOS: `<= -27.0 dBm` (why: cegah pemutusan koneksi drop signal)

## 3. Verification
- `pytest tests/test_scheduler_modules.py`
- `pytest tests/test_scraper_modules.py`
