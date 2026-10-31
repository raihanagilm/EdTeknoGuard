# Design System Pro — Rulebook UI/UX

> Rulebook ini menjadi **sumber kebenaran tunggal (single source of truth)** untuk desainer, engineer, dan tim konten. Semua aturan diturunkan dari dokumen *"Pembedahan Aturan UI/UX – Design System V2"*.
> Prinsip dasarnya: **"Terlihat rapi" ≠ "Terstruktur dengan benar."** Setiap angka, warna, dan komponen harus punya alasan, bukan sekadar *feeling*.

| | |
|---|---|
| **Sumber** | Pembedahan Aturan UI/UX – Design System V2 (Video 1–95; Video 47, 74, 96–100 kosong di sumber) |
| **Bahasa** | Indonesia |
| **Cakupan** | Foundations · Components · Patterns · UX Principles · Workflow & Governance · Checklists · Token Sheet |

---

## Cara Membaca Dokumen Ini

| Notasi | Arti |
|---|---|
| **WAJIB** | Aturan yang tidak boleh dilanggar tanpa alasan terdokumentasi |
| **DISARANKAN** | Praktik terbaik; boleh menyimpang jika ada alasan kuat |
| **DILARANG** | Anti-pattern yang terbukti merugikan user atau sistem |
| `[V18]` | Rujukan ke **Video 18** pada dokumen sumber (penomoran mengikuti urutan file sumber, bukan judul "Day X") |
| *(contoh)* | Nilai ilustratif dari sumber. **Ganti dengan nilai brand-mu**, tetapi pertahankan strukturnya |
| *(turunan)* | Angka hasil perhitungan dari aturan sumber, bukan angka eksplisit di sumber |

---

## 0. Filosofi & Prinsip Inti

1. **Sistem > Halaman.** Halaman ke-13 tidak boleh dikerjakan sama lamanya dengan halaman ke-1. Bangun fondasi dulu, halaman hanyalah *instance* dari sistem. `[V46]`
2. **Tidak ada angka tanpa alasan.** Spacing, radius, ukuran komponen, tipografi, dan ikon harus lahir dari rumus atau skala, bukan dari "kira-kira enak". `[V1, V5, V16]`
3. **Bangun sambil jalan.** Design system tidak perlu 100% selesai sebelum dipakai. Progres "cukup untuk mulai" sudah cukup. Halaman baru adalah bahan bakar sistem. `[V46, V50]`
4. **Kejelasan mengalahkan estetika.** Label, penanda wajib, dan petunjuk interaksi tidak boleh dikorbankan demi tampilan "clean". `[V75, V84, V90]`
5. **Kurangi beban kognitif & interaction cost.** Setiap klik, ketikan, dan keputusan tambahan adalah biaya bagi user. `[V58, V69, V86]`
6. **Level sama, perlakuan sama.** Elemen berfungsi sama harus punya posisi, label, dan tampilan yang sama (*Double-D Rule: Differences Are Difficult*). `[V76, V83]`
7. **Aksesibilitas itu terukur.** Kontras, line height, dan touch target dicek dengan angka, bukan mata telanjang. `[V12, V13, V23]`
8. **Sistem yang menanggung risiko, bukan user.** Pindahkan beban kerja dan keamanan ke sistem (validasi, auto-fill, rate limiting). `[V63, V69]`
9. **Hormati perhatian user.** Semakin kecil urgensi pesan, semakin kecil gangguan yang boleh dibuat. `[V39, V67]`
10. **Nama yang sama di Figma dan di kode.** Bahasa yang rapi sama pentingnya dengan visual yang rapi. `[V20]`

**Urutan membangun (bottom-up):** `Foundation (token) → Components → Templates → Pages`. `[V43, V45, V46]`

---

## 1. Foundations

### 1.1 Spacing (8pt Grid System) `[V1, V2, V27]`

**Aturan inti**

- **WAJIB** memakai kelipatan **8** untuk spacing, padding, margin, dan ukuran elemen utama: `8 · 16 · 24 · 32 · 40 · 48 · 64`.
- **DIPERBOLEHKAN** kelipatan **4** (`4 · 12 · 20`) khusus elemen detail kecil: jarak ikon ke teks, padding chip/tag/badge, padding tombol kecil.
- **DILARANG** angka acak seperti `7 · 13 · 15 · 21 · 23 · 37 · 43`.

**Kenapa 8?**

- **Divisibility:** 8 → 4 → 2 habis dibagi tanpa desimal, sehingga mudah membagi ruang.
- **Presisi pixel:** angka ganjil memaksa render ke posisi *sub-pixel* sehingga elemen blur atau bergeser. Kelipatan 8 selalu jatuh tepat di garis pixel.
- **Handoff:** mudah dikonversi developer (Android/iOS berbasis grid 4/8).

**Tiga range spasi berdasarkan konteks** `[V27]`

| Range | Nilai (px) | Dipakai untuk | Contoh |
|---|---|---|---|
| **Small** | 4, 8 | Elemen mikro yang saling terkait erat | Jarak ikon–teks, padding badge/tag, gap button group |
| **Medium** | 12, 16, 20, 24 | Komponen standar & isi card | Padding tombol, jarak avatar–teks, jarak antar elemen di card/list |
| **Large** | 32, 40, 48+ | Layout makro | Header → konten pertama, jarak antar section |

> **Prinsip:** *Makin kecil elemen, makin kecil spacing-nya. Makin besar area, makin besar spacing-nya.*
> Antar huruf 0–2px · ikon–teks 8px · antar paragraf 16–24px · antar section 32–48px.

**Padding vs Gap vs Margin** `[V65/V66]`

| Istilah | Arah jarak | Siapa yang mengatur | Contoh |
|---|---|---|---|
| **Padding** | Ke dalam (tepi → isi) | Kontainer itu sendiri | Tepi tombol ke teksnya |
| **Gap** | Ke luar, antar elemen sejajar dalam satu grup | **Kontainer induk** (1 setting untuk semua anak) | Jarak antar card dalam satu grid |
| **Margin** | Ke luar dari diri sendiri | **Per elemen** (bisa berbeda-beda) | Jarak spesifik satu elemen ke tetangganya |

Aturan cepat: tanyakan *"jaraknya ke mana?"* → ke dalam = padding · ke luar antar sejajar = gap · ke luar per elemen = margin. **DISARANKAN** memakai *gap* (diatur kontainer) agar kode lebih rapi.

**Whitespace sebagai hierarki** `[V28]`

> Ruang kosong lebih luas di sekitar elemen = elemen terasa lebih penting. Spacing seragam membuat desain *flat*.

| Tingkat kepentingan | Elemen | Spacing (contoh) | Efek |
|---|---|---|---|
| **Tinggi** | Judul section, tombol utama (CTA), hero image | **32 – 64+** | Menonjol, ditangkap mata pertama kali |
| **Sedang** | Paragraf, list item terkait, card | **16 – 24** | Terbaca sebagai satu kelompok |
| **Rendah** | Ikon+label, badge, antar baris teks | **4 – 8** | Rapat, mendukung fokus utama |

- Tombol utama: beri "napas" luas (contoh 64px). Link/teks sekunder: lebih sempit (24 atau 8px).
- **DILARANG** memberi spacing seragam ke semua elemen (semua 8px → sesak; semua 64px → bolong-bolong).

---

### 1.2 Grid & Breakpoint `[V3, V4]`

Grid adalah **fondasi fleksibilitas layout**, bukan sekadar garis bantu.

| Perangkat | Jumlah kolom | Alasan | Contoh pembagian |
|---|---|---|---|
| **Desktop** | **12** | Habis dibagi 2, 3, 4, 6 | 12 · 6+6 · 4+4+4 · 3+3+3+3 · 4+8 · 3+9 |
| **Tablet** | **8** | 12 kolom terlalu sempit; 8 adalah kelipatan 4 sehingga transisi ke mobile mulus | 4+4 · 2+6 (sidebar + konten) |
| **Mobile** | **4** | Layar sempit; jarang butuh lebih dari 2 kolom berdampingan | 4/4 (full width) · 2+2 (card produk) |

- **Margin (tepi layar) & Gutter (jarak antar kolom): WAJIB kelipatan 8** → **16px** (padat) atau **24px** (lega). Aturan ini tetap sama di semua breakpoint.
- 10 kolom **DILARANG** sebagai dasar: hanya habis dibagi 2 dan 5, sehingga 3 atau 4 kolom tidak presisi.
- Titik breakpoint dalam piksel **tidak ditentukan sumber**; tetapkan per proyek dan dokumentasikan sebagai token.

