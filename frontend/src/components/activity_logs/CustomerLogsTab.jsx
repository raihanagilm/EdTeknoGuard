import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  Key,
  ShieldAlert,
  FileText,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Clock,
  Phone,
  MapPin,
  User,
  Camera
} from 'lucide-react';
import { ActivityLogsService } from '../../services/api';
import {
  FilterContainer,
  DataTableContainer
} from '../common/CommonUI';

export function CustomerLogsTab({ activeOffice }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterRange, setFilterRange] = useState('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
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

  const fetchCustomerLogs = async () => {
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
      if (filterAction && filterAction !== 'all') params.aksi = filterAction;
      if (filterRange === 'custom') {
        if (appliedStartDate) params.start_date = appliedStartDate;
        if (appliedEndDate) params.end_date = appliedEndDate;
      }

      const res = await ActivityLogsService.listCustomerLogs(params);
      if (res.ok && res.data) {
        const rawList = res.data.data || [];
        setLogs(rawList);
        const total = res.data.total || rawList.length;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / limit) || 1);
        if (res.data.min_date) {
          setMinDate(res.data.min_date);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data log aktivitas pelanggan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerLogs();
  }, [page, limit, filterAction, filterRange, appliedStartDate, appliedEndDate, sortField, sortDir, activeOffice]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomerLogs();
  };

  const handleApplyCustomDate = () => {
    if (!startDate || !endDate) return;
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1);
    setFilterDropdownOpen(false);
  };

  const renderActionBadge = (aksi) => {
    const rawAksi = (aksi || '').toUpperCase();
    if (rawAksi === 'UBAH_ALAMAT') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          <MapPin className="w-3 h-3 text-amber-600" />
          <span>Ubah Alamat</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_NO_WA') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          <Phone className="w-3 h-3 text-emerald-600" />
          <span>Ubah No WA</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_NAMA') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
          <User className="w-3 h-3 text-purple-600" />
          <span>Ubah Nama</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_FOTO_PROFIL') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
          <Camera className="w-3 h-3 text-violet-600" />
          <span>Foto Profil</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_SSID_WIFI') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
          <Wifi className="w-3 h-3 text-sky-600" />
          <span>Ubah SSID</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_SANDI_WIFI') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
          <Key className="w-3 h-3 text-cyan-600" />
          <span>Sandi WiFi</span>
        </span>
      );
    }
    if (rawAksi === 'UBAH_WIFI') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
          <Wifi className="w-3 h-3 text-sky-600" />
          <span>Ubah WiFi</span>
        </span>
      );
    }
    if (rawAksi === 'GANTI_PASSWORD' || rawAksi === 'RESET_PASSWORD') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          <Key className="w-3 h-3 text-amber-600" />
          <span>{rawAksi === 'RESET_PASSWORD' ? 'Reset Sandi' : 'Ganti Sandi'}</span>
        </span>
      );
    }
    if (rawAksi === 'BLOKIR_MAC' || rawAksi === 'UNBLOK_MAC') {
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
          rawAksi === 'BLOKIR_MAC' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
        }`}>
          <ShieldAlert className="w-3 h-3" />
          <span>{rawAksi === 'BLOKIR_MAC' ? 'Blokir MAC' : 'Buka Blokir'}</span>
        </span>
      );
    }
    if (rawAksi === 'BUAT_TIKET') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
          <FileText className="w-3 h-3 text-indigo-600" />
          <span>Buat Tiket</span>
        </span>
      );
    }
    if (rawAksi === 'LOGIN_PORTAL' || rawAksi === 'LOGOUT_PORTAL') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          <UserCheck className="w-3 h-3 text-emerald-600" />
          <span>{rawAksi === 'LOGIN_PORTAL' ? 'Login' : 'Logout'}</span>
        </span>
      );
    }
    return (
      <span className="inline-block text-[11px] font-mono font-bold uppercase text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
        {rawAksi || 'PORTAL'}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. Filter Bar */}
      <div className="relative z-30">
        <FilterContainer>
          <form onSubmit={handleSearchSubmit} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 sm:top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari ID, Nama Pelanggan, No WA, Aksi, IP..."
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
                />
              </div>

              {/* Filter Aksi Dropdown */}
              <div className="hidden sm:block">
                <select
                  value={filterAction}
                  onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">Semua Tindakan</option>
                  <optgroup label="Profil & Identitas">
                    <option value="UBAH_ALAMAT">Ubah Alamat</option>
                    <option value="UBAH_NO_WA">Ubah Nomor WhatsApp</option>
                    <option value="UBAH_NAMA">Ubah Nama Profil</option>
                    <option value="UBAH_FOTO_PROFIL">Ganti Foto Profil</option>
                    <option value="UPDATE_PROFIL">Perbarui Profil (Multi-field)</option>
                  </optgroup>
                  <optgroup label="WiFi & Jaringan">
                    <option value="UBAH_WIFI">Ubah WiFi (SSID & Sandi)</option>
                    <option value="UBAH_SSID_WIFI">Ubah Nama SSID</option>
                    <option value="UBAH_SANDI_WIFI">Ubah Sandi WiFi</option>
                    <option value="BLOKIR_MAC">Blokir Perangkat</option>
                    <option value="UNBLOK_MAC">Buka Blokir Perangkat</option>
                  </optgroup>
                  <optgroup label="Keamanan & Layanan">
                    <option value="GANTI_PASSWORD">Ganti Sandi Akun</option>
                    <option value="RESET_PASSWORD">Reset Sandi Mandiri</option>
                    <option value="BUAT_TIKET">Buat Tiket Keluhan</option>
                    <option value="LOGIN_PORTAL">Login Portal</option>
                  </optgroup>
                </select>
              </div>

              {/* Popover Filter Waktu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className={`p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] shrink-0 cursor-pointer ${
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
                </button>

                {filterDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setFilterDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-60 sm:w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl p-3 shadow-2xl border border-sky-300 space-y-1.5 font-mono text-xs">
                      <div className="px-2 py-1 text-[11px] font-black uppercase text-slate-700 tracking-wider">
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center justify-between cursor-pointer ${
                            filterRange === rng.id
                              ? 'bg-cyan-700 text-white font-bold'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="font-medium">{rng.label}</span>
                          {filterRange === rng.id && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}

                      {filterRange === 'custom' && (
                        <div className="pt-2 border-t border-slate-200 space-y-2 text-[11px]">
                          <div>
                            <span className="text-slate-700 font-bold block text-[11px] mb-1">Mulai:</span>
                            <input
                              type="date"
                              value={startDate}
                              min={minDate || undefined}
                              max={endDate || maxDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-[11px] focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <span className="text-slate-700 font-bold block text-[11px] mb-1">Sampai:</span>
                            <input
                              type="date"
                              value={endDate}
                              min={startDate || minDate || undefined}
                              max={maxDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-[11px] focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyCustomDate}
                            disabled={!startDate || !endDate || startDate > endDate}
                            className={`w-full mt-2 py-2 rounded-lg font-bold text-center text-xs transition ${
                              !startDate || !endDate || startDate > endDate
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-cyan-700 hover:bg-cyan-800 text-white cursor-pointer shadow-xs'
                            }`}
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

            <div className="flex items-center gap-1.5 justify-end shrink-0">
              <button
                type="button"
                onClick={() => { setPage(1); fetchCustomerLogs(); }}
                className="p-1.5 sm:p-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center min-h-[34px] sm:min-h-[36px] shrink-0 cursor-pointer"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </form>
        </FilterContainer>
      </div>

      {/* 2. Tabel Audit Log Pelanggan */}
      <DataTableContainer
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onPageChange={setPage}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        loading={loading}
      >
        {/* Mobile View */}
        <div className="block md:hidden p-2 sm:p-2.5 space-y-1.5">
          {loading ? (
            <div className="text-center py-6 text-slate-400 font-mono text-xs">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
              <div>Memuat log aktivitas pelanggan...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-6 text-slate-400 font-mono text-xs">
              Tidak ada catatan aktivitas pelanggan ditemukan.
            </div>
          ) : (
            logs.map((item, idx) => {
              const rowNo = (page - 1) * limit + idx + 1;
              const isSuccess = item.status === 'SUCCESS' || item.status === 'BERHASIL';

              return (
                <div
                  key={`cust-mobile-${idx}`}
                  className="bg-white rounded-xl border border-sky-200/80 p-2.5 font-mono transition shadow-2xs hover:border-cyan-300 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] text-slate-400 font-bold shrink-0">#{rowNo}</span>
                      <span className="font-bold text-xs sm:text-sm text-cyan-900 truncate">
                        {item.nama_pelanggan || item.id_pelanggan}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderActionBadge(item.aksi)}
                    </div>
                  </div>

                  <div className="text-xs font-sans text-slate-700 leading-snug line-clamp-2">
                    {item.keterangan || '-'}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{item.created_at || item.waktu || '-'}</span>
                    </div>
                    <div className="truncate">
                      ID: <span className="font-semibold text-slate-600">{item.id_pelanggan}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 text-center whitespace-nowrap">No</th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Waktu Kejadian</span>
                    {sortField === 'created_at' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Pelanggan</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Kontak WA</th>
                <th
                  onClick={() => handleSort('aksi')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Aksi / Tindakan</span>
                    {sortField === 'aksi' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[240px]">Keterangan Audit</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Alamat IP</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                    <div>Memuat log aktivitas pelanggan...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                    Tidak ada catatan aktivitas pelanggan ditemukan.
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const rowNo = (page - 1) * limit + idx + 1;
                  const isSuccess = item.status === 'SUCCESS' || item.status === 'BERHASIL';

                  return (
                    <tr key={idx} className="hover:bg-cyan-50/40 transition">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{rowNo}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap">
                        {item.created_at || item.waktu || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-cyan-900">{item.nama_pelanggan || item.id_pelanggan}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.id_pelanggan}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                        {item.no_wa || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderActionBadge(item.aksi)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 min-w-[240px]">
                        <div className="text-xs leading-relaxed break-words">{item.keterangan || '-'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs font-mono whitespace-nowrap">{item.ip_address || '-'}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-mono font-bold uppercase ${isSuccess ? 'text-emerald-700' : 'text-rose-700'}`}
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
        </div>
      </DataTableContainer>
    </div>
  );
}
