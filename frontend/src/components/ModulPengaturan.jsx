import React from 'react'
import {
  Sliders,
  SlidersHorizontal,
  KeyRound,
  Bell,
  Clock,
  AlertTriangle,
  ZapOff,
  Smartphone,
  Moon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'

export function ModulPengaturan({
  settingsActiveSubTab,
  setSettingsActiveSubTab,
  settingsLoading,
  settingsSaveSuccess,
  settingsSaveError,
  pollingInterval,
  setPollingInterval,
  warnThreshold,
  setWarnThreshold,
  critThreshold,
  setCritThreshold,
  appVibration,
  setAppVibration,
  alertWaitingInterval,
  setAlertWaitingInterval,
  nightModeEnabled,
  setNightModeEnabled,
  nightModeStart,
  setNightModeStart,
  nightModeEnd,
  setNightModeEnd,
  modemCredentials,
  addModemCredentialRow,
  removeModemCredentialRow,
  updateModemCredentialRow,
  showModemPasswords,
  toggleModemPasswordVisibility,
  applyToInvalid,
  setApplyToInvalid,
  draggedCredIdx,
  dragOverCredIdx,
  handleCredDragStart,
  handleCredDragOver,
  handleCredDrop,
  handleCredDragEnd,
  fetchBackendSettings,
  onOpenConfirmModal
}) {
  return (
    <div className="space-y-4">
      {/* Header Pengaturan & Tab Selector */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-sky-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Pengaturan Sistem &amp; Modem ONT</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur interval pemantauan otomatis, batas toleransi redaman optik dBm, dan kredensial default modem ONT.
            </p>
          </div>

          <button
            onClick={fetchBackendSettings}
            disabled={settingsLoading}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-xs"
            title="Muat Ulang Konfigurasi Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${settingsLoading ? 'animate-spin' : ''}`} />
            <span>Sinkron Server</span>
          </button>
        </div>

        {/* Banner Status Notifikasi Simpan */}
        {settingsSaveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Konfigurasi sistem berhasil disimpan dan diterapkan ke server backend TiDB Cloud!</span>
          </div>
        )}

        {settingsSaveError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{settingsSaveError}</span>
          </div>
        )}

        {/* 3 Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-sky-100 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSettingsActiveSubTab('thresholds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              settingsActiveSubTab === 'thresholds'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-cyan-50/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Tab 1: Parameter &amp; Ambang Batas</span>
          </button>

          <button
            onClick={() => setSettingsActiveSubTab('credentials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 relative ${
              settingsActiveSubTab === 'credentials'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-cyan-50/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Tab 2: Kredensial Modem ONT</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-mono font-bold">
              {modemCredentials.length}
            </span>
          </button>

          <button
            onClick={() => setSettingsActiveSubTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              settingsActiveSubTab === 'notifications'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-cyan-50/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Tab 3: Notifikasi &amp; Pengingat</span>
          </button>
        </div>
      </div>

      {/* Konten Form 3 Tab & Sidebar Petunjuk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* 2 Kolom Form Input */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-sky-200/80 shadow-sm">
          
          {/* TAB 1: PARAMETER & AMBANG BATAS */}
          {settingsActiveSubTab === 'thresholds' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onOpenConfirmModal()
              }}
              className="space-y-4"
            >
              <div className="border-b border-sky-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Parameter Pemantauan &amp; Redaman</h3>
                <p className="text-xs text-slate-500">Konfigurasi interval deteksi berkala dan batasan status redaman optik.</p>
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
                <p className="text-[11px] text-slate-400">
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
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">dBm</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Status <strong>WARNING</strong> dipicu saat redaman turun menyentuh nilai ini (Default: <code className="bg-slate-100 px-1 rounded font-mono">-26.0 dBm</code>).
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
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">dBm</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Status <strong>CRITICAL</strong> dipicu jika redaman lebih buruk atau sama dengan nilai ini (Default: <code className="bg-slate-100 px-1 rounded font-mono">-27.0 dBm</code>).
                </p>
              </div>

              {/* Tombol Simpan Tab 1 */}
              <div className="pt-3 border-t border-sky-100 flex justify-end">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Parameter</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: KREDENSIAL MODEM ONT */}
          {settingsActiveSubTab === 'credentials' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onOpenConfirmModal()
              }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daftar Kredensial Modem ONT (Multi-Fallback)</h3>
                  <p className="text-xs text-slate-500">
                    Sistem mencoba kredensial ini berurutan dari atas ke bawah saat login scraper ONT pelanggan gagal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addModemCredentialRow}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {/* Tabel Repeater Kredensial */}
              <div className="space-y-2.5">
                {modemCredentials.map((cred, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleCredDragStart(idx)}
                    onDragOver={(e) => handleCredDragOver(e, idx)}
                    onDrop={() => handleCredDrop(idx)}
                    onDragEnd={handleCredDragEnd}
                    className={`p-3 rounded-xl border bg-white/90 transition flex flex-col sm:flex-row sm:items-center gap-2.5 ${
                      dragOverCredIdx === idx
                        ? 'border-cyan-500 ring-2 ring-cyan-200 bg-cyan-50/40'
                        : 'border-sky-200/80 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 shrink-0">
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600">⠿</span>
                      <span className="w-5 text-center">#{idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <input
                        type="text"
                        placeholder="Username modem (misal: admin)"
                        value={cred.username}
                        onChange={(e) => updateModemCredentialRow(idx, 'username', e.target.value)}
                        required
                        className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[36px]"
                      />

                      <div className="relative">
                        <input
                          type={showModemPasswords[idx] ? 'text' : 'password'}
                          placeholder="Password modem (misal: tekno2024)"
                          value={cred.password}
                          onChange={(e) => updateModemCredentialRow(idx, 'password', e.target.value)}
                          required
                          className="w-full rounded-lg border border-sky-200 px-3 py-1.5 pr-8 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[36px]"
                        />
                        <button
                          type="button"
                          onClick={() => toggleModemPasswordVisibility(idx)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showModemPasswords[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeModemCredentialRow(idx)}
                      disabled={modemCredentials.length <= 1}
                      className={`p-2 rounded-lg text-slate-400 transition ${
                        modemCredentials.length > 1
                          ? 'hover:bg-rose-50 hover:text-rose-600'
                          : 'opacity-30 cursor-not-allowed'
                      }`}
                      title="Hapus baris kredensial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Checkbox Sinkronisasi Pelanggan Invalid */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-50/50 border border-sky-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToInvalid}
                    onChange={(e) => setApplyToInvalid(e.target.checked)}
                    className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Sinkronkan ke seluruh pelanggan berstatus INVALID</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Otomatis menguji urutan kredensial baru ini ke semua pelanggan yang sebelumnya gagal login saat disimpan.
                    </p>
                  </div>
                </label>
              </div>

              {/* Tombol Simpan Tab 2 */}
              <div className="pt-3 border-t border-sky-100 flex justify-end">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Kredensial Modem</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFIKASI & PENGINGAT */}
          {settingsActiveSubTab === 'notifications' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onOpenConfirmModal()
              }}
              className="space-y-4"
            >
              <div className="border-b border-sky-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Notifikasi &amp; Jam Tenang</h3>
                <p className="text-xs text-slate-500">Konfigurasi getaran aplikasi native dan rentang jam senyap notifikasi.</p>
              </div>

              {/* Opsi 1: Getaran Aplikasi Native */}
              <div className="p-3.5 rounded-xl border border-sky-200 bg-white/90 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-cyan-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Getaran Aplikasi Native (Web Wrapper APK)</span>
                      <p className="text-[11px] text-slate-400">Aktifkan getaran perangkat Android saat alarm kritis terdeteksi.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appVibration}
                    onChange={(e) => setAppVibration(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                </label>
              </div>

              {/* Opsi 2: Pengingat Pemantauan Terjeda */}
              <div className="space-y-1.5 pt-1">
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
                <p className="text-[11px] text-slate-400">
                  Notifikasi pengingat muncul di dashboard jika pemindaian terjeda lebih dari waktu ini.
                </p>
              </div>

              {/* Opsi 3: Jam Tenang Malam (Quiet Hours) */}
              <div className="p-3.5 rounded-xl border border-sky-200 bg-white/90 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-cyan-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Jam Tenang Malam (Quiet Hours)</span>
                      <p className="text-[11px] text-slate-400">Membungkam notifikasi non-kritis selama rentang jam istirahat teknisi.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nightModeEnabled}
                    onChange={(e) => setNightModeEnabled(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                </label>

                {nightModeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sky-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Mulai Senyap</label>
                      <input
                        type="time"
                        value={nightModeStart}
                        onChange={(e) => setNightModeStart(e.target.value)}
                        className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[40px]"
                      />
                      <span className="block text-[10px] text-slate-400 mt-0.5">Default: 22:00 WIB</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Berakhir Senyap</label>
                      <input
                        type="time"
                        value={nightModeEnd}
                        onChange={(e) => setNightModeEnd(e.target.value)}
                        className="w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[40px]"
                      />
                      <span className="block text-[10px] text-slate-400 mt-0.5">Default: 06:00 WIB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tombol Simpan Tab 3 */}
              <div className="pt-3 border-t border-sky-100 flex justify-end">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan Notifikasi</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* 1 Kolom Sidebar Panduan SOP & Cara Kerja Multi-Kredensial */}
        <div className="space-y-4">
          
          {/* Card Standar Redaman Baru Dinamis */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 p-4 space-y-3 text-xs shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <Sliders className="w-4 h-4 text-cyan-600" />
              <span>Ketentuan Ambang Batas Redaman (Aktif)</span>
            </h3>

            <div className="space-y-2.5 text-[11px]">
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between font-bold text-emerald-800">
                  <span>Sinyal Optimal</span>
                  <span className="font-mono">&gt; {Number(warnThreshold).toFixed(1)} dBm</span>
                </div>
                <p className="text-slate-600 mt-1">Koneksi prima, throughput lancar, dan modul optik dalam batas toleransi aman.</p>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 shadow-xs">
                <div className="flex items-center justify-between font-bold text-amber-800">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Peringatan Ringan</span>
                  </span>
                  <span className="font-mono">&le; {Number(warnThreshold).toFixed(1)} dBm</span>
                </div>
                <p className="text-amber-900 mt-1">
                  Deteksi dini redaman optik mulai menurun menyentuh <strong>{Number(warnThreshold).toFixed(1)} dBm</strong>.
                </p>
              </div>

              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 shadow-xs">
                <div className="flex items-center justify-between font-bold text-rose-800">
                  <span className="inline-flex items-center gap-1.5">
                    <ZapOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>Notifikasi Merah (Segera Dicek)</span>
                  </span>
                  <span className="font-mono">&le; {Number(critThreshold).toFixed(1)} dBm</span>
                </div>
                <p className="text-rose-900 mt-1">
                  Gangguan serius &le; <strong>{Number(critThreshold).toFixed(1)} dBm</strong>! Berisiko tinggi LOS (*Loss of Signal*).
                </p>
              </div>
            </div>
          </div>

          {/* Card Cara Kerja Multi-Kredensial */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 p-4 space-y-2.5 text-xs shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <KeyRound className="w-4 h-4 text-cyan-600" />
              <span>Cara Kerja Multi-Kredensial</span>
            </h3>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Saat melakukan live scraping ke ONT:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              <li>Sistem mencoba kredensial tersimpan milik pelanggan terlebih dahulu.</li>
              <li>Jika ditolak, sistem mencoba semua username/password yang ada di tab <strong>Kredensial Modem ONT</strong> satu per satu.</li>
              <li>Jika berhasil terhubung, kredensial pelanggan yang tadinya <code className="bg-slate-100 px-1 rounded text-rose-600 font-mono text-[10px]">INVALID</code> otomatis diperbarui menjadi <code className="bg-slate-100 px-1 rounded text-emerald-600 font-mono text-[10px]">VALID</code>.</li>
            </ol>
          </div>

        </div>

      </div>
    </div>
  )
}
