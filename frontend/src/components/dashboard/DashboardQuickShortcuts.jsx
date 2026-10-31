import React from 'react'
import {
  Users,
  History,
  Activity,
  Ticket,
  ScrollText,
  Building2,
  Sliders,
  Sparkles
} from 'lucide-react'

export function DashboardQuickShortcuts({
  currentUser,
  onNavigate,
  unreadTicketsCount = 0
}) {
  const isSuperAdmin = currentUser?.role === 'super admin'

  return (
    <section id="dashboardQuickShortcuts" className="bg-white p-3 sm:p-4 rounded-2xl border border-sky-100 shadow-xs mb-3">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
          Akses Cepat Modul Utama
        </h3>
        <span className="text-[10px] sm:text-xs text-slate-600 font-mono">Pintasan Fitur</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2">
        {/* 1. Data Pelanggan */}
        <button
          onClick={() => onNavigate('pelanggan')}
          className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Data Pelanggan</span>
        </button>

        {/* 2. Riwayat Redaman */}
        <button
          onClick={() => onNavigate('riwayat')}
          className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Riwayat Redaman</span>
        </button>

        {/* 3. Pemantauan Kuota */}
        <button
          onClick={() => onNavigate('kuota')}
          className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Pemantauan Kuota</span>
        </button>

        {/* 4. Tiket Keluhan */}
        <button
          onClick={() => onNavigate('tiket')}
          className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center relative min-h-[58px]"
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition relative">
            <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadTicketsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 min-w-[15px] text-center text-[9px] font-black text-white bg-rose-600 rounded-full border border-white shadow-xs">
                {unreadTicketsCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Tiket Keluhan</span>
        </button>

        {/* 5. Log Aktivitas */}
        {currentUser?.role !== 'teknisi' && (
          <button
            onClick={() => onNavigate('log')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <ScrollText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Log Aktivitas</span>
          </button>
        )}

        {/* 6. Manajemen Kantor */}
        {isSuperAdmin && (
          <button
            onClick={() => onNavigate('manajemen-kantor')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Manajemen Kantor</span>
          </button>
        )}

        {/* 7. Pengaturan Sistem */}
        <button
          onClick={() => onNavigate('pengaturan', currentUser?.role === 'teknisi' ? 'account' : 'thresholds')}
          className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
        >
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Pengaturan Sistem</span>
        </button>
      </div>
    </section>
  )
}

