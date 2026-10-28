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
 * - duration: number (milidetik, default: 3500)
 * - onClose: () => void (fungsi saat ditutup / timeout)
 */
export function PortalToastNotification({
  show,
  message,
  type = 'success',
  title,
  duration = 3500,
  onClose
}) {
  useEffect(() => {
    if (!show || !duration || duration <= 0) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

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
      className="absolute bottom-20 left-3 right-3 z-50 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div
        className={`p-3.5 rounded-2xl shadow-xl shadow-slate-950/20 border backdrop-blur-md flex items-start gap-3 ${current.bgClass}`}
      >
        <div className="p-1 rounded-lg bg-white/10 shrink-0 mt-0.5">
          <IconComponent className={`w-4 h-4 ${current.iconClass}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="font-bold tracking-tight mb-0.5 leading-snug">{displayTitle}</div>
          <div className="text-[11px] leading-relaxed text-white/90 break-words font-normal">
            {message}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Tutup Notifikasi"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default PortalToastNotification;
