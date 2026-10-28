import React from 'react';
import { Bell } from 'lucide-react';
import { PortalActiveMascot } from './PortalActiveMascot';

export function PortalHeader({
  title = 'TeknoCust',
  subtitle = 'Portal Layanan Mandiri Pelanggan TeknoIndonet',
  dashboardData = null,
  customer = null,
  avatarInitials = null,
  greeting = null,
  showNotificationDot = true,
  onNotificationClick = null
}) {
  return (
    <div className="shrink-0 relative z-0" style={{ background: '#2563eb' }}>
      {/* Ornamen Lingkaran Header Terkapsulasi */}
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

      {/* Top bar: Avatar/Maskot + Judul/Subjudul/Greeting + Lonceng Notifikasi */}
      <div className="relative px-5 pt-4 pb-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {avatarInitials ? (
            customer?.foto_profil ? (
              <img
                src={customer.foto_profil}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="w-10 h-10 rounded-full object-cover border border-white/60 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-900/40 border border-white/40 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs">
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
                <div className="text-xs text-white/90 font-medium leading-none">{greeting}</div>
                <div className="text-[15px] font-bold text-white leading-tight mt-1 truncate">
                  {title}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[15px] font-black tracking-tight leading-none text-white truncate">
                  {title}
                </h1>
                <p className="text-xs text-white/95 mt-1 leading-tight font-medium truncate">
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
          aria-label="Notifikasi"
          className="relative w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition cursor-pointer shrink-0"
        >
          <Bell className="w-4 h-4 stroke-[2.2]" />
          {showNotificationDot && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full border border-blue-600" />
          )}
        </button>
      </div>
    </div>
  );
}

export default PortalHeader;
