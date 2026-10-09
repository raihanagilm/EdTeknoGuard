import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageCircle,
  X
} from 'lucide-react';
import { PortalKendalaService } from '../services/portalApi';

export function TabKendalaPelanggan({ customer }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Form State
  const [kategori, setKategori] = useState('Internet Lambat / Putus-putus');
  const [deskripsi, setDeskripsi] = useState('');
  const [noWa, setNoWa] = useState(customer?.no_hp || '');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await PortalKendalaService.list();
      if (res.ok && res.data?.tickets) {
        setTickets(res.data.tickets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await PortalKendalaService.create({
        kategori,
        deskripsi,
        no_wa: noWa
      });
      if (res.ok && res.data.ok) {
        setMessage('Keluhan Anda berhasil dikirim ke teknisi piket NOC!');
        setDeskripsi('');
        setShowCreateModal(false);
        fetchTickets();
      } else {
        setMessage(res.data?.message || 'Gagal mengirim tiket keluhan.');
      }
    } catch (err) {
      setMessage('Gagal menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async (idTiket) => {
    setDeletingId(idTiket);
    try {
      const res = await PortalKendalaService.delete(idTiket);
      if (res.ok && res.data?.ok) {
        setMessage(res.data.message || 'Tiket keluhan berhasil dihapus.');
        setTicketToDelete(null);
        fetchTickets();
      } else {
        setMessage(res.data?.message || 'Gagal menghapus tiket keluhan.');
      }
    } catch (err) {
      setMessage('Gagal menghubungi server.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search Tickets
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.id_tiket?.toLowerCase().includes(q) ||
        t.kategori?.toLowerCase().includes(q) ||
        t.deskripsi?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Master Card Lapor Gangguan */}
      <div className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs space-y-4">
        {/* Card Header & Buat Tiket CTA */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Lapor Gangguan</h2>
            <p className="text-[11px] text-slate-500">Tiket keluhan langsung diteruskan ke Teknisi Lapangan</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition active:scale-[0.98] min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tiket</span>
          </button>
        </div>

        {message && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar Filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari ID tiket, kategori, atau keluhan..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 min-h-[40px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Ticket List */}
        <div className="space-y-3 pt-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 bg-cyan-50/30 rounded-2xl border border-sky-100">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
              <span className="text-xs font-semibold">Memuat daftar laporan keluhan...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 bg-cyan-50/30 rounded-2xl border border-sky-100 text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-cyan-100/60 text-cyan-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {searchQuery ? 'Tiket Tidak Ditemukan' : 'Tidak Ada Kendala Aktif'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {searchQuery ? 'Coba cari dengan kata kunci lain.' : 'Sambungan internet Anda terpantau normal dan lancar.'}
                </p>
              </div>
            </div>
          ) : (
            paginatedTickets.map((t) => (
              <div key={t.id_tiket} className="p-4 bg-cyan-50/20 hover:bg-cyan-50/40 rounded-2xl border border-sky-100 space-y-2 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-800 bg-white px-2 py-0.5 rounded-lg border border-cyan-200">
                    {t.id_tiket}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        t.status === 'SELESAI'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {t.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTicketToDelete(t)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Hapus Laporan Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900">{t.kategori}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{t.deskripsi}</p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t.created_at?.slice(0, 16)}
                  </span>
                  {t.redaman_saat_lapor && <span>Redaman: {t.redaman_saat_lapor} dBm</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls (5 per page) */}
        {!loading && filteredTickets.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="text-[11px] text-slate-500 font-mono">
              Halaman {currentPage} dari {totalPages} ({filteredTickets.length} tiket)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-100 transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-cyan-800">{currentPage}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-100 transition"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Tiket */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-5 border border-sky-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Hapus Laporan Gangguan?</h3>
              <p className="text-xs text-slate-500">
                Tiket <strong className="font-mono text-slate-800">{ticketToDelete.id_tiket}</strong> ({ticketToDelete.kategori}) akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTicket(ticketToDelete.id_tiket)}
                disabled={deletingId === ticketToDelete.id_tiket}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {deletingId === ticketToDelete.id_tiket ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Ya, Hapus</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Tiket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-5 sm:p-6 border border-sky-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Formulir Lapor Gangguan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-700">Kategori Kendala</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
                >
                  <option value="Internet Lambat / Putus-putus">Internet Lambat / Putus-putus</option>
                  <option value="Lampu Modem Merah (LOS)">Lampu Modem Merah (LOS)</option>
                  <option value="Modem Mati Total / Tidak Menyala">Modem Mati Total / Tidak Menyala</option>
                  <option value="Jangkauan Sinyal WiFi Lemah">Jangkauan Sinyal WiFi Lemah</option>
                  <option value="Kendala Tagihan / Lainnya">Kendala Tagihan / Lainnya</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700">Nomor WhatsApp Pelapor</label>
                <input
                  type="text"
                  required
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700">Rincian Keluhan</label>
                <textarea
                  rows={3}
                  required
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Jelaskan kondisi lampu modem atau kendala yang dialami..."
                  className="w-full px-3 py-2 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Kirim Tiket</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
