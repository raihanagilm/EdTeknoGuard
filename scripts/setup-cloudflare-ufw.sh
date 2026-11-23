#!/usr/bin/env bash
# ==============================================================================
# scripts/setup-cloudflare-ufw.sh
# Skrip Pengerasan Firewall UFW VPS EdTeknoGuard (Khusus Port SSH 2024 & Cloudflare)
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "Memulai Konfigurasi Firewall UFW Server Produksi EdTeknoGuard..."
echo "=========================================================="

# 1. Pastikan port SSH kustom 2024 DIBUKA terlebih dahulu agar tidak terkunci keluar
echo "[1/4] Mengamankan akses SSH pada port kustom 2024..."
sudo ufw allow 2024/tcp comment 'SSH Custom Port EdTeknoGuard'

# 2. Buka port WireGuard jika aktif (13231/udp)
sudo ufw allow 13231/udp comment 'WireGuard VPN Tunnel' || true

# 3. Ambil daftar resmi IPv4 Cloudflare
echo "[2/4] Mengambil daftar resmi IPv4 Cloudflare..."
CLOUDFLARE_IPS=$(curl -s https://www.cloudflare.com/ips-v4)

# 4. Izinkan port 80 dan 443 HANYA dari IP Cloudflare
echo "[3/4] Mengizinkan trafik HTTP/HTTPS HANYA dari Cloudflare IPs..."
for ip in $CLOUDFLARE_IPS; do
    sudo ufw allow proto tcp from "$ip" to any port 80,443 comment 'Cloudflare IPv4'
done

# 5. Aturan default: Tolak semua koneksi masuk lain, izinkan semua koneksi keluar
echo "[4/4] Menerapkan aturan default & reload firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
echo "y" | sudo ufw enable
sudo ufw reload

echo "=========================================================="
echo "Firewall UFW berhasil dikonfigurasi!"
echo "Port 80 & 443 sekarang terkunci murni untuk IP Cloudflare."
echo "Port SSH 2024 tetap aman dapat diakses."
echo "=========================================================="
sudo ufw status verbose
