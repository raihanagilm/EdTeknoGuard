# DECISIONS.md — Architecture Decision Records (ADR)

## ADR-001: Adopsi Single Portal dan Normalisasi Database Tunggal
- **Status:** Diterima & Diimplementasikan
- **Konteks:** Menghilangkan redundansi tabel akun pelanggan dan menyatukan portal pelanggan ke dalam master tabel `pelanggan`.
- **Keputusan:** Menggabungkan kredensial portal langsung ke `pelanggan` dan menggunakan relasi CASCADE untuk tabel anakan.

## ADR-002: Standar Ikon UI SVG Murni & Larangan Emoji
- **Status:** Diterima & Diimplementasikan
- **Konteks:** Menghindari inkonsistensi visual emoji atau icon font eksternal.
- **Keputusan:** Seluruh antarmuka menggunakan inline SVG murni atau Lucide icons tanpa emoji dan tanpa dot kosong.

## ADR-003: Integrasi Harness Engineering WalkingLabs
- **Status:** Diterima & Diimplementasikan
- **Konteks:** Menjamin keandalan agen AI dalam sesi panjang (*cross-session continuity*).
- **Keputusan:** Mengimplementasikan 5 subsistem: Instructions, Tools, Environment, State, dan Feedback.
