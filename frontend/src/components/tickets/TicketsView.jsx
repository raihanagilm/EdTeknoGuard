import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowDown,
  KeyRound,
  X
} from 'lucide-react';
import { TicketsService } from '../../services/api';
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from '../common/CommonUI';
import { DesktopTableSkeleton, MobileCardStackSkeleton } from '../common/DeviceAdaptiveSkeleton';
import { ToastNotification } from '../common/ToastNotification';

export function TicketsView({ activeOffice = 'cabang', currentUser = { role: 'super admin' }, onNavigateCustomer, initialSearch = '', onClearInitialSearch }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [search, setSearch] = useState(initialSearch || '');

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      if (onClearInitialSearch) onClearInitialSearch();
    }
  }, [initialSearch]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatan, setCatatan] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sortField, setSortField] = useState('id_tiket');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const fetchTickets = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await TicketsService.list(filterStatus);
      if (res.ok && res.data) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      if (!isSilent) {
        console.error('Gagal mengambil data tiket:', err);
        showToast('Gagal memuat daftar tiket', 'error');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(false);
    setPage(1);
    setActiveMenuId(null);
    setMenuAnchor(null);

    // Auto-refresh silent setiap 5 detik agar tiket baru langsung muncul tanpa reload browser
    const pollInterval = setInterval(() => {
      fetchTickets(true);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [filterStatus, activeOffice]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleCloseMenu = () => {
      setActiveMenuId(null);
      setMenuAnchor(null);
    };
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('resize', handleCloseMenu);
    return () => {
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('resize', handleCloseMenu);
    };
  }, [activeMenuId]);

  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status || 'MENUNGGU');
    setCatatan(ticket.catatan_teknisi || '');
  };

  const handleQuickStatusChange = async (ticket, nextStatus) => {
    if (nextStatus === 'SELESAI') {
      // Buka modal agar teknisi dapat melengkapi catatan solusi sebelum tiket ditutup
      handleOpenModal({ ...ticket, status: nextStatus });
      return;
    }

    try {
      const res = await TicketsService.updateStatus(ticket.id_tiket, nextStatus, ticket.catatan_teknisi || '');
      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message || `Status #${ticket.id_tiket} berhasil diubah ke ${nextStatus}`);
        setTickets(prev => prev.map(item => item.id_tiket === ticket.id_tiket ? { ...item, status: nextStatus } : item));
      } else {
        showToast(res.data?.message || 'Gagal mengubah status tiket', 'error');
        fetchTickets();
      }
    } catch (err) {
      console.error('Gagal update status tiket:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
      fetchTickets();
    }
  };


  const isSuperAdminOrAdmin = currentUser?.role === 'super admin' || currentUser?.role === 'admin';

  const handleSendResetPasswordWA = async (t) => {
    const cleanWa = t.no_wa ? t.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const match = t.deskripsi?.match(/(?:Kata Sandi Baru.*?|password.*?):?\s*(\d{6})/i);
    const newPass = match ? match[1] : null;

    if (!cleanWa || !newPass) {
      showToast('Nomor WhatsApp atau kata sandi baru tidak valid', 'error');
      return;
    }

    const waText = `Halo Bapak/Ibu ${t.nama_pelanggan || 'Pelanggan'} (${t.id_pelanggan || '-'}),\n\nPermintaan reset kata sandi akun MyTekno Anda telah diproses oleh Tim Admin NOC.\n\nKata Sandi Baru Anda: *${newPass}*\n\nSilakan masuk ke aplikasi menggunakan Nomor WhatsApp dan kata sandi baru tersebut. Terima kasih.`;
    const waUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`;

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank');

    // Jika status saat ini MENUNGGU atau belum SELESAI, otomatis update status tiket jadi SELESAI
    if (t.status !== 'SELESAI') {
      try {
        const res = await TicketsService.updateStatus(t.id_tiket, 'SELESAI', 'Kata sandi baru telah dikirimkan ke WhatsApp pelanggan.');
        if (res.ok && res.data && res.data.status === 'success') {
          showToast('Kata sandi dikirim & status tiket selesai!', 'success');
          if (selectedTicket && selectedTicket.id_tiket === t.id_tiket) {
            setSelectedTicket(null);
          }
          fetchTickets();
        }
      } catch (err) {
        console.error('Gagal update status tiket selesai otomatis:', err);
      }
    }
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

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / limit));
  const paginatedTickets = filteredTickets.slice((page - 1) * limit, page * limit);

  const countByStatus = (st) => tickets.filter((t) => t.status === st).length;

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('');
                  setPage(1);
                }
              }}
              placeholder="Cari nomor tiket, nama warga, ID pelanggan, atau kategori kendala..."
              className="w-full pl-8 pr-8 py-1.5 sm:py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 sm:top-2.5 pointer-events-none" />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                title="Hapus pencarian (Esc)"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
      <DataTableContainer
        page={page}
        totalPages={totalPages}
        totalCount={filteredTickets.length}
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
        {/* Tampilan Mobile: Dense Streamline Micro-Card (Hemat Ruang & Bebas Truncate) */}
        <div className="block md:hidden p-2 sm:p-2.5 space-y-1.5">
          {loading ? (
            <MobileCardStackSkeleton count={4} type="ticket" />
          ) : paginatedTickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 font-mono text-xs">
              Tidak ada tiket keluhan ditemukan.
            </div>
          ) : (
            paginatedTickets.map((t, idx) => {
              const rowNo = (page - 1) * limit + idx + 1;
              const statusColor =
                t.status === 'MENUNGGU'
                  ? 'text-amber-700'
                  : t.status === 'DICEK_ADMIN'
                  ? 'text-purple-700'
                  : t.status === 'DIPROSES'
                  ? 'text-cyan-700'
                  : 'text-emerald-700';

              const cleanWa = t.no_wa ? t.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
              const waText = `Halo Bapak/Ibu ${t.nama_pelanggan}, kami dari Tim Teknis TeknoGuard NOC terkait keluhan tiket #${t.id_tiket} (${t.kategori}): "${t.deskripsi || ''}".`;

              return (
                <div
                  key={`mobile-tkt-${t.id_tiket}`}
                  className="bg-white rounded-xl border border-sky-200/80 p-2.5 font-mono transition shadow-2xs hover:border-cyan-300 space-y-1.5"
                >
                  {/* Baris 1: ID Tiket, Waktu Cek, Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs min-w-0">
                      <span className="text-slate-400 font-bold shrink-0">#{rowNo}</span>
                      <span className="font-bold text-cyan-900 shrink-0">{t.id_tiket}</span>
                      <span className="text-slate-300 shrink-0">•</span>
                      <span className="text-slate-500 font-mono text-[11px] truncate flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span>{t.created_at_str}</span>
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      <select
                        value={t.status || 'MENUNGGU'}
                        onChange={(e) => handleQuickStatusChange(t, e.target.value)}
                        className={`text-[11px] font-semibold uppercase rounded-md px-2 py-0.5 bg-white border border-[#CCDDF0] hover:border-[#026AA7] focus:outline-none focus:ring-2 focus:ring-[#026AA7]/20 focus:border-[#026AA7] transition cursor-pointer shadow-2xs font-sans ${
                          t.status === 'SELESAI' ? 'text-emerald-700 font-bold' : 'text-[#0B2545]'
                        }`}
                        title="Ubah status penanganan langsung"
                      >
                        <option value="MENUNGGU" className="bg-white text-[#0B2545]">MENUNGGU</option>
                        <option value="DICEK_ADMIN" className="bg-white text-[#0B2545]">DICEK ADMIN</option>
                        <option value="DIPROSES" className="bg-white text-[#0B2545]">DIPROSES</option>
                        <option value="SELESAI" className="bg-white text-emerald-700 font-bold">SELESAI</option>
                      </select>
                    </div>
                  </div>

                  {/* Baris 2: Nama Pelanggan & Rx Saat Lapor */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="min-w-0">
                      {onNavigateCustomer && t.nama_pelanggan ? (
                        <button
                          type="button"
                          onClick={() => onNavigateCustomer(t.nama_pelanggan)}
                          className="font-sans font-bold text-xs sm:text-sm text-cyan-800 hover:text-cyan-950 hover:underline text-left cursor-pointer transition truncate block"
                          title={`Lihat detail ${t.nama_pelanggan} di Data Pelanggan`}
                        >
                          {t.nama_pelanggan}
                        </button>
                      ) : (
                        <div className="font-sans font-bold text-xs sm:text-sm text-slate-900 truncate">{t.nama_pelanggan}</div>
                      )}
                    </div>

                    <div className="shrink-0 text-right text-[11px] font-mono">
                      <span className="text-slate-400">Rx: </span>
                      <span className={`font-black ${t.redaman_saat_lapor <= -27 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {t.redaman_saat_lapor != null ? `${t.redaman_saat_lapor.toFixed(1)} dBm` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Baris 3: ID Pelanggan & WA (Satu baris penuh, bebas truncate) */}
                  <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-cyan-900">{t.id_pelanggan}</span>
                    {t.no_wa && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-medium font-sans flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{t.no_wa}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Baris 4: Kategori chip + Cuplikan deskripsi keluhan */}
                  <div className="text-xs font-sans text-slate-700 leading-snug pt-0.5">
                    <span
                      className={`inline-block text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md mr-1.5 align-middle ${
                        t.kategori === 'RESET_PASSWORD'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.kategori}
                    </span>
                    <span className="align-middle text-slate-600 text-[11px]">
                      {t.deskripsi || '-'}
                    </span>
                  </div>

                  {/* Baris 5: Action Bar Ramping (Tinggi 32px) */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2">
                    {t.kategori === 'RESET_PASSWORD' ? (
                      isSuperAdminOrAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleSendResetPasswordWA(t)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold shadow-xs transition cursor-pointer min-h-[32px]"
                          title="Kirim Kata Sandi Baru langsung ke WhatsApp Pelanggan dan selesaikan tiket"
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>Kirim Sandi Baru (WA)</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 italic py-0.5">
                          Hanya Admin / Super Admin
                        </span>
                      )
                    ) : (
                      <>
                        {cleanWa ? (
                          <a
                            href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1 px-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[32px]"
                            title="Hubungi Pelanggan via WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Hubungi WA</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic py-1 flex-1 text-center">WA Tidak Tersedia</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenModal(t)}
                          className="py-1 px-2.5 border border-cyan-200 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 min-h-[32px] cursor-pointer shrink-0"
                          title="Lihat atau edit catatan teknisi"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Catatan</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tampilan Desktop: Tabel Standar */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3 w-12 text-center whitespace-nowrap">No</th>
              <th
                onClick={() => handleSort('id_tiket')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>No. Tiket / Waktu</span>
                  {sortField === 'id_tiket' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('nama_pelanggan')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Pelanggan</span>
                  {sortField === 'nama_pelanggan' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('kategori')}
                className="py-2.5 px-3 cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Kategori Kendala</span>
                  {sortField === 'kategori' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Deskripsi Keluhan</th>
              <th
                onClick={() => handleSort('redaman_saat_lapor')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-cyan-100/70 transition select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Rx Saat Lapor</span>
                  {sortField === 'redaman_saat_lapor' ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-700" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-700" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
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
              <th className="py-2.5 px-3 text-right whitespace-nowrap w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <DesktopTableSkeleton rows={Math.min(limit || 5, 8)} colCount={8} type="ticket" />
            ) : paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada tiket keluhan ditemukan.
                </td>
              </tr>
            ) : (
              paginatedTickets.map((t, idx) => (
                <tr key={t.id_tiket} className="hover:bg-cyan-50/40 transition">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-bold text-xs">{(page - 1) * limit + idx + 1}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-cyan-900">{t.id_tiket}</div>
                    <div className="text-xs text-slate-600 font-mono">{t.created_at_str}</div>
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
                    <div className="text-xs text-slate-600 font-mono">
                      {t.id_pelanggan} {t.no_wa && `• WA: ${t.no_wa}`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block text-xs font-bold font-mono ${t.kategori === 'RESET_PASSWORD' ? 'text-amber-700' : 'text-slate-700'}`}
                    >
                      {t.kategori}
                    </span>
                  </td>
                                    <td className="py-2.5 px-3 font-sans text-slate-600 max-w-xs">
                    {t.kategori === 'RESET_PASSWORD' ? (
                      <div>
                        {isSuperAdminOrAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleSendResetPasswordWA(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold shadow-xs transition cursor-pointer"
                            title="Kirim Kata Sandi Baru langsung ke WhatsApp Pelanggan dan selesaikan tiket"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>Kirim Sandi Baru</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 italic">
                            Hanya Admin / Super Admin
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="line-clamp-2 text-xs">{t.deskripsi || '-'}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black">
                    <span className={t.redaman_saat_lapor <= -27 ? 'text-rose-600' : 'text-slate-700'}>
                      {t.redaman_saat_lapor != null ? `${t.redaman_saat_lapor.toFixed(1)} dBm` : '-'}
                    </span>
                  </td>
                  {/* Kolom STATUS: Langsung Dropdown Inline Interaktif Sesuai Tema */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <select
                        value={t.status || 'MENUNGGU'}
                        onChange={(e) => handleQuickStatusChange(t, e.target.value)}
                        className={`text-xs font-semibold uppercase rounded-lg px-2.5 py-1 bg-white border border-[#CCDDF0] hover:border-[#026AA7] focus:outline-none focus:ring-2 focus:ring-[#026AA7]/20 focus:border-[#026AA7] transition cursor-pointer shadow-2xs font-sans ${
                          t.status === 'SELESAI' ? 'text-emerald-700 font-bold' : 'text-[#0B2545]'
                        }`}
                        title="Klik untuk ubah status penanganan langsung"
                      >
                        <option value="MENUNGGU" className="bg-white text-[#0B2545]">MENUNGGU</option>
                        <option value="DICEK_ADMIN" className="bg-white text-[#0B2545]">DICEK ADMIN</option>
                        <option value="DIPROSES" className="bg-white text-[#0B2545]">DIPROSES</option>
                        <option value="SELESAI" className="bg-white text-emerald-700 font-bold">SELESAI</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(t)}
                        className="p-1 rounded-lg text-[#64839E] hover:text-[#026AA7] hover:bg-[#F1F6FC] border border-transparent hover:border-[#CCDDF0] transition cursor-pointer"
                        title={t.catatan_teknisi ? `Catatan: ${t.catatan_teknisi}` : 'Catatan Solusi / Detail Penanganan'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Kolom AKSI: Tombol Hubungi WA Langsung (Tanpa Titik Tiga) */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {t.kategori === 'RESET_PASSWORD' ? (
                      <span className="text-slate-400 font-mono text-xs">-</span>
                    ) : (() => {
                      const cleanWa = t.no_wa ? t.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
                      const waText = `Halo Bapak/Ibu ${t.nama_pelanggan}, kami dari Tim Teknis TeknoGuard NOC terkait keluhan tiket #${t.id_tiket} (${t.kategori}): "${t.deskripsi || ''}".`;

                      return cleanWa ? (
                        <a
                          href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition shadow-2xs"
                          title={`Hubungi ${t.nama_pelanggan} (${t.no_wa}) via WhatsApp`}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                          <span>Hubungi WA</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </DataTableContainer>

      {/* Modal Kelola Status Tiket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Kelola Status Tiket</h3>
                <p className="text-[11px] text-cyan-700 font-bold">{selectedTicket.id_tiket} • {selectedTicket.nama_pelanggan}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
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
