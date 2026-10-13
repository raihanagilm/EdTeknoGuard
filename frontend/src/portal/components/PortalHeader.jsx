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
    <div className="shrink-0 relative overflow-hidden" style={{ background: '#2563eb' }}>
      {/* Ornamen Lingkaran Header */}
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

      {/* Top bar: Avatar/Maskot + Judul/Subjudul/Greeting + Lonceng Notifikasi */}
      <div className="relative px-5 pt-4 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {avatarInitials ? (
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {avatarInitials}
            </div>
          ) : (
            <div className="w-12 h-10 shrink-0 flex items-center justify-center overflow-visible">
              <PortalActiveMascot
                data={dashboardData || { customer }}
                className="w-12 h-10"
              />
            </div>
          )}

          {/* Judul Halaman Aktif / Greeting */}
          <div className="min-w-0 flex-1">
            {greeting ? (
              <>
                <div className="text-[11px] text-white/80 leading-none">{greeting}</div>
                <div className="text-[14px] font-bold text-white leading-tight mt-0.5 truncate">
                  {title}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[15px] font-black tracking-tight leading-none text-white truncate">
                  {title}
                </h1>
                <p className="text-[9px] text-blue-100 mt-1 leading-tight font-medium truncate">
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
          className="relative w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer shrink-0"
        >
          <Bell className="w-4 h-4 stroke-[2.2]" />
          {showNotificationDot && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full border border-blue-600 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}

export default PortalHeader;
