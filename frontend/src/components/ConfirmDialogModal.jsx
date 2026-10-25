import React from 'react'
import {
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react'

/**
 * ConfirmDialogModal - Komponen pop-up konfirmasi kustom yang fleksibel & reusable
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void
 * - title: string
 * - message: string | ReactNode
 * - confirmText: string (default: "Ya, Lanjutkan")
 * - cancelText: string (default: "Batal")
 * - variant: 'danger' | 'warning' | 'info' | 'success' (default: 'danger')
 * - isLoading: boolean (default: false)
 * - loadingText: string (default: "Memproses...")
 */
export function ConfirmDialogModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
  loadingText = 'Memproses...'
}) {
  if (!isOpen) return null

  // Variasi warna & tema dialog
  const variantConfig = {
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
      border: 'border-rose-100'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
      border: 'border-amber-100'
    },
    info: {
      icon: Info,
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      btnConfirm: 'bg-cyan-700 hover:bg-cyan-800 text-white shadow-cyan-200',
      border: 'border-cyan-100'
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
      border: 'border-emerald-100'
    }
  }

  const currentTheme = variantConfig[variant] || variantConfig.danger
  const IconComponent = currentTheme.icon

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border ${currentTheme.border} space-y-4 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl ${currentTheme.iconBg} border flex items-center justify-center shrink-0`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Harap konfirmasi sebelum sistem melanjutkan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition disabled:opacity-40"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs min-h-[40px] cursor-pointer disabled:opacity-50 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 min-h-[40px] cursor-pointer disabled:opacity-50 ${currentTheme.btnConfirm}`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>{loadingText}</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
