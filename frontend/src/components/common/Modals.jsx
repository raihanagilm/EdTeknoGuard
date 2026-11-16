import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react'

export function ConfirmSaveModal({
  isOpen,
  onClose,
  onConfirm,
  saving,
  pollingInterval,
  warnThreshold,
  critThreshold,
  modemCredentialsCount,
  applyToInvalid
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B2545]/50 backdrop-blur-2xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#CCDDF0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F1F6FC] text-[#026AA7] border border-[#CCDDF0] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#026AA7]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0B2545]">Konfirmasi Simpan Pengaturan</h3>
              <p className="text-xs text-[#64839E] mt-0.5">Tinjau kembali parameter yang akan diterapkan ke sistem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64839E] hover:text-[#0B2545] p-1.5 rounded-lg hover:bg-[#F1F6FC] transition cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0] text-xs space-y-2.5">
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78] font-medium">Interval Pemindaian ONT:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#026AA7] tabular-nums">{pollingInterval}</span>
              <span className="font-sans font-medium text-[#3B5B78] ml-1">Menit Sekali</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78] font-medium">Ambang Peringatan Ringan:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-amber-700 tabular-nums">{warnThreshold}</span>
              <span className="font-sans font-medium text-[#3B5B78] ml-1">dBm</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78] font-medium">Ambang Notifikasi Merah:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-rose-700 tabular-nums">{critThreshold}</span>
              <span className="font-sans font-medium text-[#3B5B78] ml-1">dBm</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78] font-medium">Total Kredensial ONT:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-[#0B2545] tabular-nums">{modemCredentialsCount}</span>
              <span className="font-sans font-medium text-[#3B5B78] ml-1">Pasangan Akun</span>
            </div>
          </div>

          {applyToInvalid && (
            <div className="pt-2 border-t border-[#CCDDF0] text-[11px] text-[#3B5B78] flex items-start gap-1.5 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Akan disinkronkan ke seluruh pelanggan berstatus <strong className="font-semibold text-[#0B2545]">INVALID / Belum Valid</strong> (Pelanggan VALID tetap aman).
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-[#3B5B78] leading-relaxed">
          Apakah Anda yakin ingin menerapkan perubahan ini ke Database? Background scheduler pemantauan akan langsung menyesuaikan aturan secara realtime.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545] font-semibold text-xs min-h-[38px] border border-[#CCDDF0] cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5 min-h-[38px] cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Ya, Terapkan Perubahan'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
