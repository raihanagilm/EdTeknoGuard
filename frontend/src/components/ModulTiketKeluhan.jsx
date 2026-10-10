import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  FileText,
  User,
  Phone,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TicketsService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulTiketKeluhan({ activeOffice = 'cabang', onNavigateCustomer }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatan, setCatatan] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sortField, setSortField] = useState('id_tiket');
  const [sortDir, setSortDir] = useState('desc');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await TicketsService.list(filterStatus);
      if (res.ok && res.data) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data tiket:', err);
      showToast('Gagal memuat daftar tiket', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, activeOffice]);

  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status || 'MENUNGGU');
    setCatatan(ticket.catatan_teknisi || '');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const res = await TicketsService.updateStatus(selectedTicket.id_tiket, newStatus, catatan);
      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message || 'Status tiket berhasil diperbarui');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        showToast(res.data?.message || 'Gagal mengubah status tiket', 'error');
      }
    } catch (err) {
      console.error('Gagal update tiket:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.id_tiket && t.id_tiket.toLowerCase().includes(q)) ||
      (t.nama_pelanggan && t.nama_pelanggan.toLowerCase().includes(q)) ||
      (t.id_pelanggan && t.id_pelanggan.toLowerCase().includes(q)) ||
      (t.kategori && t.kategori.toLowerCase().includes(q)) ||
      (t.deskripsi && t.deskripsi.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const countByStatus = (st) => tickets.filter((t) => t.status === st).length;

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-mono font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Segmented Status Ticker Bar Terpadu (Opsi B: 1 Baris Penuh Muat 1 Layar Tanpa Swipe) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Semua',
            value: tickets.length,
            colorScheme: 'cyan',
            isActive: filterStatus === 'SEMUA',
            onClick: () => setFilterStatus('SEMUA'),
            subLabel: 'Total Tiket'
          },
          {
            label: 'Menunggu',
            value: countByStatus('MENUNGGU'),
            colorScheme: 'amber',
            isActive: filterStatus === 'MENUNGGU',
            onClick: () => setFilterStatus(filterStatus === 'MENUNGGU' ? 'SEMUA' : 'MENUNGGU'),
            subLabel: 'Belum Ditangani'
          },
          {
            label: 'Dicek Admin',
            value: countByStatus('DICEK_ADMIN'),
            colorScheme: 'purple',
            isActive: filterStatus === 'DICEK_ADMIN',
            onClick: () => setFilterStatus(filterStatus === 'DICEK_ADMIN' ? 'SEMUA' : 'DICEK_ADMIN'),
            subLabel: 'Investigasi NOC'
          },
          {
            label: 'Diproses',
            value: countByStatus('DIPROSES'),
            colorScheme: 'cyan',
            isActive: filterStatus === 'DIPROSES',
            onClick: () => setFilterStatus(filterStatus === 'DIPROSES' ? 'SEMUA' : 'DIPROSES'),
            subLabel: 'Teknisi'
          },
          {
            label: 'Selesai',
            value: countByStatus('SELESAI'),
            colorScheme: 'emerald',
            isActive: filterStatus === 'SELESAI',
            onClick: () => setFilterStatus(filterStatus === 'SELESAI' ? 'SEMUA' : 'SELESAI'),
            subLabel: 'Tuntas'
          }
        ]}
      />

      {/* 2. Search Bar & Aksi */}
      <FilterContainer>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor tiket, nama warga, ID pelanggan, atau kategori kendala..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[36px] flex items-center justify-center"
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </FilterContainer>

      {/* 4. Tabel Tiket (Sorting Aktif, Tanpa Checkbox Sesuai SOP) */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3 w-12 text-center">No</th>
              <th
                onClick={() => handleSort('id_tiket')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>No. Tiket / Waktu</span>
                  {sortField === 'id_tiket' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('nama_pelanggan')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Pelanggan</span>
                  {sortField === 'nama_pelanggan' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('kategori')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Kategori Kendala</span>
                  {sortField === 'kategori' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3">Deskripsi Keluhan</th>
              <th
                onClick={() => handleSort('redaman_saat_lapor')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-cyan-100/70 transition select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Rx Saat Lapor</span>
                  {sortField === 'redaman_saat_lapor' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-700" /> : <ArrowDown className="w-3 h-3 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>
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
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat daftar tiket keluhan...</div>
                </td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada tiket keluhan ditemukan.
                </td>
              </tr>
            ) : (
              filteredTickets.map((t, idx) => (
                <tr key={t.id_tiket} className="hover:bg-cyan-50/40 transition">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-cyan-900">{t.id_tiket}</div>
                    <div className="text-[10px] text-slate-400">{t.created_at_str}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    {onNavigateCustomer && t.nama_pelanggan ? (
                      <button
                        type="button"
                        onClick={() => onNavigateCustomer(t.nama_pelanggan)}
                        className="font-sans font-bold text-cyan-800 hover:text-cyan-950 hover:underline text-left cursor-pointer transition block"
                        title={`Lihat detail ${t.nama_pelanggan} di Data Pelanggan`}
                      >
                        {t.nama_pelanggan}
                      </button>
                    ) : (
                      <div className="font-sans font-bold text-slate-900">{t.nama_pelanggan}</div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono">
                      {t.id_pelanggan} {t.no_wa && `• WA: ${t.no_wa}`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold font-mono">
                      {t.kategori}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 max-w-xs">
                    <div className="line-clamp-2">{t.deskripsi || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black">
                    <span className={t.redaman_saat_lapor <= -27 ? 'text-rose-600' : 'text-slate-700'}>
                      {t.redaman_saat_lapor != null ? `${t.redaman_saat_lapor.toFixed(1)} dBm` : '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        t.status === 'MENUNGGU'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : t.status === 'DICEK_ADMIN'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : t.status === 'DIPROSES'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {/* Menu Titik Tiga / Aksi Kelola */}
                    <div className="relative inline-block text-left">
                      <div className="relative group">
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                          title="Pilihan Aksi"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>

                        <div className="hidden group-hover:block hover:block absolute right-0 top-full pt-1 z-50 min-w-[170px]">
                          <div className="bg-white rounded-xl shadow-xl border border-sky-200 py-1 font-mono text-xs">
                            <button
                              onClick={() => handleOpenModal(t)}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
                              <span>Kelola Status</span>
                            </button>
                            {t.no_wa && (
                              <a
                                href={`https://wa.me/${t.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                                  `Halo Bapak/Ibu ${t.nama_pelanggan}, kami dari Tim Teknis TeknoGuard NOC terkait keluhan tiket #${t.id_tiket} (${t.kategori}): "${t.deskripsi || ''}".`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition border-t border-slate-100"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Hubungi WA</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableContainer>

      {/* Modal Kelola Status Tiket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Kelola Status Tiket</h3>
                <p className="text-[11px] text-cyan-700 font-bold">{selectedTicket.id_tiket} • {selectedTicket.nama_pelanggan}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Status Penanganan</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="MENUNGGU">MENUNGGU (Belum Diproses)</option>
                  <option value="DICEK_ADMIN">DICEK ADMIN (Investigasi Awal NOC)</option>
                  <option value="DIPROSES">DIPROSES (Teknisi Lapangan Menuju Lokasi)</option>
                  <option value="SELESAI">SELESAI (Kendala Berhasil Dituntaskan)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catatan Teknisi / Solusi</label>
                <textarea
                  rows="3"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tuliskan tindakan perbaikan atau keterangan kendala..."
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-sans font-medium focus:border-cyan-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {updating ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
