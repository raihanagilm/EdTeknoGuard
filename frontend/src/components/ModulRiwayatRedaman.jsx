import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ZapOff,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { LogsService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulRiwayatRedaman({ activeOffice = 'cabang', warnThreshold = -26.0, critThreshold = -27.0 }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total_records: 0, normal: 0, warning: 0, kritis_los: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRange, setFilterRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        range: filterRange,
        sort_by: 'waktu_cek',
        sort_dir: 'desc'
      };
      if (activeOffice && activeOffice !== 'all') params.kantor = activeOffice;
      if (search) params.q = search;
      if (filterStatus) params.status = filterStatus;
      if (filterRange === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const res = await LogsService.list(params);
      if (res.ok && res.data) {
        const rawList = res.data.data || res.data.logs || [];
        setLogs(rawList);
        const total = res.data.total || res.data.total_count || rawList.length;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / limit) || 1);
        if (res.data.summary) {
          setSummary(res.data.summary);
        } else {
          setSummary({ total_records: total, normal: 0, warning: 0, kritis_los: 0 });
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, filterStatus, filterRange, activeOffice]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterRange('today');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 1. 4 Kartu KPI Interaktif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          label="Total Terpantau"
          value={`${summary.total_records || totalCount} Log`}
          icon={Activity}
          colorScheme="cyan"
          isActive={filterStatus === ''}
          onClick={() => { setFilterStatus(''); setPage(1); }}
        />
        <MetricCard
          label="Sinyal Optimal"
          value={`${summary.normal || 0} Log`}
          icon={CheckCircle2}
          colorScheme="emerald"
          isActive={filterStatus === 'NORMAL'}
          onClick={() => { setFilterStatus('NORMAL'); setPage(1); }}
        />
        <MetricCard
          label="Waspada"
          value={`${summary.warning || 0} Log`}
          icon={AlertTriangle}
          colorScheme="amber"
          isActive={filterStatus === 'WARNING'}
          onClick={() => { setFilterStatus('WARNING'); setPage(1); }}
        />
        <MetricCard
          label="Kritis / LOS"
          value={`${summary.kritis_los || 0} Log`}
          icon={ZapOff}
          colorScheme="rose"
          isActive={filterStatus === 'CRITICAL'}
          onClick={() => { setFilterStatus('CRITICAL'); setPage(1); }}
        />
      </div>

      {/* 2. Filter Bar */}
      <FilterContainer>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, Nama, atau IP..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="">Semua Status</option>
              <option value="NORMAL">NORMAL (&gt; {warnThreshold} dBm)</option>
              <option value="WARNING">WARNING ({warnThreshold} s/d {critThreshold} dBm)</option>
              <option value="CRITICAL">CRITICAL (&le; {critThreshold} dBm)</option>
              <option value="LOS">LOS (Loss of Signal)</option>
            </select>
          </div>

          <div>
            <select
              value={filterRange}
              onChange={(e) => { setFilterRange(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="today">Hari Ini</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="all">Semua Waktu</option>
              <option value="custom">Kustom Tanggal</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] shadow-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={resetFilters}
              className="w-full py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </button>
          </div>
        </form>

        {filterRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-sky-100 text-xs font-mono">
            <span className="text-slate-500 font-bold">Mulai:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-sky-200 bg-white"
            />
            <span className="text-slate-500 font-bold">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-sky-200 bg-white"
            />
          </div>
        )}
      </FilterContainer>

      {/* 4. Tabel Riwayat */}
      <DataTableContainer
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        loading={loading}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3">Waktu Cek</th>
              <th className="py-2.5 px-3">ID Pelanggan</th>
              <th className="py-2.5 px-3">Nama Pelanggan</th>
              <th className="py-2.5 px-3">IP Router ONT</th>
              <th className="py-2.5 px-3 text-right">Daya Rx (dBm)</th>
              <th className="py-2.5 px-3 text-center">Suhu</th>
              <th className="py-2.5 px-3 text-center">Latency</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data riwayat...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada rekaman log ditemukan.
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => (
                <tr key={idx} className="hover:bg-cyan-50/40 transition">
                  <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px] whitespace-nowrap">
                    {item.waktu_cek || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-cyan-900">{item.id_pelanggan}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{item.nama || '-'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.ip_router || '-'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`font-black ${
                        item.rx_power <= critThreshold ? 'text-rose-600' : item.rx_power <= warnThreshold ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.rx_power != null ? `${item.rx_power.toFixed(1)}` : 'LOS'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {item.suhu_ont != null ? `${item.suhu_ont}°C` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {item.latency_ms != null ? `${item.latency_ms}ms` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.status_koneksi === 'NORMAL'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status_koneksi === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.status_koneksi || 'NORMAL'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableContainer>
    </div>
  );
}
