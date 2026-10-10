import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ActivityLogsService } from '../services/api';
import {
  ModuleHeader,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulLogAktivitas() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterRange, setFilterRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState('created_at');
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

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        range: filterRange,
        sort_by: sortField,
        sort_dir: sortDir
      };
      if (search) params.q = search;
      if (filterUser && filterUser !== 'all') params.username = filterUser;
      if (filterRange === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const res = await ActivityLogsService.list(params);
      if (res.ok && res.data) {
        const rawList = res.data.data || res.data.logs || [];
        setLogs(rawList);
        const total = res.data.total || res.data.total_count || rawList.length;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / limit) || 1);
      }
    } catch (err) {
      console.error('Gagal mengambil data log aktivitas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, [page, limit, filterUser, filterRange, sortField, sortDir]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchActivityLogs();
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter Bar */}
      <FilterContainer>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, username, atau IP..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
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
              <span>Terapkan Filter</span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => { setPage(1); fetchActivityLogs(); }}
              className="w-full py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
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

      {/* 3. Tabel Audit Log (Sorting Aktif, Tanpa Checkbox Sesuai SOP) */}
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
                onClick={() => handleSort('created_at')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Waktu Kejadian</span>
                  {sortField === 'created_at' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('username')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Pengguna</span>
                  {sortField === 'username' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('action')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Aksi / Tindakan</span>
                  {sortField === 'action' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3">Keterangan Audit</th>
              <th className="py-2.5 px-3">Alamat IP</th>
              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {sortField === 'status' ? (
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
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat log aktivitas...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada catatan aktivitas ditemukan.
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => {
                const rowNo = (page - 1) * limit + idx + 1;

                return (
                  <tr key={idx} className="hover:bg-cyan-50/40 transition">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{rowNo}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {item.created_at || item.waktu || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-cyan-900">{item.username || item.user || 'Sistem'}</div>
                      {item.nama_karyawan && (
                        <div className="text-[10px] text-slate-400 font-sans">{item.nama_karyawan}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold">
                        {item.action || item.aksi || 'ACTIVITY'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 max-w-sm">
                      <div className="line-clamp-2">{item.keterangan || item.detail || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{item.ip_address || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.status === 'SUCCESS' || item.status === 'BERHASIL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status || 'OK'}
                      </span>
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
