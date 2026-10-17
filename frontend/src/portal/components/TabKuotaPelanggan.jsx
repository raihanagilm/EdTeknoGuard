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
import { PortalHeader } from './PortalHeader';

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
    : '0.0';

  const paketNama = kuotaData?.kecepatan_paket || dashboardData?.kuota?.kecepatan_paket || customer?.paket || '-';

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
      {/* ═══ HEADER BIRU TERPADU DENGAN JUDUL HALAMAN AKTIF ═══ */}
      <PortalHeader
        title="Pemakaian Kuota"
        subtitle="Monitoring Penggunaan Data & FUP Internet"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="pb-6 space-y-4">

          {/* ═══ SECTION 1: PEMAKAIAN BULAN INI ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="p-4 pb-3 border-b border-gray-100 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-gray-900 leading-tight">Total Pemakaian Bulan Ini</h2>
                <p className="text-xs text-gray-600 mt-0.5 leading-tight font-medium">
                  Ringkasan pemakaian kuota internet
                </p>
              </div>
            </div>

            {/* Angka + progress bar pemakaian */}
            <div className="px-4 pt-3 pb-4 bg-white">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black tracking-tight font-mono text-blue-600">
                  {totalGB}
                </span>
                <span className="text-lg font-bold text-gray-500">GB</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-blue-600" style={{ width: '68%' }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Paket aktif:</span>
                <span className="font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {paketNama}
                </span>
              </div>
            </div>

            {/* Strip info unlimited */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2.5 bg-blue-50/70">
              <Infinity className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
              <p className="text-xs text-gray-700 leading-relaxed font-normal">
                Internet Anda bersifat <strong className="text-gray-900 font-semibold">Tanpa Batas Kuota (Unlimited)</strong> tanpa batas FUP kuota harian.
              </p>
            </div>
          </section>

          {/* ═══ SECTION 2: HISTORI 7 HARI ═══ */}
          <section className="mx-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-black text-gray-900">Histori 7 Hari Terakhir</h2>
              </div>
              <button
                type="button"
                onClick={fetchKuota}
                aria-label="Segarkan data kuota"
                className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-4 font-medium">Rata-rata pemakaian data harian</p>

            <div className="flex items-end justify-between gap-2 h-36 px-1">
              {history.map((item, idx) => {
                const val = Number(item.pemakaian_gb || 0);
                const heightPercent = maxGB > 0 ? Math.max(18, Math.round((val / maxGB) * 100)) : 50;
                const dayLabel = (item.tanggal || '').split(' ')[0] || (idx + 1);

                return (
                  <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                    <span className="text-[11px] font-bold text-gray-800 font-mono leading-none">
                      {val}
                    </span>
                    <div className="w-full flex-1 max-h-[86px] flex items-end justify-center">
                      <div
                        className="w-full rounded-t-md transition-all duration-700 bg-blue-600"
                        style={{
                          height: `${heightPercent}%`,
                          opacity: heightPercent >= 95 ? 1 : 0.7
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 font-mono leading-none">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>Satuan: GB (Gigabyte)</span>
              <span className="font-mono font-bold text-gray-800">Total 7 hari: {total7Days} GB</span>
            </div>
          </section>

          {/* ═══ SECTION 3: RINCIAN PEMAKAIAN ═══ */}
          <section className="mx-3 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-black text-gray-900">Rincian Pemakaian</h2>
              </div>
              <span className="text-xs text-gray-600 font-medium">7 hari</span>
            </div>

            <div className="divide-y divide-gray-100">
              {history.map((item, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-700 font-medium">{item.tanggal}</span>
                  <span className="text-xs font-bold font-mono text-gray-900">
                    {Number(item.pemakaian_gb || 0)} GB
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default TabKuotaPelanggan;
