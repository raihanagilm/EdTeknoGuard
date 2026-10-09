import React from 'react'
import {
  Radio,
  LayoutGrid,
  History,
  Activity,
  Users,
  Ticket,
  ScrollText,
  ShieldAlert,
  Sliders,
  LogOut
} from 'lucide-react'

export function Sidebar({ activeTab, setActiveTab, onLogout, currentUser = { role: 'super admin', nama_lengkap: 'Admin NOC', username: 'admin' }, unreadTickets = 0 }) {
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
        { id: 'tiket', label: 'Tiket Keluhan', icon: Ticket, badge: unreadTickets > 0 ? unreadTickets : null, visible: true }
      ]
    },
    {
      title: 'Sistem & Audit',
      items: [
        { id: 'log', label: 'Log Aktivitas', icon: ScrollText, visible: !isTeknisi },
        { id: 'pengguna', label: 'Manajemen Pengguna', icon: ShieldAlert, visible: isSuperAdmin },
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
    <aside className="hidden lg:flex w-60 bg-white/95 backdrop-blur-md flex-col fixed inset-y-0 z-40 border-r border-sky-200/80 shadow-sm">
      {/* Header Identitas */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sky-100 bg-gradient-to-r from-cyan-50/50 to-sky-50/50">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 tracking-tight leading-none">
              Tekno<span className="text-cyan-600">Guard</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">NOC RESMI NOC</div>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-cyan-100 border border-cyan-300 text-[9px] font-mono text-cyan-800 font-bold">
          AKTIF
        </span>
      </div>

      {/* Menu Navigasi Modul */}
      <div className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto text-xs font-semibold text-slate-600 scrollbar-thin">
        {menuSections.map((sec, sIdx) => {
          const visibleItems = sec.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-800/70">
                {sec.title}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition text-left text-xs ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 to-sky-500/15 text-cyan-900 font-bold border border-cyan-300/80 shadow-2xs'
                        : 'hover:bg-cyan-50/50 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black animate-pulse">
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
      <div className="p-3 border-t border-sky-100 bg-cyan-50/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-600 text-white font-mono text-xs flex items-center justify-center font-bold shrink-0">
              {getInitials(currentUser?.nama_lengkap || currentUser?.username)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.nama_lengkap || currentUser?.username || 'Admin NOC'}
              </div>
              <div className="text-[9px] text-slate-400 font-mono capitalize">
                {currentUser?.role || 'super admin'}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition shrink-0"
            title="Keluar Sesi"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ activeTab, setActiveTab, unreadTickets = 0 }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-sky-200 z-40 h-14 flex items-center px-1 shadow-md">
      <div className="grid grid-cols-5 w-full items-center text-xs">
        <button
          onClick={() => setActiveTab('pelanggan')}
          className={`flex flex-col items-center justify-center min-h-[40px] ${activeTab === 'pelanggan' ? 'text-cyan-600 font-bold' : 'text-slate-400'}`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Pelanggan</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center justify-center min-h-[40px] ${activeTab === 'riwayat' ? 'text-cyan-600 font-bold' : 'text-slate-400'}`}
        >
          <History className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Riwayat</span>
        </button>

        <button
          onClick={() => setActiveTab('beranda')}
          className="flex flex-col items-center justify-center -mt-3 min-h-[40px]"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 border-2 border-white">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-black text-cyan-800 mt-0.5">Beranda</span>
        </button>

        <button
          onClick={() => setActiveTab('tiket')}
          className={`flex flex-col items-center justify-center min-h-[40px] relative ${activeTab === 'tiket' ? 'text-cyan-600 font-bold' : 'text-slate-400'}`}
        >
          <Ticket className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Tiket</span>
          {unreadTickets > 0 && (
            <span className="absolute top-1 right-3.5 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black font-mono">
              {unreadTickets}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pengaturan')}
          className={`flex flex-col items-center justify-center min-h-[40px] ${activeTab === 'pengaturan' ? 'text-cyan-600 font-bold' : 'text-slate-400'}`}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Pengaturan</span>
        </button>
      </div>
    </nav>
  );
}
