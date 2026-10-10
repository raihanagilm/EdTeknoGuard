import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Users,
  HardDrive,
  BarChart2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-react';
import { QuotaService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulPemantauanKuota({ activeOffice = 'cabang', onNavigateCustomer }) {
  const [quotaList, setQuotaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPaket, setFilterPaket] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [paketOptions, setPaketOptions] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [activeKantor, setActiveKantor] = useState(activeOffice);
  const [sortField, setSortField] = useState('terpakai_gb');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const fetchQuota = async () => {
    setLoading(true);
    try {
      const res = await QuotaService.getOverview();
      if (res.ok && res.data) {
        setQuotaList(res.data.quota || []);
        setPaketOptions(res.data.paket_options || []);
        setCurrentPeriod(res.data.current_period || '');
        setActiveKantor(res.data.active_kantor || activeOffice);
      }
    } catch (err) {
      console.error('Gagal mengambil data kuota:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [activeOffice]);

  const filteredQuota = quotaList.filter((item) => {
    if (filterPaket !== 'all' && item.paket !== filterPaket) return false;
    if (filterLevel !== 'all') {
      const gb = item.terpakai_gb || 0;
      if (filterLevel === 'sangat_tinggi' && gb <= 150) return false;
      if (filterLevel === 'tinggi' && (gb < 100 || gb > 150)) return false;
      if (filterLevel === 'sedang' && (gb < 50 || gb >= 100)) return false;
      if (filterLevel === 'ringan' && (gb <= 0 || gb >= 50)) return false;
      if (filterLevel === 'nol' && gb > 0) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.id_pelanggan && item.id_pelanggan.toLowerCase().includes(q)) ||
        (item.ip_router && item.ip_router.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalTraffic = filteredQuota.reduce((acc, item) => acc + (item.terpakai_gb || 0), 0);
  const avgTraffic = filteredQuota.length > 0 ? totalTraffic / filteredQuota.length : 0;

  return (
    <div className="space-y-4">
      {/* 1. Segmented Status Ticker Bar Terpadu (Opsi B: 1 Baris Penuh Muat 1 Layar Tanpa Swipe) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total Terdata',
            value: `${filteredQuota.length}`,
            colorScheme: 'cyan',
            subLabel: `dari ${quotaList.length} ONT`
          },
          {
            label: 'Total Trafik',
            value: `${totalTraffic.toFixed(1)} GB`,
            colorScheme: 'emerald',
            subLabel: 'Bulan Berjalan'
          },
          {
            label: 'Rata-Rata',
            value: `${avgTraffic.toFixed(1)} GB`,
            colorScheme: 'purple',
            subLabel: 'Per Pelanggan'
          }
        ]}
      />

      {/* 2. Filter Bar & Aksi Ringkas */}
      <FilterContainer>
        <div className="flex items-center justify-between gap-2">
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

            {/* Tombol Popover Filter Paket & Level */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={`p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] shrink-0 ${
                  filterPaket !== 'all' || filterLevel !== 'all'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border-sky-200'
                }`}
                title="Filter Paket & Level Pemakaian"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {filterPaket !== 'all' ? filterPaket : filterLevel !== 'all' ? `Level: ${filterLevel}` : 'Filter'}
                </span>
                {(filterPaket !== 'all' || filterLevel !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {/* Popover Menu Filter */}
              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-sky-200 space-y-2.5 font-mono text-xs">
                    {/* Seksi 1: Paket */}
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Paket Layanan:
                      </div>
                      <select
                        value={filterPaket}
                        onChange={(e) => setFilterPaket(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
                      >
                        <option value="all">Semua Paket</option>
                        {paketOptions.map((pkt) => (
                          <option key={pkt} value={pkt}>{pkt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Seksi 2: Level Pemakaian */}
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Level Pemakaian:
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { id: 'all', label: 'Semua' },
                          { id: 'sangat_tinggi', label: '> 150 GB' },
                          { id: 'tinggi', label: '100-150 GB' },
                          { id: 'sedang', label: '50-100 GB' },
                          { id: 'ringan', label: '< 50 GB' },
                          { id: 'nol', label: '0 GB' }
                        ].map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setFilterLevel(lvl.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition ${
                              filterLevel === lvl.id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterPaket('all');
                          setFilterLevel('all');
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700"
                      >
                        Reset Filter
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterDropdownOpen(false)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tombol Reload */}
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            <button
              onClick={fetchQuota}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[34px] sm:min-h-[36px] flex items-center justify-center shrink-0"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </FilterContainer>

      {/* 4. Tabel Pemakaian Kuota (Sorting Aktif, Tanpa Checkbox Sesuai SOP) */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3 w-12 text-center">No</th>
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
              <th
                onClick={() => handleSort('paket')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Paket Layanan</span>
                  {sortField === 'paket' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 font-mono">IP Router</th>
              <th
                onClick={() => handleSort('terpakai_gb')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pemakaian Bulan Ini</span>
                  {sortField === 'terpakai_gb' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Status Bandwidth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data pemakaian kuota...</div>
                </td>
              </tr>
            ) : filteredQuota.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada data kuota ditemukan.
                </td>
              </tr>
            ) : (
              filteredQuota.map((item, idx) => (
                <tr key={item.id_pelanggan} className="hover:bg-cyan-50/40 transition">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-900">{item.id_pelanggan}</td>
                  <td className="py-2.5 px-3">
                    {onNavigateCustomer && item.nama ? (
                      <button
                        type="button"
                        onClick={() => onNavigateCustomer(item.nama)}
                        className="font-sans font-bold text-cyan-800 hover:text-cyan-950 hover:underline text-left cursor-pointer transition block"
                        title={`Lihat detail ${item.nama} di Data Pelanggan`}
                      >
                        {item.nama}
                      </button>
                    ) : (
                      <div className="font-sans font-bold text-slate-900">{item.nama}</div>
                    )}
                    <div className="text-[10px] text-slate-400">{item.alamat || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold">
                      {item.paket}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{item.ip_router}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="font-black text-slate-900">
                      {item.terpakai_gb != null ? item.terpakai_gb.toFixed(1) : '0.0'} <span className="text-[10px] text-slate-400 font-normal">GB</span>
                    </div>
                    <div className="w-20 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.terpakai_gb > 150 ? 'bg-rose-500' : item.terpakai_gb > 100 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, ((item.terpakai_gb || 0) / 200) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      UNLIMITED
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
