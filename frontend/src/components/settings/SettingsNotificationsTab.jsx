import React from 'react'
import {
  Clock,
  Moon,
  Save
} from 'lucide-react'

export function SettingsNotificationsTab({
  onOpenConfirmModal,
  settingsLoading,
  alertWaitingInterval,
  setAlertWaitingInterval,
  nightModeEnabled,
  setNightModeEnabled,
  nightModeStart,
  setNightModeStart,
  nightModeEnd,
  setNightModeEnd
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onOpenConfirmModal()
      }}
      className="space-y-4"
    >
      <div className="border-b border-sky-100 pb-3">
        <h3 className="text-sm font-extrabold text-slate-900">Notifikasi &amp; Jam Senyap</h3>
        <p className="text-xs text-slate-500">Konfigurasi interval pengingat dan rentang jam senyap notifikasi operasional NOC.</p>
      </div>

      {/* Opsi 1: Pengingat Pemantauan Terjeda */}
      <div className="space-y-1.5 py-1">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-600" />
          <span>Interval Pengingat Pemantauan Terjeda (Menit)</span>
        </label>
        <input
          type="number"
          min="5"
          max="180"
          value={alertWaitingInterval}
          onChange={(e) => setAlertWaitingInterval(e.target.value)}
          className="w-full rounded-xl border border-sky-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[40px]"
        />
        <p className="text-xs text-slate-600 font-sans">
          Notifikasi pengingat muncul di dashboard jika pemindaian terjeda lebih dari waktu ini.
        </p>
      </div>

      {/* Opsi 2: Jam Tenang Malam (Quiet Hours) */}
      <div className="py-2 space-y-3 border-t border-sky-100">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-cyan-600" />
            <div>
              <span className="text-xs font-bold text-slate-800">Jam Tenang Malam (Quiet Hours)</span>
              <p className="text-xs text-slate-600 font-sans mt-0.5">Membungkam notifikasi non-kritis selama rentang jam istirahat teknisi.</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={nightModeEnabled}
            onChange={(e) => setNightModeEnabled(e.target.checked)}
            className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
          />
        </label>

        {nightModeEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Mulai Senyap</label>
              <input
                type="time"
                value={nightModeStart}
                onChange={(e) => setNightModeStart(e.target.value)}
                className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[40px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Berakhir Senyap</label>
              <input
                type="time"
                value={nightModeEnd}
                onChange={(e) => setNightModeEnd(e.target.value)}
                className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[40px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tombol Simpan Tab 3 */}
      <div className="pt-3 border-t border-sky-100 flex justify-end">
        <button
          type="submit"
          disabled={settingsLoading}
          className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition min-h-[42px] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Pengaturan Notifikasi</span>
        </button>
      </div>
    </form>
  )
}

