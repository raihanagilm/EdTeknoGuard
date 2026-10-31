import React from 'react'
import {
  Bell,
  Building2,
  MoreVertical,
  LogOut
} from 'lucide-react'
import { NotificationsView } from '../NotificationsView'

export function AppHeader({
  activeTab,
  isNotificationOpen,
  setIsNotificationOpen,
  totalUnreadNotifications,
  notificationList,
  activeOffice,
  currentUser,
  handleNotificationItemClick,
  handleDismissNotificationItem,
  handleMarkAllNotificationsRead,
  notificationLoading,
  kantorList,
  handleSwitchOffice,
  headerMenuRef,
  headerMenuOpen,
  setHeaderMenuOpen,
  handleLogout
}) {
  const tabTitles = {
    beranda: 'Beranda Pemantauan',
    riwayat: 'Riwayat Redaman',
    kuota: 'Pemantauan Kuota',
    pelanggan: 'Data Pelanggan',
    tiket: 'Tiket Keluhan',
    log: 'Log Aktivitas',
    'manajemen-kantor': 'Manajemen Kantor & Akun',
    pengguna: 'Manajemen Pengguna',
    kantor: 'Manajemen Kantor',
    pengaturan: 'Pengaturan Sistem'
  }

  // Hitung kantor yang diizinkan untuk user aktif
  let allowedCodes = []
  if (currentUser?.role === 'super admin') {
    allowedCodes = kantorList.map((k) => k.kode)
  } else if (Array.isArray(currentUser?.allowed_kantor)) {
    allowedCodes = currentUser.allowed_kantor
  } else if (typeof currentUser?.allowed_kantor === 'string') {
    try {
      const parsed = JSON.parse(currentUser.allowed_kantor)
      allowedCodes = Array.isArray(parsed) ? parsed : [currentUser.allowed_kantor]
    } catch {
      allowedCodes = currentUser.allowed_kantor.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }

  const visibleKantors = kantorList.filter(
    (k) => currentUser?.role === 'super admin' || allowedCodes.includes(k.kode)
  )

  const cleanOfficeName = (name, code) => {
    if (!name) return code ? code.toUpperCase() : 'Kantor'
    return name.replace(/^Kantor\s+/i, '').trim()
  }

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-sky-200/80 sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs font-mono font-bold text-cyan-800 uppercase tracking-wide">
          {tabTitles[activeTab] || `Modul ${activeTab}`}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Ikon Lonceng Notifikasi */}
        <div className="relative">
          <button
            id="btn-bell-notification"
            type="button"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isNotificationOpen
                ? 'bg-cyan-600 text-white border-cyan-700 shadow-md ring-2 ring-cyan-400/40'
                : 'bg-cyan-50/80 hover:bg-cyan-100 text-cyan-700 border-sky-200/80'
            }`}
            title="Pusat Notifikasi Pemantauan & Tiket"
            aria-label="Pusat Notifikasi Pemantauan & Tiket"
          >
            <Bell className="w-4 h-4" />
            {totalUnreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center px-1 border-2 border-white animate-pulse">
                {totalUnreadNotifications}
              </span>
            )}
          </button>

          <NotificationsView
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notificationList}
            unreadCount={totalUnreadNotifications}
            activeOffice={activeOffice}
            currentUser={currentUser}
            onItemClick={handleNotificationItemClick}
            onDismissItem={handleDismissNotificationItem}
            onMarkAllRead={handleMarkAllNotificationsRead}
            loading={notificationLoading}
          />
        </div>

        {/* Office Switcher Dropdown */}
        <div className="flex items-center gap-1.5 pl-2 sm:pl-2.5 rounded-xl border border-sky-200 text-xs font-mono transition bg-white/60">
          <Building2 className="w-4 h-4 text-cyan-800 shrink-0" />
          <span className="text-[11px] font-bold text-slate-600 uppercase hidden md:inline">Kantor:</span>
          <select
            value={activeOffice}
            onChange={(e) => handleSwitchOffice(e.target.value)}
            className="bg-transparent text-cyan-950 font-bold focus:outline-none cursor-pointer pr-1 py-1 text-xs"
            title="Pilih Wilayah Kantor Operasional"
          >
            {visibleKantors.length > 0 ? (
              visibleKantors.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {cleanOfficeName(k.nama, k.kode)}
                </option>
              ))
            ) : (
              <option value={activeOffice}>{activeOffice.toUpperCase()}</option>
            )}
          </select>
        </div>

        {/* Tombol Titik Tiga (More Menu & Logout Dropdown) */}
        <div className="relative" ref={headerMenuRef}>
          <button
            type="button"
            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer flex items-center justify-center"
            title="Menu Akun & Sesi"
            aria-label="Menu Akun dan Sesi"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {headerMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-sky-200/90 shadow-xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 bg-cyan-50/60 rounded-xl border border-cyan-100/80 mb-1">
                <span className="block text-xs font-bold text-slate-900 truncate">
                  {currentUser?.nama_lengkap || 'Administrator'}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">@{currentUser?.username || 'user'}</span>
                  <span className="text-[9px] uppercase font-bold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded-md">
                    {currentUser?.role || 'user'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHeaderMenuOpen(false)
                  handleLogout()
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/60 hover:bg-rose-100 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Keluar Akun (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

