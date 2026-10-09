import React from 'react';
import {
  Wifi,
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

  const isSignalGood = signal.status_koneksi === 'NORMAL';
  const isSignalWarn = signal.status_koneksi === 'WARNING';

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

        {/* Live Status Pill */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-white">Status Sambungan Prima</span>
          </div>
          <span className="font-mono text-cyan-100 text-[11px]">Latensi: {signal.latency_ms} ms</span>
        </div>
      </div>

      {/* 2. Kartu Sinyal & Redaman Optik (SOP Warning -26, Kritis -27) */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Daya Terima</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              {signal.rx_power ? `${signal.rx_power} dBm` : '-'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Suhu ONT</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{signal.suhu_ont || 41}°C</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Latensi</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{signal.latency_ms || 18} ms</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Cards (4 Grid) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('wifi')}
          className="p-3.5 bg-white hover:bg-cyan-50/50 rounded-2xl border border-sky-100 text-left transition shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Kelola WiFi</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ganti Nama &amp; Password</div>
        </button>

        <button
          onClick={() => onNavigate('kendala')}
          className="p-3.5 bg-white hover:bg-rose-50/50 rounded-2xl border border-sky-100 text-left transition shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Lapor Gangguan</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Kirim Tiket ke Teknisi</div>
        </button>

        <button
          onClick={() => onNavigate('kuota')}
          className="p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-sky-100 text-left transition shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
            <PieChart className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Pemakaian Data</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{kuota.kuota_terpakai_gb} GB Terpakai</div>
        </button>

        <button
          onClick={() => onNavigate('profil')}
          className="p-3.5 bg-white hover:bg-purple-50/50 rounded-2xl border border-sky-100 text-left transition shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Akun &amp; Sandi</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Keamanan Akun Warga</div>
        </button>
      </div>

      {/* 4. Tips Pemakaian WiFi Rumah Sehat */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200/80 text-xs text-slate-700 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-cyan-900">
          <Info className="w-4 h-4 text-cyan-700" />
          <span>Panduan Penempatan Modem ONT</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Letakkan modem ONT di ruang terbuka yang tinggi, hindari menaruh di dalam lemari atau di balik dinding tebal agar sinyal WiFi menyebar merata ke seluruh ruangan.
        </p>
      </div>
    </div>
  );
}
