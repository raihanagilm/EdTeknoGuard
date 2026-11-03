import React from 'react'
import {
  Clock,
  AlertTriangle,
  ZapOff,
  Save,
  Sliders
} from 'lucide-react'

export function SettingsThresholdTab({
  onOpenConfirmModal,
  settingsLoading,
  pollingInterval,
  setPollingInterval,
  warnThreshold,
  setWarnThreshold,
  critThreshold,
  setCritThreshold
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onOpenConfirmModal()
      }}
      className="space-y-4"
    >
      <div className="border-b border-sky-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Parameter Pemantauan &amp; Redaman</h3>
          <p className="text-xs text-slate-500">Konfigurasi interval deteksi berkala dan batasan status redaman optik.</p>
        </div>
      </div>

      {/* Input 1: Interval Scanning */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-600" />
          <span>Interval Pemantauan Otomatis (Menit)</span>
        </label>
        <input
          type="number"
          min="1"
          max="1440"
          required
          value={pollingInterval}
          onChange={(e) => setPollingInterval(e.target.value)}
          className="w-full rounded-xl border border-sky-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
        />
        <p className="text-xs text-slate-600 font-sans">
          Waktu jeda antar siklus background scheduler untuk memeriksa redaman seluruh modem ONT aktif.
        </p>
      </div>

      {/* Input 2: Ambang Batas Peringatan Dini */}
      <div className="space-y-1.5 pt-2">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Ambang Batas Peringatan Dini / Warning (dBm)</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            max="0"
            required
            value={warnThreshold}
            onChange={(e) => setWarnThreshold(e.target.value)}
            className="w-full rounded-xl border border-sky-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">dBm</span>
        </div>
        <p className="text-xs text-slate-600 font-sans">
          Status <strong className="text-amber-800 font-bold">WARNING</strong> dipicu saat redaman turun menyentuh nilai ini.
        </p>
      </div>

      {/* Input 3: Ambang Batas Kritis */}
      <div className="space-y-1.5 pt-2">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
          <ZapOff className="w-4 h-4 text-rose-500" />
          <span>Ambang Batas Kritis / Critical Alarm (dBm)</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            max="0"
            required
            value={critThreshold}
            onChange={(e) => setCritThreshold(e.target.value)}
            className="w-full rounded-xl border border-sky-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">dBm</span>
        </div>
        <p className="text-xs text-slate-600 font-sans">
          Status <strong className="text-rose-800 font-bold">CRITICAL</strong> dipicu jika redaman lebih buruk atau sama dengan nilai ini.
        </p>
      </div>

      {/* Tombol Simpan Tab 1 */}
      <div className="pt-3 border-t border-sky-100 flex justify-end">
        <button
          type="submit"
          disabled={settingsLoading}
          className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition min-h-[42px] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Parameter</span>
        </button>
      </div>

      {/* Standar Redaman Baru Dinamis (Khusus Tampilan Desktop) */}
      <div className="hidden lg:block pt-3 border-t border-sky-100 space-y-3">
        <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
          <Sliders className="w-4 h-4 text-cyan-600" />
          <span>Ketentuan Ambang Batas Redaman (Aktif)</span>
        </h4>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="py-2 px-3 border-l-2 border-emerald-500 bg-emerald-50/40">
            <div className="flex items-center justify-between font-bold text-emerald-800">
              <span>Sinyal Optimal</span>
              <span className="font-mono font-black">&gt; {Number(warnThreshold).toFixed(1)} dBm</span>
            </div>
            <p className="text-slate-600 text-xs mt-1">Koneksi prima &amp; throughput lancar.</p>
          </div>
          <div className="py-2 px-3 border-l-2 border-amber-500 bg-amber-50/40">
            <div className="flex items-center justify-between font-bold text-amber-800">
              <span>Peringatan Ringan</span>
              <span className="font-mono font-black">&le; {Number(warnThreshold).toFixed(1)} dBm</span>
            </div>
            <p className="text-amber-900 text-xs mt-1">Deteksi dini redaman mulai turun.</p>
          </div>
          <div className="py-2 px-3 border-l-2 border-rose-500 bg-rose-50/40">
            <div className="flex items-center justify-between font-bold text-rose-800">
              <span>Kritis / Alarm Merah</span>
              <span className="font-mono font-black">&le; {Number(critThreshold).toFixed(1)} dBm</span>
            </div>
            <p className="text-rose-900 text-xs mt-1">Gangguan serius, risiko tinggi LOS!</p>
          </div>
        </div>
      </div>
    </form>
  )
}

