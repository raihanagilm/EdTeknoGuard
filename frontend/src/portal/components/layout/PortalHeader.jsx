import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { PortalActiveMascot } from '../common/PortalActiveMascot';
import { checkHasUnreadNotifications } from '../../utils/notificationUtils';
import { PortalKendalaService, PortalPembayaranService } from '../../services/portalApi';

export function PortalHeader({
  title = 'MyTekno',
  subtitle = 'Portal Layanan Mandiri Pelanggan TeknoIndonet',
  dashboardData = null,
  customer = null,
  avatarInitials = null,
  greeting = null,
  showNotificationDot = null, // Jika null, otomatis dihitung dari unread
  onNotificationClick = null,
  children = null
}) {
  const pel = customer || dashboardData?.customer || null;
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      PortalKendalaService.list(),
      PortalPembayaranService.getRiwayat(5)
    ])
      .then(([ticketRes, paymentRes]) => {
        if (!isMounted) return;
        const tickets = ticketRes.status === 'fulfilled' && ticketRes.value?.ok && ticketRes.value.data?.tickets
          ? ticketRes.value.data.tickets : [];
        const payments = paymentRes.status === 'fulfilled' && paymentRes.value?.ok && paymentRes.value.data?.invoices
          ? paymentRes.value.data.invoices : [];
        const unread = checkHasUnreadNotifications(pel, tickets, payments);
        setHasUnread(unread);
      })
      .catch(() => {
        if (isMounted) {
          const unread = checkHasUnreadNotifications(pel, [], []);
          setHasUnread(unread);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pel?.id_pelanggan, pel?.status_pembayaran]);

  // Dot tampil jika showNotificationDot dioper manual boolean, atau otomatis jika hasUnread == true
  const isDotVisible = showNotificationDot !== null ? showNotificationDot : hasUnread;

  return (
    <div className="shrink-0 relative z-0 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 border-b border-blue-700/60 overflow-hidden">
      {/* ═══ ELEMEN TEKSTUR VISUAL KAYA: GELOMBANG SINYAL, NETWORK NODES & SERAT OPTIK ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* 1. Lingkaran Gelombang Radar/WiFi Konsentris di Kanan Atas */}
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

        {/* 2. Jaringan Simpul Koneksi & Garis Data (Network Nodes Constellation) di Kiri & Tengah */}
        <svg
          className="absolute top-2 left-6 w-56 h-28 text-white opacity-[0.14]"
          viewBox="0 0 220 110"
          fill="none"
        >
          {/* Garis-garis penghubung node */}
          <line x1="20" y1="40" x2="70" y2="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="70" y1="20" x2="130" y2="50" stroke="currentColor" strokeWidth="1.2" />
          <line x1="130" y1="50" x2="190" y2="25" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
          <line x1="70" y1="20" x2="80" y2="85" stroke="currentColor" strokeWidth="1.2" />
          <line x1="80" y1="85" x2="150" y2="90" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="130" y1="50" x2="150" y2="90" stroke="currentColor" strokeWidth="1.2" />

          {/* Titik-titik node */}
          <circle cx="20" cy="40" r="2.5" fill="currentColor" />
          <circle cx="70" cy="20" r="3.5" fill="currentColor" />
          <circle cx="130" cy="50" r="3" fill="currentColor" />
          <circle cx="190" cy="25" r="2.5" fill="currentColor" />
          <circle cx="80" cy="85" r="2.5" fill="currentColor" />
          <circle cx="150" cy="90" r="3" fill="currentColor" />
        </svg>

        {/* 3. Garis Gelombang Aliran Data Optik Bertingkat di Bagian Bawah */}
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
          <path
            d="M-10 80 C 90 35, 190 95, 290 55 C 350 25, 400 75, 450 55"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        {/* 4. Dual Ambient Radial Glow (Kanan & Kiri) */}
        <div className="absolute -top-10 right-4 w-36 h-36 bg-blue-300/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-28 h-28 bg-indigo-400/15 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Top bar: Avatar/Maskot + Judul/Subjudul/Greeting + Lonceng Notifikasi */}
      <div className={`relative px-4 sm:px-5 pt-4 ${children ? 'pb-3' : 'pb-20 sm:pb-22'} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {avatarInitials ? (
            customer?.foto_profil ? (
              <img
                src={customer.foto_profil}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="w-11 h-11 rounded-full object-cover border-2 border-white/40 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-blue-700/80 border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold tracking-tight shrink-0 shadow-xs">
                {avatarInitials}
              </div>
            )
          ) : (
            <div className="shrink-0 inline-flex items-center justify-center leading-none overflow-visible" style={{ lineHeight: 0 }}>
              <PortalActiveMascot
                data={dashboardData || { customer }}
                className="w-11 h-9"
              />
            </div>
          )}

          {/* Judul Halaman Aktif / Greeting */}
          <div className="min-w-0 flex-1">
            {greeting ? (
              <>
                <div className="text-xs font-medium text-white/80 leading-tight truncate">{greeting}</div>
                <div className="text-sm font-bold text-white tracking-tight leading-snug mt-0.5 truncate">
                  {title}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                  {title}
                </h1>
                <p className="text-xs font-medium text-white/95 mt-0.5 leading-snug break-words">
                  {subtitle}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Lonceng Notifikasi Konsisten */}
        <button
          type="button"
          onClick={onNotificationClick}
          aria-label="Buka Notifikasi"
          className="relative w-10 h-10 rounded-xl bg-blue-700/70 hover:bg-blue-700 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0 active:scale-95"
        >
          <Bell className="w-4 h-4 stroke-[2.2]" />
          {isDotVisible && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-blue-600" />
          )}
        </button>
      </div>

      {/* Konten Tambahan Opsional di Header (Misal Maskot & Widget Perangkat) */}
      {children && (
        <div className="relative px-4 sm:px-5 pb-8 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

export default PortalHeader;
