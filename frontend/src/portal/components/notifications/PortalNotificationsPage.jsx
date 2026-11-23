import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  CheckCheck,
  ReceiptText,
  RefreshCw
} from 'lucide-react';
import { PortalKendalaService, PortalPembayaranService } from '../../services/portalApi';
import { rupiah, periodeTeks } from '../payment/paymentUtils';

function NotificationCardItem({ item, isRead, onCardClick, onActionClick, onDelete }) {
  const getStatusColor = () => {
    switch (item.statusType) {
      case 'info':
        return 'text-blue-600';
      case 'success':
        return 'text-emerald-600';
      case 'danger':
        return 'text-rose-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <article
      onClick={() => onCardClick(item)}
      className={`p-3.5 space-y-1.5 transition-colors cursor-pointer select-none ${
        isRead
          ? 'bg-slate-50/80 hover:bg-slate-100/70 text-slate-500'
          : 'bg-white hover:bg-slate-50/40 text-slate-900 shadow-2xs'
      }`}
    >
      {/* Baris Atas: Judul Kategori & Status Bersih (Tanpa Box) + Tombol Hapus */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs truncate ${isRead ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-medium inline-flex items-center gap-1 tracking-normal ${
              isRead ? 'opacity-65' : ''
            } ${getStatusColor()}`}
          >
            {item.statusType === 'success' ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" />
            ) : item.statusType === 'info' && item.statusText !== 'MENUNGGU' ? (
              <RefreshCw className="w-3 h-3 shrink-0" />
            ) : (
              <Clock className="w-3 h-3 shrink-0" />
            )}
            <span className="capitalize">{item.statusText?.toLowerCase() || ''}</span>
          </span>

          {/* Tombol Hapus Tunggal per Notifikasi (Hanya jika bukan tagihan aktif yang belum lunas) */}
          {item.statusType !== 'danger' && (
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
          )}
        </div>
      </div>

      {/* Isi Pesan Notifikasi */}
      <p className={`text-xs leading-relaxed ${isRead ? 'text-slate-400' : 'text-slate-600 font-normal'}`}>
        {item.desc}
      </p>

      {/* Baris Bawah: Waktu & Link Aksi (Sans-serif Murni, Tanpa Fake Monospace) */}
      <div className="pt-1 flex items-center justify-between text-[11px] font-sans">
        <span className={`flex items-center gap-1 ${isRead ? 'text-slate-400' : 'text-slate-500'}`}>
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{item.timestamp}</span>
        </span>

        {item.actionText && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(item);
            }}
            className={`font-semibold inline-flex items-center gap-0.5 transition cursor-pointer font-sans ${
              isRead
                ? 'text-slate-500 hover:text-blue-600'
                : 'text-blue-600 hover:text-blue-700 hover:underline'
            }`}
            title={`Buka ${item.actionText}`}
          >
            <span>{item.actionText}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
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

  useEffect(() => {
    if (!notifToDelete && !showClearAllModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (notifToDelete) setNotifToDelete(null);
        if (showClearAllModal) setShowClearAllModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifToDelete, showClearAllModal]);
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('teknocust_deleted_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [billingData, setBillingData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      PortalKendalaService.list(),
      PortalPembayaranService.getRiwayat(5),
      PortalPembayaranService.getTagihan()
    ])
      .then(([ticketRes, paymentRes, billingRes]) => {
        if (!isMounted) return;
        if (ticketRes.status === 'fulfilled' && ticketRes.value?.ok && ticketRes.value.data?.tickets) {
          setTickets(ticketRes.value.data.tickets);
        }
        if (paymentRes.status === 'fulfilled' && paymentRes.value?.ok && paymentRes.value.data?.invoices) {
          setPayments(paymentRes.value.data.invoices);
        }
        if (billingRes.status === 'fulfilled' && billingRes.value) {
          setBillingData(billingRes.value.data || billingRes.value);
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

  const pel = { ...(customer || {}), ...(dashboardData?.customer || {}) };
  const isBelumBayar =
    pel.status_pembayaran === 'BELUM_BAYAR' ||
    pel.status_pembayaran === 'OVERDUE' ||
    pel.status_pembayaran === 'ISOLIR';

  // Bangun daftar notifikasi dengan skema monokromatik biru & slate konsisten
  const notificationList = useMemo(() => {
    const items = [];

    // Deteksi tagihan aktif langsung dari API Network Bill live (prioritas)
    const unpaidInvoices = billingData?.unpaid || [];
    const activeBill = billingData?.next_bill || (unpaidInvoices.length > 0 ? unpaidInvoices[0] : null);
    const hasLiveUnpaid = Boolean(activeBill || unpaidInvoices.length > 0);
    const hasUnpaidBill = hasLiveUnpaid || isBelumBayar || (pel.total_tagihan && pel.total_tagihan > 0) || pel.is_overdue;

    // 0. Notifikasi Pesan Pengingat Resmi dari Admin NOC
    if (pel.billing_reminder && hasUnpaidBill) {
      items.push({
        id: pel.billing_reminder.id,
        category: 'BILLING',
        title: 'Pengingat Tagihan Internet (NOC)',
        desc: pel.billing_reminder.pesan,
        timestamp: pel.billing_reminder.waktu,
        actionText: 'Bayar Sekarang',
        actionTab: 'pembayaran',
        actionSubTab: 'tagihan',
        statusText: pel.status_pembayaran || 'Belum bayar',
        statusType: 'danger'
      });
    }

    // 1. Notifikasi Pengingat Tagihan Harian (Setiap Hari Pukul 10:00 WIB sampai lunas)
    if (hasUnpaidBill && !pel.billing_reminder) {
      const nominalValue = activeBill?.total || billingData?.unpaid_total || pel.total_tagihan || pel.harga_paket;
      const hargaFormatted = nominalValue
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nominalValue)
        : 'Rp -';

      let periodeLabel = 'bulan ini';
      if (activeBill?.billing_period) {
        periodeLabel = periodeTeks(activeBill.billing_period);
      } else if (pel.periode_tagihan) {
        periodeLabel = pel.periode_tagihan.includes('-') ? periodeTeks(pel.periode_tagihan) : pel.periode_tagihan;
      }

      // Tanggal hari ini format YYYY-MM-DD
      const now = new Date();
      const todayDateStr = now.toISOString().slice(0, 10);
      const isPastTenAM = now.getHours() >= 10;
      const reminderTimeLabel = isPastTenAM ? 'Hari ini, 10:00' : 'Kemarin, 10:00';
      const isOverdue = Boolean(activeBill?.overdue || pel.is_overdue || pel.status_pembayaran === 'OVERDUE');

      items.push({
        // ID berganti per hari (todayDateStr) sehingga pengingat selalu sinkron tiap hari pukul 10:00
        id: `billing-unpaid-${pel.id_pelanggan || 'cust'}-${todayDateStr}`,
        category: 'BILLING',
        title: 'Pengingat Tagihan Belum Dibayar',
        desc: `Tagihan internet periode ${periodeLabel} (${hargaFormatted}) belum dibayar. Mohon segera melakukan pembayaran tagihan internet bulanan Anda.`,
        timestamp: reminderTimeLabel,
        actionText: 'Bayar Sekarang',
        actionTab: 'pembayaran',
        actionSubTab: 'tagihan',
        statusText: isOverdue ? 'Terlambat' : 'Belum bayar',
        statusType: 'danger'
      });
    } else if (!hasUnpaidBill && !pel.billing_reminder) {
      const periodeLabel = pel.periode_tagihan
        ? (pel.periode_tagihan.includes('-') ? periodeTeks(pel.periode_tagihan) : pel.periode_tagihan)
        : 'bulan ini';

      items.push({
        id: `billing-paid-${pel.periode_tagihan || 'current'}`,
        category: 'BILLING',
        title: 'Tagihan Lunas Terverifikasi',
        desc: `Iuran internet periode ${periodeLabel} sudah lunas dan aktif lancar.`,
        timestamp: 'Periode aktif',
        actionText: 'Lihat Detail',
        actionTab: 'pembayaran',
        actionSubTab: 'tagihan',
        statusText: 'Lunas',
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
      let statusType = 'info';
      let desc = `Laporan #${t.id_tiket} (${t.kategori || 'Gangguan'}): ${t.deskripsi || 'Menunggu penanganan tim teknisi.'}`;

      if (isSelesai) {
        statusType = 'success';
      } else if (t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN' || t.status === 'MENUNGGU') {
        statusType = 'info';
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
  }, [isBelumBayar, pel, tickets, payments, billingData, deletedIds]);

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

  const handleToggleRead = (item) => {
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
  };

  const handleActionNavigate = (item) => {
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
            {/* Action Bar Kanan Atas (Tandai Dibaca & Hapus Dibaca) */}
            {(notificationList.some((it) => !readIds.includes(it.id)) || notificationList.some((it) => readIds.includes(it.id))) && (
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-end gap-3 bg-white">
                {notificationList.some((it) => !readIds.includes(it.id)) && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-blue-600 hover:text-blue-700 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer py-0.5"
                    title="Tandai seluruh pemberitahuan sebagai sudah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Tandai Dibaca</span>
                  </button>
                )}

                {notificationList.some((it) => !readIds.includes(it.id)) && notificationList.some((it) => readIds.includes(it.id)) && (
                  <span className="w-px h-3 bg-slate-200" aria-hidden="true" />
                )}

                {notificationList.some((it) => readIds.includes(it.id)) && (
                  <button
                    type="button"
                    onClick={handleClearReadNotifications}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer py-0.5"
                    title="Hapus seluruh pemberitahuan yang sudah dibaca"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Hapus Dibaca</span>
                  </button>
                )}
              </div>
            )}

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
                      onCardClick={handleToggleRead}
                      onActionClick={handleActionNavigate}
                      onDelete={(it) => setNotifToDelete(it)}
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
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotifToDelete(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-notification-title"
            className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 id="delete-notification-title" className="text-sm font-bold text-gray-900">Hapus Pemberitahuan Ini?</h3>
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
                Tidak (Esc)
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
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClearAllModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-all-notifications-title"
            className="max-w-sm w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 id="clear-all-notifications-title" className="text-sm font-bold text-gray-900">Hapus Semua Notifikasi?</h3>
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
                Batal (Esc)
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
