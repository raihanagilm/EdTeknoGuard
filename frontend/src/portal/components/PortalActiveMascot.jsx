import React, { useState, useEffect } from 'react';
import '../../styles/mascots/index.css';

/**
 * Cache in-memory untuk SVG yang telah di-fetch agar tidak fetch berulang kali
 */
const svgCache = {};

/**
 * Daftar maskot rotasi berkala (bergantian setiap 3 menit / 180 detik)
 */
const ROTATING_MASCOTS = [
  'menyapa',
  'rekomendasi',
  'analisis-redaman',
  'percaya-diri',
  'tersipu',
  'bosan',
  'berpikir',
  'juara',
  'bintang',
  'memantau',
  'siaga-24jam'
];

/**
 * Menghitung indeks maskot sinkron dengan waktu nyata jam dinding (interval 3 menit)
 */
const getWallClockMascotIndex = () => {
  const threeMinutesMs = 3 * 60 * 1000;
  return Math.floor(Date.now() / threeMinutesMs) % ROTATING_MASCOTS.length;
};

/**
 * Menentukan maskot prioritas berdasarkan kondisi aktivitas sistem:
 */
export function getActiveMascotKey(data, rotatingIndex) {
  const currentIndex = typeof rotatingIndex === 'number' ? rotatingIndex : getWallClockMascotIndex();
  if (!data) return ROTATING_MASCOTS[currentIndex % ROTATING_MASCOTS.length];

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
      return 'pelanggan';
    }
    if (latestTicket.status === 'DICEK_ADMIN') {
      return 'layanan-pelanggan';
    }
    if (latestTicket.status === 'DIPROSES') {
      return 'teknisi';
    }
  }

  // 3. Gembira jika baru bayar tagihan
  if (customer.status_pembayaran === 'LUNAS_BARU') {
    return 'gembira';
  }

  // Fallback: rotasi sinkron jam dinding
  return ROTATING_MASCOTS[currentIndex % ROTATING_MASCOTS.length];
}

/**
 * Komponen Maskot Interaktif Portal (Memuat SVG mandiri secara asinkron dari /mascots/<key>.svg)
 */
export function PortalActiveMascot({ data, mascotKey: customMascotKey, className = 'w-20 h-16' }) {
  const [rotatingIndex, setRotatingIndex] = useState(() => getWallClockMascotIndex());
  const mascotKey = customMascotKey || getActiveMascotKey(data, rotatingIndex);
  const [svgContent, setSvgContent] = useState(() => svgCache[mascotKey] || '');

  // Interval rotasi sinkron jam dinding
  useEffect(() => {
    const timer = setInterval(() => {
      const newIdx = getWallClockMascotIndex();
      setRotatingIndex((prev) => (prev !== newIdx ? newIdx : prev));
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Fetch SVG jika belum ada di cache
  useEffect(() => {
    if (svgCache[mascotKey]) {
      setSvgContent(svgCache[mascotKey]);
      return;
    }

    let isMounted = true;
    fetch(`/mascots/${mascotKey}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((svgText) => {
        svgCache[mascotKey] = svgText;
        if (isMounted) setSvgContent(svgText);
      })
      .catch((err) => {
        console.warn(`[PortalActiveMascot] Gagal memuat SVG /mascots/${mascotKey}.svg:`, err);
      });

    return () => {
      isMounted = false;
    };
  }, [mascotKey]);

  return (
    <div
      className={`relative pointer-events-none select-none inline-flex items-center justify-center leading-none mascot-container-${mascotKey} ${className} [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain`}
      style={{ overflow: 'visible', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
