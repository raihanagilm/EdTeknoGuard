# Pedoman Desain UI/UX & Design Tokens: EdTeknoGuard

Dokumen ini merupakan acuan resmi standar visual, palet warna, tipografi, dan komponen antarmuka aplikasi **EdTeknoGuard**. Seluruh template HTML, styling Tailwind CSS, dan komponen interaktif wajib mengacu pada standar di dokumen ini untuk menjaga konsistensi tampilan.

> 🔗 **Tautan Dokumen Terkait:**
> - 📖 [README Utama Proyek](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/README.md)
> - 📋 [Alur Kerja Sistem & Logika Bisnis (prd.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/prd.md)
> - 🏗️ [Struktur File/Folder & Database (arsitektur.md)](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/arsitektur.md)

---

## 1. Filosofi Desain

- **Gaya:** Modern, Clean, Professional Network NOC Dashboard, Highly Accessible, Mobile-First.
- **Fokus Pengguna:** Teknisi jaringan dan Administrator NOC yang membutuhkan akses cepat, indikator visual yang kontras dan jelas (mudah terbaca di layar HP saat di tiang/lapangan maupun di monitor kantor).
- **Interaktivitas:** Reaktif dan responsif menggunakan **Alpine.js** dan **Tailwind CSS** tanpa beban runtime yang berat.

---

## 2. Palet Warna Resmi (Color Tokens)

### 2.1 Brand & Neutral

| Peran | Hex Code | Tailwind Class | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `#4F46E5` | `bg-indigo-600`, `text-indigo-600` | Tombol aksi utama, navbar, active state |
| **Primary Hover** | `#4338CA` | `hover:bg-indigo-700` | Interaksi hover tombol utama |
| **Primary Dark** | `#312E81` | `bg-indigo-900` | Header tebal, card accent |
| **Primary Soft** | `#EEF2FF` | `bg-indigo-50`, `text-indigo-700` | Badge aktif, card highlight, active nav link |
| **Body Background** | `#F8FAFC` | `bg-slate-50` | Background seluruh aplikasi |
| **Surface / Card** | `#FFFFFF` | `bg-white` | Kontainer kartu, modal, tabel |
| **Border / Divider**| `#E2E8F0` | `border-slate-200` | Garis pemisah komponen |
| **Heading Text** | `#0F172A` | `text-slate-900` | Judul, angka KPI, teks utama |
| **Body Text** | `#334155` | `text-slate-700` | Deskripsi, isi tabel |
| **Muted Text** | `#64748B` | `text-slate-500` | Subtitle, placeholder, timestamp |

---

### 2.2 Status Ambang Batas Redaman (Optical Rx Power Tokens)

Khusus sinyal optik ONT pada EdTeknoGuard, batas ambang peringatan dini ditetapkan mulai **-26.0 dBm**:

| Status | Rentang Nilai (dBm) | Warna Hex | Badge / Styling | Keterangan Tindakan |
| :--- | :--- | :--- | :--- | :--- |
| **NORMAL** | `> -26.0 dBm`<br>*(misal: -12 s/d -25.9 dBm)* | `#10B981` (Emerald) | `bg-emerald-50 text-emerald-700 border-emerald-200` | Sinyal optimal. Tidak butuh tindakan. |
| **WARNING** | `-26.0 dBm` s/d `-31.9 dBm` | `#F59E0B` (Amber) | `bg-amber-50 text-amber-700 border-amber-200` | **Peringatan Awal!** Potensi bending kabel, redaman drop. Alert dikirim ke Telegram. |
| **CRITICAL** | `< -32.0 dBm` | `#EF4444` (Red) | `bg-rose-50 text-rose-700 border-rose-200` | Redaman sangat buruk, koneksi putus-nyambung. Perlu cek segera. |
| **LOS / DOWN** | *Timeout / RTO* | `#64748B` (Slate) | `bg-slate-100 text-slate-700 border-slate-300` | Modem mati / kabel putus total. Cek massal vs lokal. |

---

## 3. Tipografi (Typography Hierarchy)

Font utama yang digunakan adalah **Plus Jakarta Sans** atau **Inter** via Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- **H1 (Page Title):** `text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl`
- **H2 (Section Heading):** `text-lg font-semibold text-slate-800 sm:text-xl`
- **H3 (Card Title):** `text-sm font-medium text-slate-500 uppercase tracking-wider`
- **KPI Stat Metric:** `text-2xl font-extrabold text-slate-900 sm:text-3xl`
- **Body Regular:** `text-sm font-normal text-slate-700 leading-relaxed`
- **Mono / Tech Code (IP, MAC):** `font-mono text-xs font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded`

---

## 4. Standar Mobile-First & Responsive Breakpoints

1. **Prinsip Dasar:**
   - Semua antarmuka didesain nyaman dioperasikan satu tangan pada layar smartphone (lebar `360px` - `420px`).
   - Ukuran target sentuh tombol minimal **44 x 44 px** (`min-h-[44px]` dan `min-w-[44px]`).
2. **Navigasi:**
   - Mobile: Sticky Top Header dengan Hamburger Menu & Bottom Quick Action Bar (Cek Sekarang, Status Polling).
   - Desktop: Topbar responsif dengan status engine dan profil admin.
3. **Penyajian Tabel Pelanggan:**
   - Mobile: Ditampilkan sebagai **Kartu Kontak Interaktif** ringkas (Nama, IP, Redaman terkini, status badge, tombol aksi cepat).
   - Desktop (`md:` ke atas): Ditampilkan sebagai **Tabel Data Lengkap** dengan fitur sortir, filter POP/Status, dan pagination.

---

## 5. Komponen Utama Antarmuka (Reusable Components)

### 5.1 KPI Summary Cards
Terdiri dari 4 kartu metrik utama di bagian atas:
1. **Total ONT Terpantau** (Icon: Router/Network, Netral Indigo)
2. **ONT Normal** (Icon: Shield Check, Hijau Emerald)
3. **Peringatan Redaman $\le -26$ dBm** (Icon: Exclamation Triangle, Kuning Amber)
4. **LOS / Modem Mati** (Icon: Wifi Off, Merah Rose)

### 5.2 Control Bar & Polling Scheduler
Panel kontrol di atas daftar pelanggan:
- **Status Engine Badge:** `● Polling Aktif (Tiap 5 Menit)` (Hijau) atau `○ Polling Dijeda` (Abu-abu).
- **Tombol "Cek Redaman Sekarang" (Manual Scan All):** Tombol aksi cepat dengan animasi spinner saat proses async berjalan.
- **Tombol "Jeda / Mulai Monitoring":** Mengontrol loop scheduler di backend.
- **Timestamp Cek Terakhir:** Menampilkan waktu terakhir kolektor SNMP dijalankan.

### 5.3 Filter & Pencarian
- Input pencarian cepat (Nama, IP 10.10.x.x, MAC Address, ID Pelanggan).
- Dropdown filter POP (`Semua POP`, `Server Cabang`, `Server Pusat`, `Mini Server Pabelan`, `Mini Klero`, `BMS`).
- Dropdown filter Status (`Semua Status`, `Normal`, `Warning <= -26 dBm`, `LOS / Mati`).

### 5.4 Grafik Analisis Historis (Chart.js)
- Pilihan Rentang Waktu: Tab interaktif `[ Hari Ini ]` `[ 7 Hari ]` `[ 30 Hari ]`.
- Visualisasi garis pergerakan redaman rata-rata dan titik puncak redaman drop.
- Garis batas kritis putus-putus (*threshold line*) berwarna oranye di titik `-26.0 dBm`.

---

## 6. Integrasi dengan Arsitektur & Markdown Lain

Untuk alur fungsional sistem dan detail backend:
- 📋 Alur Kerja & Logika Bisnis: [prd.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/prd.md)
- 🏗️ Struktur Folder & Skema Database: [arsitektur.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/arsitektur.md)
- 📖 Panduan Menjalankan Sistem: [README.md](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/README.md)
