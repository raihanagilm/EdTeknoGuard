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
import { PortalActiveMascot } from './PortalActiveMascot';

export function TabKendalaPelanggan({ customer, dashboardData }) {
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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU FULL KOTAK (PERSIS SESUAI STANDAR TEKNOCUST) ═══ */}
      <div className="shrink-0 relative overflow-hidden" style={{ background: '#2563eb' }}>
        {/* Ornamen lingkaran */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: '#3b82f6' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-4 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: '#60a5fa', opacity: 0.55 }}
        />
        <div
          className="absolute -bottom-14 -left-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: '#3b82f6', opacity: 0.7 }}
        />

        {/* Top bar: maskot + TeknoCust + bell */}
        <div className="relative px-5 pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Maskot Kiri Atas */}
            <div className="w-12 h-10 shrink-0 flex items-center justify-center overflow-visible">
              <PortalActiveMascot
                data={dashboardData || { customer }}
                className="w-12 h-10"
              />
            </div>
            {/* TeknoCust + subtitle */}
            <div className="min-w-0">
              <div className="text-[14px] font-black tracking-tight leading-none text-white">
                Tekno<span className="text-blue-200">Cust</span>
              </div>
              <div className="text-[9px] text-blue-100 mt-1 leading-tight font-medium">
                Portal Layanan Mandiri Pelanggan TeknoIndonet
              </div>
            </div>
          </div>

          {/* Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer shrink-0"
          >
            <AlertCircle className="w-4 h-4 stroke-[2.2]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full border border-blue-600 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-24 space-y-3">

          {/* Feedback Notifikasi */}
          {message && (
            <div className="px-3">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{message}</span>
                </div>
                <button onClick={() => setMessage('')} className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ CARD PUTIH LAPOR GANGGUAN (naik menimpa header) ═══ */}
          <div className="relative mx-3">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">

              {/* Card Header & Buat Tiket CTA */}
              <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-black text-gray-900 leading-tight">Lapor Gangguan</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight font-medium truncate">
                      Tiket diteruskan langsung ke Teknisi Lapangan
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition cursor-pointer shrink-0"
                  style={{ background: '#2563eb' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Tiket</span>
                </button>
              </div>

              {/* Filter Search */}
              <div className="p-4 pb-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari ID tiket, kategori, atau keluhan..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Ticket List */}
              <div className="px-4 pb-4 space-y-2.5">
                {loading ? (
                  <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Memuat daftar laporan keluhan...</span>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800">
                        {searchQuery ? 'Tiket Tidak Ditemukan' : 'Tidak Ada Kendala Aktif'}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {searchQuery ? 'Coba cari dengan kata kunci lain.' : 'Sambungan internet Anda terpantau normal dan lancar.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  paginatedTickets.map((t) => (
                    <div key={t.id_tiket} className="p-3.5 bg-gray-50 hover:bg-blue-50/50 rounded-2xl border border-gray-200 space-y-2 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
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
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Laporan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-900">{t.kategori}</div>
                      <p className="text-xs text-gray-600 leading-relaxed">{t.deskripsi}</p>
                      <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
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

              {/* Pagination Controls */}
              {!loading && filteredTickets.length > ITEMS_PER_PAGE && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-gray-500 font-mono">
                    Halaman {currentPage} dari {totalPages} ({filteredTickets.length} tiket)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition cursor-pointer"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono font-bold text-blue-700">{currentPage}</span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition cursor-pointer"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Modal Konfirmasi Hapus Tiket */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Hapus Laporan Gangguan?</h3>
              <p className="text-xs text-gray-500">
                Tiket <strong className="font-mono text-gray-800">{ticketToDelete.id_tiket}</strong> ({ticketToDelete.kategori}) akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTicket(ticketToDelete.id_tiket)}
                disabled={deletingId === ticketToDelete.id_tiket}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="max-w-md w-full bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-sm font-black text-gray-900">Formulir Lapor Gangguan</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-700 block">Kategori Kendala</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                >
                  <option value="Internet Lambat / Putus-putus">Internet Lambat / Putus-putus</option>
                  <option value="Lampu Modem Merah (LOS)">Lampu Modem Merah (LOS)</option>
                  <option value="Modem Mati Total / Tidak Menyala">Modem Mati Total / Tidak Menyala</option>
                  <option value="Jangkauan Sinyal WiFi Lemah">Jangkauan Sinyal WiFi Lemah</option>
                  <option value="Kendala Tagihan / Lainnya">Kendala Tagihan / Lainnya</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Nomor WhatsApp Pelapor</label>
                <input
                  type="text"
                  required
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Rincian Keluhan</label>
                <textarea
                  rows={3}
                  required
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Jelaskan kondisi lampu modem atau kendala yang dialami..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                  style={{ background: '#2563eb' }}
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

export default TabKendalaPelanggan;
