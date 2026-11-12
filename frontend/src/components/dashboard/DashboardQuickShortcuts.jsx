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
 * DashboardQuickShortcuts
 * Mode: Operate (Mission-Control Telemetry Grid)
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
    <section id="dashboardQuickShortcuts" className="lg:hidden bg-white p-3.5 sm:p-4 rounded-xl border border-[#CCDDF0] shadow-2xs mb-3">
      {/* Telemetry Section Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold text-[#0B2545] tracking-tight">
          Modul Operasional
        </h3>
        <span className="text-[11px] text-[#64839E] font-medium">
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
              className="group relative flex flex-col items-center justify-center p-2 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] border border-[#CCDDF0] transition-all duration-150 text-center min-h-[62px] active:scale-[0.98] cursor-pointer"
            >
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono font-bold">
                  {item.badge}
                </span>
              )}
              <Icon className="w-4 h-4 text-[#026AA7] group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-[11px] font-semibold text-[#0B2545] mt-1.5 tracking-tight truncate w-full">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