### 1.3 Strategi Layout Lintas Perangkat `[V8]`

| Strategi | Ciri | Kelebihan | Kekurangan | Cocok untuk |
|---|---|---|---|---|
| **Adaptive** | Layout berbeda total per device | UX optimal per konteks | Effort build 2× | E-commerce, super app (mobile: bottom nav; desktop: sidebar filter) |
| **Responsive** | Satu layout mengalir mengikuti lebar layar | Effort 1×, jalan di semua ukuran | Kurang optimal per device | Blog, berita, company profile |
| **Strict** | Layout terkunci; muncul scrollbar jika layar kecil | Presisi tinggi | Rusak jika dipaksa menyesuaikan | Design tool, editor, dashboard analitik, software teknis |

Panduan cepat: mau beda per device → **Adaptive** · sekali bikin jalan di mana-mana → **Responsive** · konten tak boleh berubah ukuran → **Strict**. **WAJIB** memilih strategi sebelum mulai mendesain.

### 1.4 Logika Penentuan Ukuran Elemen `[V7]`

| Pendekatan | Logika | Setting Figma | Cocok untuk | Yang dijaga konsisten |
|---|---|---|---|---|
| **Element First** | Tentukan tinggi wadah dulu | **Fixed height** | Button, input, badge/tag, ikon (konten pendek & terprediksi) | Tinggi total (mis. 40/48px) |
| **Content First** | Tentukan padding dulu, biarkan konten mengisi | **Hug / Fill** | Table row, card, list item (konten dinamis) | Nilai padding (mis. 16px) |

- **DILARANG** memaksa fixed height pada elemen berkonten dinamis (teks terpotong) dan **DILARANG** membiarkan tinggi tombol dinamis.
- Kedua pendekatan tetap tunduk pada 8pt grid (tinggi utama kelipatan 8; padding utama kelipatan 8; detail kecil kelipatan 4).

### 1.5 Corner Radius `[V6, V23]`

**Radius = karakter brand.** Pilih skala berdasarkan kesan yang diinginkan:

| Karakter | Radius | Kesan | Cocok untuk |
|---|---|---|---|
| **Kecil** | 2 – 4px | Formal, serius, profesional | Banking, enterprise, dashboard data |
| **Sedang** | 8 – 12px | Modern, seimbang, bersih (paling umum) | Startup, SaaS, produktivitas |
| **Besar** | 16px+ | Friendly, playful, santai | Consumer app, lifestyle, kesehatan, aplikasi anak |

**Dua rumus wajib**

- **Nested radius:** `Radius dalam = Radius kontainer − Padding`. Contoh: card radius 16, padding 8 → gambar di dalamnya radius **8**.
- **Pill / fully rounded:** `Radius = Tinggi ÷ 2`. Contoh: badge tinggi 24 → radius **12**.
- **DILARANG** angka radius acak (7, 13, 19px).
- Wrapper ikon berwarna memakai radius yang sama dengan sistem (konsisten dengan card dan tombol).

---

### 1.6 Color System

Struktur tiga lapis: **Brand (identitas) → Neutral (struktur & teks) → Semantic (status & umpan balik)**, seluruhnya disimpan sebagai **token/variable** agar rebranding dan dark mode cukup mengubah satu tempat. `[V9, V15]`

#### 1.6.1 Prinsip token warna `[V9]`

- **DILARANG** memilih warna manual lewat color picker atau menyalin hex (menghasilkan "warna kembar" seperti `#0062FF`, `#0060FF`, `#005FFF`).
- **WAJIB** memakai token bernama dengan hex terkunci, contoh penamaan: `Foundation/Primary/primary-500`.
- Setiap token punya **peran semantik** (bukan hanya nama warna).
- Di kode, developer memakai variabel (mis. `--primary-500`), bukan hardcode hex.
- Manfaat: ganti nilai satu token → seluruh komponen ikut berubah.

#### 1.6.2 Brand / Primary Scale `[V10]`

**Workflow:** ekstrak hex dari logo brand (eyedropper) → jadikan **Primary 500** → generate skala 50–950 (uicolors.app) → **kurasi ±5 level** → simpan sebagai token.

| Token | Hex *(contoh)* | Peran |
|---|---|---|
| `primary-50` | `#F0F9F5` | Background notifikasi / surface bertint brand |
| `primary-200` | `#B7E3CE` | Background badge, label, chip status |
| `primary-500` | `#328E6E` | **Warna utama:** button & link (CTA) |
| `primary-600` | `#24775C` | Hover & pressed state |
| `primary-950` | `#0B231D` | Teks di atas background terang (lolos AA); basis overlay gelap |

- Level tambahan (mis. 400, 700) boleh diambil kapan saja dari skala yang sama; jangan buat warna baru dari nol.
- Jika brand sudah punya identitas, **DILARANG** mengarang warna primary baru.

#### 1.6.3 Neutral `[V11]`

| Token | Hex | Peran | Catatan |
|---|---|---|---|
| `text-primary` | `#1A1A1A` | Teks utama (**soft black**) | **DILARANG** `#000000`: kontras 21:1 menyebabkan halation & mata cepat lelah |
| `surface-page` | `#F5F5F5` | Background halaman | Selisih luminansi tipis membuat card terbaca sebagai objek terpisah |
| `surface-card` | `#FFFFFF` | Card / surface | Putih murni hanya untuk permukaan yang harus "naik" |
| `text-secondary` | `#6B7280` | Teks sekunder | Saran sumber (di luar narasi eksplisit) |
| `border` | `#E5E7EB` | Garis pemisah | Saran sumber (di luar narasi eksplisit) |

- **WAJIB** memecah putih menjadi dua level (halaman + card); elevasi dibentuk lewat luminansi, bukan shadow tebal.
- Audit berkala: cari semua `#000000` dan `#FFFFFF` di file lalu ganti dengan versi soft.

#### 1.6.4 Semantic Color `[V15, V17]`

User datang dengan ekspektasi warna: merah = bahaya, hijau = sukses, kuning/oranye = hati-hati, biru = info. **DILARANG** menukar makna (mis. banner "Pembayaran berhasil" berwarna merah).

| Kategori | Hex dasar (level 600) | Fungsi |
|---|---|---|
| **Success** | `#16A34A` | Aksi berhasil |
| **Warning** | `#D97706` | Peringatan *(amber-oranye, bukan kuning murni agar terbaca)* |
| **Error** | `#DC2626` | Aksi gagal |
| **Info** | `#2563EB` | Informasi netral |

- Level 600 = titik jenuh yang teks putihnya lolos AA. Generate skala 50–950 untuk tiap status, ambil level yang dipakai saja.
- **Pilih satu gaya dan konsisten di seluruh komponen:**

| Gaya | Wujud | Cocok untuk |
|---|---|---|
| **Mencolok (Solid)** | Latar 600 + teks putih | Toast, modal konfirmasi, status kritis |
| **Soft** | Latar level 50–100 + teks level 700–800 | Inline alert, badge status, pesan bantuan |

- Simpan sebagai token: `semantic/success`, `semantic/error`, dst.

**Jika brand berwarna merah** `[V17]`

| Elemen | Aturan | Contoh |
|---|---|---|
| Brand / Primary | Merah lebih terang | `#F87171` |
| **Error (status)** | **Tetap merah**, bedakan **shade** (lebih gelap & pekat) | `#991B1B` |
| **Tombol destructive (aksi)** | Bedakan **visual weight**: Outline / ghost, bukan solid merah yang sama dengan primary | Pola Netflix |

#### 1.6.5 Secondary Color `[V35]`

- Peran: **supporting**, bukan saingan primary. Dipakai untuk **badge, tag, highlight section, active state navigasi**. **DILARANG** dipakai di CTA utama.
- Cara menentukan (Adobe Color, input hex primary):

| Harmoni | Posisi | Karakter | Pilih jika |
|---|---|---|---|
| **Analogous** | ±30° | Harmonis, paling aman | Ingin tenang & profesional |
| **Complementary** | +180° | Kontras, eye-catching | Secondary harus benar-benar menonjol (badge, notif) |
| **Triadic** | ±120° | Berani tapi seimbang | Brand playful/energik |

- Alternatif: ekstrak dari logo, **wajib lolos kontras AA** (contoh sumber: 3.22:1 gagal → 5.60:1 lolos setelah tone digeser).
- Jadikan skala 50–950: level 100–200 untuk bg badge/tag · 500–600 untuk isi/aksen/active · 800–950 untuk teks di atas bg terang.

#### 1.6.6 Proporsi Warna 60-30-10 `[V48]`

