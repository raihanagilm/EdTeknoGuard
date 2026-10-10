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
  ArrowDown
} from 'lucide-react';
import { QuotaService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulPemantauanKuota({ activeOffice = 'cabang' }) {
  const [quotaList, setQuotaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPaket, setFilterPaket] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
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
      {/* 1. 3 Kartu Metrik Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <MetricCard
          label="Total Pelanggan Terdata"
          value={`${filteredQuota.length}`}
          unit={`/ ${quotaList.length} ONT`}
          icon={Users}
          colorScheme="cyan"
          subLabel="Wilayah Kantor Aktif"
        />
        <MetricCard
          label="Total Trafik Akumulasi"
          value={`${totalTraffic.toFixed(1)}`}
          unit="GB"
          icon={HardDrive}
          colorScheme="emerald"
          subLabel="Konsumsi Bulan Berjalan"
        />
        <MetricCard
          label="Rata-Rata Per Pelanggan"
          value={`${avgTraffic.toFixed(1)}`}
          unit="GB/user"
          icon={BarChart2}
          colorScheme="purple"
          subLabel="Estimasi Penggunaan Rata-rata"
        />
      </div>

      {/* 2. Filter Bar & Aksi */}
      <FilterContainer>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1">
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
                value={filterPaket}
                onChange={(e) => setFilterPaket(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
              >
                <option value="all">Semua Paket Layanan</option>
                {paketOptions.map((pkt) => (
                  <option key={pkt} value={pkt}>{pkt}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
              >
                <option value="all">Semua Level Pemakaian</option>
                <option value="sangat_tinggi">Sangat Tinggi (&gt; 150 GB)</option>
                <option value="tinggi">Tinggi (100 - 150 GB)</option>
                <option value="sedang">Sedang (50 - 100 GB)</option>
                <option value="ringan">Ringan (&lt; 50 GB)</option>
                <option value="nol">Nol (0 GB)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <span className="px-2.5 py-1.5 rounded-xl bg-cyan-100/80 border border-cyan-300 text-cyan-900 font-mono text-[11px] font-bold shrink-0">
              Wilayah: {activeKantor.toUpperCase() || 'CABANG'}
            </span>
            <button
              onClick={fetchQuota}
              disabled={loading}
              className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[36px] flex items-center justify-center shrink-0"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
                    <div className="font-sans font-bold text-slate-900">{item.nama}</div>
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
