import React from 'react'
import {
  AlertTriangle,
  ZapOff,
  CheckCircle2,
  RefreshCw,
  X,
  Phone,
  Radio
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-sky-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Simpan Pengaturan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tinjau kembali parameter yang akan diterapkan ke sistem</p>
          </div>
        </div>

        <div className="p-4 bg-cyan-50/50 rounded-2xl border border-sky-200 text-xs space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-sky-100">
            <span className="text-slate-500">Interval Pemindaian ONT:</span>
            <strong className="font-mono text-cyan-800">{pollingInterval} Menit Sekali</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-sky-100">
            <span className="text-slate-500">Ambang Peringatan Ringan:</span>
            <strong className="font-mono text-amber-700">{warnThreshold} dBm</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-sky-100">
            <span className="text-slate-500">Ambang Notifikasi Merah:</span>
            <strong className="font-mono text-rose-700">{critThreshold} dBm</strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-sky-100">
            <span className="text-slate-500">Mode Malam (Notifikasi Senyap):</span>
            <strong className="text-slate-800">
              {nightModeEnabled ? `Aktif (${nightModeStart} - ${nightModeEnd})` : 'Nonaktif'}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-sky-100">
            <span className="text-slate-500">Total Kredensial ONT:</span>
            <span className="font-mono font-bold text-slate-800">{modemCredentialsCount} Pasangan User/Pass</span>
          </div>
          {applyToInvalid && (
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Akan disinkronkan ke seluruh pelanggan berstatus <strong>INVALID / Belum Valid</strong> (Pelanggan VALID tetap aman).</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin menerapkan perubahan ini ke Database? Background scheduler pemantauan akan langsung menyesuaikan aturan secara realtime.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs min-h-[40px]"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2 min-h-[40px]"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Ya, Terapkan Perubahan'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function OntDetailModal({
  selectedOnt,
  onClose,
  warnThreshold,
  critThreshold
}) {
  if (!selectedOnt) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-4 border border-sky-200 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
          <div>
            <div className="text-xs font-bold text-slate-900">{selectedOnt.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{selectedOnt.id} &bull; {selectedOnt.ip}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-cyan-50/50 rounded-xl border border-sky-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Status Optik:</span>
              <span className={`font-bold ${selectedOnt.rx <= critThreshold ? 'text-rose-600' : selectedOnt.rx <= warnThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                {selectedOnt.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Daya Terima (Rx):</span>
              <span className="font-bold text-slate-900">{selectedOnt.rx !== null ? `${selectedOnt.rx} dBm` : 'LOS'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Daya Pancar (Tx):</span>
              <span className="font-bold text-slate-900">{selectedOnt.tx} dBm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Suhu Modul:</span>
              <span className="font-bold text-slate-900">{selectedOnt.temp}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lokasi POP:</span>
              <span className="font-bold text-slate-900">{selectedOnt.pop}</span>
            </div>
          </div>

          <div className="text-[11px] font-sans text-slate-600">
            <div className="font-bold text-slate-800">Alamat:</div>
            <div>{selectedOnt.address}</div>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <a
            href={`tel:${selectedOnt.phone}`}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Telepon</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
