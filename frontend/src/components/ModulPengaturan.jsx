import React, { useState, useEffect } from 'react'
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
  CheckCircle2,
  User,
  Lock,
  ShieldCheck,
  LogOut
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
  onOpenConfirmModal,
  currentUser,
  setCurrentUser,
  onLogout
}) {
  // State Edit Profil Pengguna (Super Admin, Admin, & Teknisi)
  const [editNama, setEditNama] = useState(currentUser?.nama_lengkap || '')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmPasswordBaru, setKonfirmPasswordBaru] = useState('')
  const [showPassBaru, setShowPassBaru] = useState(false)
  const [showKonfirmPass, setShowKonfirmPass] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (currentUser?.nama_lengkap) {
      setEditNama(currentUser.nama_lengkap)
    }
  }, [currentUser])

  // Handler Simpan Perubahan Nama & Password Pengguna
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess('')
    setProfileError('')

    if (passwordBaru && passwordBaru.length < 6) {
      setProfileError('Kata sandi baru minimal 6 karakter!')
      setProfileLoading(false)
      return
    }

    if (passwordBaru && passwordBaru !== konfirmPasswordBaru) {
      setProfileError('Konfirmasi kata sandi baru tidak cocok!')
      setProfileLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: editNama,
          password_baru: passwordBaru
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setProfileSuccess(data.message || 'Profil dan kata sandi Anda berhasil diperbarui!')
        if (data.user && setCurrentUser) {
          setCurrentUser(data.user)
        }
        setPasswordBaru('')
        setKonfirmPasswordBaru('')
      } else {
        setProfileError(data.message || 'Gagal memperbarui profil.')
      }
    } catch (err) {
      setProfileError('Gagal terhubung ke server backend.')
    } finally {
      setProfileLoading(false)
    }
  }

  const isTeknisi = currentUser?.role === 'teknisi'
  
  // State Kategori (Personal vs Pengaturan NOC)
  const [settingsCategory, setSettingsCategory] = useState(
    isTeknisi || settingsActiveSubTab === 'account' ? 'personal' : 'noc'
  )

  useEffect(() => {
    if (isTeknisi) {
      setSettingsCategory('personal')
      if (settingsActiveSubTab !== 'account') {
        setSettingsActiveSubTab('account')
      }
    }
  }, [isTeknisi])

  return (
    <div className="space-y-4">
      {/* Banner & Mobile Switcher */}
      <div className="space-y-3">
        {/* Banner Status Notifikasi Simpan */}
        {!isTeknisi && settingsSaveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Konfigurasi sistem berhasil disimpan dan diterapkan ke server backend TiDB Cloud!</span>
          </div>
        )}

        {!isTeknisi && settingsSaveError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{typeof settingsSaveError === 'string' ? settingsSaveError : JSON.stringify(settingsSaveError)}</span>
          </div>
        )}

        {/* 1. MOBILE SEGMENTED SWITCHER (Ala App DANA: Personal vs Pengaturan NOC) */}
        <div className="lg:hidden space-y-2.5">
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                setSettingsCategory('personal')
                setSettingsActiveSubTab('account')
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                settingsCategory === 'personal' || isTeknisi
                  ? 'bg-white text-cyan-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>

            {!isTeknisi && (
              <button
                onClick={() => {
                  setSettingsCategory('noc')
                  if (settingsActiveSubTab === 'account') {
                    setSettingsActiveSubTab('thresholds')
                  }
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  settingsCategory === 'noc'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Pengaturan NOC</span>
              </button>
            )}
          </div>

          {/* Grid Menu Ala DANA saat Kategori NOC Aktif di Mobile */}
          {!isTeknisi && settingsCategory === 'noc' && (
            <div className="p-3 bg-white/95 rounded-2xl border border-sky-200/90 shadow-xs animate-in fade-in duration-200">
              <div className="grid grid-cols-3 gap-2">
                
                {/* 1. Parameter Redaman */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('thresholds')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition cursor-pointer text-center ${
                    settingsActiveSubTab === 'thresholds'
                      ? 'bg-cyan-50/80 border border-cyan-300 ring-2 ring-cyan-400/40 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition ${
                    settingsActiveSubTab === 'thresholds'
                      ? 'bg-gradient-to-tr from-cyan-600 to-sky-500 ring-2 ring-cyan-200 text-white'
                      : 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white'
                  }`}>
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 leading-tight">
                    Parameter
                  </span>
                  <span className="text-[10px] font-bold text-cyan-600 mt-0.5 font-mono">
                    {pollingInterval}m • {Number(warnThreshold).toFixed(0)}dBm
                  </span>
                </button>

                {/* 2. Kredensial ONT */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('credentials')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition cursor-pointer text-center relative ${
                    settingsActiveSubTab === 'credentials'
                      ? 'bg-cyan-50/80 border border-cyan-300 ring-2 ring-cyan-400/40 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition relative ${
                    settingsActiveSubTab === 'credentials'
                      ? 'bg-gradient-to-tr from-cyan-600 to-sky-500 ring-2 ring-cyan-200 text-white'
                      : 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white'
                  }`}>
                    <KeyRound className="w-5 h-5" />
                    {modemCredentials.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white">
                        {modemCredentials.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 leading-tight">
                    Kredensial ONT
                  </span>
                  <span className="text-[10px] font-bold text-cyan-600 mt-0.5 font-mono">
                    {modemCredentials.length} Akun
                  </span>
                </button>

                {/* 3. Notifikasi */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('notifications')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition cursor-pointer text-center ${
                    settingsActiveSubTab === 'notifications'
                      ? 'bg-cyan-50/80 border border-cyan-300 ring-2 ring-cyan-400/40 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition ${
                    settingsActiveSubTab === 'notifications'
                      ? 'bg-gradient-to-tr from-cyan-600 to-sky-500 ring-2 ring-cyan-200 text-white'
                      : 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white'
                  }`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 leading-tight">
                    Notifikasi
                  </span>
                  <span className="text-[10px] font-bold text-cyan-600 mt-0.5">
                    {appVibration ? 'Getar Aktif' : 'Senyap'}
                  </span>
                </button>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Konten Form & Desktop Tree Menu */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* DESKTOP TREE MENU (Sidebar Kolom Kiri 1/4) */}
        <div className="hidden lg:block lg:col-span-1 space-y-3">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-sky-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
              Menu Pengaturan
            </h3>

            {/* Tree Branch 1: Personal (Profil & Keamanan) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-800">
                <User className="w-3.5 h-3.5 text-cyan-600" />
                <span>Personal</span>
              </div>
              <div className="pl-4 space-y-1 border-l-2 border-sky-100 ml-3">
                <button
                  onClick={() => {
                    setSettingsCategory('personal')
                    setSettingsActiveSubTab('account')
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    settingsActiveSubTab === 'account'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-cyan-50/60 hover:text-cyan-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Profil &amp; Kata Sandi</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Tree Branch 2: Pengaturan NOC & Jaringan (Khusus Super Admin & Admin) */}
            {!isTeknisi && (
              <div className="space-y-1 pt-2 border-t border-sky-100">
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-800">
                  <Sliders className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Pengaturan NOC</span>
                </div>
                <div className="pl-4 space-y-1 border-l-2 border-sky-100 ml-3">
                  <button
                    onClick={() => {
                      setSettingsCategory('noc')
                      setSettingsActiveSubTab('thresholds')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      settingsActiveSubTab === 'thresholds'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-cyan-50/60 hover:text-cyan-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Parameter &amp; Redaman</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsCategory('noc')
                      setSettingsActiveSubTab('credentials')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      settingsActiveSubTab === 'credentials'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-cyan-50/60 hover:text-cyan-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Kredensial ONT</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-mono font-bold">
                      {modemCredentials.length}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsCategory('noc')
                      setSettingsActiveSubTab('notifications')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      settingsActiveSubTab === 'notifications'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-cyan-50/60 hover:text-cyan-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Notifikasi &amp; Jam Senyap</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3 Kolom Form Input (Desktop 3/4) */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-sky-200/80 shadow-sm">
          
          {/* TAB 1: PARAMETER & AMBANG BATAS (Khusus Super Admin & Admin) */}
          {!isTeknisi && settingsActiveSubTab === 'thresholds' && (
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Parameter</span>
                </button>
              </div>

              {/* Card Standar Redaman Baru Dinamis (Khusus Tampilan Desktop) */}
              <div className="hidden lg:block pt-3 border-t border-sky-100">
                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                    <Sliders className="w-4 h-4 text-cyan-600" />
                    <span>Ketentuan Ambang Batas Redaman (Aktif)</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between font-bold text-emerald-800">
                        <span>Sinyal Optimal</span>
                        <span className="font-mono">&gt; {Number(warnThreshold).toFixed(1)} dBm</span>
                      </div>
                      <p className="text-slate-600 text-[10px] mt-0.5">Koneksi prima &amp; throughput lancar.</p>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between font-bold text-amber-800">
                        <span>Peringatan Ringan</span>
                        <span className="font-mono">&le; {Number(warnThreshold).toFixed(1)} dBm</span>
                      </div>
                      <p className="text-amber-900 text-[10px] mt-0.5">Deteksi dini redaman mulai turun.</p>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                      <div className="flex items-center justify-between font-bold text-rose-800">
                        <span>Kritis / Alarm Merah</span>
                        <span className="font-mono">&le; {Number(critThreshold).toFixed(1)} dBm</span>
                      </div>
                      <p className="text-rose-900 text-[10px] mt-0.5">Gangguan serius, risiko tinggi LOS!</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: KREDENSIAL MODEM ONT (Khusus Super Admin & Admin) */}
          {!isTeknisi && settingsActiveSubTab === 'credentials' && (
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
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto min-h-[36px] cursor-pointer"
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
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                          ? 'hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Kredensial Modem</span>
                </button>
              </div>

              {/* Card Panduan Cara Kerja Multi-Kredensial (Khusus Desktop) */}
              <div className="hidden lg:block pt-3 border-t border-sky-100">
                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                    <KeyRound className="w-4 h-4 text-cyan-600" />
                    <span>Cara Kerja Multi-Kredensial Fallback</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                    <li>Sistem mencoba kredensial tersimpan milik pelanggan terlebih dahulu.</li>
                    <li>Jika ditolak, sistem mencoba semua username/password default di atas satu per satu.</li>
                    <li>Jika berhasil, status kredensial pelanggan otomatis diperbarui menjadi <code className="bg-emerald-100 px-1 rounded text-emerald-800 font-mono text-[10px]">VALID</code>.</li>
                  </ol>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFIKASI & PENGINGAT (Khusus Super Admin & Admin) */}
          {!isTeknisi && settingsActiveSubTab === 'notifications' && (
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

          {/* TAB 4: PROFIL & AKUN SAYA (Semua Role: Super Admin, Admin, & Teknisi) */}
          {(settingsActiveSubTab === 'account' || (isTeknisi && settingsActiveSubTab !== 'account')) && (
            <div className="space-y-5">
              <div className="border-b border-sky-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Profil &amp; Keamanan Akun Saya</h3>
                <p className="text-xs text-slate-500">Kelola identitas nama lengkap, kata sandi akses, dan sesi aktif akun NOC Anda.</p>
              </div>

              {profileSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Form Ubah Nama & Password */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Informasi Readonly Akun */}
                <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Username Login</span>
                    <span className="font-mono font-bold text-slate-900">{currentUser?.username || 'admin'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Hak Akses / Role</span>
                    <span className="font-bold text-cyan-800 uppercase text-[11px] bg-cyan-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {currentUser?.role || 'super admin'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Wilayah Kantor Diizinkan</span>
                    <span className="font-bold text-slate-800 uppercase text-[11px]">
                      {Array.isArray(currentUser?.allowed_kantor) ? currentUser.allowed_kantor.join(', ') : (currentUser?.allowed_kantor || 'SEMUA')}
                    </span>
                  </div>
                </div>

                {/* Input Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-600" />
                    <span>Nama Lengkap / Nama Karyawan</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    placeholder="Contoh: Raihan Agil / Teknisi NOC"
                    className="w-full rounded-xl border border-sky-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
                  />
                  <p className="text-[11px] text-slate-400">
                    Nama ini akan tercatat pada log aktivitas audit sistem saat melakukan tindakan operasional.
                  </p>
                </div>

                {/* Input Kata Sandi Baru */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-600" />
                    <span>Kata Sandi Baru (Kosongkan jika tidak ingin mengubah)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassBaru ? 'text' : 'password'}
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Masukkan kata sandi baru (minimal 6 karakter)"
                      className="w-full rounded-xl border border-sky-200 pl-3.5 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassBaru(!showPassBaru)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label="Toggle lihat password baru"
                    >
                      {showPassBaru ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Input Konfirmasi Kata Sandi Baru */}
                {passwordBaru && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-600" />
                      <span>Konfirmasi Kata Sandi Baru</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showKonfirmPass ? 'text' : 'password'}
                        value={konfirmPasswordBaru}
                        onChange={(e) => setKonfirmPasswordBaru(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru"
                        className="w-full rounded-xl border border-sky-200 pl-3.5 pr-10 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[42px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKonfirmPass(!showKonfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        aria-label="Toggle lihat konfirmasi password"
                      >
                        {showKonfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tombol Simpan Profil */}
                <div className="pt-3 border-t border-sky-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 transition min-h-[42px] cursor-pointer"
                  >
                    {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan Perubahan Akun</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* Seksi Logout Akun Sesi NOC (Diletakkan Permanen di Paling Bawah Pengaturan untuk Semua Role) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-rose-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Keluar dari Sesi TeknoGuard</span>
            </h4>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Akhiri sesi login aktif di perangkat ini secara aman dan kembali ke halaman login.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 min-h-[40px] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
