import React from 'react'
import {
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  ZapOff,
  Radio,
  Eye,
  EyeOff,
  Play,
  RotateCw,
  MoreVertical,
  Info,
  Phone,
  ShieldAlert,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { DataTableContainer } from '../CommonUI'

export function CustomersTable({
  customers,
  loading,
  page,
  limit,
  setLimit,
  setPage,
  totalRecords,
  selectedIds,
  setSelectedIds,
  sortField,
  sortDir,
  handleSort,
  handleSortIpRouter,
  probingId,
  handleSingleProbe,
  togglingMonitoredId,
  handleToggleMonitored,
  visiblePassId,
  setVisiblePassId,
  activeMenuId,
  setActiveMenuId,
  handleOpenDetail,
  handleToggleIsolir,
  handleOpenEdit,
  handleDeleteCustomer,
  isOfficeActive
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit))

  return (
    <DataTableContainer
      page={page}
      totalPages={totalPages}
      totalCount={totalRecords}
      limit={limit}
      onLimitChange={(newLimit) => {
        setLimit(newLimit)
        setPage(1)
      }}
      onPageChange={setPage}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
      loading={loading}
    >
      <table className="w-full text-left border-collapse table-auto">
        <thead>
          <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
            <th className="py-2.5 px-3 w-10 text-center">
              <input
                type="checkbox"
                checked={customers.length > 0 && selectedIds.length === customers.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(customers.map((c) => c.id_pelanggan || c.id))
                  } else {
                    setSelectedIds([])
                  }
                }}
                className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
            </th>
            <th className="py-2.5 px-2 w-12 text-center">No</th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition w-32 ${sortField === 'id' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={() => handleSort('id')}
            >
              <div className="flex items-center gap-1">
                <span>ID Pelanggan</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'id' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {sortField === 'id' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition ${sortField === 'nama' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={() => handleSort('nama')}
            >
              <div className="flex items-center gap-1">
                <span>Nama Pelanggan</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'nama' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {sortField === 'nama' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition w-36 ${['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={handleSortIpRouter}
              title="Klik untuk ganti urutan: 1. Router -> 2. ONT -> 3. Modem -> Normal (-)"
            >
              <div className="flex items-center gap-1">
                <span>
                  {sortField === 'ip_router' ? 'IP Router' : sortField === 'ip_ont' ? 'IP ONT' : sortField === 'jenis_modem' ? 'Modem' : 'IP & Router'}
                </span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) && (
                  <span className="text-[10px] text-cyan-800 font-black">▲</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition w-44 ${sortField === 'status_kredensial' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={() => handleSort('status_kredensial')}
            >
              <div className="flex items-center gap-1">
                <span>WiFi &amp; Admin ONT</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status_kredensial' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {sortField === 'status_kredensial' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 text-right cursor-pointer select-none transition w-32 ${sortField === 'rx_power' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={() => handleSort('rx_power')}
            >
              <div className="flex items-center justify-end gap-1">
                <span>Redaman (dBm)</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'rx_power' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {sortField === 'rx_power' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 text-center cursor-pointer select-none transition w-28 ${sortField === 'status_koneksi' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
              onClick={() => handleSort('status_koneksi')}
            >
              <div className="flex items-center justify-center gap-1">
                <span>Status</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status_koneksi' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                {sortField === 'status_koneksi' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 text-right w-32">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100 font-mono text-xs">
          {loading ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-slate-400">
                <RotateCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                <span>Memuat data pelanggan...</span>
              </td>
            </tr>
          ) : customers.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-slate-400">
                Tidak ada data pelanggan ditemukan.
              </td>
            </tr>
          ) : (
            customers.map((c, idx) => {
              const cId = c.id_pelanggan || c.id
              const isSelected = selectedIds.includes(cId)
              const isProbing = probingId === cId

              return (
                <tr
                  key={cId}
                  className={`hover:bg-cyan-50/40 transition-colors ${
                    isSelected ? 'bg-cyan-50/70' : idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, cId])
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== cId))
                        }
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-400 text-[11px]">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {c.id_pelanggan || c.id}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-bold text-slate-900">{c.nama}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <span>{c.paket_internet || 'Tanpa Paket'}</span>
                      {c.no_wa && c.no_wa !== '-' && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700 font-sans">{c.no_wa}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>{c.ip_modem || '-'}</span>
                      {c.ip_modem && (
                        <a
                          href={`http://${c.ip_modem}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-cyan-700"
                          title="Buka Web UI Modem"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {c.jenis_modem || 'ZTE GM220-S'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <div className="text-[11px] text-slate-700 truncate max-w-[150px]" title={c.wifi_ssid || '-'}>
                      SSID: <strong>{c.wifi_ssid || '-'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>Pass:</span>
                      {visiblePassId === cId ? (
                        <span className="font-bold text-slate-800">{c.wifi_password || '-'}</span>
                      ) : (
                        <span>••••••••</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setVisiblePassId((prev) => (prev === cId ? null : cId))}
                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        {visiblePassId === cId ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`font-black text-xs ${
                        c.rx_power === null || c.rx_power === undefined
                          ? 'text-slate-400'
                          : Number(c.rx_power) <= -27.0
                          ? 'text-rose-600'
                          : Number(c.rx_power) <= -26.0
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {c.rx_power !== null && c.rx_power !== undefined
                        ? `${Number(c.rx_power).toFixed(2)} dBm`
                        : '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.status_koneksi === 'NORMAL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : c.status_koneksi === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : c.status_koneksi === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : c.status_koneksi === 'LOS'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {c.status_koneksi === 'NORMAL' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : c.status_koneksi === 'WARNING' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <ZapOff className="w-3 h-3" />
                      )}
                      <span>{c.status_koneksi || 'UNTESTED'}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleSingleProbe(c)}
                        disabled={isProbing || !isOfficeActive}
                        className={`p-1.5 rounded-lg border transition ${
                          isProbing
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                            : 'bg-white hover:bg-cyan-50 border-sky-200 text-cyan-800'
                        }`}
                        title="Tes Redaman Langsung (Single Probe)"
                      >
                        {isProbing ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Radio className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId((prev) => (prev === cId ? null : cId))}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === cId && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuId(null)
                              }}
                            />
                            <div
                              className={`absolute right-0 z-50 w-44 bg-white rounded-xl shadow-xl border border-sky-200 py-1.5 font-sans text-xs divide-y divide-slate-100 ${
                                idx >= Math.max(0, customers.length - 3)
                                  ? 'bottom-full mb-1.5'
                                  : 'top-full mt-1.5'
                              }`}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuId(null)
                                    handleOpenDetail(c)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 font-bold flex items-center gap-2 transition"
                                >
                                  <Info className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Detail Pelanggan</span>
                                </button>

                                {c.no_wa && c.no_wa !== '-' && (
                                  <a
                                    href={`https://wa.me/${c.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setActiveMenuId(null)}
                                    className="w-full text-left px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-2 transition"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Hubungi WA</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuId(null)
                                    handleToggleIsolir(c)
                                  }}
                                  className={`w-full text-left px-3 py-1.5 font-bold flex items-center gap-2 transition ${
                                    c.status_isolir
                                      ? 'text-emerald-700 hover:bg-emerald-50'
                                      : 'text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>{c.status_isolir ? 'Buka Isolir' : 'Isolir Akses'}</span>
                                </button>
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuId(null)
                                    handleOpenEdit(c, c)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-100 font-bold flex items-center gap-2 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit Data</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuId(null)
                                    handleDeleteCustomer(cId)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Hapus Data</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </DataTableContainer>
  )
}