| Porsi | Peran | Karakter |
|---|---|---|
| **60%** Dominan | Background/kanvas | Netral, tidak mencolok |
| **30%** Sekunder | Card, sidebar, container, pemisah | Sedikit berbeda dari background |
| **10%** Aksen | Button, CTA, active state | Paling vibrant & kontras |

- **DILARANG** memakai warna aksen di mana-mana; aksen yang merata berhenti berfungsi sebagai sinyal.

#### 1.6.7 Kontras & Aksesibilitas (WCAG) `[V12]`

| Level | Teks normal (<18px) | Teks besar (≥18px) |
|---|---|---|
| **AA** *(target wajib)* | ≥ **4.5:1** | ≥ **3:1** |
| **AAA** *(opsional, baca intensif)* | ≥ **7:1** | — |

- Cek dengan contrast checker bawaan Figma (color picker → ikon AA).
- Jika < 4.5, sesuaikan **warna teks**, pertahankan identitas warna brand.
- **Kunci dan dokumentasikan pasangan warna yang lolos** (mis. teks putih di primary-500; soft-black di `#F5F5F5`).
- Tombol disabled sering gagal kontras (contoh sumber: 1.9:1); lihat aturan disabled di §2.1.

#### 1.6.8 Overlay di atas Foto/Card `[V34]`

- **DILARANG** default ke `#000000`. Gunakan **level tergelap dari brand scale (900/950)**: hijau → dark green, biru → dark navy, merah → dark maroon.
- **Quick test:** ganti foto dengan **putih solid**. Jika teks masih terbaca, overlay aman untuk foto apa pun. Jika pucat, naikkan opacity (contoh 60% → 86%), jangan kembali ke hitam murni.

#### 1.6.9 Warna Merah pada Badge Notifikasi `[V77]`

- Merah dipilih karena otak lebih cepat menyadari merah pada konteks beremosi, dan badge merah menciptakan *open loop* (**Zeigarnik Effect**).
- **DILARANG** memakai badge merah untuk hal tidak mendesak (mis. promo diskon). Itu *false urgency* yang menurunkan kepercayaan.

---

### 1.7 Typography

#### 1.7.1 Pemilihan Font `[V33]`

Font di UI adalah **alat fungsional dulu, estetika kemudian**. Lolos dua cek teknis sebelum disesuaikan dengan brand:

1. **Legibilitas kecil:** ketik `i`, `l`, `1` berdampingan; ketiganya harus mudah dibedakan (i bertitik, 1 punya kaki/bendera, l polos). Uji juga di 12–13px.
2. **Ketersediaan weight:** minimal **4 weight** (400 / 500 / 600 / 700).

| Kategori | Kesan | Contoh font | Cocok untuk |
|---|---|---|---|
| **Rounded** | Friendly · playful | Plus Jakarta Sans, Nunito, Poppins | Consumer / lifestyle |
| **Geometric** | Modern · clean | Inter, DM Sans, Outfit | Tech / SaaS |
| **Humanist** | Trustworthy · approachable | Source Sans Pro, Lato, Work Sans | Finansial / kesehatan |

| Weight | Angka | Fungsi |
|---|---|---|
| Regular | 400 | Body, paragraf panjang (kenyamanan baca) |
| Medium | 500 | Label, tombol, navigasi |
| Semibold | 600 | Sub-heading, judul card |
| Bold | 700 | Heading utama, penekanan (teks pendek) |

#### 1.7.2 Type Scale `[V5, V36, V13, V68]`

- **Batasi 4–5 ukuran font** per produk. Ukuran yang beda tipis (13/14/17px) tidak terbaca sebagai level hierarki.
- **Hindari Golden Ratio (×1.618) untuk UI**: loncatannya terlalu jauh (42/68/110px hampir tak terpakai) dan level yang dibutuhkan (12, 20, 24) justru tidak ada. Gunakan **T-shirt scale manual**. *(Materi awal [V5] memperkenalkan golden ratio; materi lanjutan [V36] mengoreksinya. Aturan yang berlaku: V36.)*
- Tambah level baru **hanya** jika ada alasan fungsional (mis. dashboard padat data).

| Token | Ukuran | Line height (rasio) | Line height (px) | Weight | Peran |
|---|---|---|---|---|---|
| `text-display` (XL) | 32 | ×1.25 | **40** | 700 | Judul besar |
| `text-heading` (L) | 24 | ×1.25 | 30 → **32** *(turunan)* | 700 | Heading |
| `text-subheading` (M) | 20 | ×1.5 | 30 → **32** *(turunan)* | 600 | Sub-heading, title card |
| `text-body` (S) | 16 | ×1.5 | **24** | 400 | Body / paragraf |
| `text-caption` (XS) | 12 | ×1.5 | 18 → **20** *(turunan)* | 400 | Caption, catatan |

Notasi style di Figma: `12/150 · 16/150 · 20/150 · 24/125 · 32/125`. Buat text styles otomatis dengan plugin **Styler → Generate Styles**.

**Hierarki judul vs body:** `Title = Body × 1.25 – 1.5` (body 16 → title **20–24px**). Bold saja tidak cukup; ukuran adalah lapisan kontras paling kuat. Gabungkan size + weight + color + spacing. `[V68]`

#### 1.7.3 Line Height `[V13]`

- **WAJIB** nilai eksplisit; **DILARANG** "Auto" pada komponen produksi.
- **Body = font size × 1.5** (lantai minimal WCAG 1.4.12; boleh naik ke 1.6–1.7 untuk teks sangat panjang, tidak boleh di bawah 1.5).
- **Heading = font size × 1.25** (teks pendek 1–2 baris, dirapatkan agar padu).
- Bulatkan hasil ke **kelipatan 4/8** (mis. 25.6 → 24 atau 28). Untuk teks body, **bulatkan ke atas** agar tidak turun di bawah 1.5.

#### 1.7.4 Spasi Vertikal Antar Teks `[V14, V42]`

| Aturan | Nilai | Catatan |
|---|---|---|
| Jarak antar paragraf | ≈ font size body, dibulatkan ke kelipatan 4 | 16px → 16 · 18px → 20 |
| Space **atas** heading | ≈ 2× body (mis. **32px**) | Melepas heading dari blok sebelumnya |
| Space **bawah** heading | ≈ 1× body (mis. **16px**) | Mengikat heading ke isinya (Gestalt proximity) |
| Gambar → headline (card/artikel) | ±**24px** | Visual weight gambar berat; headline butuh napas |
| Headline → body (card/artikel) | ±**8px** | Sama-sama teks; satu unit konten |

- **DILARANG** spacing atas = bawah pada heading (asimetri 2:1 adalah kuncinya: *heading milik konten di bawahnya*).
- Angka paragraf adalah `itemSpacing` antar-frame, bekerja bersama line height, bukan menggantikannya.
- Simpan sebagai token: `space/paragraph`, `space/heading-top`, `space/heading-bottom`, `space/image-to-text`, `space/heading-to-body`.

#### 1.7.5 Alignment `[V31]`

| Konten | Alignment | Alasan |
|---|---|---|
| Body / paragraf | **Rata kiri** | Tepi kiri konsisten = titik jangkar mata |
| Heading pendek (≤ 2 baris, berdiri sendiri) | Boleh **center** | Judul section landing page, modal |
| Heading panjang (> 2 baris) / di atas paragraf | **Rata kiri** | Tepi tidak berantakan |
| Angka di tabel | **Rata kanan** | Digit sejajar, mudah dibandingkan |
| Teks apa pun di UI | **DILARANG justify** | Word-spacing acak (8px ↔ 31px), UI responsif tak punya lebar tetap |

#### 1.7.6 Panjang Baris `[V32]`

| Perangkat | Karakter/baris | Container (font 16px) |
|---|---|---|
| **Desktop** | 50–75 (**ideal 66**) | **600–700px** |
| **Mobile** | 30–50 | Full width, padding kiri-kanan 16–24px |

- Batasi **lebar container**, bukan hanya font size. Developer menerjemahkan ke `max-width: 65ch`.

#### 1.7.7 Headline `[V41]`

- Persempit container (contoh ±540px) sampai headline pecah jadi 2–3 baris seimbang.
- **Quick test:** > 8–10 kata dalam satu baris → persempit.
- **DILARANG** memutus di tengah kata, memecah frasa yang menyatu, atau menyisakan satu kata yatim (*orphan*) di baris akhir. Putus di batas makna (sebelum kata kerja/frasa baru).

---

### 1.8 Iconography

#### 1.8.1 Ukuran `[V16]`

- **Ikon pendamping teks = line height teks tersebut** (bukan font size). Body 16/24 → ikon **24px**.
- Tangga ukuran (kelipatan 4): 

