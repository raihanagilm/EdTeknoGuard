import React, { useState, useEffect } from 'react';
import {
  Activity,
  Signal,
  Thermometer,
  Timer,
  Wifi,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  Info,
  Bell
} from 'lucide-react';
import { PortalActiveMascot } from './PortalActiveMascot';

export function TabBerandaPelanggan({ data, onNavigate }) {
  const signal = data?.signal || {
    rx_power: -26.38,
    status_koneksi: 'WARNING',
    latency_ms: 183,
    suhu_ont: 62.0
  };
  const customer = data?.customer || {
    nama: 'Aisyah / Tuti',
    paket: '20 Mbps Unlimited',
    ip_router: '10.10.12.45'
  };

  // Nilai pembacaan metrik real-time
  const rxPowerValue = signal.rx_power !== undefined && signal.rx_power !== null
    ? Number(signal.rx_power).toFixed(2)
    : '-26.38';
  const suhuOntValue = signal.suhu_ont !== undefined && signal.suhu_ont !== null
    ? Math.round(signal.suhu_ont)
    : 62;
  const latencyValue = signal.latency_ms !== undefined && signal.latency_ms !== null
    ? Math.round(signal.latency_ms)
    : 183;

  // Inisial Nama Pelanggan (Contoh: "Aisyah / Tuti" -> "AT")
  const getInitials = (namaStr) => {
    if (!namaStr) return 'AT';
    const parts = namaStr.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AT';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const customerInitials = getInitials(customer.nama);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU KHUSUS BERANDA SESUAI INSTRUKSI ═══ */}
      <div className="shrink-0 relative overflow-hidden" style={{ background: '#2563eb' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {customerInitials}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-white/80 leading-none">Selamat Datang,</div>
              <div className="text-[14px] font-bold text-white leading-tight mt-0.5 truncate">
                {customer.nama || 'Aisyah / Tuti'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="relative w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 stroke-[2.2]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full border border-blue-600 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN SESUAI DESAIN HTML USER ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-6 space-y-4">

          {/* ═══ KARTU UTAMA: STATUS SINYAL & MASKOT INTERAKTIF ═══ */}
          <div className="px-4">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">

            {/* Bagian Atas: Header info + Maskot Pintar di Kanan Atas */}
            <div
              className="relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' }}
            >
              {/* Radial Glow Halus di Belakang Maskot */}
              <div
                className="absolute top-0 right-0 w-28 h-28 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, transparent 70%)'
                }}
              />

              {/* Maskot KECIL & UTUH di Pojok Kanan Atas (Berubah Otomatis Sesuai Kondisi) */}
              <div className="absolute top-2 right-2 w-20 h-16 pointer-events-none z-10 flex items-center justify-center overflow-visible">
                <PortalActiveMascot data={data} className="w-20 h-16" />
              </div>

              {/* Teks Kiri (Diberi padding kanan agar tidak tertimpa maskot) */}
              <div className="relative p-4 pr-24">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                    <Activity className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="text-[13px] font-bold text-gray-900 leading-tight">
                    Kualitas Sinyal Optik
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 mt-2 font-medium">
                  Pembacaan real-time dari modem
                </div>
              </div>
            </div>

            {/* 3 Metrik Utama: Daya Terima, Suhu ONT, Latensi */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-white">

              {/* 1. Daya Terima (dBm) */}
              <div className="px-2.5 py-4">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <Signal className="w-3 h-3 text-gray-400" />
                  <div className="text-[9.5px] text-gray-500 font-medium">Daya Terima</div>
                </div>
                <div className="text-center">
                  <span className="text-[16px] font-black font-mono text-gray-900">
                    {rxPowerValue}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono ml-0.5">dBm</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '66%',
                      background: '#2563eb'
                    }}
                  />
                </div>
              </div>

              {/* 2. Suhu ONT (°C) */}
              <div className="px-2.5 py-4">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <Thermometer className="w-3 h-3 text-gray-400" />
                  <div className="text-[9.5px] text-gray-500 font-medium">Suhu ONT</div>
                </div>
                <div className="text-center">
                  <span className="text-[16px] font-black font-mono text-gray-900">
                    {suhuOntValue}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono ml-0.5">°C</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '75%',
                      background: '#2563eb'
                    }}
                  />
                </div>
              </div>

              {/* 3. Latensi (ms) */}
              <div className="px-2.5 py-4">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <Timer className="w-3 h-3 text-gray-400" />
                  <div className="text-[9.5px] text-gray-500 font-medium">Latensi</div>
                </div>
                <div className="text-center">
                  <span className="text-[16px] font-black font-mono text-gray-900">
                    {latencyValue}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono ml-0.5">ms</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '35%',
                      background: '#2563eb'
                    }}
                  />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ═══ MENU LAYANAN (Akses Cepat 4 Kotak Biru Cantik) ═══ */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[13px] font-bold text-gray-900">Menu Layanan</div>
            <span className="text-[10px] text-gray-400 font-medium">Akses Cepat</span>
          </div>

          <div className="grid grid-cols-4 gap-2">

            {/* Tombol WiFi */}
            <button
              type="button"
              onClick={() => onNavigate('wifi')}
              className="relative overflow-hidden rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
            >
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/40 rounded-full pointer-events-none" />
              <div
                className="relative w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: '#2563eb' }}
              >
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <span className="relative text-[10px] font-bold text-gray-800 leading-none">WiFi</span>
            </button>

            {/* Tombol Kendala */}
            <button
              type="button"
              onClick={() => onNavigate('kendala')}
              className="relative overflow-hidden rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
            >
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/40 rounded-full pointer-events-none" />
              <div
                className="relative w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: '#2563eb' }}
              >
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <span className="relative text-[10px] font-bold text-gray-800 leading-none">Kendala</span>
            </button>

            {/* Tombol Kuota */}
            <button
              type="button"
              onClick={() => onNavigate('kuota')}
              className="relative overflow-hidden rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
            >
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/40 rounded-full pointer-events-none" />
              <div
                className="relative w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: '#2563eb' }}
              >
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <span className="relative text-[10px] font-bold text-gray-800 leading-none">Kuota</span>
            </button>

            {/* Tombol Akun */}
            <button
              type="button"
              onClick={() => onNavigate('profil')}
              className="relative overflow-hidden rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
            >
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/40 rounded-full pointer-events-none" />
              <div
                className="relative w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: '#2563eb' }}
              >
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="relative text-[10px] font-bold text-gray-800 leading-none">Akun</span>
            </button>

          </div>
        </div>

        {/* ═══ BANNER PANDUAN PENEMPATAN MODEM ═══ */}
        <div className="px-4">
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ background: '#2563eb' }}
          >
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-8 -left-4 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative p-4 flex items-start gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold mb-1">Panduan Penempatan Modem ONT</div>
                <p className="text-[11px] text-white/90 leading-relaxed">
                  Letakkan modem ONT di ruang terbuka yang tinggi, hindari menaruh di dalam lemari atau di balik dinding tebal agar sinyal WiFi menyebar merata ke seluruh ruangan.
                </p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </main>
    </div>
  );
}

export default TabBerandaPelanggan;
