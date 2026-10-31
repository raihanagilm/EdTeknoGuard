# Deploy EdTeknoGuard ke VPS (Produksi)

Playbook untuk memindahkan EdTeknoGuard dari uji coba laptop ke VPS yang selalu nyala.
Diikuti Cloudflare Tunnel sebagai pintu publik (domain + SSL + WAF).

> **⚠️ Syarat mutlak pemantauan asli (bukan simulasi):** IP router pelanggan bersifat
> **privat (`10.10.x.x`)**. VPS **HARUS** punya jalur routing ke jaringan itu (site-to-site
> VPN/WireGuard ke jaringan NOC, atau VPS berada di dalam jaringan ISP). Tanpa itu, scraper
> hanya menghasilkan status *UNREACHABLE* → sistem jatuh ke mode simulasi.

---

## 1. Prasyarat di VPS (Debian/Ubuntu)

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Docker + Docker Compose plugin
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```

---

## 2. Clone & Konfigurasi

```bash
cd /opt
sudo git clone https://github.com/raihanagilm/EdTeknoGuard.git
cd EdTeknoGuard

# Buat .env dari contoh, lalu isi nilai produksi
sudo cp .env.example .env
sudoedit .env
```

Isi `.env` dengan nilai **produksi**:

| Variabel | Keterangan |
|---|---|
| `APP_ENV` | `production` |
| `APP_URL` | `https://app.<domain-kamu>` |
| `SECRET_KEY` | **Wajib dirotasi** — generate `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `DB_*` | kredensial TiDB Cloud (tetap) |
| `TELEGRAM_*` | token bot & chat ID teknisi |
| `POLLING_*` / `WARNING_THRESHOLD_DBM` / `CRITICAL_THRESHOLD_DBM` | `-26.0` / `-27.0` (lihat AGENTS.md) |
| `SNMP_SIMULATION_MODE` | `false` di produksi jika scraping asli |

---

## 3. Build & Jalankan Docker

```bash
sudo docker compose up -d --build
sudo docker compose ps                 # pastikan status healthy
curl -sS http://127.0.0.1:8000/login | head -5   # cek root app
sudo docker compose logs -f edteknoguard         # lihat log
```

> Folder `./data` di docker-compose di-mount ke `/app/data` agar `scan_state.json`
> (state pause/resume scan) tetap tersimpan di antara restart.

Perintah operasional lain:
```bash
sudo docker compose down              # hentikan
sudo docker compose up -d             # mulai kembali
sudo docker compose logs -f           # ikuti log
```

---

## 4. Cloudflare Tunnel Terbeda (Named Tunnel) → domain

> Sudah harus ada **domain di akun Cloudflare** (tambah di dashboard Cloudflare,
> arahkan nameserver). Untuk trial tanpa domain cukup pakai Quick Tunnel:
> `cloudflared tunnel --url http://127.0.0.1:8000`

```bash
# Login & buat tunnel (setelah domain ada di Cloudflare)
cloudflared tunnel login
cloudflared tunnel create edteknoguard

# Konfigurasi
sudo nano /etc/cloudflared/config.yml
```
Isi `config.yml`:
```yaml
tunnel: <TUNNEL_ID_ATAU_NAMA>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: app.<domain-kamu>
    service: http://127.0.0.1:8000
  - service: http_status:404
```

```bash
# Route subdomain ke tunnel (A:192.0.2.1 lama/LB) — pakai DNS route
cloudflared tunnel route dns edteknoguard app.<domain-kamu>

# Jalankan sebagai service & auto-start
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Setelah itu:
- Set `APP_URL=https://app.<domain-kamu>` di `.env`
- `sudo docker compose up -d` (restart container)
- Buka `https://app.<domain-kamu>` → login

---

## 5. Catatan Operasional

- **Wajib routing ke `10.10.x.x`** (VPN/Router) agar scraper hidup bekerja.
- Akses dashboard dilindungi login aplikasi; opsional tambah **Cloudflare Access**
  (Zero Trust) sebagai lapisan kedua di depan `/login`.
- Scheduler berjalan di dalam proses container 24/7; pantau dengan Healthcheck Docker.
- Backup: data inti di TiDB Cloud (otomatis), folder `data/` kecil, opsional tar arsip.