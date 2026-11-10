# Panduan Lengkap Deployment Server Linux (Produksi) 🛡️
## Domain: https://portal.teknoindo.net/

Panduan langkah demi langkah (*end-to-end*) untuk memasang dan menjalankan sistem **EdTeknoGuard & Portal Pelanggan MyTekno** dari awal (*fresh install*) pada server Linux mandiri (Ubuntu 22.04 / 24.04 LTS / Debian 12).

---

## 📑 Daftar Isi
1. [Spesifikasi & Prasyarat Sistem](#1-spesifikasi--prasyarat-sistem)
2. [Konfigurasi DNS Domain](#2-konfigurasi-dns-domain)
3. [Update Server & Instalasi Dependensi Inti](#3-update-server--instalasi-dependensi-inti)
4. [Instalasi & Konfigurasi Basis Data MySQL](#4-instalasi--konfigurasi-basis-data-mysql)
5. [Clone Repositori & Setup Proyek](#5-clone-repositori--setup-proyek)
6. [Konfigurasi Variabel Lingkungan (.env)](#6-konfigurasi-variabel-lingkungan-env)
7. [Inisialisasi Skema Database & Super Admin](#7-inisialisasi-skema-database--super-admin)
8. [Konfigurasi Service Daemon 24/7 (Systemd)](#8-konfigurasi-service-daemon-247-systemd)
9. [Konfigurasi Web Server Nginx (Reverse Proxy)](#9-konfigurasi-web-server-nginx-reverse-proxy)
10. [Pendaftaran Sertifikat SSL HTTPS (Certbot Let's Encrypt)](#10-pendaftaran-sertifikat-ssl-https-certbot-lets-encrypt)
11. [Verifikasi Akses & Pengujian Fitur](#11-verifikasi-akses--pengujian-fitur)
12. [Pemeliharaan, Backup Otomatis & Alur Update Git](#12-pemeliharaan-backup-otomatis--alur-update-git)

---

## 1. Spesifikasi & Prasyarat Sistem

### Rekomendasi Hardware Server:
* **Sistem Operasi**: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS / Debian 12 (64-bit).
* **CPU**: Minimal 2 vCPU Core.
* **RAM**: Minimal 2 GB (Disarankan 4 GB agar lancar saat build frontend dan kompilasi).
* **Storage**: Minimal 20 GB SSD / NVMe.
* **Akses Jaringan**:
  * Port Publik: `80` (HTTP) dan `443` (HTTPS) terbuka.
  * **Jalur IP Privat ONT**: Server Linux harus memiliki jalur routing ke IP modem pelanggan (`10.10.x.x` atau `192.168.x.x`) melalui VPN WireGuard/OpenVPN atau terhubung langsung ke router core NOC ISP agar fitur pemantauan redaman optik berjalan nyata.

---

## 2. Konfigurasi DNS Domain

Sebelum mendaftarkan SSL, arahkan subdomain Anda ke IP publik server:

1. Buka dashboard DNS manajemen domain Anda (misal: Cloudflare, Niagahoster, Domainesia, dsb.).
2. Tambahkan **DNS A Record**:
   * **Type**: `A`
   * **Name / Host**: `portal` (atau `portal.teknoindo.net`)
   * **IPv4 Address**: `163.223.112.238`
   * **TTL**: `Auto` / `300 seconds`
   * *(Jika menggunakan Cloudflare, matikan Proxy sementara / set ke DNS Only / awan abu-abu saat pendaftaran Certbot)*.
3. Uji propagasi DNS di komputer lokal Anda:
   ```bash
   ping portal.teknoindo.net
   ```
   Pastikan IP yang merespons adalah IP server Linux Anda.

---

## 3. Update Server & Instalasi Dependensi Inti

Masuk ke server Linux Anda via SSH:
```bash
ssh tekno@163.223.112.238
```

### A. Pengerasan Keamanan Port SSH (Port 2024)
Demi keamanan server produksi dari serangan otomatis *brute-force*, ubah port default SSH `22` menjadi port kustom **`2024`**:
```bash
sudo nano /etc/ssh/sshd_config
```
1. Cari baris `#Port 22` atau `Port 22`, ubah menjadi:
   ```text
   Port 2024
   ```
2. Simpan (`Ctrl + O`, Enter, lalu `Ctrl + X`).
3. Muat ulang layanan SSH:
   ```bash
   sudo systemctl restart ssh
   ```
4. Verifikasi port mendengarkan:
   ```bash
   ss -tulpn | grep 2024
   ```
5. Selanjutnya, gunakan port `2024` saat remote via SSH:
   ```bash
   ssh -p 2024 tekno@163.223.112.238
   ```

### B. Perbarui Repositori OS
```bash
sudo apt update && sudo apt upgrade -y
```

### C. Pasang Paket-Paket Pendukung
```bash
sudo apt install -y curl wget git build-essential ufw \
  python3 python3-pip python3-venv python3-dev \
  pkg-config default-libmysqlclient-dev \
  nginx certbot python3-certbot-nginx
```

### D. Pasang Node.js (v20 LTS) & NPM
Node.js dibutuhkan untuk mengompilasi aplikasi frontend React 18:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi terpasang
node -v   # Output: v20.x.x
npm -v    # Output: 10.x.x
python3 --version # Output: Python 3.10+ / 3.12+
```

---

## 4. Instalasi & Konfigurasi Basis Data MySQL

### A. Pasang MySQL Server
```bash
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
```

### B. Amankan MySQL
Jalankan wizard pengamanan:
```bash
sudo mysql_secure_installation
```
*(Ikuti petunjuk di layar: set password root yang kuat, hapus anonymous user, larang remote root login, dan hapus test database).*

### C. Buat User & Database Produksi
Masuk ke konsol MySQL:
```bash
sudo mysql -u root -p
```

Jalankan perintah SQL berikut untuk membuat database master dan user khusus dengan hak akses multi-tenant:
```sql
-- 1. Buat Database Master Utama
CREATE DATABASE IF NOT EXISTS edteknoguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Buat User Khusus Aplikasi
-- Ganti 'SandiKuatEdTekno2026!' dengan kata sandi acak yang kuat
CREATE USER 'edtekno_user'@'localhost' IDENTIFIED BY 'SandiKuatEdTekno2026!';

-- 3. Berikan Hak Akses ke Database Master dan Seluruh Database Tenant (edtekno_*)
GRANT ALL PRIVILEGES ON edteknoguard.* TO 'edtekno_user'@'localhost';
GRANT ALL PRIVILEGES ON `edtekno\_%`.* TO 'edtekno_user'@'localhost';

-- 4. Terapkan Hak Akses
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Clone Repositori & Setup Proyek

### A. Siapkan Direktori Produksi
Disarankan menempatkan aplikasi pada direktori user **`/home/tekno/edteknoguard`** (karena partisi `/home` memiliki kapasitas penyimpanan paling besar dan lega):
```bash
# 1. Pastikan cache sistem dibersihkan terlebih dahulu agar partisi tidak penuh
sudo apt clean

# 2. Pindah ke direktori /home/tekno
cd /home/tekno

# 3. Clone repositori ke direktori edteknoguard
git clone https://github.com/raihanagilm/EdTeknoGuard.git edteknoguard

# 4. Atur kepemilikan dan izin akses (krusial agar web server Nginx dapat membaca file frontend)
sudo chown -R tekno:tekno /home/tekno/edteknoguard
sudo chmod 755 /home/tekno
sudo chmod -R 755 /home/tekno/edteknoguard

# 5. Masuk ke direktori proyek
cd /home/tekno/edteknoguard
```

### B. Setup Virtual Environment Python & Dependensi
```bash
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip & install dependensi backend
pip install --upgrade pip
pip install -r requirements.txt
```

### C. Kompilasi Aset Frontend (React 18 + Vite)
```bash
cd /home/tekno/edteknoguard/frontend
npm install
npm run build
cd /home/tekno/edteknoguard
```
> **Catatan**: Hasil kompilasi frontend akan berada di folder `/home/tekno/edteknoguard/frontend/dist`. FastAPI secara otomatis menyajikan direktori ini untuk Dashboard Admin NOC dan Portal Pelanggan TeknoCust.

---

## 6. Konfigurasi Variabel Lingkungan (.env)

Buat berkas `.env` dari contoh `.env.example`:
```bash
cp .env.example .env
nano .env
```

Sesuaikan isinya dengan konfigurasi produksi domain **`https://portal.teknoindo.net`**:

```env
# ════════════════════════════════════════════════════════════════
# KONFIGURASI APLIKASI PRODUKSI
# ════════════════════════════════════════════════════════════════
APP_NAME="EdTeknoGuard & MyTekno Portal"
APP_ENV="production"
APP_PORT=7890
APP_URL="https://portal.teknoindo.net"

# Buat SECRET_KEY acak yang aman (lihat petunjuk generator di bawah)
SECRET_KEY="GANTI_DENGAN_TOKEN_ACAK_PANJANG_HASIL_GENERATOR"

# ════════════════════════════════════════════════════════════════
# BASIS DATA MYSQL LOKAL PRODUKSI
# ════════════════════════════════════════════════════════════════
DB_HOST="127.0.0.1"
DB_PORT=3306
DB_USER="tekno"
DB_PASSWORD="tekno2025"
DB_NAME="edteknoguard"

# ════════════════════════════════════════════════════════════════
# INTEGRASI API NETWORK BILL (SISTEM BILLING ISP)
# ════════════════════════════════════════════════════════════════
NETWORK_BILL_BASE_URL="https://billing.isp-anda.com/api/v1"
NETWORK_BILL_API_TOKEN="token_api_network_read_anda"
NETWORK_BILL_BILLING_TOKEN="token_api_billing_read_anda"
```

> 💡 **Cara Menghasilkan SECRET_KEY Acak yang Sangat Kuat:**
> Jalankan perintah berikut di terminal Linux untuk mencetak token acak 48-byte:
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(48))"
> ```
> Salin hasilnya dan tempel pada kolom `SECRET_KEY` di file `.env`. Simpan file dengan menekan `Ctrl + O`, lalu keluar dengan `Ctrl + X`.

---

## 7. Inisialisasi Skema Database & Super Admin

Setelah file `.env` selesai dikonfigurasi, jalankan skrip bootstrap terpadu untuk membuat seluruh tabel master, kantor default, skema tenant, dan akun Super Admin awal:

```bash
cd /home/tekno/edteknoguard
source .venv/bin/activate
python -m app.db.init_db
```

Output terminal yang sukses akan menampilkan:
```text
=================================================================
 🛡️  EdTeknoGuard - Inisialisasi Database Multi-Tenant
=================================================================
[1/3] Memastikan 4 Tabel Master di Database Utama (edteknoguard)...
  -> Tabel Master terdaftar: kantors, users, user_kantors, user_activity_logs
  -> [OK] Database master bersih dari tabel operasional/pelanggan.
[INFO] Menambahkan kantor default...
  -> [OK] Kantor default dibuat.
[INFO] Membuat Super Admin default (admin / agiltampan)...
  -> [OK] Super Admin & hak akses kantor berhasil dibuat.
[2/3] Memastikan skema seluruh database tenant aktif...
  -> [OK] Skema tenant 'Karang Gede' siap.
  -> [OK] Skema tenant 'Banyumas' siap.
  -> [OK] Skema tenant 'Tengaran' siap.
  -> [OK] Skema tenant 'Slawi' siap.
[3/3] Selesai. Seluruh database master & tenant siap digunakan!
```

---

## 8. Konfigurasi Service Daemon 24/7 (Systemd)

Agar aplikasi otomatis berjalan di latar belakang, memuat scheduler monitoring redaman berkala, dan hidup kembali secara otomatis saat server restart/reboot, buat service systemd:

```bash
sudo nano /etc/systemd/system/edteknoguard.service
```

Isi dengan konfigurasi berikut:
```ini
[Unit]
Description=EdTeknoGuard FastAPI & Background Monitoring Daemon
After=network.target mysql.service mariadb.service
Wants=mysql.service mariadb.service

[Service]
User=tekno
Group=tekno
WorkingDirectory=/home/tekno/edteknoguard
Environment="PATH=/home/tekno/edteknoguard/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
# Catatan penting: Gunakan --workers 1 agar state pemindaian in-memory & APScheduler background daemon sinkron (tidak duplikasi/kedip)
ExecStart=/home/tekno/edteknoguard/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 7890 --workers 1 --proxy-headers --forwarded-allow-ips='*'
Restart=always
RestartSec=5s
KillMode=process

# Batas file terbuka untuk konkurensi scraping tinggi
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Simpan file, kemudian aktifkan dan jalankan servicenya:
```bash
sudo systemctl daemon-reload
sudo systemctl enable edteknoguard
sudo systemctl start edteknoguard

# Periksa status layanan
sudo systemctl status edteknoguard
```
*(Pastikan status berwarna hijau bertuliskan `active (running)`).*

---

## 9. Konfigurasi Web Server Nginx (Reverse Proxy)

Nginx bertindak sebagai gerbang terdepan yang menangani SSL HTTPS, kompresi Gzip, caching file statis, dan meneruskan permintaan API ke backend FastAPI/Uvicorn.

### A. Buat Konfigurasi Server Block
```bash
sudo nano /etc/nginx/sites-available/portal.teknoindo.net
```

Tempel konfigurasi siap pakai berikut:
```nginx
server {
    server_name portal.teknoindo.net;

    # Batas ukuran upload berkas (misal import massal pelanggan via Excel/CSV)
    client_max_body_size 50M;

    # Pengaturan Header Keamanan
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Reverse Proxy Utama ke Backend Uvicorn / Static Vite
    location / {
        proxy_pass http://127.0.0.1:7890;
        proxy_http_version 1.1;

        # Mendukung WebSocket & Server-Sent Events (SSE)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Teruskan IP Asli Klien & Protokol HTTPS
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout untuk proses import massal & scraping on-demand pelanggan
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Optimasi Caching Aset Frontend Statis (JS, CSS, Font, Gambar Maskot)
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {
        proxy_pass http://127.0.0.1:7890;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # Logging Akses & Error
    access_log /var/log/nginx/portal_teknoindo_access.log;
    error_log /var/log/nginx/portal_teknoindo_error.log;
}
```

### B. Aktifkan Konfigurasi & Uji Nginx
```bash
# Buat symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/portal.teknoindo.net /etc/nginx/sites-enabled/

# Uji sintaks Nginx
sudo nginx -t
```
*(Pastikan muncul pesan: `syntax is ok` dan `test is successful`).*

Muat ulang Nginx:
```bash
sudo systemctl reload nginx
```

---

## 10. Pendaftaran Sertifikat SSL HTTPS (Certbot Let's Encrypt)

Daftarkan sertifikat SSL resmi gratis dari Let's Encrypt untuk domain Anda:

```bash
sudo certbot --nginx -d portal.teknoindo.net
```

### Langkah Interaktif Certbot:
1. Masukkan **Alamat Email** Anda (untuk peringatan masa berlaku sertifikat).
2. Setujui Ketentuan Layanan (*Terms of Service*): ketik `Y` lalu Enter.
3. Berbagi email dengan EFF (opsional): ketik `N` lalu Enter.
4. Certbot akan otomatis memverifikasi DNS domain, memasang sertifikat SSL, dan mengonfigurasi pengalihan otomatis (*Redirect HTTP to HTTPS*).

### Verifikasi Auto-Renewal SSL:
Sertifikat Let's Encrypt berlaku selama 90 hari dan diperpanjang otomatis oleh timer systemd Linux. Uji proses perpanjangannya:
```bash
sudo certbot renew --dry-run
```
*(Jika muncul `Congratulations, all simulated renewals succeeded`, SSL Anda aman selamanya).*

---

## 11. Verifikasi Akses & Pengujian Fitur

Buka peramban web (*browser*) Anda dan uji seluruh endpoint:

### 1. Dashboard Admin NOC EdTeknoGuard
* Buka: **`https://portal.teknoindo.net/login`** atau **`https://portal.teknoindo.net/`**
* **Kredensial Default**:
  * **Username**: `admin`
  * **Password**: `agiltampan`
* **Pengecekan Fitur**:
  * Cek indikator gembok hijau HTTPS di browser.
  * Pastikan masa aktif sesi 30 hari aktif (*Sliding Expiration*).
  * Masuk ke menu `/pelanggan` dan uji Single Probe redaman ONT.
  * Masuk ke menu `/settings` untuk mengatur ambang batas (`-26.0 dBm` warning, `-27.0 dBm` kritis).

### 2. Portal Pelanggan Mandiri MyTekno
* Buka: **`https://portal.teknoindo.net/portal`**
* **Kredensial Masuk Warga**:
  * **Nomor WhatsApp**: Nomor terdaftar pelanggan (misal: `085640236236`).
  * **Kata Sandi Awal**: `123456` (atau format nomor WA tanpa 0/62).
* **Pengecekan Fitur**:
  * Tab Tagihan & Virtual Account berjalan live.
  * Tab Riwayat Pembayaran bersih dan rapi.
  * Modal konfirmasi logout dengan maskot sedih berfungsi penuh dan mengunci seluruh layar.

---

## 12. Pemeliharaan, Backup Otomatis & Alur Update Git

### A. Perintah Cepat Pengelolaan Layanan
```bash
# Melihat log aktivitas sistem secara langsung (live follow)
sudo journalctl -u edteknoguard -f

# Memeriksa status service
sudo systemctl status edteknoguard

# Me-restart aplikasi (misal setelah ubah .env)
sudo systemctl restart edteknoguard

# Menghentikan / Menjalankan aplikasi
sudo systemctl stop edteknoguard
sudo systemctl start edteknoguard
```

### B. Otomasi Backup Basis Data MySQL (Cron Job Harian)
Amankan data pelanggan dan riwayat log dengan backup otomatis setiap pukul 02:00 dini hari:

1. Buat folder backup:
   ```bash
   sudo mkdir -p /var/backups/edteknoguard
   sudo chown -R root:root /var/backups/edteknoguard
   ```
2. Buat skrip backup:
   ```bash
   sudo nano /usr/local/bin/backup_edtekno.sh
   ```
   Isi skrip:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/edteknoguard"
   DATE=$(date +"%Y%m%d_%H%M%S")
   mysqldump -u edtekno_user -p'SandiKuatEdTekno2026!' --databases edteknoguard edtekno_karang_gede edtekno_banyumas edtekno_tengaran edtekno_slawi | gzip > "$BACKUP_DIR/backup_edtekno_$DATE.sql.gz"
   # Hapus backup yang lebih lama dari 30 hari
   find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
   ```
3. Beri izin eksekusi:
   ```bash
   sudo chmod +x /usr/local/bin/backup_edtekno.sh
   ```
4. Pasang di crontab sistem:
   ```bash
   sudo crontab -e
   ```
   Tambahkan baris berikut di baris paling bawah:
   ```cron
   0 2 * * * /usr/local/bin/backup_edtekno.sh > /dev/null 2>&1
   ```

### C. 🔄 Alur Lengkap Update: Dari Komputer Lokal (Laptop/PC) Sampai Server Produksi (VPS)

Banyak pengguna bingung mengenai alur push dan pull. Prinsip dasarnya adalah: **Kompilasi/koding di lokal $\rightarrow$ Push ke GitHub $\rightarrow$ Tarik (Pull) di Server Linux $\rightarrow$ Restart Service.**

Berikut alur lengkap langkah-demi-langkahnya:

---

#### 📌 TAHAP 1: Di Komputer Lokal (Laptop / PC Anda)

Jalankan perintah ini di terminal proyek laptop Anda sebelum pindah ke server:

1. **Periksa status perubahan lokal:**
   ```bash
   git status
   ```
   - Jika muncul pesan **`Your branch is up to date with 'origin/main'`** dan **`nothing to commit, working tree clean`**, artinya semua kode lokal Anda **sudah ada di GitHub**. Anda bisa langsung lanjut ke **Tahap 2**.
   - Jika ada file yang telah diedit/berwarna merah atau belum di-commit, lakukan langkah 2 dan 3.

2. **Simpan & Commit perubahan:**
   ```bash
   git add .
   git commit -m "feat/fix: deskripsi pembaruan fitur atau bug"
   ```

3. **Kirim (Push) ke GitHub:**
   ```bash
   git push origin main
   ```
   *(Tunggu sampai proses push selesai 100% dan tidak ada pesan error).*

---

#### 📌 TAHAP 2: Di Server Linux (VPS Produksi)

Setelah kode berhasil terkirim ke GitHub pada Tahap 1, buka terminal SSH server Anda:

1. **Masuk ke direktori proyek:**
   ```bash
   cd /home/tekno/edteknoguard
   ```

2. **Tarik kode terbaru dari GitHub:**
   ```bash
   git pull origin main
   ```

3. **(Wajib jika ada perubahan UI / Tampilan Web) Kompilasi ulang Frontend React:**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
   *(Jika hanya perubahan kode Python backend atau scheduler, langkah kompilasi frontend ini bisa dilewati).*

4. **(Opsional jika ada pustaka Python baru / skema DB baru):**
   ```bash
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m app.db.init_db
   ```

5. **Restart Layanan Aplikasi:**
   ```bash
   sudo systemctl restart edteknoguard
   ```

6. **Verifikasi Layanan Berjalan Normal:**
   ```bash
   sudo systemctl status edteknoguard
   ```
   *(Pastikan status berwarna hijau **`active (running)`**. Tekan tombol `q` untuk keluar).*

---

### D. 🚀 Cheat Sheet: Perintah Cepat 1-Baris di Server VPS (One-Liner)

Untuk pembaruan rutin backend atau perbaikan kode harian di server Linux, Anda cukup menjalankan perintah singkat satu baris ini di terminal server:

```bash
cd /home/tekno/edteknoguard && git pull origin main && sudo systemctl restart edteknoguard
```

> 💡 **Jika ada perubahan tampilan frontend (Web UI), tambahkan build frontend:**
> ```bash
> cd /home/tekno/edteknoguard && git pull origin main && cd frontend && npm run build && cd .. && sudo systemctl restart edteknoguard
> ```

---

## 13. Konfigurasi VPN WireGuard (Koneksi Server ke Jaringan Modem ONT / MikroTik)

Agar background worker / scraper EdTeknoGuard di server Debian dapat menjangkau modem-modem ONT pelanggan (yang berada di segmen IP privat lokal seperti `10.x.x.x` atau `192.168.x.x` di balik MikroTik ISP), server Debian perlu dihubungkan sebagai **WireGuard Client (Peer)** ke MikroTik ISP (RouterOS v7).

### A. Instalasi WireGuard di Debian

Jalankan perintah berikut di server Debian:

```bash
# Perbarui repository dan instal paket WireGuard beserta tools
sudo apt update
sudo apt install -y wireguard wireguard-tools resolvconf
```

### B. Membuat Pasangan Kunci (Keypair) di Server Debian

Buat private key dan public key untuk server Debian:

```bash
# Masuk ke direktori konfigurasi WireGuard dengan hak root
sudo -i
cd /etc/wireguard
umask 077

# Hasilkan private key dan public key
wg genkey | tee debian_private.key | wg pubkey > debian_public.key

# Lihat isi kedua kunci
echo "=== PRIVATE KEY DEBIAN ===" && cat debian_private.key
echo "=== PUBLIC KEY DEBIAN ===" && cat debian_public.key
exit
```

> ⚠️ **Catatan Penting**:
> - Salin isi teks dari `debian_public.key` untuk dimasukkan ke konfigurasi **Peer** di MikroTik ISP.
> - `debian_private.key` tetap tersimpan rahasia di server Debian.

---

### C. Konfigurasi di Sisi MikroTik ISP (RouterOS v7)

Di Winbox / Terminal MikroTik ISP, pastikan Interface WireGuard sudah ada dan tambahkan Debian sebagai Peer:

```routeros
# 1. Pastikan interface WireGuard MikroTik aktif (contoh: port 13231)
# /interface/wireguard/add name=wg-edtekno listen-port=13231

# 2. Tambahkan Peer untuk Server Debian:
/interface/wireguard/peers/add \
    interface=wg-edtekno \
    public-key="PASTE_ISI_DARI_DEBIAN_PUBLIC_KEY_DISINI" \
    allowed-address=10.200.0.2/32 \
    comment="Server EdTeknoGuard Debian"

# 3. Pastikan IP address interface WireGuard MikroTik sudah disetel:
# /ip/address/add address=10.200.0.1/24 interface=wg-edtekno
```

---

### D. Membuat Berkas Konfigurasi `wg0.conf` di Debian

Buat berkas `/etc/wireguard/wg0.conf`:

```bash
sudo nano /etc/wireguard/wg0.conf
```

Isi dengan template berikut (sesuaikan IP dan Public Key MikroTik Anda):

```ini
[Interface]
# IP Tunnel WireGuard untuk server Debian
Address = 10.200.0.2/24
# Private Key Debian (salin dari debian_private.key)
PrivateKey = ISI_DARI_DEBIAN_PRIVATE_KEY

[Peer]
# Public Key milik Interface WireGuard MikroTik ISP
PublicKey = ISI_PUBLIC_KEY_WIREGUARD_MIKROTIK
# IP Publik / Domain MikroTik ISP beserta port WireGuard
Endpoint = ip-publik-atau-domain-mikrotik.com:13231
# Segmen IP yang boleh dilewatkan ke tunnel:
# - IP Interface WireGuard MikroTik (10.200.0.1/32)
# - Subnet IP modem-modem ONT pelanggan (contoh: 10.10.0.0/16, 192.168.100.0/24)
AllowedIPs = 10.200.0.1/32, 10.10.0.0/16, 192.168.1.0/24, 192.168.100.0/24
# Keepalive agar tunnel selalu terhubung melewati NAT firewall
PersistentKeepalive = 25
```

> 💡 **Tips Routing `AllowedIPs`:**
> Jangan memasukkan `0.0.0.0/0` pada `AllowedIPs` agar koneksi internet publik dan akses Nginx web server Debian tidak terputus. Hanya cantumkan subnet IP tunnel dan subnet IP lokal modem ONT/MikroTik.

---

### E. Mengaktifkan dan Menguji Koneksi WireGuard

1. **Uji Jalankan Interface WireGuard Secara Manual:**
   ```bash
   sudo wg-quick up wg0
   ```

2. **Periksa Status Handshake & Transfer Data:**
   ```bash
   sudo wg show
   ```
   *Jika berhasil, Anda akan melihat baris `latest handshake: ... ago` dan statistik `transfer: ... received, ... sent`.*

3. **Uji Ping ke Gateway MikroTik & Salah Satu IP Modem ONT:**
   ```bash
   ping -c 4 10.200.0.1
   ping -c 4 10.10.1.1
   ```

4. **Uji HTTP Curl ke Salah Satu Modem ONT ZTE:**
   ```bash
   curl -I --connect-timeout 5 http://10.10.1.1
   ```

5. **Aktifkan Autostart Saat Server Booting (Systemd):**
   ```bash
   sudo systemctl enable wg-quick@wg0
   sudo systemctl start wg-quick@wg0
   ```

6. **Perintah Cepat Kelola WireGuard:**
   ```bash
   # Status service
   sudo systemctl status wg-quick@wg0

   # Restart interface WireGuard
   sudo systemctl restart wg-quick@wg0

   # Mematikan koneksi WireGuard
   sudo systemctl stop wg-quick@wg0
   ```

---

🛡️ **EdTeknoGuard & MyTekno Portal siap beroperasi 24/7 di https://portal.teknoindo.net/**.

