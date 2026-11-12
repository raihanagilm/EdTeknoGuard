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
 * ConfirmDialogModal - Komponen pop-up konfirmasi kustom profesional (60-30-10 Light Architecture)
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

  const variantConfig = {
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white',
      border: 'border-[#CCDDF0]'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white',
      border: 'border-[#CCDDF0]'
    },
    info: {
      icon: Info,
      iconBg: 'bg-[#E0F0FF] text-[#026AA7] border-[#CCDDF0]',
      btnConfirm: 'bg-[#026AA7] hover:bg-[#035388] text-white',
      border: 'border-[#CCDDF0]'
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      border: 'border-[#CCDDF0]'
    }
  }

  const currentTheme = variantConfig[variant] || variantConfig.danger
  const IconComponent = currentTheme.icon

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0B2545]/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border ${currentTheme.border} space-y-4 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${currentTheme.iconBg} border flex items-center justify-center shrink-0`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0B2545] leading-snug">{title}</h3>
              <p className="text-xs text-[#64839E] mt-0.5">Harap konfirmasi sebelum sistem melanjutkan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[#64839E] hover:text-[#0B2545] p-1.5 rounded-lg hover:bg-[#F1F6FC] transition disabled:opacity-40 cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0] text-xs sm:text-sm text-[#3B5B78] leading-relaxed font-sans">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545] font-semibold text-xs min-h-[38px] cursor-pointer disabled:opacity-50 transition border border-[#CCDDF0]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-2 min-h-[38px] cursor-pointer disabled:opacity-50 ${currentTheme.btnConfirm}`}
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
