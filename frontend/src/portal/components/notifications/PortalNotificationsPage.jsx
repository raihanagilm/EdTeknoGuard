import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  CheckCheck,
  ReceiptText
} from 'lucide-react';
import { PortalKendalaService, PortalPembayaranService } from '../../services/portalApi';
import { rupiah, periodeTeks } from '../payment/paymentUtils';

function NotificationCardItem({ item, isRead, onClick, onDelete }) {
  const getBadgeStyle = () => {
    switch (item.statusType) {
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/80';
    }
  };

  return (
    <article
      onClick={() => onClick(item)}
      className={`p-3.5 space-y-1.5 transition cursor-pointer select-none ${
        isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-blue-50/30 hover:bg-blue-50/50'
      }`}
    >
      {/* Baris Atas: Judul Kategori & Status Badge + Tombol Hapus */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isRead && (
            <span
              className="inline-flex items-center justify-center text-blue-600 shrink-0"
              title="Pemberitahuan baru belum dibaca"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
          <span className={`text-xs font-bold truncate ${isRead ? 'text-slate-700' : 'text-slate-900'}`}>
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase ${getBadgeStyle()}`}
          >
            {item.statusText}
          </span>

          {/* Tombol Hapus Tunggal per Notifikasi */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            title="Hapus Pemberitahuan Ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Isi Pesan Notifikasi */}
      <p className={`text-xs leading-relaxed ${isRead ? 'text-slate-500' : 'text-slate-600'}`}>
        {item.desc}
      </p>

      {/* Baris Bawah: Waktu & Link Aksi */}
      <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {item.timestamp}
        </span>

        <span
          className="font-bold text-blue-600 inline-flex items-center gap-0.5 hover:underline cursor-pointer"
        >
          <span>{item.actionText}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}

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
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('teknocust_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifToDelete, setNotifToDelete] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
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
    setLoading(true);

    Promise.allSettled([
      PortalKendalaService.list(),
      PortalPembayaranService.getRiwayat(5)
    ])
      .then(([ticketRes, paymentRes]) => {
        if (!isMounted) return;
        if (ticketRes.status === 'fulfilled' && ticketRes.value?.ok && ticketRes.value.data?.tickets) {
          setTickets(ticketRes.value.data.tickets);
        }
        if (paymentRes.status === 'fulfilled' && paymentRes.value?.ok && paymentRes.value.data?.invoices) {
          setPayments(paymentRes.value.data.invoices);
        }
      })
      .catch((err) => console.error('Gagal mengambil data notifikasi:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
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
        actionSubTab: 'tagihan',
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
        actionSubTab: 'tagihan',
        statusText: 'LUNAS',
        statusType: 'success'
      });
    }

    // 2. Struk Riwayat Transaksi Pembayaran Berhasil
    payments.forEach((inv) => {
      const timeStr = formatRelativeTime(inv.payment?.date || inv.issue_date);
      const periodeLabel = inv.billing_period ? periodeTeks(inv.billing_period) : (inv.number || 'Bulan Ini');
      const nominalStr = rupiah(inv.total);
      const metodeStr = inv.payment?.method_label || 'Lunas';

      items.push({
        id: `payment-invoice-${inv.id}`,
        category: 'PAYMENT',
        title: `Pembayaran Berhasil: ${periodeLabel}`,
        desc: `Pembayaran iuran internet sebesar ${nominalStr} (${metodeStr}) telah berhasil diverifikasi dan tercatat lunas.`,
        timestamp: timeStr,
        actionText: 'Lihat Struk',
        actionTab: 'pembayaran',
        actionSubTab: 'riwayat',
        statusText: 'LUNAS',
        statusType: 'success'
      });
    });

    // 3. Tiket Kendala Pelanggan
    tickets.forEach((t) => {
      const timeStr = formatRelativeTime(t.updated_at || t.created_at);
      const isSelesai = t.status === 'SELESAI';

      let statusLabel = t.status || 'MENUNGGU';
      let statusType = 'warning';
      let desc = `Laporan #${t.id_tiket} (${t.kategori || 'Gangguan'}): ${t.deskripsi || 'Menunggu penanganan tim teknisi.'}`;

      if (isSelesai) {
        statusType = 'success';
      } else if (t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN') {
        statusType = 'info';
      } else if (t.status === 'MENUNGGU') {
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
  }, [isBelumBayar, pel, tickets, payments, deletedIds]);

  const handleMarkAllAsRead = () => {
    const allIds = notificationList.map((n) => n.id);
    const next = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(next);
    try {
      localStorage.setItem('teknocust_read_notifications', JSON.stringify(next));
      window.dispatchEvent(new Event('teknocust_notifications_updated'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearReadNotifications = () => {
    setShowClearAllModal(true);
  };

  const handleConfirmClearAll = () => {
    const readItems = notificationList.filter((it) => readIds.includes(it.id));
    if (readItems.length > 0) {
      const readItemIds = readItems.map((it) => it.id);
      const next = Array.from(new Set([...deletedIds, ...readItemIds]));
      setDeletedIds(next);
      try {
        localStorage.setItem('teknocust_deleted_notifications', JSON.stringify(next));
        window.dispatchEvent(new Event('teknocust_notifications_updated'));
      } catch (err) {
        console.error(err);
      }
    }
    setShowClearAllModal(false);
  };

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
      window.dispatchEvent(new Event('teknocust_notifications_updated'));
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
        window.dispatchEvent(new Event('teknocust_notifications_updated'));
      } catch (e) {
        console.error(e);
      }
    }
    if (onNavigate && item.actionTab) {
      onNavigate(item.actionTab, item.actionSubTab);
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#EEF2F6] text-slate-900">
      {/* ═══ HEADER BIRU TERPADU DENGAN TEKSTUR VISUAL KAYA & UKURAN KONSISTEN ═══ */}
      <div className="shrink-0 relative z-0 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 border-b border-blue-700/60 overflow-hidden">
        {/* Elemen Tekstur Visual: Gelombang Sinyal, Network Nodes & Serat Optik */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
          {/* Lingkaran Gelombang Radar/WiFi Konsentris di Kanan Atas */}
          <svg
            className="absolute -top-16 -right-16 w-64 h-64 text-white opacity-[0.16]"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle cx="120" cy="120" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="120" cy="120" r="55" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="120" cy="120" r="85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
            <circle cx="120" cy="120" r="115" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          {/* Jaringan Simpul Koneksi & Garis Data di Kiri & Tengah */}
          <svg
            className="absolute top-2 left-16 w-56 h-28 text-white opacity-[0.14]"
            viewBox="0 0 220 110"
            fill="none"
          >
            <line x1="20" y1="40" x2="70" y2="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
            <line x1="70" y1="20" x2="130" y2="50" stroke="currentColor" strokeWidth="1.2" />
            <line x1="130" y1="50" x2="190" y2="25" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="70" y1="20" x2="80" y2="85" stroke="currentColor" strokeWidth="1.2" />
            <line x1="80" y1="85" x2="150" y2="90" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
            <line x1="130" y1="50" x2="150" y2="90" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="20" cy="40" r="2.5" fill="currentColor" />
            <circle cx="70" cy="20" r="3.5" fill="currentColor" />
            <circle cx="130" cy="50" r="3" fill="currentColor" />
            <circle cx="190" cy="25" r="2.5" fill="currentColor" />
            <circle cx="80" cy="85" r="2.5" fill="currentColor" />
            <circle cx="150" cy="90" r="3" fill="currentColor" />
          </svg>

          {/* Garis Gelombang Aliran Data Optik Bertingkat di Bagian Bawah */}
          <svg
            className="absolute -bottom-4 left-0 w-full h-24 text-white opacity-[0.12]"
            viewBox="0 0 400 90"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M-20 60 C 80 15, 180 85, 280 35 C 340 10, 390 60, 440 40"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {/* Dual Ambient Lighting Mesh */}
          <div className="absolute -top-10 right-4 w-36 h-36 bg-blue-300/25 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-10 left-10 w-28 h-28 bg-indigo-400/15 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="relative px-4 sm:px-5 pt-4 pb-20 sm:pb-22 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="Kembali"
              className="w-10 h-10 rounded-xl bg-blue-700/70 hover:bg-blue-700 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                Pusat Notifikasi
              </h1>
              <p className="text-xs font-medium text-white/95 mt-0.5 leading-snug break-words">
                Pemberitahuan &amp; riwayat aktivitas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-18) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-18 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3">
          {/* Card Utama Pembungkus List (Sesuai Styling Kartu Menu Lain) */}
          <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200/90">
            {/* Action & Filter Bar dengan Ikon Semantik */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    Semua Pemberitahuan
                  </span>
                  {notificationList.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal">
                      · {notificationList.length} pesan
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {notificationList.some((it) => !readIds.includes(it.id)) && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                    title="Tandai seluruh pemberitahuan sebagai sudah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tandai Dibaca</span>
                  </button>
                )}

                {notificationList.some((it) => readIds.includes(it.id)) && (
                  <button
                    type="button"
                    onClick={handleClearReadNotifications}
                    className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                    title="Hapus seluruh pemberitahuan yang sudah dibaca"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Dibaca</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Notifikasi */}
            <div className="divide-y divide-slate-100">
              {loading && notificationList.length === 0 ? (
                <div className="p-3.5 space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2.5 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-24 h-4 bg-slate-200 rounded" />
                        <div className="w-16 h-4 bg-slate-200 rounded" />
                      </div>
                      <div className="w-3/4 h-3.5 bg-slate-200 rounded" />
                      <div className="w-1/2 h-3 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : notificationList.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Tidak Ada Notifikasi
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Semua pemberitahuan sudah dibersihkan atau belum ada kendala baru.
                    </p>
                  </div>
                </div>
              ) : (
                notificationList.map((item) => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <NotificationCardItem
                      key={item.id}
                      item={item}
                      isRead={isRead}
                      onClick={handleItemClick}
                      onDelete={(it) => {
                        const next = [...deletedIds, it.id];
                        setDeletedIds(next);
                        try {
                          localStorage.setItem('teknocust_deleted_notifications', JSON.stringify(next));
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
      {/* Modal Konfirmasi Hapus Notifikasi Tunggal */}
      {notifToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
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

      {/* Modal Konfirmasi Hapus Semua Notifikasi yang Sudah Dibaca */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Hapus Semua Notifikasi?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Seluruh pemberitahuan yang sudah dibaca akan dihapus dari daftar Anda.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalNotificationsPage;
