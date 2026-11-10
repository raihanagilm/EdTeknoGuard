import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * PortalToastNotification
 * 
 * Komponen Notifikasi Mengambang (Floating Toast) Terpadu untuk TeknoCust (Portal Pelanggan).
 * Diposisikan mengambang tepat di atas Sticky Bottom Navigation (bottom-20),
 * tidak mendorong layout halaman, dan otomatis hilang setelah durasi tertentu.
 *
 * Props:
 * - show: boolean (apakah toast aktif)
 * - message: string (pesan notifikasi)
 * - type: 'success' | 'error' | 'warning' | 'info' (default: 'success')
 * - title: string (opsional)
 * - duration: number (milidetik, default: 5000)
 * - onClose: () => void (fungsi saat ditutup / timeout)
 */
export function PortalToastNotification({
  show,
  message,
  type = 'success',
  title,
  duration = 5000,
  onClose
}) {
  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!show || !duration || duration <= 0) return;
    const timer = setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, message, duration]);

  if (!show || !message) return null;

  const config = {
    success: {
      defaultTitle: 'Berhasil',
      bgClass: 'bg-emerald-900/95 border-emerald-500/60 text-emerald-50',
      iconClass: 'text-emerald-400',
      Icon: CheckCircle2
    },
    error: {
      defaultTitle: 'Gagal / Perhatian',
      bgClass: 'bg-rose-900/95 border-rose-500/60 text-rose-50',
      iconClass: 'text-rose-400',
      Icon: AlertCircle
    },
    warning: {
      defaultTitle: 'Peringatan',
      bgClass: 'bg-amber-900/95 border-amber-500/60 text-amber-50',
      iconClass: 'text-amber-400',
      Icon: AlertTriangle
    },
    info: {
      defaultTitle: 'Informasi',
      bgClass: 'bg-slate-900/95 border-slate-600/60 text-slate-50',
      iconClass: 'text-blue-400',
      Icon: Info
    }
  };

  const current = config[type] || config.info;
  const IconComponent = current.Icon;
  const displayTitle = title || current.defaultTitle;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="absolute bottom-16 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs z-50 pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      <div
        className={`px-3 py-2 rounded-xl shadow-lg shadow-slate-950/20 border backdrop-blur-md flex items-center gap-2.5 ${current.bgClass}`}
      >
        <div className="p-1 rounded-md bg-white/10 shrink-0">
          <IconComponent className={`w-3.5 h-3.5 ${current.iconClass}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="font-bold tracking-tight text-[11px] leading-tight">{displayTitle}</div>
          <div className="text-[10.5px] leading-tight text-white/90 break-words font-normal">
            {message}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Tutup Notifikasi"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default PortalToastNotification;
