import React from 'react'
import {
  Users,
  History,
  Activity,
  Ticket,
  ScrollText,
  Building2,
  Sliders
} from 'lucide-react'

/**
 * DashboardQuickShortcuts (Impeccable Refactor)
 * Mode: Operate (Mission-Control Telemetry Grid)
 * - Anti-Slop: Zero sparkles/kicker tropes, zero pseudo-monospace on natural copy
 * - Tactile Feedback: Crisp border definition with subtle hover elevation
 * - Maintainable: DRY mapped array under 80 lines
 */
export function DashboardQuickShortcuts({
  currentUser,
  onNavigate,
  unreadTicketsCount = 0
}) {
  const isSuperAdmin = currentUser?.role === 'super admin'
  const isTeknisi = currentUser?.role === 'teknisi'

  const shortcuts = [
    {
      id: 'pelanggan',
      label: 'Pelanggan',
      icon: Users,
      show: true,
      onClick: () => onNavigate('pelanggan')
    },
    {
      id: 'riwayat',
      label: 'Riwayat',
      icon: History,
      show: true,
      onClick: () => onNavigate('riwayat')
    },
    {
      id: 'kuota',
      label: 'Kuota',
      icon: Activity,
      show: true,
      onClick: () => onNavigate('kuota')
    },
    {
      id: 'tiket',
      label: 'Tiket',
      icon: Ticket,
      show: true,
      badge: unreadTicketsCount,
      onClick: () => onNavigate('tiket')
    },
    {
      id: 'log',
      label: 'Log Sistem',
      icon: ScrollText,
      show: !isTeknisi,
      onClick: () => onNavigate('log')
    },
    {
      id: 'manajemen-kantor',
      label: 'Kantor',
      icon: Building2,
      show: isSuperAdmin,
      onClick: () => onNavigate('manajemen-kantor')
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan',
      icon: Sliders,
      show: true,
      onClick: () => onNavigate('pengaturan', isTeknisi ? 'account' : 'thresholds')
    }
  ].filter((item) => item.show)

  return (
    <section id="dashboardQuickShortcuts" className="lg:hidden bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs mb-3">
      {/* Telemetry Section Header (Pure Semantic Heading - No Decorative Dot/Halo) */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
          Modul Operasional
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">
          Akses Cepat
        </span>
      </div>

      {/* Tactile Fast-Action Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {shortcuts.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="group relative flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50/70 hover:bg-cyan-50/40 active:bg-cyan-100/50 border border-slate-200/70 hover:border-cyan-300 transition-all duration-150 text-center min-h-[62px] active:scale-[0.98] cursor-pointer"
            >
              {/* Icon Container with subtle high-taste contrast */}
              <div className="h-8 w-8 rounded-md bg-white border border-slate-200/60 shadow-2xs flex items-center justify-center mb-1 text-slate-600 group-hover:text-cyan-700 group-hover:border-cyan-200 transition-colors">
                <Icon className="w-4 h-4" />
              </div>

              {/* Natural Typography (No fake monospace on natural copy) */}
              <span className="text-[11px] font-medium text-slate-700 group-hover:text-cyan-950 transition-colors tracking-tight truncate max-w-full px-0.5">
                {item.label}
              </span>

              {/* Unread Indicator Badge */}
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[16px] text-center text-[9px] font-bold font-mono tabular-nums text-white bg-rose-600 rounded-full ring-2 ring-white shadow-2xs">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
