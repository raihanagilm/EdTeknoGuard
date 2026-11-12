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
import { PortalKendalaService } from '../../services/portalApi';
import { PortalActiveMascot } from '../common/PortalActiveMascot';
import { PortalHeader } from '../layout/PortalHeader';
import { PortalToastNotification } from '../common/PortalToastNotification';

export function PortalTicketsTab({ customer, dashboardData, onOpenNotifications , hasUnreadNotifications}) {
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success', title: '' });

  const showToast = (msg, type = 'success', title = '') => {
    setToast({ show: true, message: msg, type, title });
  };

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

    const targetWa = customer?.no_hp || customer?.no_wa || noWa || '';

    try {
      const res = await PortalKendalaService.create({
        kategori,
        deskripsi,
        no_wa: targetWa
      });
      if (res.ok && res.data.ok) {
        showToast('Keluhan Anda berhasil dikirim ke teknisi piket NOC!', 'success', 'Tiket Terkirim');
        setDeskripsi('');
        setShowCreateModal(false);
        fetchTickets();
      } else {
        showToast(res.data?.message || 'Gagal mengirim tiket keluhan.', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async (idTiket) => {
    setDeletingId(idTiket);
    try {
      const res = await PortalKendalaService.delete(idTiket);
      if (res.ok && res.data?.ok) {
        showToast(res.data.message || 'Tiket keluhan berhasil dihapus.', 'info', 'Tiket Dihapus');
        setTicketToDelete(null);
        fetchTickets();
      } else {
        showToast(res.data?.message || 'Gagal menghapus tiket keluhan.', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server.', 'error');
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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#EEF2F6] text-slate-900">
      {/* ═══ HEADER BIRU TERPADU DENGAN JUDUL HALAMAN AKTIF ═══ */}
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        title="Pusat Kendala & Keluhan"
        subtitle="Layanan tiket gangguan teknis"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-18) ═══ */}
      <main className="scroll-area -mt-18 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3">

          {/* ═══ CARD UTAMA: ACTION BAR (BUAT TIKET + CARI) & DAFTAR TIKET ═══ */}
          <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200/90">

            {/* Bilah Aksi Utama: Tombol Buat Tiket & Ikon Visual Semantik */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    Tiket Bantuan
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    · {filteredTickets.length} laporan
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Tiket Baru</span>
              </button>
            </div>

            {/* Filter Search */}
            <div className="p-3 sm:p-3.5 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari ID tiket, kategori, atau keluhan..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                    title="Hapus Pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Ticket List */}
            <div className="border-t border-slate-100">
              {loading ? (
                <div className="p-3.5 space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2.5 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-20 h-4 bg-slate-200 rounded" />
                        <div className="w-16 h-4 bg-slate-200 rounded" />
                      </div>
                      <div className="w-3/4 h-3.5 bg-slate-200 rounded" />
                      <div className="w-1/2 h-3 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {searchQuery ? 'Tiket Tidak Ditemukan' : 'Tidak Ada Kendala Aktif'}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {searchQuery ? 'Coba cari dengan kata kunci lain.' : 'Sambungan internet Anda terpantau normal dan lancar.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paginatedTickets.map((t) => (
                    <article key={t.id_tiket} className="p-3.5 hover:bg-slate-50/60 space-y-1.5 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {t.id_tiket}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              t.status === 'SELESAI'
                                ? 'text-emerald-600'
                                : t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN'
                                ? 'text-blue-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {t.status === 'SELESAI' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN' ? (
                              <RefreshCw className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            <span>{t.status}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setTicketToDelete(t)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Laporan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{t.kategori}</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{t.deskripsi}</p>
                      <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {t.created_at?.slice(0, 16)}
                        </span>
                        {t.redaman_saat_lapor && <span className="text-[11px] font-semibold text-slate-600">Redaman: {t.redaman_saat_lapor} dBm</span>}
                      </div>
                    </article>
                  ))}
                </div>
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

          </section>

        </div>
      </main>

      {/* Modal Konfirmasi Hapus Tiket */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-sm font-black text-gray-900">Formulir Lapor Gangguan</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 transition cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
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
                  <option value="Kendala Tagihan">Kendala Tagihan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
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

      {/* Floating Toast Notification Terpadu */}
      <PortalToastNotification
        show={toast.show}
        message={toast.message}
        type={toast.type}
        title={toast.title}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

export default PortalTicketsTab;
