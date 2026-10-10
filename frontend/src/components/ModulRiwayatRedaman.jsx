import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ZapOff,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-react';
import { LogsService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulRiwayatRedaman({ activeOffice = 'cabang', warnThreshold = -26.0, critThreshold = -27.0, onNavigateCustomer }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total_records: 0, normal: 0, warning: 0, critical: 0, los: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRange, setFilterRange] = useState('today');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('waktu_cek');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        range: filterRange,
        sort_by: sortField,
        sort_dir: sortDir
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
      {/* 1. Segmented Status Ticker Bar Terpadu (Opsi B: 1 Baris Penuh Muat 1 Layar Tanpa Swipe) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total',
            value: summary.total_records || totalCount,
            colorScheme: 'cyan',
            isActive: filterStatus === '',
            onClick: () => { setFilterStatus(''); setPage(1); },
            subLabel: 'Semua Log'
          },
          {
            label: 'Optimal',
            value: summary.normal || 0,
            colorScheme: 'emerald',
            isActive: filterStatus === 'NORMAL',
            onClick: () => { setFilterStatus('NORMAL'); setPage(1); },
            subLabel: '> -26 dBm'
          },
          {
            label: 'Waspada',
            value: summary.warning || 0,
            colorScheme: 'amber',
            isActive: filterStatus === 'WARNING',
            onClick: () => { setFilterStatus('WARNING'); setPage(1); },
            subLabel: '-26~-27 dBm'
          },
          {
            label: 'Kritis',
            value: summary.critical || 0,
            colorScheme: 'rose',
            isActive: filterStatus === 'CRITICAL',
            onClick: () => { setFilterStatus('CRITICAL'); setPage(1); },
            subLabel: '≤ -27 dBm'
          },
          {
            label: 'LOS',
            value: summary.los || 0,
            colorScheme: 'purple',
            isActive: filterStatus === 'LOS',
            onClick: () => { setFilterStatus('LOS'); setPage(1); },
            subLabel: 'Putus'
          }
        ]}
      />

      {/* 2. Filter Bar Ringkas (Search + Tombol Popover Filter Waktu) */}
      <FilterContainer>
        <form onSubmit={handleSearchSubmit} className="flex items-center justify-between gap-2">
          {/* Kotak Pencarian & Tombol Filter Popover */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 sm:top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID, Nama, atau IP..."
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>

            {/* Tombol Popover Filter Rentang Waktu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={`p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] shrink-0 ${
                  filterRange !== 'today'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border-sky-200'
                }`}
                title="Filter Rentang Tanggal / Waktu"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {filterRange === 'today'
                    ? 'Hari Ini'
                    : filterRange === '7d'
                    ? '7 Hari'
                    : filterRange === '30d'
                    ? '30 Hari'
                    : filterRange === 'all'
                    ? 'Semua Waktu'
                    : 'Kustom'}
                </span>
                {filterRange !== 'today' && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {/* Popover Dropdown Rentang Waktu */}
              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-52 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-sky-200 space-y-1 font-mono text-xs">
                    <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Pilih Rentang Waktu:
                    </div>
                    {[
                      { id: 'today', label: 'Hari Ini' },
                      { id: '7d', label: '7 Hari Terakhir' },
                      { id: '30d', label: '30 Hari Terakhir' },
                      { id: 'all', label: 'Semua Waktu' },
                      { id: 'custom', label: 'Kustom Tanggal' }
                    ].map((rng) => (
                      <button
                        key={rng.id}
                        type="button"
                        onClick={() => {
                          setFilterRange(rng.id);
                          setPage(1);
                          if (rng.id !== 'custom') setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl transition flex items-center justify-between ${
                          filterRange === rng.id
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'hover:bg-cyan-50 text-slate-700'
                        }`}
                      >
                        <span>{rng.label}</span>
                        {filterRange === rng.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}

                    {filterRange === 'custom' && (
                      <div className="pt-2 border-t border-sky-100 space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Mulai:</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-sky-200 bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sampai:</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-sky-200 bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFilterDropdownOpen(false)}
                          className="w-full mt-1 py-1 bg-cyan-600 text-white rounded-lg font-bold text-center"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tombol Reset/Reload */}
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            <button
              type="button"
              onClick={resetFilters}
              className="p-1.5 sm:p-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center min-h-[34px] sm:min-h-[36px] shrink-0"
              title="Reset Filter"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </form>
      </FilterContainer>

      {/* 4. Tabel Riwayat (Sorting Aktif, Tanpa Checkbox Sesuai SOP) */}
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
              <th className="py-2.5 px-3 w-12 text-center">No</th>
              <th
                onClick={() => handleSort('waktu_cek')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Waktu Cek</span>
                  {sortField === 'waktu_cek' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('id_pelanggan')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>ID Pelanggan</span>
                  {sortField === 'id_pelanggan' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('nama')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Nama Pelanggan</span>
                  {sortField === 'nama' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3">IP Router ONT</th>
              <th
                onClick={() => handleSort('rx_power')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Daya Rx (dBm)</span>
                  {sortField === 'rx_power' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Suhu</th>
              <th className="py-2.5 px-3 text-center">Latency</th>
              <th
                onClick={() => handleSort('status_koneksi')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {sortField === 'status_koneksi' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data riwayat...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada rekaman log ditemukan.
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => {
                const rowNo = (page - 1) * limit + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-cyan-50/40 transition">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{rowNo}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px] whitespace-nowrap">
                      {item.waktu_cek || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-900">{item.id_pelanggan}</td>
                    <td className="py-2.5 px-3 font-sans">
                      {onNavigateCustomer && item.nama ? (
                        <button
                          type="button"
                          onClick={() => onNavigateCustomer(item.nama)}
                          className="font-semibold text-cyan-800 hover:text-cyan-950 hover:underline text-left cursor-pointer transition"
                          title={`Lihat detail ${item.nama} di Data Pelanggan`}
                        >
                          {item.nama}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-900">{item.nama || '-'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.ip_router || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      {item.rx_power != null ? (
                        <span
                          className={`font-black ${
                            item.rx_power <= critThreshold ? 'text-rose-600' : item.rx_power <= warnThreshold ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {Number(item.rx_power).toFixed(1)} dBm
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">
                          {item.status_koneksi === 'LOS' ? 'LOS' : '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {item.suhu_ont != null ? `${item.suhu_ont}°C` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {item.latency_ms != null ? `${item.latency_ms}ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {(() => {
                        const statusVal = (item.status_koneksi || 'NORMAL').toUpperCase();
                        let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                        if (statusVal === 'WARNING') {
                          badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                        } else if (statusVal === 'CRITICAL') {
                          badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                        } else if (statusVal === 'LOS') {
                          badgeClass = 'bg-purple-50 text-purple-700 border border-purple-200';
                        }
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeClass}`}>
                            {statusVal}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTableContainer>
    </div>
  );
}
