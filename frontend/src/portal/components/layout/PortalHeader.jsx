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
  onNotificationClick = null
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
    <div className="shrink-0 relative z-0 bg-blue-600 border-b border-blue-700/60">
      {/* Top bar: Avatar/Maskot + Judul/Subjudul/Greeting + Lonceng Notifikasi */}
      <div className="relative px-4 sm:px-5 pt-3.5 pb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {avatarInitials ? (
            customer?.foto_profil ? (
              <img
                src={customer.foto_profil}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="w-10 h-10 rounded-full object-cover border border-white/40 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-700/80 border border-white/30 flex items-center justify-center text-white text-xs font-bold tracking-tight shrink-0 shadow-xs">
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
    </div>
  );
}

export default PortalHeader;