| Ukuran | Konteks |
|---|---|
| **16** | Ikon mikro: caption/label kecil, indikator |
| **20** | Kontrol kompak: chip, tombol sekunder |
| **24** | ⭐ Standar utama |
| **32** | Ikon menonjol: leading icon list, fitur highlight |
| **40** | Display: empty state, hero |

- Verifikasi dengan Dev Mode: W/H ikon harus sama dengan line height teks.

#### 1.8.2 Frame & Optical Balance `[V21]`

- Vektor ikon **jangan memenuhi 100% frame**; sisakan padding ±10–15%.

| Frame | Padding | Maks. artwork |
|---|---|---|
| 16px | ±1–2px | ±12–14px |
| **24px** | ±2–3px | ±18–20px |
| 32px | ±2–4px | ±24–28px |

- Ikon impor: cek frame → bungkus frame 24×24 → center dengan padding ±3px → lakukan untuk seluruh library.

#### 1.8.3 Satu Family Ikon `[V29]`

- **Satu produk = satu family ikon.** Perbedaan family: lebar stroke, ujung garis (cap), radius sudut.
- Family umum: Material Icons, Heroicons, Phosphor, Feather, Lucide. Gunakan plugin **Iconify** dan filter tema yang sama (mis. Outline 24×24 semua).
- Jika terpaksa memakai ikon luar family: samakan **stroke width, end cap, corner radius, optical balance**; atau gambar custom mengikuti style guide family.

#### 1.8.4 Icon Wrapper & Touch Target `[V23]`

| Kasus | Aturan |
|---|---|
| Ikon **inline** (di samping teks) | Tanpa wrapper; align mengikuti line height |
| Ikon **standalone** (icon button, close, shortcut) | **WAJIB** wrapper |
| Wrapper desktop | Ikon 24 + padding 8 = **40px** |
| Wrapper mobile | Ikon 24 + padding 12 = **48px** (Material 48; Apple HIG 44 ⇒ padding 10) |

- `Wrapper = Ikon + padding (atas+bawah)`, padding kelipatan 4/8. Pisahkan **ukuran visual** (24) dari **ukuran interaksi** (48).

---

### 1.9 Imagery: Aspect Ratio `[V56]`

| Konteks | Rasio | Fungsi |
|---|---|---|
| Hero / feature image | **16:9** | Focal point utama |
| Card artikel / produk | **4:3** (alternatif 3:2) | Card compact & konsisten di grid |
| Avatar / thumbnail | **1:1** | Konsisten di semua ukuran |

- Yang terpenting: **satu rasio yang sama untuk konteks yang sama** di seluruh produk.
- Figma: buat frame berrasio tetap, set Fill mode **Fill/Crop** agar gambar auto-crop tanpa gepeng.
- Komponen logo/ikon/ilustrasi: ubah **Constraints ke Scale** agar proporsional saat di-resize (bukan Left/Top). Jangan buat komponen terpisah per ukuran. `[V73]`

### 1.10 Sound Tokens `[V94]`

- Audio feedback adalah token design system (setara Color, Typography, Spacing, Icon, Motion).
- **Satu bunyi = satu token** dengan nama sistematis: `sound.feedback.correct`, `sound.button.click`, `audio.success.01`, `audio.error.01`.
- Alur: identifikasi momen (klik, sukses, error, notifikasi, swipe) → standarisasi library → distribusikan ke Developer **dan** Marketing/Content → pastikan 100% identik lintas platform (experience parity, contoh Ruangguru).

---

## 2. Components

### 2.0 Standar Dokumentasi Komponen `[V43, V54]`

Setiap komponen **WAJIB** punya 6 atribut: **Name · Description · Usage (kapan dipakai / tidak) · Variants · States · Anatomy**. Generate spec (spacing, anatomy, properties, component set) otomatis dengan plugin **DesignDoc [Spectral]**, dan regenerate setiap desain berubah.

**Penamaan** `[V20]`: *Nama di Figma = nama di kode.* Pakai istilah standar industri (cek uiguideline.com; mis. "Toast" dipakai 42% design system besar; alternatif SnackBar/Notification/Flag) dan simpan dalam glosarium tim. Definisi fungsi harus sama antara designer dan engineer.

**Figma:** bangun dengan **Auto Layout** (`Shift+A`); properti variant dinamai logis (`Type`, `State`); gabungkan lewat *Combine as variants*; ubah radius/warna di master component sekali, semua varian mengikuti. `[V19]`

---

### 2.1 Button `[V18, V19, V30, V53, V76, V83, V89]`

**Ukuran & padding**

| Ukuran | Tinggi | Padding vertikal | Padding horizontal | Penggunaan |
|---|---|---|---|---|
| Small | **32** | 4–8 | 12–16 | Aksi sekunder, table action, UI padat |
| **Medium** | **40** | 8–12 | 16–24 | **Standar** desktop & mobile |
| Large | **48** | 12–16 | 24–32 | CTA utama, hero |

- Tinggi **WAJIB** kelipatan 8. **DILARANG** tinggi 37/43px. Minimum tinggi mobile **40px**.
- `Padding vertikal = (Tinggi − Line height teks) ÷ 2` · `Padding horizontal ≥ 2× vertikal`. Contoh Large: (48 − 24) ÷ 2 = 12; horizontal 24.
- Auto Layout: width **Hug contents**, height **Fixed**.

**Padding optikal per jenis tombol** `[V30]`

| Jenis | Rumus | Contoh |
|---|---|---|
| Teks saja | Simetris | Kiri 16 · Kanan 16 |
| Teks + ikon | **Sisi ikon = Padding dasar − Gap** | Dasar 16, gap 8 → sisi ikon 8, sisi teks 16 |
| Ikon saja | `(Target size − Ikon) ÷ 2` | (48 − 24) ÷ 2 = 12 di semua sisi |

*Rumus adalah titik awal; sesuaikan manual ±2–4px sampai mata merasa seimbang.*

**Hierarki (satu layar = satu Primary)** `[V18, V53, V55]`

| Varian | Tampilan | Fungsi |
|---|---|---|
| **Primary (Solid)** | Fill warna brand | Aksi paling penting. **Hanya SATU per layar/view** |
| **Outline (Secondary)** | Border, background transparan | Aksi pendukung (Batal, Kembali, Simpan ke Wishlist) |
| **Text (Tertiary)** | Teks saja | Aksi rendah (Lihat semua, Lewati, Lupa password?) |
| **Destructive** | Warna error | Aksi berisiko (Hapus, Keluar). Jika brand merah → gaya outline/ghost, bukan solid |

Banyak primary sekaligus menyebabkan *decision fatigue* (user bisa mengklik 0 kali).

**State:** setiap varian **WAJIB** punya 4 state: **Default · Hover · Pressed · Disabled**. Matriks 4 varian × 4 state = **16 komponen** dalam satu component set.

**Konsistensi**

- **Posisi:** level sama, posisi sama. Primary CTA di alur yang sama tetap di area yang sama (mis. sticky bawah di mobile) `[V76]`.
- **Label:** **1 aksi = 1 label.** Jangan "Lanjut / Lanjutkan / Selanjutnya" untuk aksi yang sama `[V83]`.
- **Teks:** kata kerja spesifik ("Buat Project", "Bayar Sekarang"), bukan "OK/Submit".

**Disabled button** `[V89]` *(menggantikan opsi disabled di [V49])*

- **DILARANG** menonaktifkan tombol submit untuk "mencegah error": user menebak-nebak dan kontras disabled biasanya gagal AA (contoh 1.9:1).
- **DISARANKAN:** tombol selalu aktif + **inline validation** saat diklik (border merah + pesan spesifik pada field bermasalah).
- Disabled **hanya** untuk: (a) mencegah *double submission* saat loading (teks jadi "Memproses..."); (b) aksi berisiko yang menunggu konfirmasi (mis. "Hapus Akun" aktif setelah centang persetujuan / ketik kata konfirmasi).

---

### 2.2 Input Field `[V51, V78, V84]`

**5 state wajib**

| State | Karakteristik | Tampilan |
|---|---|---|
| **Default** | Kosong | Placeholder + border netral |
| **Filled** | Sudah diketik | Teks user |
| **Focus** | Saat diklik/tap | Border **primary color** + kursor berkedip |
| **Error** | Data tidak valid | Border merah + pesan error di bawah (jelas & beri solusi) |
| **Disabled** | Tidak bisa diedit | Warna pudar + cursor `not-allowed` |

- Contoh pesan error: ❌ "Email salah" → ✅ "Lengkapi domain, contoh: nama@email.com".

