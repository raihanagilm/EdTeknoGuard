import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Infinity,
  TrendingUp,
  RefreshCw,
  List,
  Bell
} from 'lucide-react';
import { PortalKuotaService } from '../../services/portalApi';
import { PortalHeader } from '../layout/PortalHeader';

export function PortalQuotaTab({ customer, dashboardData, onOpenNotifications , hasUnreadNotifications}) {
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
    const interval = setInterval(() => {
      fetchKuota();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Update kuotaData jika dashboardData diperbarui dari polling induk
  useEffect(() => {
    if (dashboardData?.kuota && !kuotaData) {
      fetchKuota();
    }
  }, [dashboardData]);

  // Total GB bulan ini
  const totalGB = kuotaData?.kuota_terpakai_gb !== undefined && kuotaData?.kuota_terpakai_gb !== null
    ? Number(kuotaData.kuota_terpakai_gb).toFixed(1)
    : dashboardData?.kuota?.kuota_terpakai_gb !== undefined && dashboardData?.kuota?.kuota_terpakai_gb !== null
    ? Number(dashboardData.kuota.kuota_terpakai_gb).toFixed(1)
    : '0.0';

  const rawPaketNama = kuotaData?.kecepatan_paket || dashboardData?.kuota?.kecepatan_paket || customer?.paket || '-';
  const cleanPaketLabel = (raw) => {
    if (!raw || raw === '-') return '-';
    const trimmed = String(raw).trim();
    if (/^paket\s+/i.test(trimmed)) return trimmed;
    return `Paket ${trimmed}`;
  };
  const paketNama = cleanPaketLabel(rawPaketNama);

  // Dynamic Kuota Bar (skala proporsional)
  const kuotaNum = parseFloat(totalGB) || 0;
  const kuotaBarPercent = Math.min(100, Math.max(8, Math.round((kuotaNum / Math.max(50, Math.ceil(kuotaNum / 50) * 50)) * 100)));

  // 7 Hari histori dari backend (atau fallback dinamis 7 hari terakhir jika belum ada data)
  const getDynamicEmptyHistory = () => {
    const list = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('id-ID', { month: 'short' });
      list.push({ tanggal: `${day} ${month}`, pemakaian_gb: 0.0 });
    }
    return list;
  };

  const rawHistory = kuotaData?.usage_history && kuotaData.usage_history.length > 0
    ? kuotaData.usage_history
    : getDynamicEmptyHistory();

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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-slate-50 text-slate-900">
      {/* ═══ HEADER BIRU TERPADU DENGAN JUDUL HALAMAN AKTIF ═══ */}
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        title="Pemakaian Kuota"
        subtitle="Monitoring Penggunaan Data & FUP Internet"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3.5">

          {/* ═══ SECTION 1: PEMAKAIAN BULAN INI ═══ */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden">
            {/* Card Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/60">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Total Pemakaian Bulan Ini</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight font-medium">
                  Ringkasan pemakaian kuota internet
                </p>
              </div>
            </div>

            {/* Angka + progress bar pemakaian */}
            <div className="p-4 bg-white">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight font-mono text-slate-900">
                  {totalGB}
                </span>
                <span className="text-sm font-semibold text-slate-500">GB Terpakai</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-blue-600"
                  style={{ width: `${kuotaBarPercent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Paket aktif:</span>
                <span className="font-bold text-slate-900">
                  {paketNama}
                </span>
              </div>
            </div>

            {/* Strip info unlimited */}
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-start gap-2.5 bg-slate-50">
              <Infinity className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Internet Anda bersifat <strong className="text-slate-900 font-semibold">Tanpa Batas Kuota (Unlimited)</strong> tanpa batas FUP harian.
              </p>
            </div>
          </section>

          {/* ═══ SECTION 2: HISTORI 7 HARI ═══ */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Histori 7 Hari Terakhir</h2>
              </div>
              <button
                type="button"
                onClick={fetchKuota}
                aria-label="Segarkan data kuota"
                className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 font-medium">Rata-rata pemakaian data harian</p>

            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 px-0.5 sm:px-1">
              {history.map((item, idx) => {
                const val = Number(item.pemakaian_gb || 0);
                const heightPercent = maxGB > 0 ? Math.max(18, Math.round((val / maxGB) * 100)) : 50;
                const dayLabel = (item.tanggal || '').split(' ')[0] || (idx + 1);

                return (
                  <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 font-mono leading-none">
                      {val}
                    </span>
                    <div className="w-full flex-1 max-h-[86px] flex items-end justify-center">
                      <div
                        className="w-full rounded-t-md transition-all duration-700 bg-blue-600"
                        style={{
                          height: `${heightPercent}%`,
                          opacity: heightPercent >= 95 ? 1 : 0.75
                        }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 font-mono leading-none">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Satuan: GB (Gigabyte)</span>
              <span className="font-mono font-bold text-slate-900">Total 7 hari: {total7Days} GB</span>
            </div>
          </section>

          {/* ═══ SECTION 3: RINCIAN PEMAKAIAN ═══ */}
          <section className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Rincian Pemakaian</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">7 hari</span>
            </div>

            <div className="divide-y divide-slate-100">
              {history.map((item, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <span className="text-xs text-slate-600 font-medium">{item.tanggal}</span>
                  <span className="text-xs font-bold font-mono text-slate-900">
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

export default PortalQuotaTab;
