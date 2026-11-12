import React from 'react'
import {
  LayoutGrid,
  History,
  Activity,
  Users,
  Ticket,
  ScrollText,
  Building2,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export function Sidebar({
  activeTab,
  setActiveTab,
  onLogout,
  currentUser = { role: 'super admin', nama_lengkap: 'Admin NOC', username: 'admin' },
  unreadTickets = 0,
  isCollapsed = false,
  setIsCollapsed = () => {}
}) {
  const isSuperAdmin = currentUser?.role === 'super admin';
  const isTeknisi = currentUser?.role === 'teknisi';

  const menuSections = [
    {
      title: 'Pemantauan Jaringan',
      items: [
        { id: 'beranda', label: 'Beranda Pemantauan', icon: LayoutGrid, visible: true },
        { id: 'riwayat', label: 'Riwayat Redaman', icon: History, visible: true },
        { id: 'kuota', label: 'Pemantauan Kuota', icon: Activity, visible: true }
      ]
    },
    {
      title: 'Layanan & Pelanggan',
      items: [
        { id: 'pelanggan', label: 'Data Pelanggan', icon: Users, visible: true },
        { id: 'tiket', label: 'Tiket Keluhan', icon: Ticket, visible: true, badge: unreadTickets > 0 ? unreadTickets : null }
      ]
    },
    {
      title: 'Sistem & Audit',
      items: [
        { id: 'log', label: 'Log Aktivitas', icon: ScrollText, visible: !isTeknisi },
        { id: 'manajemen-kantor', label: 'Manajemen Kantor', icon: Building2, visible: isSuperAdmin },
        { id: 'pengaturan', label: 'Pengaturan Sistem', icon: Sliders, visible: !isTeknisi }
      ]
    }
  ];

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`hidden lg:flex bg-[#0B2545] flex-col fixed inset-y-0 left-0 z-50 border-r border-[#1E437A] select-none shadow-sm transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-14 flex items-center border-b border-[#1E437A] ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#026AA7] flex items-center justify-center text-white shadow-xs overflow-hidden shrink-0">
            <img
              src="/tekno-indo-logo.png"
              alt="Tekno Indo"
              className="w-5 h-5 object-contain"
              onError={(e) => {
                // Fallback jika path logo berbeda
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-white tracking-tight leading-none truncate">
                Tekno<span className="text-sky-300">Guard</span>
              </div>
              <div className="text-[10px] text-sky-200/75 font-mono font-semibold mt-1 tracking-tight truncate">
                OPTICAL SURVEILLANCE
              </div>
            </div>
          )}
        </div>

        {/* Tombol Toggle Collapse Sidebar */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg text-sky-200/75 hover:text-white hover:bg-[#13315C] transition shrink-0 cursor-pointer ${
            isCollapsed ? 'hidden' : 'block'
          }`}
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar (Mini Icons)'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Mini Toggle saat collapsed */}
      {isCollapsed && (
        <div className="py-2 flex justify-center border-b border-[#1E437A]/50 bg-[#0B2545]">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg text-sky-200/75 hover:text-white hover:bg-[#13315C] transition cursor-pointer"
            title="Perluas Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Menu Navigasi Modul */}
      <div className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto text-xs font-semibold scrollbar-thin">
        {menuSections.map((sec, sIdx) => {
          const visibleItems = sec.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-200/60 truncate">
                  {sec.title}
                </div>
              )}
              {isCollapsed && sIdx > 0 && (
                <div className="my-2 border-t border-[#1E437A]/60" />
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                    className={`w-full flex items-center rounded-lg transition text-left text-xs cursor-pointer ${
                      isCollapsed
                        ? 'justify-center p-2.5'
                        : 'justify-between px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-[#026AA7] text-white font-semibold shadow-xs'
                        : 'text-sky-100/80 hover:bg-[#13315C] hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 relative">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-200' : 'text-sky-300/75'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {isCollapsed && item.badge && (
                        <span className="absolute -top-1.5 -right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0B2545]" />
                      )}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Profil User */}
      <div className={`border-t border-[#1E437A] bg-[#0B2545] ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <div
            className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}
            title={isCollapsed ? `${currentUser?.nama_lengkap || currentUser?.username} (${currentUser?.role})` : undefined}
          >
            <div className="h-8 w-8 rounded-lg bg-[#13315C] border border-[#1E437A] text-sky-200 font-mono text-xs flex items-center justify-center font-bold shrink-0">
              {getInitials(currentUser?.nama_lengkap || currentUser?.username)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.nama_lengkap || currentUser?.username || 'Admin NOC'}
                </div>
                <div className="text-[11px] text-sky-200/75 font-mono capitalize truncate">
                  {currentUser?.role || 'super admin'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-sky-200/75 hover:text-white hover:bg-[#13315C] transition shrink-0 cursor-pointer"
            title="Keluar Sesi"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ activeTab, setActiveTab, unreadTickets = 0 }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#CCDDF0] z-50 h-16 flex items-center px-1 shadow-md">
      <div className="grid grid-cols-5 w-full items-center text-xs">
        <button
          onClick={() => setActiveTab('pelanggan')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${activeTab === 'pelanggan' ? 'text-[#026AA7] font-bold' : 'text-[#3B5B78]'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-0.5">Pelanggan</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${activeTab === 'riwayat' ? 'text-[#026AA7] font-bold' : 'text-[#3B5B78]'}`}
        >
          <History className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-0.5">Riwayat</span>
        </button>

        <button
          onClick={() => setActiveTab('beranda')}
          className="flex flex-col items-center justify-center -mt-3 min-h-[48px]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#026AA7] text-white flex items-center justify-center shadow-md shadow-[#0B2545]/20 border-2 border-white">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black text-[#0B2545] mt-0.5">Beranda</span>
        </button>

        <button
          onClick={() => setActiveTab('tiket')}
          className={`flex flex-col items-center justify-center min-h-[48px] relative ${activeTab === 'tiket' ? 'text-[#026AA7] font-bold' : 'text-[#3B5B78]'}`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-0.5">Tiket</span>
          {unreadTickets > 0 && (
            <span className="absolute top-1 right-3 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-bold font-mono">
              {unreadTickets}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pengaturan')}
          className={`flex flex-col items-center justify-center min-h-[48px] ${activeTab === 'pengaturan' ? 'text-[#026AA7] font-bold' : 'text-[#3B5B78]'}`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-0.5">Pengaturan</span>
        </button>
      </div>
    </nav>
  );
}
