import React, { useState, useEffect } from 'react'
import {
  Sliders,
  SlidersHorizontal,
  KeyRound,
  Bell,
  User,
  Lock
} from 'lucide-react'
import { ToastNotification } from '../common/ToastNotification'
import { SettingsThresholdTab } from './SettingsThresholdTab'
import { SettingsCredentialsTab } from './SettingsCredentialsTab'
import { SettingsNotificationsTab } from './SettingsNotificationsTab'
import { SettingsProfileTab } from './SettingsProfileTab'

export function SettingsView({
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
  dragOverCredIdx,
  handleCredDragStart,
  handleCredDragOver,
  handleCredDrop,
  handleCredDragEnd,
  fetchBackendSettings,
  onOpenConfirmModal,
  currentUser,
  setCurrentUser,
  onLogout,
  activeOffice
}) {
  // Pesan hasil aksi profil dipegang di sini karena toast-nya milik shell pengaturan,
  // sedangkan form dan state-nya berada di dalam SettingsProfileTab.
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

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
    } else if (settingsActiveSubTab === 'mikrotik') {
      setSettingsActiveSubTab('thresholds')
    }
  }, [isTeknisi, settingsActiveSubTab, setSettingsActiveSubTab])

  // Muat data pengaturan real dari database saat modul pengaturan dibuka atau kantor aktif berganti
  useEffect(() => {
    if (fetchBackendSettings && !isTeknisi) {
      fetchBackendSettings(activeOffice)
    }
  }, [activeOffice, isTeknisi])

  return (
    <div className="space-y-4">
      {/* Floating Toast Notification */}
      <ToastNotification
        show={Boolean(!isTeknisi && settingsSaveSuccess)}
        type="success"
        title="Pengaturan Tersimpan"
        message="Konfigurasi sistem berhasil disimpan dan diterapkan ke server backend database lokal!"
      />
      <ToastNotification
        show={Boolean(!isTeknisi && settingsSaveError)}
        type="error"
        title="Gagal Menyimpan"
        message={typeof settingsSaveError === 'string' ? settingsSaveError : JSON.stringify(settingsSaveError)}
      />
      <ToastNotification
        show={Boolean(profileSuccess)}
        type="success"
        title="Profil Diperbarui"
        message={profileSuccess}
      />
      <ToastNotification
        show={Boolean(profileError)}
        type="error"
        title="Gagal Memperbarui"
        message={profileError}
      />

      {/* Mobile Switcher */}
      <div className="space-y-3">

        {/* 1. MOBILE SEGMENTED SWITCHER (Ala App DANA: Personal vs Pengaturan NOC) */}
        <div className="lg:hidden space-y-2.5">
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                setSettingsCategory('personal')
                setSettingsActiveSubTab('account')
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${settingsCategory === 'personal' || isTeknisi
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${settingsCategory === 'noc'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Pengaturan NOC</span>
              </button>
            )}
          </div>

          {/* Grid Menu Simpel (Hanya Ikon Bersih, Tanpa Border Kotak, Tanpa Background Bulat, Tanpa Badge Angka) */}
          {!isTeknisi && settingsCategory === 'noc' && (
            <div className="p-2 bg-white/95 rounded-2xl border border-sky-100 shadow-xs animate-in fade-in duration-200">
              <div className="grid grid-cols-3 gap-1">

                {/* 1. Parameter Redaman */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('thresholds')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition cursor-pointer text-center ${settingsActiveSubTab === 'thresholds'
                    ? 'text-cyan-700 font-black'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                    }`}
                >
                  <SlidersHorizontal className={`w-5 h-5 mb-1 transition ${settingsActiveSubTab === 'thresholds' ? 'text-cyan-600 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'
                    }`} />
                  <span className="text-[11px] leading-tight font-bold">
                    Parameter
                  </span>
                </button>

                {/* 2. Kredensial ONT */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('credentials')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition cursor-pointer text-center ${settingsActiveSubTab === 'credentials'
                    ? 'text-cyan-700 font-black'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                    }`}
                >
                  <KeyRound className={`w-5 h-5 mb-1 transition ${settingsActiveSubTab === 'credentials' ? 'text-cyan-600 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'
                    }`} />
                  <span className="text-[11px] leading-tight font-bold">
                    Kredensial ONT
                  </span>
                </button>

                {/* 3. Notifikasi */}
                <button
                  type="button"
                  onClick={() => setSettingsActiveSubTab('notifications')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition cursor-pointer text-center ${settingsActiveSubTab === 'notifications'
                    ? 'text-cyan-700 font-black'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                    }`}
                >
                  <Bell className={`w-5 h-5 mb-1 transition ${settingsActiveSubTab === 'notifications' ? 'text-cyan-600 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'
                    }`} />
                  <span className="text-[11px] leading-tight font-bold">
                    Notifikasi
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
          <div className="bg-white rounded-xl p-4 border border-[#CCDDF0] shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] px-1 font-mono">
              Menu Pengaturan
            </h3>

            {/* Tree Branch 1: Personal (Profil & Keamanan) */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#0B2545]">
                <User className="w-3.5 h-3.5 text-[#026AA7]" />
                <span>Personal</span>
              </div>
              <div className="pl-4 space-y-1 border-l-2 border-[#DAE7F5] ml-3">
                <button
                  onClick={() => {
                    setSettingsCategory('personal')
                    setSettingsActiveSubTab('account')
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${settingsActiveSubTab === 'account'
                    ? 'bg-[#026AA7] text-white shadow-2xs'
                    : 'text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545]'
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
              <div className="space-y-1 pt-2 border-t border-[#DAE7F5]">
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#0B2545]">
                  <Sliders className="w-3.5 h-3.5 text-[#026AA7]" />
                  <span>Pengaturan NOC</span>
                </div>
                <div className="pl-4 space-y-1 border-l-2 border-[#DAE7F5] ml-3">
                  <button
                    onClick={() => {
                      setSettingsCategory('noc')
                      setSettingsActiveSubTab('thresholds')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${settingsActiveSubTab === 'thresholds'
                      ? 'bg-[#026AA7] text-white shadow-2xs'
                      : 'text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545]'
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${settingsActiveSubTab === 'credentials'
                      ? 'bg-[#026AA7] text-white shadow-2xs'
                      : 'text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545]'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Kredensial ONT</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsCategory('noc')
                      setSettingsActiveSubTab('notifications')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${settingsActiveSubTab === 'notifications'
                      ? 'bg-[#026AA7] text-white shadow-2xs'
                      : 'text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545]'
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
        <div className="lg:col-span-3 bg-white rounded-xl p-5 border border-[#CCDDF0] shadow-2xs">

          {/* TAB 1: PARAMETER & AMBANG BATAS (Khusus Super Admin & Admin) */}
          {!isTeknisi && (settingsActiveSubTab === 'thresholds' || settingsActiveSubTab === 'threshold') && (
            <SettingsThresholdTab
              onOpenConfirmModal={onOpenConfirmModal}
              settingsLoading={settingsLoading}
              pollingInterval={pollingInterval}
              setPollingInterval={setPollingInterval}
              warnThreshold={warnThreshold}
              setWarnThreshold={setWarnThreshold}
              critThreshold={critThreshold}
              setCritThreshold={setCritThreshold}
            />
          )}

          {/* TAB 2: KREDENSIAL MODEM ONT (Khusus Super Admin & Admin) */}
          {!isTeknisi && settingsActiveSubTab === 'credentials' && (
            <SettingsCredentialsTab
              onOpenConfirmModal={onOpenConfirmModal}
              settingsLoading={settingsLoading}
              modemCredentials={modemCredentials}
              addModemCredentialRow={addModemCredentialRow}
              removeModemCredentialRow={removeModemCredentialRow}
              updateModemCredentialRow={updateModemCredentialRow}
              showModemPasswords={showModemPasswords}
              toggleModemPasswordVisibility={toggleModemPasswordVisibility}
              applyToInvalid={applyToInvalid}
              setApplyToInvalid={setApplyToInvalid}
              dragOverCredIdx={dragOverCredIdx}
              handleCredDragStart={handleCredDragStart}
              handleCredDragOver={handleCredDragOver}
              handleCredDrop={handleCredDrop}
              handleCredDragEnd={handleCredDragEnd}
            />
          )}

          {/* TAB 3: NOTIFIKASI & PENGINGAT (Khusus Super Admin & Admin) */}
          {!isTeknisi && settingsActiveSubTab === 'notifications' && (
            <SettingsNotificationsTab
              onOpenConfirmModal={onOpenConfirmModal}
              settingsLoading={settingsLoading}
              alertWaitingInterval={alertWaitingInterval}
              setAlertWaitingInterval={setAlertWaitingInterval}
              nightModeEnabled={nightModeEnabled}
              setNightModeEnabled={setNightModeEnabled}
              nightModeStart={nightModeStart}
              setNightModeStart={setNightModeStart}
              nightModeEnd={nightModeEnd}
              setNightModeEnd={setNightModeEnd}
            />
          )}

          {/* TAB 4: PROFIL & AKUN SAYA (Semua Role: Super Admin, Admin, & Teknisi) - Gaya TeknoCust */}
          {(settingsActiveSubTab === 'account' || (isTeknisi && settingsActiveSubTab !== 'account')) && (
            <SettingsProfileTab
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onLogout={onLogout}
              setProfileSuccess={setProfileSuccess}
              setProfileError={setProfileError}
              appVibration={appVibration}
              setAppVibration={setAppVibration}
            />
          )}

        </div>

      </div>

    </div>
  )
}
