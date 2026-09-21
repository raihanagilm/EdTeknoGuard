# Aturan Global UI/UX Workspace: Kepatuhan Mutlak Terhadap designsystempro.md

Setiap kali AI Agent merancang, memodifikasi, mereview, atau mengimplementasikan kode frontend (HTML, Tailwind CSS, Jinja2, Alpine.js, Chart.js, SVG, modal, form, dan navigasi) pada proyek **EdTeknoGuard**, agen **WAJIB MEMBACA DAN MEMATUHI**:

👉 **[`designsystempro.md`](file:///c:/Users/r/Documents/Magang/EdTeknoGuard/designsystempro.md) — Master Rulebook UI/UX (Single Source of Truth)**

---

## Prinsip Mutlak UI/UX:

1. **"Terlihat rapi" ≠ "Terstruktur dengan benar."**
   - Setiap pilihan padding, margin, warna, border-radius, elevasi, dan hierarki tombol harus memiliki alasan sistemik dari rulebook, bukan sekadar *feeling*.

2. **Sistem Spacing Modular 8pt/4pt:**
   - Gunakan hanya kelipatan 4px / 8px: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px).
   - Dilarang keras menggunakan nilai spacing arbitrer acak (seperti `p-[13px]`, `m-[17px]`).

3. **Proporsi Warna 60-30-10:**
   - 60% warna dominan netral/latar (`bg-slate-50`, `bg-white`).
   - 30% warna sekunder/kontainer/surface (`border-slate-200`, `text-slate-700`, card backgrounds).
   - 10% warna aksen/brand (`#4F46E5` / `bg-indigo-600` dan warna status alert).

4. **Aksesibilitas & Kontras Teks (WCAG AA):**
   - Kontras teks dengan latar belakang wajib memenuhi rasio minimal 4.5:1 untuk teks normal dan 3:1 untuk teks besar.
   - Ukuran target sentuh interaktif (*Touch Target*) pada seluruh tombol, link, dan kontrol mobile minimal **44 x 44 px** (`min-h-[44px]` dan `min-w-[44px]`).

5. **Hierarki Komponen:**
   - **Tombol:** Maksimal 1 tombol Primary per area tampilan. Gunakan Secondary/Ghost untuk aksi pendukung.
   - **Aksi Destruktif:** Hapus atau aksi berbahaya wajib berlabel jelas (warna rose/red) dan wajib didahului modal pop-up konfirmasi.
   - **Ikon UI:** Wajib menggunakan SVG inline bersih murni dengan stroke/fill yang konsisten. DILARANG KERAS menggunakan emoji sebagai ikon UI/tombol.
   - **Form Fields:** Label selalu berada di atas input, gunakan placeholder hanya sebagai contoh format, dan sertakan validasi status yang jelas.

6. **Mobile-First Responsiveness:**
   - Desain selalu berawal dari layar kecil smartphone (360px - 420px) dengan kenyamanan operasional satu tangan (bottom navigation atau drawer burger off-canvas), lalu diperluas secara proporsional ke tablet (`md:`) dan desktop (`lg:` / `xl:`).
