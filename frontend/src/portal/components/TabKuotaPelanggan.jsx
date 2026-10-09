import React, { useState, useEffect } from 'react';
import {
  PieChart,
  HardDrive,
  Calendar,
  Gauge,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import { PortalKuotaService } from '../services/portalApi';

export function TabKuotaPelanggan({ customer }) {
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

  const terpakai = kuotaData?.kuota_terpakai_gb || 84.5;
  const history = kuotaData?.usage_history || [];

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-slate-900">Pemakaian Kuota</h2>
        <p className="text-[11px] text-slate-500">Statistik akumulasi pemakaian data internet bulan berjalan</p>
      </div>

      {/* Main Gauge Card (MUTLAK: TANPA SISA KUOTA SESUAI SOP) */}
      <div className="bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg shadow-cyan-600/20 text-center relative overflow-hidden">
        <div className="text-xs text-cyan-100 font-medium uppercase tracking-wider">
          Total Pemakaian Bulan Ini
        </div>
        <div className="text-4xl font-black tracking-tight mt-1 mb-1 font-mono">
          {terpakai} <span className="text-xl font-bold font-sans">GB</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white mt-2">
          <Gauge className="w-3.5 h-3.5 text-cyan-200" />
          <span>Paket: {kuotaData?.kecepatan_paket || customer?.paket || '20 Mbps Unlimited'}</span>
        </div>

        {/* Note Unlimited */}
        <div className="mt-4 pt-3 border-t border-white/15 text-[11px] text-cyan-100">
          Internet Anda bersifat <strong>Tanpa Batas Kuota (Unlimited)</strong> tanpa batas FUP kuota harian.
        </div>
      </div>

      {/* Histori Pemakaian 7 Hari Terakhir */}
      <div className="bg-white rounded-3xl p-4 border border-sky-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Histori 7 Hari Terakhir</div>
              <div className="text-[10px] text-slate-400">Rata-rata pemakaian data harian</div>
            </div>
          </div>
          <button onClick={fetchKuota} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {history.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">Data histori sedang dikompilasi...</div>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono">
                <span className="text-slate-600 font-sans font-medium">{h.tanggal}</span>
                <span className="font-bold text-cyan-900">{h.pemakaian_gb} GB</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
