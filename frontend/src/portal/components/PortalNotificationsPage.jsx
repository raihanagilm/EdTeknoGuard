import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { PortalKendalaService } from '../services/portalApi';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Baru saja';
  try {
    const d = new Date(dateString.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateString;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return 'Kemarin';
    if (diffDay < 7) return `${diffDay} hari lalu`;

    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function PortalNotificationsPage({
  customer,
  dashboardData,
  onBack,
  onNavigate
}) {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('teknocust_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifToDelete, setNotifToDelete] = useState(null);
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('teknocust_deleted_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    setLoadingTickets(true);
    PortalKendalaService.list()
      .then((res) => {
        if (isMounted && res.ok && res.data?.tickets) {
          setTickets(res.data.tickets);
        }
      })
      .catch((err) => console.error('Gagal mengambil tiket untuk notifikasi:', err))
      .finally(() => {
        if (isMounted) setLoadingTickets(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const pel = customer || dashboardData?.customer || {};
  const isBelumBayar = pel.status_pembayaran === 'BELUM_BAYAR';

  // Bangun daftar notifikasi dengan skema monokromatik biru & slate konsisten
  const notificationList = useMemo(() => {
    const items = [];

    // 1. Notifikasi Pengingat Tagihan Harian (Setiap Hari Pukul 10:00 WIB sampai lunas)
    if (isBelumBayar) {
      const hargaFormatted = pel.harga_paket
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pel.harga_paket)
        : 'Rp -';

      // Tanggal hari ini format YYYY-MM-DD
      const now = new Date();
      const todayDateStr = now.toISOString().slice(0, 10);
      const isPastTenAM = now.getHours() >= 10;
      const reminderTimeLabel = isPastTenAM ? 'Hari ini, 10:00' : 'Kemarin, 10:00';

      items.push({
        // ID berganti per hari (todayDateStr) sehingga jika dihapus hari ini, besok jam 10:00 akan muncul notifikasi pengingat baru lagi
        id: `billing-unpaid-${pel.id_pelanggan || 'cust'}-${todayDateStr}`,
        category: 'BILLING',
        title: 'Pengingat Tagihan Belum Dibayar',
        desc: `Tagihan internet periode ${pel.periode_tagihan || 'bulan ini'} (${hargaFormatted}) belum dibayar. Mohon segera melakukan pembayaran tagihan internet bulanan Anda.`,
        timestamp: reminderTimeLabel,
        actionText: 'Bayar Sekarang',
        actionTab: 'pembayaran',
        statusText: 'BELUM BAYAR',
        statusType: 'danger'
      });
    } else {
      items.push({
        id: `billing-paid-${pel.periode_tagihan || 'current'}`,
        category: 'BILLING',
        title: 'Tagihan Lunas Terverifikasi',
        desc: `Iuran internet periode ${pel.periode_tagihan || 'bulan ini'} sudah lunas dan aktif lancar.`,
        timestamp: 'Periode aktif',
        actionText: 'Lihat Detail',
        actionTab: 'pembayaran',
        statusText: 'LUNAS',
        statusType: 'success'
      });
    }

    // 2. Tiket Kendala Pelanggan
    tickets.forEach((t) => {
      const timeStr = formatRelativeTime(t.updated_at || t.created_at);
      const isSelesai = t.status === 'SELESAI';

      let statusLabel = t.status || 'MENUNGGU';
      let statusType = 'warning';
      let desc = `Laporan #${t.id_tiket} (${t.kategori || 'Gangguan'}): ${t.deskripsi || 'Menunggu penanganan tim teknisi.'}`;

      if (isSelesai) {
        statusType = 'success';
      } else if (t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN') {
        statusType = 'warning';
      } else {
        statusType = 'danger';
      }

      items.push({
        id: `ticket-${t.id_tiket}-${t.status}`,
        category: 'TICKET',
        title: `Kendala: ${t.kategori || 'Gangguan'}`,
        desc: desc,
        timestamp: timeStr,
        actionText: 'Lihat Tiket',
        actionTab: 'kendala',
        statusText: statusLabel,
        statusType: statusType
      });
    });

    return items.filter((item) => !deletedIds.includes(item.id));
  }, [isBelumBayar, pel, tickets, deletedIds]);

// Saat halaman notifikasi dibuka, tandai semua notifikasi aktif sebagai sudah dibaca
  useEffect(() => {
    if (notificationList.length > 0) {
      const allIds = notificationList.map((n) => n.id);
      const unread = allIds.filter((id) => !readIds.includes(id));
      if (unread.length > 0) {
        const next = Array.from(new Set([...readIds, ...allIds]));
        setReadIds(next);
        try {
          localStorage.setItem('teknocust_read_notifications', JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [notificationList]);

  const handlePromptDelete = (e, item) => {
    e.stopPropagation();
    setNotifToDelete(item);
  };

  const handleConfirmDelete = () => {
    if (!notifToDelete) return;
    const next = [...deletedIds, notifToDelete.id];
    setDeletedIds(next);
    try {
      localStorage.setItem('teknocust_deleted_notifications', JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
    setNotifToDelete(null);
  };

  const handleItemClick = (item) => {
    if (!readIds.includes(item.id)) {
      const next = [...readIds, item.id];
      setReadIds(next);
      try {
        localStorage.setItem('teknocust_read_notifications', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
    }
    if (onNavigate && item.actionTab) {
      onNavigate(item.actionTab);
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU TERPADU DENGAN TOMBOL KEMBALI (PERSIS TAB LAIN) ═══ */}
      <div className="shrink-0 relative z-0" style={{ background: '#2563eb' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-bl-full"
            style={{ background: '#3b82f6', opacity: 0.6 }}
          />
          <div
            className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full"
            style={{ background: '#3b82f6', opacity: 0.4 }}
          />
        </div>

        <div className="relative px-5 pt-4 pb-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="Kembali"
              className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="portal-heading font-black tracking-tight leading-none text-white truncate">
                Pusat Notifikasi
              </h1>
              <p className="portal-subheading text-white/95 mt-0.5 sm:mt-1 leading-tight truncate">
                Pemberitahuan tiket kendala &amp; status tagihan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="pb-24 space-y-3">
          {/* Card Utama Pembungkus List (Sesuai Styling Kartu Menu Lain) */}
          <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
            {/* Header Card Section */}
            <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-black text-gray-900 leading-tight">Daftar Pemberitahuan</div>
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-tight font-medium">
                    Aktivitas layanan &amp; laporan terbaru Anda
                  </div>
                </div>
              </div>

              {notificationList.length > 0 && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {notificationList.length} Notif
                </span>
              )}
            </div>

            {/* List Notifikasi */}
            <div className="p-4 space-y-3">
              {loadingTickets && tickets.length === 0 ? (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-24 h-4 bg-gray-200 rounded" />
                        <div className="w-16 h-4 bg-gray-200 rounded" />
                      </div>
                      <div className="w-3/4 h-3.5 bg-gray-200 rounded" />
                      <div className="w-1/2 h-3 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : notificationList.length === 0 ? (
                <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">
                      Tidak Ada Notifikasi
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Semua pemberitahuan sudah dibersihkan atau belum ada kendala baru.
                    </p>
                  </div>
                </div>
              ) : (
                notificationList.map((item) => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-3.5 bg-slate-50/70 hover:bg-blue-50/40 rounded-xl border border-slate-200/80 space-y-2 transition cursor-pointer"
                    >
                      {/* Baris Atas: Judul Kategori & Status Badge + Status Dibaca + Tombol Hapus */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 animate-pulse" title="Belum dibaca" />
                          )}
                          <span className="text-[12px] font-bold text-slate-800 truncate">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-semibold tracking-wide ${
                              isRead ? 'text-slate-400' : 'text-blue-600 font-bold'
                            }`}
                          >
                            {isRead ? 'Sudah Dibaca' : 'Baru'}
                          </span>

                          <span
                            className={`text-[11px] font-bold tracking-wide ${
                              item.statusType === 'success'
                                ? 'text-emerald-600'
                                : item.statusType === 'warning'
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {item.statusText}
                          </span>

                          {/* Tombol Hapus Tunggal per Notifikasi */}
                          <button
                            type="button"
                            onClick={(e) => handlePromptDelete(e, item)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Pemberitahuan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Isi Pesan Notifikasi */}
                      <p className="portal-body-normal text-gray-700 leading-relaxed">
                        {item.desc}
                      </p>

                      {/* Baris Bawah: Waktu & Link Aksi */}
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {item.timestamp}
                        </span>

                        <span className="font-bold text-blue-600 inline-flex items-center gap-0.5 hover:underline">
                          <span>{item.actionText}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
      {/* Modal Konfirmasi Hapus Notifikasi */}
      {notifToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Hapus Pemberitahuan Ini?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pemberitahuan <strong className="text-gray-800 font-semibold">{notifToDelete.title}</strong> akan disembunyikan dari riwayat Anda.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNotifToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalNotificationsPage;
