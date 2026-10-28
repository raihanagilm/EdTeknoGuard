import React, { useState, useEffect } from 'react';
import { PORTAL_MASCOTS_SVG } from './portalMascotsSvg';

// Import CSS untuk masing-masing maskot secara terpisah/modular
import '../../styles/mascots/mascot-gangguan.css';
import '../../styles/mascots/mascot-marah.css';
import '../../styles/mascots/mascot-gembira.css';
import '../../styles/mascots/mascot-sedih.css';
import '../../styles/mascots/mascot-pelanggan.css';
import '../../styles/mascots/mascot-layanan-pelanggan.css';
import '../../styles/mascots/mascot-teknisi.css';
import '../../styles/mascots/mascot-menyapa.css';
import '../../styles/mascots/mascot-rekomendasi.css';
import '../../styles/mascots/mascot-analisis-redaman.css';
import '../../styles/mascots/mascot-percaya-diri.css';
import '../../styles/mascots/mascot-tersipu.css';
import '../../styles/mascots/mascot-bosan.css';
import '../../styles/mascots/mascot-security.css';
import '../../styles/mascots/mascot-bingung.css';

/**
 * Daftar maskot rotasi berkala (bergantian setiap 5 menit / 300 detik)
 */
const ROTATING_MASCOTS = [
  'menyapa',
  'rekomendasi',
  'analisis-redaman',
  'percaya-diri',
  'tersipu',
  'bosan'
];

/**
 * Menentukan maskot prioritas berdasarkan kondisi aktivitas sistem:
 * 1. gangguan.html jika redaman optik >= -28.0 dBm (yaitu <= -28 dBm secara fisik sinyal drop / critical / los)
 * 2. marah.html jika pelanggan belum bayar tagihan (status_pembayaran === 'BELUM_BAYAR')
 * 3. gembira.html jika user sudah membayar tagihan (status_pembayaran === 'LUNAS_BARU' / baru lunas)
 * 4. sedih.html jika pelanggan sudah tidak aktif (is_active === false)
 * 5. pelanggan.html jika user melaporkan kendala (tiket status MENUNGGU)
 * 6. layanan-pelanggan.html jika laporan ditangani admin (tiket status DICEK_ADMIN)
 * 7. teknisi.html jika laporan ditangani teknisi (tiket status DIPROSES)
 * 
 * Jika tidak ada event darurat di atas, sistem akan merotasi 6 maskot santai setiap 5 menit:
 * menyapa -> rekomendasi -> analisis-redaman -> percaya-diri -> tersipu -> bosan
 */
export function getActiveMascotKey(data, rotatingIndex) {
  if (!data) return ROTATING_MASCOTS[rotatingIndex % ROTATING_MASCOTS.length];

  const customer = data.customer || {};
  const signal = data.signal || {};
  const latestTicket = data.latest_ticket;

  // 1. Gangguan jika redaman >= -28 dBm atau LOS/CRITICAL
  const rxPower = typeof signal.rx_power === 'number' ? signal.rx_power : parseFloat(signal.rx_power || -21);
  if (rxPower <= -28.0 || signal.status_koneksi === 'CRITICAL' || signal.status_koneksi === 'LOS') {
    return 'gangguan';
  }

  // 2. Marah jika belum bayar tagihan
  if (customer.status_pembayaran === 'BELUM_BAYAR' || customer.status_tagihan === 'MENUNGGAK') {
    return 'marah';
  }

  // 4. Sedih jika user sudah tidak aktif
  if (customer.is_active === false || customer.status === 'NONAKTIF') {
    return 'sedih';
  }

  // 5, 6, 7. Status tiket kendala jika ada tiket aktif
  if (latestTicket && ['MENUNGGU', 'DICEK_ADMIN', 'DIPROSES'].includes(latestTicket.status)) {
    if (latestTicket.status === 'MENUNGGU') {
      return 'pelanggan'; // Pelanggan baru melapor kendala
    }
    if (latestTicket.status === 'DICEK_ADMIN') {
      return 'layanan-pelanggan'; // Laporan ditangani admin customer service
    }
    if (latestTicket.status === 'DIPROSES') {
      return 'teknisi'; // Laporan ditangani teknisi di lapangan
    }
  }

  // 3. Gembira jika baru bayar tagihan
  if (customer.status_pembayaran === 'LUNAS_BARU') {
    return 'gembira';
  }

  // Fallback: rotasi 5 menit sekali
  return ROTATING_MASCOTS[rotatingIndex % ROTATING_MASCOTS.length];
}

/**
 * Komponen Maskot Interaktif Portal
 */
export function PortalActiveMascot({ data, mascotKey: customMascotKey, className = 'w-20 h-16' }) {
  const [rotatingIndex, setRotatingIndex] = useState(0);

  // Interval rotasi 5 menit (300.000 ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setRotatingIndex((prev) => (prev + 1) % ROTATING_MASCOTS.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const mascotKey = customMascotKey || getActiveMascotKey(data, rotatingIndex);
  const svgHtml = PORTAL_MASCOTS_SVG[mascotKey] || PORTAL_MASCOTS_SVG['menyapa'];

  return (
    <div
      className={`relative pointer-events-none select-none inline-flex items-center justify-center leading-none mascot-container-${mascotKey} ${className} [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain`}
      style={{ overflow: 'visible', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
