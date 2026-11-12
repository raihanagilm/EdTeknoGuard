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
  nightModeEnabled,
  nightModeStart,
  nightModeEnd,
  modemCredentialsCount,
  applyToInvalid
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B2545]/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#CCDDF0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#E0F0FF] text-[#026AA7] border border-[#CCDDF0] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#026AA7]" />
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

        <div className="p-4 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0] text-xs space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78]">Interval Pemindaian ONT:</span>
            <strong className="font-mono text-[#026AA7]">{pollingInterval} Menit Sekali</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78]">Ambang Peringatan Ringan:</span>
            <strong className="font-mono text-amber-700">{warnThreshold} dBm</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78]">Ambang Notifikasi Merah:</span>
            <strong className="font-mono text-rose-700">{critThreshold} dBm</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78]">Mode Malam (Notifikasi Senyap):</span>
            <strong className="text-[#0B2545]">
              {nightModeEnabled ? `Aktif (${nightModeStart} - ${nightModeEnd})` : 'Nonaktif'}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#CCDDF0]/60">
            <span className="text-[#3B5B78]">Total Kredensial ONT:</span>
            <span className="font-mono font-bold text-[#0B2545]">{modemCredentialsCount} Pasangan User/Pass</span>
          </div>

          {applyToInvalid && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Akan disinkronkan ke seluruh pelanggan berstatus <strong>INVALID / Belum Valid</strong> (Pelanggan VALID tetap aman).</span>
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
            className="px-5 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 flex items-center gap-2 min-h-[38px] cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Ya, Terapkan Perubahan'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
