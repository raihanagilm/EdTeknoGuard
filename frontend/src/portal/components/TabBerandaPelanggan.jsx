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
  Bell,
  CreditCard,
  ChevronRight,
  Receipt,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';

export function TabBerandaPelanggan({ data, onNavigate }) {
  const signal = data?.signal || {
    rx_power: null,
    status_koneksi: 'NORMAL',
    latency_ms: null,
    suhu_ont: null
  };
  const customer = data?.customer || {
    nama: '-',
    paket: '-',
    ip_router: '-',
    status_pembayaran: 'LUNAS'
  };

  const kuotaData = data?.kuota || {
    kuota_terpakai_gb: 0,
    periode_bulan: '-'
  };

  const kuotaTerpakai = kuotaData.kuota_terpakai_gb !== undefined && kuotaData.kuota_terpakai_gb !== null
    ? Number(kuotaData.kuota_terpakai_gb).toFixed(1)
    : '0.0';

  // Nilai pembacaan metrik real-time
  const rxPowerValue = signal.rx_power !== undefined && signal.rx_power !== null
    ? Number(signal.rx_power).toFixed(2)
    : '-';
  const suhuOntValue = signal.suhu_ont !== undefined && signal.suhu_ont !== null
    ? Math.round(signal.suhu_ont)
    : '-';
  const latencyValue = signal.latency_ms !== undefined && signal.latency_ms !== null
    ? Math.round(signal.latency_ms)
    : '-';

  // Inisial Nama Pelanggan
  const getInitials = (namaStr) => {
    if (!namaStr || namaStr === '-') return 'US';
    const parts = namaStr.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const customerInitials = getInitials(customer.nama);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU TERPADU DENGAN GREETING & LONCENG NOTIFIKASI KONSISTEN ═══ */}
      <PortalHeader
        greeting="Selamat Datang,"
        title={customer.nama || '-'}
        avatarInitials={customerInitials}
        dashboardData={data}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="pb-6 space-y-4">

          {/* ═══ KARTU UTAMA: STATUS SINYAL & KONDISI PERANGKAT ═══ */}
          <section className="mx-4 bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">
            {/* Header Kondisi Perangkat */}
            <div
              className="relative p-4 pr-32 min-h-[96px]"
              style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' }}
            >
              {/* Radial Glow Halus */}
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, transparent 70%)'
                }}
              />

              {/* Maskot Kanan Atas */}
              <div
                className="absolute top-2 right-2 w-24 h-20 pointer-events-none z-10 inline-flex items-center justify-center leading-none"
                style={{ lineHeight: 0 }}
              >
                <PortalActiveMascot data={data} className="w-24 h-20" />
              </div>

              {/* Teks Kiri */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700 shrink-0">
                  <Activity className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">
                  Kondisi Perangkat
                </h2>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                Pembacaan real-time dari modem pelanggan
              </p>
            </div>

            {/* 3 Metrik Baris Data Terpadu */}
            <dl className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-white m-0 p-0">
              {/* 1. Daya Terima (dBm) */}
              <div className="px-2.5 py-3.5 text-center">
                <dt className="flex items-center justify-center gap-1 mb-1">
                  <Signal className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-700 font-semibold">Daya Terima</span>
                </dt>
                <dd className="m-0">
                  <span className="text-base font-black font-mono text-gray-900">
                    {rxPowerValue}
                  </span>
                  <span className="text-[11px] text-gray-600 font-mono ml-0.5 font-medium">dBm</span>
                </dd>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden mx-1">
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
              <div className="px-2.5 py-3.5 text-center">
                <dt className="flex items-center justify-center gap-1 mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-700 font-semibold">Suhu ONT</span>
                </dt>
                <dd className="m-0">
                  <span className="text-base font-black font-mono text-gray-900">
                    {suhuOntValue}
                  </span>
                  <span className="text-[11px] text-gray-600 font-mono ml-0.5 font-medium">°C</span>
                </dd>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden mx-1">
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
              <div className="px-2.5 py-3.5 text-center">
                <dt className="flex items-center justify-center gap-1 mb-1">
                  <Timer className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-700 font-semibold">Latensi</span>
                </dt>
                <dd className="m-0">
                  <span className="text-base font-black font-mono text-gray-900">
                    {latencyValue}
                  </span>
                  <span className="text-[11px] text-gray-600 font-mono ml-0.5 font-medium">ms</span>
                </dd>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden mx-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '35%',
                      background: '#2563eb'
                    }}
                  />
                </div>
              </div>
            </dl>
          </section>

          {/* ═══ MENU LAYANAN (Akses Cepat Termasuk Pembayaran) ═══ */}
          <section className="px-4">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-sm font-bold text-gray-900">Menu Layanan</h2>
              <span className="text-xs text-gray-600 font-medium">Akses Cepat</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {/* 1. Tombol WiFi */}
              <button
                type="button"
                onClick={() => onNavigate('wifi')}
                className="rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-gray-800 leading-none">WiFi</span>
              </button>

              {/* 2. Tombol Kendala */}
              <button
                type="button"
                onClick={() => onNavigate('kendala')}
                className="rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-gray-800 leading-none">Kendala</span>
              </button>

              {/* 3. Tombol Kuota */}
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-gray-800 leading-none">Kuota</span>
              </button>

              {/* 4. Tombol Pembayaran (Segera Hadir) */}
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-gray-800 leading-none">Bayar</span>
              </button>

              {/* 5. Tombol Akun */}
              <button
                type="button"
                onClick={() => onNavigate('profil')}
                className="rounded-xl p-2 sm:p-2.5 flex flex-col items-center gap-1.5 transition active:scale-[0.97] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70 hover:border-blue-300"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-gray-800 leading-none">Akun</span>
              </button>
            </div>
          </section>

          {/* ═══ SECTION: RINGKASAN KUOTA ═══ */}
          <section className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-sm font-bold text-gray-900">Ringkasan Kuota</h2>
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="text-xs text-blue-700 font-bold flex items-center gap-1 hover:text-blue-800 cursor-pointer"
              >
                <span>Lihat Detail</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
            <div className="text-[28px] font-black text-blue-600 leading-none mb-2.5 font-mono">
              {kuotaTerpakai} <span className="text-sm text-gray-600 font-semibold font-sans">GB</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden w-full mb-2.5">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: '65%' }} />
            </div>
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>Pemakaian Bulan Ini</span>
              <span className="font-semibold text-gray-700">Paket {customer.paket || '-'}</span>
            </div>
          </section>

          {/* ═══ SECTION: TAGIHAN BULAN INI ═══ */}
          <section className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-700">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Tagihan Bulan Ini</h2>
              </div>
              {customer.status_pembayaran === 'BELUM_BAYAR' || customer.status_tagihan === 'MENUNGGAK' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  Belum Dibayar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lunas
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <div className="text-xs text-gray-700 font-medium">Periode: Oktober 2026</div>
                <div className="text-xs text-gray-600 mt-0.5 font-medium">Jatuh tempo tgl 20 setiap bulan</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs active:scale-95 transition cursor-pointer"
                style={{ background: '#2563eb' }}
              >
                Detail Tagihan
              </button>
            </div>
          </section>

          {/* ═══ BANNER PANDUAN PENEMPATAN MODEM ═══ */}
          <div className="px-4">
            <div
              className="rounded-2xl relative"
              style={{ background: '#2563eb' }}
            >
              <div className="p-4 flex items-start gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold mb-1 text-white">Panduan Penempatan Modem ONT</div>
                  <p className="text-xs text-white/95 leading-relaxed font-normal">
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
