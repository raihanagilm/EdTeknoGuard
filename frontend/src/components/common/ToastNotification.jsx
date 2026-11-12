import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react'

/**
 * ToastNotification - Komponen notifikasi pop-up pojok kanan bawah (Deep Navy & Crisp Blue Architectural)
 */
export function ToastNotification({
  show,
  onClose,
  type = 'success',
  title,
  message,
  duration = 5000
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

  if (!show || !message) return null

  const config = {
    success: {
      defaultTitle: 'Berhasil',
      cardClass: 'bg-[#0B2545] text-white border-[#1E437A]',
      iconClass: 'text-emerald-400',
      Icon: CheckCircle2
    },
    warning: {
      defaultTitle: 'Perhatian / Terkunci',
      cardClass: 'bg-[#0B2545] text-white border-[#1E437A]',
      iconClass: 'text-amber-400',
      Icon: AlertTriangle
    },
    info: {
      defaultTitle: 'Informasi',
      cardClass: 'bg-[#0B2545] text-white border-[#1E437A]',
      iconClass: 'text-sky-300',
      Icon: Info
    },
    error: {
      defaultTitle: 'Gagal / Kesalahan',
      cardClass: 'bg-[#0B2545] text-white border-[#1E437A]',
      iconClass: 'text-rose-400',
      Icon: AlertCircle
    }
  }

  const current = config[type] || config.info
  const displayTitle = title || current.defaultTitle
  const IconComponent = current.Icon

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 font-sans"
    >
      <div
        className={`p-3.5 rounded-xl shadow-xl border flex items-start gap-2.5 ${current.cardClass}`}
      >
        <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${current.iconClass}`} aria-hidden="true" />
        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-bold mb-0.5 text-white">{displayTitle}</div>
          <div className="break-words text-sky-100/80">{message}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sky-300/60 hover:text-white text-xs font-bold px-1 py-0.5 rounded transition cursor-pointer select-none"
          title="Tutup Notifikasi"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
