import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react'

/**
 * ToastNotification - Komponen notifikasi pop-up pojok kanan bawah (Dark Glassmorphism)
 *
 * Props:
 * - show: boolean
 * - onClose: () => void
 * - type: 'success' | 'warning' | 'info' | 'error' (default: 'success')
 * - title: string (opsional, jika kosong otomatis sesuai type)
 * - message: string | ReactNode
 * - duration: number (milidetik, default: 4000. Set 0 untuk non-auto-dismiss)
 */
export function ToastNotification({
  show,
  onClose,
  type = 'success',
  title,
  message,
  duration = 4000
}) {
  useEffect(() => {
    if (!show || !duration || duration <= 0) return
    const timer = setTimeout(() => {
      if (onClose) onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [show, duration, onClose])

  if (!show || !message) return null

  const config = {
    success: {
      defaultTitle: 'Pemeriksaan Berhasil',
      cardClass: 'bg-emerald-900/95 text-emerald-100 border-emerald-500/50',
      iconClass: 'text-emerald-300',
      Icon: CheckCircle2
    },
    warning: {
      defaultTitle: 'Perhatian / Terkunci',
      cardClass: 'bg-amber-900/95 text-amber-100 border-amber-500/50',
      iconClass: 'text-amber-300',
      Icon: AlertTriangle
    },
    info: {
      defaultTitle: 'Informasi',
      cardClass: 'bg-cyan-900/95 text-cyan-100 border-cyan-500/50',
      iconClass: 'text-cyan-300',
      Icon: Info
    },
    error: {
      defaultTitle: 'Gagal / Kesalahan',
      cardClass: 'bg-rose-900/95 text-rose-100 border-rose-500/50',
      iconClass: 'text-rose-300',
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
      className="fixed bottom-5 right-5 z-[100] max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div
        className={`p-3.5 rounded-2xl shadow-xl border flex items-start gap-2.5 backdrop-blur-md ${current.cardClass}`}
      >
        <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${current.iconClass}`} aria-hidden="true" />
        <div className="flex-1 text-xs font-sans leading-relaxed">
          <div className="font-bold mb-0.5">{displayTitle}</div>
          <div className="break-words">{message}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded transition cursor-pointer select-none"
          title="Tutup Notifikasi"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
