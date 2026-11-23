import React from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Smartphone,
  ArrowUpDown,
  Send,
  BellOff
} from 'lucide-react'
import { DesktopTableSkeleton, MobileCardStackSkeleton } from '../common/DeviceAdaptiveSkeleton'

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
  onNavigateCustomer,
  sortField = '',
  sortDir = 'asc',
  onSort
}) {
  const { page = 1, total_pages = 1, total_records = 0 } = pagination
  const allSelected = data.length > 0 && data.every((p) => selectedIds.includes(p.id_pelanggan))
  const formatRupiah = (val) => `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`

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
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          title={p.last_reminder_full ? `Terakhir diingatkan: ${p.last_reminder_full}` : 'Sudah dikirimi pengingat'}
        >
          <Send className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
          <span>Diingatkan {p.last_reminder}</span>
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200"
        title="Belum pernah dikirimi pengingat tagihan"
      >
        <BellOff className="w-2.5 h-2.5 shrink-0 text-slate-400" />
        <span>Belum Diingatkan</span>
      </span>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#CCDDF0] shadow-2xs overflow-hidden mb-4">
        {/* Desktop Skeleton */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F1F6FC] border-b border-[#CCDDF0] text-[#3B5B78] font-sans text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center"><div className="w-4 h-4 bg-slate-200 rounded mx-auto" /></th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Kontak WA</th>
                <th className="py-2.5 px-3">Tagihan & Periode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Jatuh Tempo</th>
                <th className="py-2.5 px-3">Nomor VA</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CCDDF0]/60 font-mono text-xs">
              <DesktopTableSkeleton rows={6} colCount={8} type="billing" />
            </tbody>
          </table>
        </div>
        {/* Mobile Skeleton */}
        <div className="md:hidden p-3">
          <MobileCardStackSkeleton count={4} type="billing" />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#CCDDF0] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[#0B2545]">Tidak Ada Data Tagihan</h4>
        <p className="text-xs text-[#64839E] mt-1">Tidak ditemukan data pelanggan sesuai kriteria pencarian dan filter status ini.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#CCDDF0] shadow-2xs overflow-hidden mb-4">
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
                title="Urutkan berdasarkan Nomor WhatsApp"
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
                aria-sort={sortField === 'nomor_va' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`py-2.5 px-3 cursor-pointer select-none transition ${
                  sortField === 'nomor_va' ? 'bg-[#E2EDF8] text-[#026AA7] font-bold' : 'hover:bg-[#E2EDF8]/60'
                }`}
                onClick={() => onSort && onSort('nomor_va')}
                title="Urutkan berdasarkan Nomor Virtual Account"
              >
                <div className="flex items-center gap-1.5">
                  <span>Nomor VA</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'nomor_va' ? 'text-[#026AA7]' : 'text-slate-400'}`} />
                  {sortField === 'nomor_va' && (
                    <span className="text-[10px] text-[#026AA7] font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CCDDF0]/60">
            {data.map((p) => {
              const isChecked = selectedIds.includes(p.id_pelanggan)
              const isSyncing = syncingId === p.id_pelanggan
              const isCopied = copiedVA === p.nomor_va
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
                  <td className="py-2.5 px-3 font-mono text-[#0B2545]">
                    {p.no_wa && p.no_wa !== '-' ? (
                      <a
                        href={`https://wa.me/${p.no_wa.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#026AA7] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{p.no_wa}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
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
                  <td className="py-2.5 px-3 font-mono">
                    {p.nomor_va && p.nomor_va !== '-' ? (
                      <button
                        onClick={() => onCopyVA(p.nomor_va)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#CCDDF0] bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[11px] text-[#0B2545] cursor-pointer transition-colors"
                        title="Klik untuk salin VA"
                      >
                        <span>{p.nomor_va}</span>
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#64839E]" />}
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
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
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Sorting Controls */}
      <div className="md:hidden px-3.5 py-2 bg-[#F1F6FC] border-b border-[#CCDDF0] flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-[#3B5B78]">Urutkan:</span>
        <div className="flex items-center gap-1.5">
          <select
            value={sortField || 'default'}
            onChange={(e) => onSort && onSort(e.target.value === 'default' ? '' : e.target.value)}
            className="text-xs bg-white border border-[#CCDDF0] rounded-md px-2 py-1 text-[#0B2545] focus:outline-none focus:border-[#026AA7]"
            aria-label="Urutkan data tagihan"
          >
            <option value="default">Prioritas (Overdue)</option>
            <option value="nama">Pelanggan</option>
            <option value="no_wa">Kontak WA</option>
            <option value="total_tagihan">Total Tagihan</option>
            <option value="status_pembayaran">Status</option>
            <option value="jatuh_tempo">Jatuh Tempo</option>
            <option value="nomor_va">Nomor VA</option>
          </select>
          {sortField && (
            <button
              type="button"
              onClick={() => onSort && onSort(sortField)}
              className="px-2 py-1 rounded bg-white border border-[#CCDDF0] text-[#026AA7] text-xs font-bold hover:bg-[#E2EDF8]"
              title="Balik arah urutan"
            >
              {sortDir === 'asc' ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card Stack View */}
      <div className="md:hidden divide-y divide-[#CCDDF0]/60">
        {data.map((p) => {
          const isChecked = selectedIds.includes(p.id_pelanggan)
          const isSyncing = syncingId === p.id_pelanggan
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
                  <span className="text-[10px] text-[#64839E]">Nomor VA:</span>
                  <span className="font-bold text-[#026AA7]">{p.nomor_va || '-'}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  onClick={() => onSyncSingle(p.id_pelanggan)}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg border border-[#CCDDF0] bg-white text-xs font-sans font-semibold text-[#026AA7] hover:bg-[#F1F6FC] transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Live</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2.5 px-3 py-2.5 bg-[#F1F6FC] border-t border-[#CCDDF0] text-xs font-sans text-center sm:text-left">
        <span className="text-[#64839E]">
          Total <strong className="text-[#0B2545] font-mono">{total_records}</strong> data (Halaman{' '}
          <strong className="text-[#0B2545] font-mono">{page}</strong> dari <strong className="text-[#0B2545] font-mono">{total_pages}</strong>)
        </span>
        <div className="flex items-center gap-1 justify-center">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded-lg border border-[#CCDDF0] bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-[#0B2545]" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= total_pages}
            className="p-1 rounded-lg border border-[#CCDDF0] bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-[#0B2545]" />
          </button>
        </div>
      </div>
    </div>
  )
}
