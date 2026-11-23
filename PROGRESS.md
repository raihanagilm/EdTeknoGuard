# PROGRESS.md — Status Pelacakan Sesi & Keberlanjutan Sistem

## Current State
- Last commit: 84edaae
- Test status: passing (make check: passing)
- Active module: System Harness & Operational Stability
- Baseline: Green

## In Progress
- Pengerasan Keamanan Sistem (Defense-in-Depth): Bound Parameterized Queries, Anti-Brute-Force Rate Limiting, Security Headers, dan Origin Firewall UFW

## Next Steps
- [x] Refactoring parameterized queries bound parameters di `app/core/tenant_database.py`
- [x] Middleware `SecurityHeadersMiddleware` (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)
- [x] Middleware `LoginRateLimitMiddleware` (Sliding window rate limit anti-brute force pada `/api/auth/login` dan `/portal/api/auth/login`)
- [x] Skrip otomasi firewall VPS `scripts/setup-cloudflare-ufw.sh` (Lockdown port 80/443 ke Cloudflare IP & Port SSH 2024)
- [x] Suite pengujian keamanan `tests/test_security_hardening.py` (78 tests passing)
- [ ] Deploy dan restart layanan di server VPS produksi

## Blockers
- None
