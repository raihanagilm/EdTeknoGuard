import React from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  ArrowUpDown,
  Send,
  BellOff,
  Phone
} from 'lucide-react'
import { DesktopTableSkeleton, MobileCardStackSkeleton } from '../common/DeviceAdaptiveSkeleton'
import { DataTableContainer, BillingModeLabel } from '../common/CommonUI'

export function BillingTable({
  data = [],
  loading = false,
  selectedIds = [],
  onToggleSelect,
  onSelectAllCurrentPage,
  onSyncSingle,
  syncingId,
  onCopyVA,
  copiedVA,
  pagination = {},
  onPageChange,
  onLimitChange,
  onNavigateCustomer,
  sortField = '',
  sortDir = 'asc',
  onSort
}) {
  const { page = 1, total_pages = 1, total_records = 0, limit = 15 } = pagination
  const allSelected = data.length > 0 && data.every((p) => selectedIds.includes(p.id_pelanggan))
  const formatRupiah = (val) => `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`
  const renderBillingModeLabel = (mode) => <BillingModeLabel mode={mode} />

  const renderStatusBadge = (p) => {
    if (p.status_pembayaran === 'LUNAS') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Lunas</span>
        </span>
      )
    }
    const isOverdue = p.is_overdue || p.status_pembayaran === 'OVERDUE'
    const Icon = isOverdue ? AlertTriangle : Clock
    const textColor = isOverdue ? 'text-rose-600' : 'text-amber-600'
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${textColor}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{isOverdue ? 'Jatuh Tempo' : 'Belum Bayar'}</span>
      </span>
    )
  }

  const renderReminderBadge = (p) => {
    if (p.status_pembayaran === 'LUNAS') {
      return null
    }
    if (p.has_reminder) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"
          title={p.last_reminder_full ? `Terakhir diingatkan: ${p.last_reminder_full}` : 'Sudah dikirimi pengingat'}
        >
          <Send className="w-3 h-3 shrink-0 text-emerald-600" />
          <span>Diingatkan {p.last_reminder}</span>
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"
        title="Belum pernah dikirimi pengingat tagihan"
      >
        <BellOff className="w-3 h-3 shrink-0 text-slate-400" />
        <span>Belum Diingatkan</span>
      </span>
    )
  }

  return (
    <DataTableContainer
      page={page}
      totalPages={total_pages}
      totalCount={total_records}
      limit={limit}
      onLimitChange={onLimitChange}
      onPageChange={onPageChange}
      onPrevPage={() => onPageChange && onPageChange(Math.max(1, page - 1))}
      onNextPage={() => onPageChange && onPageChange(Math.min(total_pages, page + 1))}
      loading={loading}
    >
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F1F6FC] border-b border-[#CCDDF0] text-[#3B5B78] font-sans text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAllCurrentPage}
                  className="rounded border-slate-300 text-[#026AA7] focus:ring-[#026AA7] cursor-pointer"
                />
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'nama' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'nama' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('nama')}
                title="Urutkan berdasarkan Nama Pelanggan"
              >
                <div className="flex items-center gap-1.5">
                  <span>Pelanggan</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'nama' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'nama' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'no_wa' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'no_wa' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('no_wa')}
                title="Urutkan berdasarkan Kontak WhatsApp"
              >
                <div className="flex items-center gap-1.5">
                  <span>Kontak WA</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'no_wa' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'no_wa' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'total_tagihan' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'total_tagihan' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('total_tagihan')}
                title="Urutkan berdasarkan Total Tagihan"
              >
                <div className="flex items-center gap-1.5">
                  <span>Tagihan & Periode</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'total_tagihan' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'total_tagihan' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'status_pembayaran' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'status_pembayaran' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('status_pembayaran')}
                title="Urutkan berdasarkan Status Pembayaran"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status_pembayaran' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'status_pembayaran' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'jatuh_tempo' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'jatuh_tempo' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('jatuh_tempo')}
                title="Urutkan berdasarkan Tanggal Jatuh Tempo"
              >
                <div className="flex items-center gap-1.5">
                  <span>Jatuh Tempo</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'jatuh_tempo' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'jatuh_tempo' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={sortField === 'billing_mode' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'billing_mode' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('billing_mode')}
                title="Urutkan berdasarkan Jenis Tagihan (Prabayar / Pascabayar)"
              >
                <div className="flex items-center gap-1.5">
                  <span>Jenis Tagihan</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'billing_mode' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'billing_mode' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CCDDF0]/60">
            {loading && data.length === 0 ? (
              <DesktopTableSkeleton rows={Math.min(limit || 6, 8)} colCount={8} type="billing" />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#64839E]">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs text-[#0B2545]">Tidak Ada Data Tagihan</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Tidak ditemukan data pelanggan sesuai kriteria pencarian dan filter status ini.</div>
                </td>
              </tr>
            ) : (
              data.map((p) => {
                const isChecked = selectedIds.includes(p.id_pelanggan)
                const isSyncing = syncingId === p.id_pelanggan
                const cleanWa = p.no_wa && p.no_wa !== '-' ? p.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62') : ''
                const tagihanStr = formatRupiah(p.total_tagihan)
                const vaStr = p.nomor_va && p.nomor_va !== '-' ? p.nomor_va : '-'
                const waText = `Halo Bapak/Ibu ${p.nama}, kami dari Tim Layanan Pelanggan TeknoGuard menginformasikan tagihan internet Anda periode ${p.periode_tagihan || '-'} sebesar ${tagihanStr} (Jatuh tempo: ${p.jatuh_tempo || '-'}). Pembayaran dapat dilakukan via Virtual Account: ${vaStr}. Terima kasih.`

                return (
                  <tr
                    key={p.id_pelanggan}
                    className={`hover:bg-[#F8FAFC] transition-colors ${isChecked ? 'bg-[#F1F6FC]/60' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelect(p.id_pelanggan)}
                        className="rounded border-slate-300 text-[#026AA7] focus:ring-[#026AA7] cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      {onNavigateCustomer ? (
                        <button
                          type="button"
                          onClick={() => onNavigateCustomer(p.id_pelanggan || p.nama)}
                          className="font-bold text-[#026AA7] hover:text-[#035388] hover:underline text-left cursor-pointer transition block"
                          title={`Lihat detail ${p.nama} di Data Pelanggan`}
                        >
                          {p.nama}
                        </button>
                      ) : (
                        <div className="font-bold text-[#0B2545]">{p.nama}</div>
                      )}
                      <div className="font-mono text-[11px] text-[#64839E] flex items-center gap-1.5 mt-0.5">
                        <span>{p.id_pelanggan}</span>
                        {p.has_fcm && (
                          <span className="inline-flex items-center text-[10px] text-emerald-600" title="Terhubung Aplikasi MyTekno">
                            <Smartphone className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {cleanWa ? (
                        <a
                          href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition shadow-2xs group cursor-pointer"
                          title={`Hubungi ${p.nama} (${p.no_wa}) via WhatsApp`}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                          <span>Hubungi WA</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-bold text-[#0B2545]">{formatRupiah(p.total_tagihan)}</div>
                      <div className="text-[11px] text-[#64839E]">{p.periode_tagihan}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        {renderStatusBadge(p)}
                        {renderReminderBadge(p)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#0B2545]">{p.jatuh_tempo}</td>
                    <td className="py-2.5 px-3">
                      {renderBillingModeLabel(p.billing_mode)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSyncSingle(p.id_pelanggan)}
                          disabled={isSyncing}
                          className="p-1.5 rounded-lg border border-[#CCDDF0] bg-white hover:bg-[#F1F6FC] text-[#026AA7] cursor-pointer transition-colors"
                          title="Sync Live dari Network Bill"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack */}
      <div className="md:hidden divide-y divide-[#CCDDF0]/60">
        {loading && data.length === 0 ? (
          <div className="p-3">
            <MobileCardStackSkeleton count={4} type="billing" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-[#64839E]">
            <p className="text-xs font-bold text-[#0B2545]">Tidak Ada Data Tagihan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tidak ditemukan data pelanggan pada filter ini.</p>
          </div>
        ) : (
          data.map((p) => {
            const isChecked = selectedIds.includes(p.id_pelanggan)
            const isSyncing = syncingId === p.id_pelanggan
            const cleanWa = p.no_wa && p.no_wa !== '-' ? p.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62') : ''
            const tagihanStr = formatRupiah(p.total_tagihan)
            const vaStr = p.nomor_va && p.nomor_va !== '-' ? p.nomor_va : '-'
            const waText = `Halo Bapak/Ibu ${p.nama}, kami dari Tim Layanan Pelanggan TeknoGuard menginformasikan tagihan internet Anda periode ${p.periode_tagihan || '-'} sebesar ${tagihanStr} (Jatuh tempo: ${p.jatuh_tempo || '-'}). Pembayaran dapat dilakukan via Virtual Account: ${vaStr}. Terima kasih.`

            return (
              <div key={p.id_pelanggan} className={`p-3.5 ${isChecked ? 'bg-[#F1F6FC]/60' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(p.id_pelanggan)}
                      className="rounded border-slate-300 text-[#026AA7] focus:ring-[#026AA7] cursor-pointer"
                    />
                    <div>
                      {onNavigateCustomer ? (
                        <button
                          type="button"
                          onClick={() => onNavigateCustomer(p.id_pelanggan || p.nama)}
                          className="text-xs font-bold text-[#026AA7] hover:text-[#035388] hover:underline text-left cursor-pointer transition block"
                          title={`Lihat detail ${p.nama} di Data Pelanggan`}
                        >
                          {p.nama}
                        </button>
                      ) : (
                        <h5 className="text-xs font-bold text-[#0B2545]">{p.nama}</h5>
                      )}
                      <p className="text-[11px] font-mono text-[#64839E]">{p.id_pelanggan}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {renderStatusBadge(p)}
                    {renderReminderBadge(p)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2.5 p-2 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0]">
                  <div>
                    <span className="text-[10px] text-[#64839E] block">Total Tagihan:</span>
                    <span className="font-bold text-[#0B2545]">{formatRupiah(p.total_tagihan)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64839E] block">Jatuh Tempo:</span>
                    <span className="text-[#0B2545]">{p.jatuh_tempo}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-[10px] text-[#64839E] font-sans">Jenis Tagihan:</span>
                    {renderBillingModeLabel(p.billing_mode)}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  {cleanWa && (
                    <a
                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition shadow-2xs group cursor-pointer"
                      title={`Hubungi ${p.nama} (${p.no_wa}) via WhatsApp`}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                      <span>Hubungi WA</span>
                    </a>
                  )}

                  <button
                    onClick={() => onSyncSingle(p.id_pelanggan)}
                    disabled={isSyncing}
                    className="px-2.5 py-1 rounded-lg border border-[#CCDDF0] bg-white text-xs font-sans font-semibold text-[#026AA7] hover:bg-[#F1F6FC] transition flex items-center gap-1 cursor-pointer"
                    title="Sync Live dari Network Bill"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Live</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </DataTableContainer>
  )
}