**Label & placeholder**

- **Label permanen di atas field.** **DILARANG** placeholder sebagai satu-satunya label.
- Placeholder = **contoh format** (`cth: 0812 3456 7890`), bukan nama field.
- Floating label **tidak disarankan** (NN/g: field terisi mirip field kosong/default).

**Penanda wajib vs opsional** (Heuristic #5: Error Prevention)

- Field wajib → asterisk `*`; field opsional → teks eksplisit **(Opsional)** — **tandai keduanya**.
- Pengecualian: form sangat pendek & familiar (mis. login email + password).

---

### 2.3 Kontrol Pilihan

#### Radio vs Dropdown `[V24]`

| Jumlah opsi | Perlu membandingkan nilai/harga? | Komponen |
|---|---|---|
| **< 6** | Ya / Tidak | **Radio Button** |
| **6 – 15** | Tidak | **Dropdown** |
| **> 15** | Tidak | **Dropdown + Search** |
| Berapa pun | Ya, penting | **Radio** (atau Card Selection) |

#### Default Selection Radio `[V37]`

| Konteks | Boleh default? | Perlakuan |
|---|---|---|
| Netral & reversible (metode pembayaran) | ✅ | Default = opsi paling umum |
| Opsional (ukuran baju) | ⚠️ | Sediakan **Clear selection** / opsi "None" |
| Sensitif/personal & wajib (gender) | ❌ | Kosong + validasi "Wajib dipilih" |

*Radio button tidak bisa di-unselect; default = pilihan yang tak bisa dikosongkan user.*

#### Default Dropdown `[V71, V72]`

- **Default kosong > default ngasal.** **DILARANG** memilih opsi pertama alfabetis ("Afghanistan") agar field terisi.
- **Smart default** hanya jika akurat (lokasi device / riwayat user).
- Menaruh opsi relevan **di atas list** (field tetap kosong "Pilih negara…") lebih aman daripada menjadikannya default.

#### Checkbox `[V38]`

| State | Visual | Arti |
|---|---|---|
| Unchecked | Kotak kosong | Tidak ada dipilih |
| Checked | Kotak + ✓ | Dipilih / semua dipilih |
| **Indeterminate** | Kotak + **dash (—)** | **Sebagian** dipilih |

- **WAJIB 3 variant** (`checked / unchecked / indeterminate`). Pola parent–child ("Select all"): 0 anak → unchecked · semua → checked · sebagian → indeterminate.
- Dokumentasikan siklus klik (indeterminate → checked → unchecked); tambahkan counter "2/4" bila membantu.

#### Slider, Stepper, Text Input `[V80, V93]`

| Kebutuhan | Komponen |
|---|---|
| Angka eksak & rentang kecil (1–5, jumlah tiket) | **Number Stepper** (default dekat target: 1–3 klik) |
| Angka eksak & rentang besar (umur, tahun lahir, stok) | **Text Input** + numeric keypad |
| Perkiraan / "rasa" (brightness, volume) | **Slider** |

- **DILARANG** slider untuk angka presisi; menampilkan angka di sampingnya hanya kosmetik.
- Stepper hibrida: angka di tengah **harus bisa diketik langsung**.

#### Date Input `[V81]`

- Tanggal sudah diketahui (tanggal lahir) → **Text field** `DD/MM/YYYY`.
- Tanggal perlu dipilih/dibandingkan (tiket, hotel, meeting) → **Calendar Picker** (hari, ketersediaan, harga).

---

### 2.4 Tag vs Badge `[V79]`

| | **TAG** | **BADGE** |
|---|---|---|
| Pemicu | **User** memilih | **Sistem** mendeteksi kondisi |
| Fungsi | Representasi pilihan (filter aktif, kategori, email penerima) | Status/jumlah (angka notifikasi, "Pending", "Hot") |
| Tombol X | **Wajib ada** (bisa dihapus) | **Tidak boleh ada** |
| Sifat | Action-oriented, reversible | Information-oriented, otomatis |

*Jika sebuah Badge butuh tombol X, itu sebenarnya Tag.* Nama boleh beragam (Chip, Pill, Label, Dot, Counter), tetapi definisi fungsinya disepakati antara designer dan engineer.

---

### 2.5 Feedback & Overlay

#### Toast vs Banner vs Modal `[V39]`

Pertanyaan tunggal: *"Seberapa penting user harus merespons ini sekarang?"*

| Aspek | 🟢 Toast | 🟡 Banner | 🔴 Modal |
|---|---|---|---|
| Butuh respons? | Tidak | Tidak sekarang | **Ya, sekarang** |
| Posisi | Pojok layar (floating) | Bawah nav / atas halaman | Tengah + overlay |
| Durasi | Auto-dismiss **3–5 detik** | Menetap sampai dismiss/kondisi berubah | Menetap sampai diputuskan |
| Blokir halaman? | Tidak | Tidak | **Ya** |
| Action button | Biasanya tidak | Opsional | Wajib (min. Batal/Lanjut) |
| Contoh | "Berhasil disimpan" | "Maintenance Sabtu 02:00" | "Hapus data ini?" |

Kesalahan umum: modal untuk info ringan · toast untuk pesan kritis (hilang sebelum terbaca) · banner untuk konfirmasi aksi (jadi sampah visual).
Anatomi Toast: Icon, Title, Description, Action button, Close button `[V20]`.

#### Modal `[V22, V61, V67, V91, V95]`

**Anatomi 4 bagian:** Header (judul **1–2 kata** + tombol Close X di kanan atas) · Body · Footer (Primary = konfirmasi/maju; Outline = batal) · Overlay.

- **Lebar desktop: 500–600px** (jadi interupsi fokus; alur mata vertikal Title → Isi → Action). Konten kompleks/form panjang → **halaman penuh / drawer / full-screen modal**.
- **Aturan emas:** *jika modal perlu di-scroll, kontennya salah tempat.*
- **Gunakan modal hanya untuk:** (1) konfirmasi aksi berkonsekuensi (hapus permanen, exit tanpa simpan); (2) input kritis sebelum proses lanjut; (3) notifikasi urgen (sesi berakhir, error kritis).
- **DILARANG** modal otomatis untuk promo/tips/notifikasi sepele.

**Uji Kerugian (Loss Test) & Reversibility** `[V67]`

> *"Kalau user mengabaikan pesan ini, apakah user benar-benar rugi?"*

| Reversibel? | Contoh | Komponen |
|---|---|---|
| **Ya** (bisa dicoba lagi, tak ada data hilang) | Gagal tambah ke keranjang | **Toast** ("Gagal, coba lagi") |
| **Tidak** (data hilang, aksi permanen) | Tutup dokumen belum tersimpan | **Modal** |

**Perilaku penutupan (dismissal)** `[V95]`

| Situasi | Mekanisme | Klik backdrop |
|---|---|---|
| Ada data yang bisa hilang (checkout, form panjang) | **Forced dismiss** (wajib klik X, idealnya ada dialog konfirmasi) | ❌ Tidak menutup |
| Aksi destruktif/irreversible ("Hapus 3 item?") | **Forced dismiss** | ❌ Tidak menutup |
| Hanya melihat (preview gambar/galeri) | **Light dismiss** | ✅ Langsung menutup |

**Timing popup** `[V91]`

- **DILARANG** popup di detik ke-0 (refleks user: "cari X"). Tunggu user terlibat (scroll/interaksi/beberapa produk).
- Perkenalan fitur baru → **tooltip/hint kecil**, bukan overlay penuh.
- Blocking overlay hanya untuk konten urgen & kritis (sesi habis, wajib ganti password).

#### Error Message `[V26]`

Tujuan: *bantu user keluar dari masalah secepat mungkin.*

1. **Jelas:** jawab "apa yang terjadi" + "apa yang harus dilakukan" dalam 1–2 kalimat. **DILARANG** kode/istilah teknis (`Error 0x80004005`, `NullPointerException`, 404/500).
2. **CTA spesifik:** "Coba Lagi", "Hubungi Support", "Ganti Metode"; bukan "OK/Tutup/Lanjut". (Inline form & toast boleh tanpa CTA, tapi teks tetap memberi cara memperbaiki.)
3. **Sudut pandang sistem ("Kami"), bukan menyalahkan user ("Kamu").** ✅ "Password yang dimasukkan tidak cocok." ❌ "Kamu salah memasukkan password."
4. Error tak dikenal: "Terjadi kesalahan. Coba beberapa saat lagi, ya."

#### Empty State `[V25, V92]`

| Elemen | Aturan |
|---|---|
| **Title (APA)** | Singkat & deskriptif, **2–4 kata**, jelaskan mengapa kosong ("Belum ada project") |
| **Body (CARA)** | **1–2 kalimat**, arahan cara mengisi; **DILARANG** mengulang Title |
| **CTA (AKSI)** | Kata kerja spesifik ("Buat Project", "Tulis Postingan Pertama"); **DILARANG** "OK/Lanjut/Submit" |
| Ilustrasi/ikon | Opsional, sangat disarankan (ikon 40px) |

Empty state adalah peluang onboarding, bukan placeholder. Hindari *dead end*.

#### Loading: Skeleton vs Spinner `[V52, V57]`

| Kondisi | Pilihan |
|---|---|
| **< 1 detik** | Tidak perlu loading state (menghindari flicker) |
| **1–3 detik** + layout terprediksi | **Skeleton** (meniru layout asli) |
| **> 3 detik** atau layout tak terprediksi | **Spinner** (+ teks status, mis. "Memuat pesanan…") |
| Proses background (upload, save, sync) | **Spinner** kecil di konteks (tombol/ikon) |

Desainer mengelola **perceived performance**. Buat variant skeleton per tipe halaman (card, list, article) dan spinner per ukuran (inline, overlay).

#### Tooltip vs Popover `[V58]`

- Isi hanya dibaca (label singkat) → **Tooltip**, trigger **hover**.
- Ada aksi di dalamnya (menu, pengaturan, toggle) → **Popover**, trigger **klik** (mencegah "kesenggol").

---

### 2.6 Navigasi

#### Bottom Navigation vs Hamburger `[V59, V62, V75]`

- Riset NN/g: navigasi visible discoverability **92%** vs hidden **47%**. *"Nggak bisa buka yang nggak tau ada."*
- **Bottom nav (visible):** fitur penting & sering dipakai (Home, Search, Keranjang/Transaksi, Profile).
- **Hamburger (hidden):** fitur pendukung/jarang (Settings, About, Help, Privacy, Sign Out).
- **Bottom nav WAJIB memakai label** (ikon + teks) agar user tidak menebak (recognition over recall).

#### Jumlah & Urutan Menu `[V87]`

- Tidak ada angka ajaib. Tentukan berdasarkan 4 faktor: **luas konten**, **kejelasan label**, **niat user**, **posisi**.
- Label spesifik ("Sepatu Lari") > generik ("Solusi", "Layanan", "Lainnya"). Sedikit menu berlabel generik hanya *menunda kebingungan*.
- **Serial position effect:** item terpenting di **awal atau akhir**; tengah paling sering di-skip.

#### Tabs vs Accordion `[V40]`

| | **Tab** | **Accordion** |
|---|---|---|
| Konten | Setara & sejenis (Detail, Ulasan, Diskusi) | Panjang & beragam (FAQ, kebijakan) |
| Jumlah section | **≤ 5**, semua label terlihat tanpa scroll horizontal | Boleh banyak (> 5) |
| Perilaku user | Sering switch/membandingkan | Butuh 1–2 section saja |
| Interaksi | Horizontal | Vertikal (natural di mobile) |

Tergoda membuat tab ke-6? Itu sinyal untuk beralih ke accordion/drawer/list.

#### Breadcrumb `[V82]`

- Pakai **hanya jika hierarki ≥ 3 level** (Home → Kategori → Sub → Produk). Struktur dangkal 1–2 level → **SKIP** (menduplikasi main menu).

#### Overflow Menu (Titik Tiga) `[V85]`

| Jumlah action | Keputusan |
|---|---|
| **1–2** | ❌ Tampilkan langsung (hemat 1 klik) |
| **> 3 (mis. 5–6+)** | ✅ Gunakan titik tiga |

Jika action sedikit dan masih muat → tampilkan langsung (text/icon button). Titik tiga bukan tempat sampah untuk tombol yang malas ditata.

#### Pagination vs Infinite Scroll `[V60]`

- **Pagination:** user punya tujuan spesifik (seeking), butuh checkpoint & backtracking.
- **Infinite scroll:** mode eksplorasi/browsing (feed). Waspadai *dark pattern* memakainya saat user sedang mencari sesuatu.

#### Posisi Search `[V88]`

Search di tab bawah (Thumb Zone) adalah trade-off sadar: +1 tap, tetapi jangkauan ergonomis lebih baik, fungsi berubah jadi ruang eksplorasi (kategori + rekomendasi), mengikuti pola industri (muscle memory), dan Home lebih lega.

#### Recent Search `[V86]`

- Suggestion tidak selalu mempercepat. Recent Search menurunkan cost untuk pencarian berulang, tetapi menambah cost (scan sia-sia) untuk pencarian baru.
- **Cek dulu data:** Repeat-Query Rate **tinggi → pakai**; **rendah → skip**.

---

## 3. Patterns

### 3.1 Form Registrasi `[V70]`

> **Menunda, bukan memecah.** Solusi form panjang bukan stepper, tetapi menunda field non-esensial.

- Form awal **maksimal 2 field mutlak** (Email + Password). Uji: *"Apakah data ini dibutuhkan untuk membuat akun?"* Jika tidak (No. HP, alamat, tanggal lahir) → **DILARANG** di form awal.
- Setelah "Akun Jadi", tampilkan ajakan **"Lengkapi Profil"**. User yang sudah merasakan value jauh lebih rela mengisi.
- Data yang terkumpul tetap sama lengkapnya; yang berubah hanya **waktu memintanya**.

### 3.2 Smart Form: Trigger Field `[V69]`

- Cari **satu field kunci** yang bisa menarik data lain. Contoh Indonesia: **Kode Pos** → otomatis mengisi Kecamatan, Kota/Kabupaten, Provinsi (4 interaksi → 1, hemat 75%).
- Prinsip: jika sistem sudah punya datanya, jangan minta user mengetik. Field hasil auto-fill **tetap bisa diedit** untuk pengecualian.

### 3.3 Password `[V63]`

- Cukup **minimal 6–8 karakter**. **DILARANG** aturan berlapis (huruf besar + angka + simbol + 12 karakter + tak boleh sama dengan yang lama) yang menaikkan cognitive load dan risiko *cart abandonment* (riset Baymard: 82% situs e-commerce terlalu ribet; ±18,75% batal checkout karena macet reset password).
- Pindahkan keamanan ke sistem: **CAPTCHA, rate limiting (limit login), 2FA** saat ada aktivitas mencurigakan. Sejalan dengan pedoman NIST (tanpa rotasi berkala/komposisi rumit).

### 3.4 Checkout & Login `[V64]`

- **WAJIB guest checkout.** Memaksa login/registrasi di tengah checkout menyebabkan drop-off ±30% (Baymard).
- Situasi time-sensitive (war tiket, flash sale): **DILARANG** memaksa login di awal.
- Langkah minimal: **Isi Data → Bayar → Selesai.**
- Ingin user terdaftar? Lakukan **setelah** pembayaran: cocokkan email ke akun yang ada, atau tawarkan pembuatan akun otomatis.

### 3.5 Multi-step Form

- Label tombol lanjut **identik di semua step** ("Lanjut" · "Lanjut" · "Lanjut"). Beda label = beda sinyal = *micro-hesitation* (±0,4 detik). `[V83]`

### 3.6 Discoverability Fitur Tersembunyi `[V90]`

- *User nggak tahu = percuma.* Handoff ke developer bukan langkah terakhir; **langkah ke-5 adalah memberi tahu user**.
- Fitur yang butuh interaksi khusus (swipe, long press, drag) **WAJIB** punya petunjuk visual:

| Metode | Cara kerja | Kapan |
|---|---|---|
| **Tooltip** | Pop-up petunjuk saat pertama kali membuka layar | Perkenalan fitur baru |
| **Peek animation** | Elemen bergeser sedikit saat layar dimuat | Petunjuk halus bahwa elemen bisa di-swipe |
| **Smart prompt** | Muncul setelah user memakai jalur lama berulang (mis. 3× titik tiga) | Mengajarkan cara efisien tanpa mengganggu yang sudah paham |

- **DILARANG** mengorbankan discoverability demi minimalisme.

### 3.7 Audit Status Sistem `[V49]`

- **Visibility of System Status** (Nielsen Heuristic #1): user harus selalu tahu apa yang terjadi dan apa langkah berikutnya. Setelah setup selesai, CTA berikutnya **harus jelas**.
- Waspadai **Curse of Knowledge**: pembuat sudah tahu alurnya, user baru menebak-nebak. Desain untuk user paling awam.

---

## 4. Prinsip UX Pendukung (Referensi Cepat)

| Prinsip | Inti | Dipakai pada |
|---|---|---|
| **Visibility of System Status** | Sistem selalu memberi tahu keadaannya | Checkbox indeterminate, loading state, CTA lanjut |
| **Discoverability** | Tak terlihat = tak ada | Bottom nav, hamburger, gesture |
| **Interaction Cost** | Biaya = mikir + melihat/scan + mengetik/klik | Recent search, stepper, date input, trigger field |
| **Recognition over Recall** | Lebih baik mengenali daripada mengingat | Label navigasi, label form permanen |
| **Clarity over Aesthetics** | Jelas mengalahkan clean | Label ikon, penanda wajib/opsional |
| **Double-D Rule / Jakob's Law** | Perbedaan itu menyulitkan; user mengharapkan pola yang sudah dikenal | Posisi CTA, label tombol, posisi search |
| **Spatial Consistency / Thumb Zone** | Otak menghafal posisi; bawah layar paling ergonomis | Sticky primary button di bawah |
| **Gestalt Proximity** | Yang berdekatan = satu kelompok | Spasi heading, image–text |
| **Serial Position Effect** | Awal & akhir paling diingat | Urutan menu navigasi |
| **Zeigarnik Effect** | Otak benci hal yang menggantung | Badge merah notifikasi (jangan disalahgunakan) |
| **Perceived Performance** | Yang dirasakan lebih penting dari kecepatan nyata | Skeleton vs spinner |
| **Error Prevention** | Cegah kesalahan sebelum terjadi | Penanda wajib, validasi inline |
| **Forgiving UI / Minimize Interruption** | Error reversible tidak dihukum popup | Toast vs modal |
| **Data Integrity over Convenience** | Data benar > form cepat terisi | Default dropdown/radio |
| **Intentional Friction** | Gesekan positif mencegah salah pilih | Field kosong yang wajib dipilih sadar |
| **Shift of Responsibility** | Sistem menanggung risiko | Password, auto-fill |
| **Progressive Disclosure** | Yang penting dulu, sisanya di-layer (bukan untuk fitur utama) | Registrasi bertahap, overflow menu |

---

## 5. Workflow & Governance

### 5.1 Anatomi Design System (3 Bagian) `[V43]`

Component library **baru 1/3** dari design system.

| Lapisan | Isi | Deliverable |
|---|---|---|
| **01 Style Guide** (fondasi) | Colors, typography, spacing, corner radius, icon, (shadow, motion, sound) | Color scale 50–950, type scale, spacing scale |
| **02 Component Library** (blok) | Button, input, modal, dropdown, checkbox, tabs, dst., masing-masing terdokumentasi 6 atribut | Komponen + dokumentasi |
| **03 Pattern Library** (pola) | Gabungan komponen untuk masalah berulang: form checkout, page header, card grid | Pola siap rakit |

Urutan tak boleh dibalik: fondasi berantakan → komponen inkonsisten → pola mustahil rapi.

### 5.2 Atomic Design (Brad Frost) `[V44, V45, V50]`

| Level | Definisi | Contoh |
|---|---|---|
| **01 Atoms** | Elemen terkecil, tak bisa dipecah | Button, input, icon, label, checkbox |
| **02 Molecules** | Atom + atom = unit fungsional | Search bar, form field |
| **03 Organisms** | Molecule + molecule = bagian UI utuh | Navbar, product card |
| **04 Templates** | Kerangka layout dengan posisi komponen terdefinisi (tanpa konten final) | Template halaman artikel: Header → Hero → Judul+Body → Related |
| **05 Pages** | Template + konten final | Halaman yang dilihat user |

- Atomic Design adalah **cara berpikir (mental model)**, bukan checklist berurutan. Boleh mulai dari organism (breakdown ke bawah) atau template (layout-first). Yang penting **kesadaran level** dan niat **memakai ulang**.
- **Templates menjamin konsistensi susunan.** Komponen sama ≠ halaman konsisten tanpa aturan *di mana* komponen diletakkan.
- **Uji template dengan edge case** sebelum dirilis: judul panjang, gambar gelap/minim, teks sangat sedikit. Perbaiki aturan truncation, aspect ratio, min-height jika runtuh.
- Urutan kerja: **Komponen → Template → Pages**.

### 5.3 Mindset Kerja `[V46, V50]`

- **Build systems, not pages.** Urutan prioritas: Pondasi (color, type, spacing, components) > Template > Halaman.
- **DILARANG** menunggu sistem 100% sebelum mendesain halaman. Desain halaman berjalan beriringan dan menguji/memperkaya sistem (edge case baru → token/komponen baru).
- Setiap elemen baru = calon aset: tanya *"ini bisa dipakai ulang di mana lagi?"*.
- Ukur keberhasilan sistem dari **seberapa cepat & konsisten halaman baru diproduksi**, bukan cantiknya file Figma.

### 5.4 Handoff & Dokumentasi `[V54]`

- Dokumentasi adalah pilar kelima (setelah Warna, Tipografi, Komponen, Spacing). Spec manual **makan waktu, rawan salah, cepat basi**.
- Generate spec otomatis (**DesignDoc [Spectral]**): spacing, anatomy, properties (Type/State), component set. Desain berubah → generate ulang.
- Indikator sukses: pertanyaan "padding berapa?" dari engineer setelah rilis ≈ **nol**.

### 5.5 Tooling yang Direkomendasikan

| Kebutuhan | Tool |
|---|---|
| Generate color scale 50–950 | uicolors.app (Tailwind CSS Color Generator) |
| Harmoni warna secondary | Adobe Color |
| Cek kontras | Contrast checker bawaan Figma (ikon AA di color picker) |
| Text styles otomatis | Plugin Styler (Generate Styles) |
| Ikon satu family | Plugin Iconify |
| Penamaan komponen standar industri | uiguideline.com |
| Spec & anotasi otomatis | DesignDoc [Spectral] |
| Validasi ukuran ikon vs teks | Figma Dev Mode |

---

## 6. Konflik Antar-Materi & Keputusan yang Berlaku

Sumber adalah kumpulan video bertahap sehingga beberapa aturan disempurnakan di materi lanjutan. Rulebook ini memakai keputusan berikut:

| # | Topik | Konflik | Keputusan |
|---|---|---|---|
| 1 | Type scale | V5: golden ratio 42/26/16/10 · V36: golden ratio tidak cocok, pakai 12/16/20/24/32 | **V36 berlaku** |
| 2 | Disabled button | V49: boleh disabled + hint · V89: hindari, gunakan tombol aktif + inline validation | **V89 berlaku**; disabled hanya untuk loading & konfirmasi |
| 3 | Tombol destructive | V18: varian solid merah · V17: brand merah → outline | Pakai warna error; **jika brand merah atau berdampingan dengan primary → outline/ghost**. Satu solid utama per view |
| 4 | Touch target | V18: tombol mobile min 40 · V23: standalone 48 (Material) / 44 (Apple) | Tombol berlabel **≥ 40** (DISARANKAN 48 untuk CTA utama mobile); **ikon standalone 48** |
| 5 | Peran token primary | V9 (contoh 50/200/400/600/900) · V10 (50/200/500/600/950) | **V10 berlaku**; V9 hanya ilustrasi konsep |
| 6 | Space bawah heading | V14: 16px · V42: 8px | **16px** untuk heading section pada teks berjalan; **8px** untuk headline → body pada card/artikel |
| 7 | Ambang overflow menu | V85 tabel: 1–2 vs 5–6+ · checklist: > 3 | **≥ 4 action** → titik tiga; 3 action → putuskan berdasarkan muat/tidak |
| 8 | Loading state | V52 & V57 konsisten | Satu aturan (lihat §2.5) |
| 9 | Line height hasil bulat | Sumber hanya memberi contoh (16→24, 26→32, 32→40) | Nilai 12/20/24px pada §1.7.2 adalah *turunan* dengan pembulatan ke atas ke kelipatan 4 |

---

## 7. Checklist Audit Konsolidasi

### Foundations
- [ ] Semua spacing kelipatan 8 (detail kecil kelipatan 4); tidak ada 13/15/21/23px.
- [ ] Grid 12/8/4 dengan margin & gutter 16/24 di semua breakpoint.
- [ ] Strategi layout (adaptive/responsive/strict) sudah diputuskan.
- [ ] Radius mengikuti karakter brand; nested = radius − padding; pill = tinggi ÷ 2.
- [ ] Tidak ada `#000000` dan `#FFFFFF` liar; teks `#1A1A1A`, halaman `#F5F5F5`, card `#FFFFFF`.
- [ ] Semua warna berasal dari token (brand, neutral, semantic, secondary); tidak ada hex manual.
- [ ] Kontras teks ≥ 4.5:1 (besar ≥ 3:1); pasangan lolos terdokumentasi.
- [ ] Semantic color 4 slot dengan satu gaya (solid **atau** soft).
- [ ] Aksen ≤ ±10% permukaan; overlay memakai level gelap brand.
- [ ] Font lolos tes i-l-1, tersedia 4 weight; type scale 4–5 ukuran.
- [ ] Line height eksplisit: body ×1.5, heading ×1.25, dibulatkan kelipatan 4.
- [ ] Space atas heading > space bawah heading; jarak paragraf ≈ font size.
- [ ] Tidak ada teks justify; lebar teks 50–75 karakter (desktop).
- [ ] Ukuran ikon = line height teks; satu family ikon; frame + padding optik konsisten.
- [ ] Rasio gambar baku per konteks (16:9 / 4:3 / 1:1).

### Components & Patterns
- [ ] Tiap komponen punya Name, Description, Usage, Variants, States, Anatomy.
- [ ] Button: 3 ukuran, 4 varian × 4 state, hanya **1 primary per layar**, label & posisi konsisten.
- [ ] Input: 5 state, label permanen, placeholder = contoh, wajib `*` + `(Opsional)`.
- [ ] Radio < 6 · Dropdown 6–15 · Dropdown+Search > 15; default sesuai konteks sensitivitas.
- [ ] Checkbox 3 state + logika parent–child terdokumentasi.
- [ ] Tag (ada X) vs Badge (tanpa X) tidak tertukar.
- [ ] Toast 3–5 detik / Banner menetap / Modal hanya untuk keputusan wajib (Loss Test).
- [ ] Modal 500–600px, tanpa scroll, dismiss sesuai risiko data.
- [ ] Error message manusiawi, punya solusi, sudut pandang sistem, CTA spesifik.
- [ ] Empty state punya Title (2–4 kata) + Body (1–2 kalimat) + CTA kata kerja.
- [ ] Loading: <1s tanpa loading · 1–3s skeleton · >3s spinner.
- [ ] Bottom nav berlabel; hamburger hanya untuk menu pendukung; tab ≤ 5; breadcrumb hanya ≥ 3 level.
- [ ] Registrasi ≤ 2 field awal; guest checkout tersedia; password 6–8 karakter.
- [ ] Fitur gesture punya petunjuk discoverability.

### Workflow
- [ ] Nama komponen Figma = nama di kode; glosarium tim tersedia.
- [ ] Komponen memakai Auto Layout; properti bernama `Type`/`State`.
- [ ] Template diuji dengan edge case; spec di-generate ulang setiap ada perubahan.

---

## 8. Cheat Sheet Keputusan Cepat

| Situasi | Keputusan |
|---|---|
| Spasi antar ikon–teks | 4–8px |
| Padding komponen (tombol, card) | 12–24px |
| Jarak antar section | 32–48px+ |
| Tinggi tombol | 32 / **40** / 48 |
| Tap target ikon standalone | 40 desktop · **48 mobile** |
| Radius pill | tinggi ÷ 2 |
| Radius elemen di dalam card | radius card − padding |
| Ukuran ikon di samping teks 16/24 | 24px |
| Body / heading line height | ×1.5 / ×1.25 |
| Judul vs body | ×1.25–1.5 |
| Panjang baris | 66 karakter (50–75 desktop, 30–50 mobile) |
| Teks tabel angka | rata kanan |
| Pilihan < 6 / 6–15 / > 15 | Radio / Dropdown / Dropdown+Search |
| Angka eksak kecil / besar / kira-kira | Stepper / Text input / Slider |
| Tanggal diketahui / dipilih | Text field / Calendar picker |
| Notifikasi tak butuh respons / bisa ditunda / harus sekarang | Toast / Banner / Modal |
| Error reversible / irreversible | Toast / Modal |
| Loading 1–3s terprediksi / >3s | Skeleton / Spinner |
| Hover-only info / info dengan aksi | Tooltip / Popover |
| Section konten ≤ 5 setara / banyak & panjang | Tab / Accordion |
| Action 1–2 / ≥ 4 | Tampil langsung / Titik tiga |
| Fitur utama / pendukung | Bottom nav / Hamburger |
| Tujuan spesifik / eksplorasi | Pagination / Infinite scroll |
| Hierarki ≥ 3 level | Breadcrumb |
| Pilihan user (bisa dihapus) / status sistem | Tag / Badge |

---

## 9. Token Sheet (Starter, CSS Custom Properties)

> Nilai warna adalah **contoh dari sumber**: ganti dengan brand-mu. Pilih **satu** profil radius sesuai karakter brand.

```css
:root {
  /* ---------- Spacing (8pt grid; 4 untuk detail kecil) ---------- */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
  --space-12: 48px; --space-16: 64px;

  /* ---------- Grid ---------- */
  --grid-cols-desktop: 12;
  --grid-cols-tablet: 8;
  --grid-cols-mobile: 4;
  --grid-gutter: 24px;        /* 16px untuk layout padat */
  --grid-margin: 24px;        /* 16px untuk layout padat */

  /* ---------- Radius (pilih 1 profil) ---------- */
  --radius-sm: 4px;           /* formal: banking / enterprise */
  --radius-md: 8px;           /* modern: SaaS / startup (12px bila lebih lembut) */
  --radius-lg: 16px;          /* friendly: consumer / lifestyle */
  /* nested  = calc(container-radius - padding)  ·  pill = height / 2 */

  /* ---------- Color: Brand (contoh) ---------- */
  --primary-50:  #F0F9F5;
  --primary-200: #B7E3CE;
  --primary-500: #328E6E;
  --primary-600: #24775C;
  --primary-950: #0B231D;

  /* ---------- Color: Neutral ---------- */
  --text-primary:   #1A1A1A;
  --text-secondary: #6B7280;
  --border:         #E5E7EB;
  --surface-page:   #F5F5F5;
  --surface-card:   #FFFFFF;

  /* ---------- Color: Semantic (level 600) ---------- */
  --semantic-success: #16A34A;
  --semantic-warning: #D97706;
  --semantic-error:   #DC2626;
  --semantic-info:    #2563EB;
  /* Jika brand merah: brand #F87171, error #991B1B */

  /* ---------- Typography ---------- */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --text-caption-size: 12px;     --text-caption-lh: 20px;      /* turunan */
  --text-body-size: 16px;        --text-body-lh: 24px;         /* ×1.5 */
  --text-subheading-size: 20px;  --text-subheading-lh: 32px;   /* turunan */
  --text-heading-size: 24px;     --text-heading-lh: 32px;      /* ×1.25 dibulatkan */
  --text-display-size: 32px;     --text-display-lh: 40px;      /* ×1.25 */
  --text-measure: 65ch;          /* panjang baris ideal (50–75) */

  /* ---------- Text spacing ---------- */
  --space-paragraph: 16px;
  --space-heading-top: 32px;
  --space-heading-bottom: 16px;
  --space-image-to-text: 24px;
  --space-heading-to-body: 8px;  /* card / artikel */

  /* ---------- Icon ---------- */
  --icon-xs: 16px; --icon-sm: 20px; --icon-md: 24px; --icon-lg: 32px; --icon-xl: 40px;
  --icon-wrapper-desktop: 40px;
  --icon-wrapper-mobile: 48px;

  /* ---------- Components ---------- */
  --btn-h-sm: 32px; --btn-h-md: 40px; --btn-h-lg: 48px;
  --touch-target-mobile: 48px;
  --modal-width-min: 500px; --modal-width-max: 600px;
  --toast-duration: 4000ms;      /* 3–5 detik */
  --aspect-hero: 16 / 9; --aspect-card: 4 / 3; --aspect-avatar: 1 / 1;
}
```

### Penamaan Token di Figma

```
Foundation/Primary/primary-50 … primary-950
Foundation/Neutral/text-primary · surface-page · surface-card
Foundation/Semantic/success · warning · error · info
Text/Display-Bold 32/125 · Heading-Bold 24/125 · Subheading 20/150 · Body-Regular 16/150 · Caption-Regular 12/150
Spacing/space-1 … space-16
Component/Button   →  properties: Type = Primary | Outline | Text | Destructive
                                    State = Default | Hover | Pressed | Disabled
Component/Input    →  State = Default | Filled | Focus | Error | Disabled
Component/Checkbox →  State = Unchecked | Checked | Indeterminate
Sound/sound.feedback.correct · sound.button.click
```

---

*Akhir dokumen. Perbarui rulebook ini setiap ada keputusan desain baru: sistem yang sehat adalah sistem yang terus tumbuh (living system).*
