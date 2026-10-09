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
  User
} from 'lucide-react';
import { TicketsService } from '../services/api';
import {
  ModuleHeader,
  MetricCard,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulTiketKeluhan({ activeOffice = 'cabang' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatan, setCatatan] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

      {/* 1. Header Banner */}
      <ModuleHeader
        badge="PORTAL WARGA"
        icon={HelpCircle}
        title="Tiket Keluhan Pelanggan"
        subtitle="Daftar laporan kendala teknis dan keluhan koneksi jaringan yang dikirim melalui portal mandiri warga."
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-100/80 border border-cyan-300 text-cyan-900 font-mono text-[11px] font-bold">
            Total: {tickets.length} Tiket
          </span>
          <button
            onClick={fetchTickets}
            className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </ModuleHeader>

      {/* 2. 4 Kartu KPI Interaktif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          label="Menunggu"
          value={`${countByStatus('MENUNGGU')} Tiket`}
          icon={Clock}
          colorScheme="amber"
          isActive={filterStatus === 'MENUNGGU'}
          onClick={() => setFilterStatus(filterStatus === 'MENUNGGU' ? 'SEMUA' : 'MENUNGGU')}
          subLabel="Belum Ditangani"
        />
        <MetricCard
          label="Dicek Admin"
          value={`${countByStatus('DICEK_ADMIN')} Tiket`}
          icon={Search}
          colorScheme="purple"
          isActive={filterStatus === 'DICEK_ADMIN'}
          onClick={() => setFilterStatus(filterStatus === 'DICEK_ADMIN' ? 'SEMUA' : 'DICEK_ADMIN')}
          subLabel="Investigasi NOC"
        />
        <MetricCard
          label="Diproses"
          value={`${countByStatus('DIPROSES')} Tiket`}
          icon={AlertTriangle}
          colorScheme="cyan"
          isActive={filterStatus === 'DIPROSES'}
          onClick={() => setFilterStatus(filterStatus === 'DIPROSES' ? 'SEMUA' : 'DIPROSES')}
          subLabel="Teknisi Lapangan"
        />
        <MetricCard
          label="Selesai"
          value={`${countByStatus('SELESAI')} Tiket`}
          icon={CheckCircle2}
          colorScheme="emerald"
          isActive={filterStatus === 'SELESAI'}
          onClick={() => setFilterStatus(filterStatus === 'SELESAI' ? 'SEMUA' : 'SELESAI')}
          subLabel="Tuntas Ditangani"
        />
      </div>

      {/* 3. Search Bar */}
      <FilterContainer>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket, nama warga, ID pelanggan, atau kategori kendala..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </FilterContainer>

      {/* 4. Tabel Tiket */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3">No. Tiket / Waktu</th>
              <th className="py-2.5 px-3">Pelanggan</th>
              <th className="py-2.5 px-3">Kategori Kendala</th>
              <th className="py-2.5 px-3">Deskripsi Keluhan</th>
              <th className="py-2.5 px-3 text-right">Rx Saat Lapor</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat daftar tiket keluhan...</div>
                </td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada tiket keluhan ditemukan.
                </td>
              </tr>
            ) : (
              filteredTickets.map((t) => (
                <tr key={t.id_tiket} className="hover:bg-cyan-50/40 transition">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-cyan-900">{t.id_tiket}</div>
                    <div className="text-[10px] text-slate-400">{t.created_at_str}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-sans font-bold text-slate-900">{t.nama_pelanggan}</div>
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
                    <button
                      onClick={() => handleOpenModal(t)}
                      className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-900 border border-cyan-200 rounded-lg font-mono text-[10px] font-bold transition inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Kelola</span>
                    </button>
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
