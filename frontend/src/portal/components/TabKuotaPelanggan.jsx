import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Infinity,
  TrendingUp,
  RefreshCw,
  List,
  Bell
} from 'lucide-react';
import { PortalKuotaService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';

export function TabKuotaPelanggan({ customer, dashboardData }) {
  const [kuotaData, setKuotaData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchKuota = async () => {
    setLoading(true);
    try {
      const res = await PortalKuotaService.getKuota();
      if (res.ok && res.data) {
        setKuotaData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKuota();
  }, []);

  // Total GB bulan ini
  const totalGB = kuotaData?.kuota_terpakai_gb !== undefined && kuotaData?.kuota_terpakai_gb !== null
    ? Number(kuotaData.kuota_terpakai_gb).toFixed(1)
    : dashboardData?.kuota?.kuota_terpakai_gb !== undefined && dashboardData?.kuota?.kuota_terpakai_gb !== null
    ? Number(dashboardData.kuota.kuota_terpakai_gb).toFixed(1)
    : '163.7';

  const paketNama = kuotaData?.kecepatan_paket || dashboardData?.kuota?.kecepatan_paket || customer?.paket || '20 Mbps Unlimited';

  // 7 Hari histori dari backend (atau fallback default 7 hari)
  const defaultHistory = [
    { tanggal: '07 Oct', pemakaian_gb: 4.6 },
    { tanggal: '08 Oct', pemakaian_gb: 6.8 },
    { tanggal: '09 Oct', pemakaian_gb: 5.7 },
    { tanggal: '10 Oct', pemakaian_gb: 4.6 },
    { tanggal: '11 Oct', pemakaian_gb: 6.8 },
    { tanggal: '12 Oct', pemakaian_gb: 5.7 },
    { tanggal: '13 Oct', pemakaian_gb: 4.6 }
  ];

  const rawHistory = kuotaData?.usage_history && kuotaData.usage_history.length > 0
    ? kuotaData.usage_history
    : defaultHistory;

  // Normalisasi data 7 hari terakhir
  const history = rawHistory.slice(-7);
  const maxGB = Math.max(...history.map((h) => Number(h.pemakaian_gb || 0)), 1);
  const total7Days = history.reduce((acc, curr) => acc + Number(curr.pemakaian_gb || 0), 0).toFixed(1);
  // Inisial Nama Pelanggan (Contoh: "Aisyah / Tuti" -> "AT")
  const getInitials = (namaStr) => {
    if (!namaStr) return 'AT';
    const parts = namaStr.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AT';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const customerInitials = getInitials(customer?.nama);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU DENGAN MASKOT, BRAND TEKNOCUST, DAN LONCENG NOTIFIKASI ═══ */}
      <div className="shrink-0 relative overflow-hidden" style={{ background: '#2563eb' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative px-5 pt-4 pb-3 flex items-center justify-between gap-3">
          {/* Maskot Kiri Atas */}
          <div className="w-12 h-10 shrink-0 flex items-center justify-center overflow-visible">
            <PortalActiveMascot
              data={dashboardData || { customer }}
              className="w-12 h-10"
            />
          </div>

          {/* Tulisan Brand Tekno & Portal Layanan Mandiri Pelanggan TeknoIndonet */}
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-black tracking-tight leading-none text-white">
              Tekno<span className="text-blue-200">Cust</span>
            </div>
            <div className="text-[9px] text-blue-100 mt-1 leading-tight font-medium">
              Portal Layanan Mandiri Pelanggan TeknoIndonet
            </div>
          </div>

          {/* Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 hover:bg-white/25 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 stroke-[2.2]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </button>
        </div>
      </div>

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS BERANDA ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-6 space-y-4">

          {/* ═══ CARD 1: MODEL PERSIS SEPERTI CARD DI BERANDA DENGAN MASKOT KANAN ATAS ═══ */}
          <div className="px-4">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">

              {/* Bagian Atas: Header info + Maskot Pintar di Kanan Atas berlatar Gradient & Radial Glow */}
              <div
                className="relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(255, 255, 255) 100%)' }}
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
                  <PortalActiveMascot
                    data={dashboardData || { customer }}
                    className="w-20 h-16"
                  />
                </div>

                {/* Teks Kiri (Diberi padding kanan pr-24 agar tidak tertimpa maskot) */}
                <div className="relative p-4 pr-24">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                      <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="text-[13px] font-bold text-gray-900 leading-tight">
                      Total Pemakaian Bulan Ini
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 font-medium">
                    Ringkasan pemakaian kuota internet
                  </div>
                </div>
              </div>

              {/* Angka + progress bar pemakaian */}
              <div className="px-4 pt-3 pb-4 border-t border-gray-100 bg-white">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black tracking-tight font-mono" style={{ color: '#2563eb' }}>
                    {totalGB}
                  </span>
                  <span className="text-lg font-bold text-gray-400">GB</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: '68%', background: '#2563eb' }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 font-medium">Paket aktif:</span>
                  <span className="font-bold px-2 py-0.5 rounded" style={{ background: '#dbeafe', color: '#2563eb' }}>
                    {paketNama}
                  </span>
                </div>
              </div>

              {/* Strip info unlimited */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2.5" style={{ background: '#eff6ff' }}>
                <Infinity className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#2563eb' }} />
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Internet Anda bersifat <strong className="text-gray-900">Tanpa Batas Kuota (Unlimited)</strong> tanpa batas FUP kuota harian.
                </p>
              </div>

            </div>
          </div>

          {/* ═══ CARD: HISTORI 7 HARI ═══ */}
          <div className="px-4 pt-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: '#2563eb' }} />
                  <div className="text-[13px] font-black text-gray-900">Histori 7 Hari Terakhir</div>
                </div>
                <button
                  type="button"
                  onClick={fetchKuota}
                  className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-[10px] text-gray-500 mb-4 font-medium">Rata-rata pemakaian data harian</div>

              <div className="flex items-end justify-between gap-2 h-32 px-1">
                {history.map((item, idx) => {
                  const val = Number(item.pemakaian_gb || 0);
                  const heightPercent = maxGB > 0 ? Math.max(18, Math.round((val / maxGB) * 100)) : 50;
                  const dayLabel = (item.tanggal || '').split(' ')[0] || (idx + 1);

                  return (
                    <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                      <div className="text-[9px] font-bold text-gray-700 font-mono">
                        {val}
                      </div>
                      <div className="w-full flex-1 max-h-[82px] flex items-end justify-center">
                        <div
                          className="w-full rounded-t-md transition-all duration-700"
                          style={{
                            height: `${heightPercent}%`,
                            background: '#2563eb',
                            opacity: heightPercent >= 95 ? 1 : 0.65
                          }}
                        />
                      </div>
                      <div className="text-[9px] font-semibold text-gray-500 font-mono">
                        {dayLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                <span>Satuan: GB (Gigabyte)</span>
                <span className="font-mono font-bold text-gray-700">Total 7 hari: {total7Days} GB</span>
              </div>
            </div>
          </div>

          {/* ═══ CARD: RINCIAN PEMAKAIAN ═══ */}
          <div className="px-4 pt-3">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" style={{ color: '#2563eb' }} />
                  <div className="text-[12px] font-black text-gray-900">Rincian Pemakaian</div>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">7 hari</span>
              </div>

              <div className="divide-y divide-gray-50">
                {history.map((item, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] text-gray-700 font-medium">{item.tanggal}</span>
                    <span className="text-[12px] font-bold font-mono text-gray-900">
                      {Number(item.pemakaian_gb || 0)} GB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default TabKuotaPelanggan;
