import React from 'react'
import {
  Bell,
  Building2,
  MoreVertical,
  LogOut
} from 'lucide-react'
import { NotificationsView } from '../notifications/NotificationsView'

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
    <header className="h-14 bg-white border-b border-[#CCDDF0] sticky top-0 z-40 px-3 sm:px-7 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-xs font-mono font-bold text-[#0B2545] uppercase tracking-wider truncate">
          {tabTitles[activeTab] || `Modul ${activeTab}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Ikon Lonceng Notifikasi */}
        <div className="relative">
          <button
            id="btn-bell-notification"
            type="button"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className={`relative p-1.5 sm:p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
              isNotificationOpen
                ? 'bg-[#026AA7] text-white border-[#035388] shadow-sm'
                : 'bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#026AA7] border-[#CCDDF0]'
            }`}
            title="Pusat Notifikasi Pemantauan & Tiket"
            aria-label="Pusat Notifikasi Pemantauan & Tiket"
          >
            <Bell className="w-4 h-4 text-[#026AA7]" />
            {totalUnreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-[#026AA7] text-white rounded text-[9px] font-mono font-bold flex items-center justify-center px-0.5 tabular-nums">
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
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#CCDDF0] bg-[#F1F6FC] text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#026AA7] shrink-0" />
          <span className="text-[11px] font-mono font-semibold text-[#3B5B78] uppercase hidden md:inline">Kantor:</span>
          <select
            value={activeOffice}
            onChange={(e) => handleSwitchOffice(e.target.value)}
            className="bg-transparent text-[#0B2545] font-bold focus:outline-none cursor-pointer pr-1 text-xs"
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
            className="p-1.5 sm:p-2 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#3B5B78] hover:text-[#0B2545] border border-[#CCDDF0] transition cursor-pointer flex items-center justify-center"
            title="Menu Akun & Sesi"
            aria-label="Menu Akun dan Sesi"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {headerMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#CCDDF0] shadow-xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0] mb-1">
                <span className="block text-xs font-semibold text-[#0B2545] truncate">
                  {currentUser?.nama_lengkap || 'Administrator'}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-[#64839E] font-mono">@{currentUser?.username || 'user'}</span>
                  <span className="text-[9px] uppercase font-bold text-[#026AA7] bg-[#E0F0FF] px-1.5 py-0.5 rounded">
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
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
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

