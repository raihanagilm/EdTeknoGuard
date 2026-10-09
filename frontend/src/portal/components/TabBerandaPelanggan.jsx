import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Clock,
  Info
} from 'lucide-react';

export function TabBerandaPelanggan({ data, onNavigate }) {
  const signal = data?.signal || { rx_power: -21.4, status_koneksi: 'NORMAL', latency_ms: 18, suhu_ont: 41.0 };
  const kuota = data?.kuota || { kuota_terpakai_gb: 84.5, kecepatan_paket: '20 Mbps Unlimited' };
  const customer = data?.customer || {};

  // Real-time Browser & Network Connectivity Detection
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isSignalGood = signal.status_koneksi === 'NORMAL';
  const isSignalWarn = signal.status_koneksi === 'WARNING';
  const isSignalCrit = signal.status_koneksi === 'CRITICAL' || signal.status_koneksi === 'LOS';

  // Real-time Connection Status Determination
  const getConnectionStatus = () => {
    if (!isOnline) {
      return {
        label: 'Perangkat Terputus dari Jaringan',
        dotColor: 'bg-rose-500',
        ping: true,
        textColor: 'text-rose-100',
        subText: 'Tidak ada koneksi internet'
      };
    }
    if (isSignalCrit) {
      return {
        label: 'Sinyal Drop / Redaman Kritis',
        dotColor: 'bg-rose-500',
        ping: true,
        textColor: 'text-rose-100',
        subText: 'Perlu perbaikan jalur optik'
      };
    }
    if (isSignalWarn) {
      return {
        label: 'Sambungan Waspada (Redaman Turun)',
        dotColor: 'bg-amber-400',
        ping: true,
        textColor: 'text-amber-100',
        subText: 'Koneksi menurun'
      };
    }
    return {
      label: 'Status Sambungan Prima',
      dotColor: 'bg-emerald-400',
      ping: true,
      textColor: 'text-emerald-100',
      subText: 'Koneksi lancar'
    };
  };

  const connectionState = getConnectionStatus();

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* 1. Hero Card Status Pelanggan */}
      <div className="bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 rounded-3xl p-5 text-white shadow-lg shadow-cyan-600/20 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-cyan-100 border border-white/20">
            {customer.paket || '20 Mbps Unlimited'}
          </span>
          <span className="text-[11px] text-cyan-100 font-mono">
            {customer.ip_router || '10.10.12.45'}
          </span>
        </div>

        <div className="mt-3">
          <div className="text-xs text-cyan-100 font-medium">Selamat Datang,</div>
          <div className="text-lg sm:text-xl font-black tracking-tight">{customer.nama || 'Pelanggan Setia'}</div>
        </div>

        {/* Pemakaian Kuota Hari Ini */}
        <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-cyan-100">
            <PieChart className="w-3.5 h-3.5 text-cyan-200" />
            <span className="font-medium">Pemakaian Hari Ini:</span>
          </div>
          <span className="font-mono font-bold text-white bg-white/15 px-2 py-0.5 rounded-lg border border-white/10">
            {kuota.kuota_hari_ini_gb || 3.2} GB
          </span>
        </div>
      </div>

      {/* 2. Kartu Sinyal & Redaman Optik */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Kualitas Sinyal Optik</div>
              <div className="text-[10px] text-slate-400">Pembacaan Real-time dari Modem</div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              isSignalGood
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isSignalWarn
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {signal.status_koneksi}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div className="p-2.5 rounded-2xl bg-cyan-50/40 border border-sky-100/80">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Daya Terima</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              {signal.rx_power ? `${signal.rx_power} dBm` : '-'}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-cyan-50/40 border border-sky-100/80">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Suhu ONT</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{signal.suhu_ont || 41}°C</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-cyan-50/40 border border-sky-100/80">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Latensi</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{signal.latency_ms || 18} ms</div>
          </div>
        </div>
      </div>

      {/* 3. MENU LAYANAN & OPERASIONAL (Akses Cepat Tile Cards Sesuai Gambar 2) */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-xs">
        <header className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 bg-cyan-600 rounded-full" />
            <h2 className="text-xs font-black text-slate-900 font-mono uppercase tracking-wide">
              Menu Layanan &amp; Operasional
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">Akses Cepat</span>
        </header>

        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* 1. Kelola WiFi */}
          <button
            onClick={() => onNavigate('wifi')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Wifi className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">WiFi</span>
          </button>

          {/* 2. Lapor Gangguan */}
          <button
            onClick={() => onNavigate('kendala')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Kendala</span>
          </button>

          {/* 3. Pemakaian Data */}
          <button
            onClick={() => onNavigate('kuota')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Kuota</span>
          </button>

          {/* 4. Akun & Sandi */}
          <button
            onClick={() => onNavigate('profil')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Akun</span>
          </button>
        </div>
      </section>

      {/* 4. Tips Pemakaian WiFi Rumah Sehat */}
      <div className="p-4 rounded-3xl bg-cyan-50/80 border border-sky-200/80 text-xs text-slate-700 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-cyan-900">
          <Info className="w-4 h-4 text-cyan-700 shrink-0" />
          <span>Panduan Penempatan Modem ONT</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
          Letakkan modem ONT di ruang terbuka yang tinggi, hindari menaruh di dalam lemari atau di balik dinding tebal agar sinyal WiFi menyebar merata ke seluruh ruangan.
        </p>
      </div>
    </div>
  );
}
