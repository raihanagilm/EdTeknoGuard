import React from 'react'
import {
  ArrowUpDown,
  Wifi,
  Edit2,
  Trash2,
  Info,
  Phone,
  Activity,
  MoreVertical
} from 'lucide-react'
import { DataTableContainer } from '../common/CommonUI'

export function CustomersTable({
  customers = [],
  loading = false,
  page = 1,
  limit = 15,
  setLimit,
  setPage,
  totalRecords = 0,
  selectedIds = [],
  setSelectedIds,
  sortField = 'id',
  sortDir = 'asc',
  handleSort,
  handleSortIpRouter,
  probingId,
  probeCooldowns = {},
  handleSingleProbe,
  activeMenuId,
  setActiveMenuId,
  handleOpenDetail,
  handleOpenEdit,
  handleDeleteCustomer,
  isOfficeActive = true,
  warnThreshold = -26.0,
  critThreshold = -27.0
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
      {/* Tampilan Mobile: Card Stack Responsif (P8-03 Pola #1) */}
      <div className="block md:hidden p-2.5 sm:p-3 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
            <div>Memuat data pelanggan...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            Tidak ada data pelanggan ditemukan.
          </div>
        ) : (
          customers.map((c) => {
            const cId = c.id_pelanggan || c.id
            const isSelected = selectedIds.includes(cId)
            const isOnline = c.status_lease === 'bound' && c.status_koneksi !== 'OFFLINE'
            const cooldown = probeCooldowns[cId] || 0
            const isProbing = probingId === cId
            const isDisabled = isProbing || cooldown > 0 || !isOfficeActive || !isOnline

            const rxVal = c.rx_power ?? c.rx ?? c.redaman_current ?? c.redaman_baseline
            const isNumeric = rxVal !== null && rxVal !== undefined && !isNaN(Number(rxVal))
            const rawStatus = (c.status_koneksi || c.status || 'NORMAL').toUpperCase()

            let statusBadge = 'NORMAL'
            let badgeClass = 'text-emerald-700'

            if (rawStatus === 'UNTESTED' || rawStatus === 'LOCKOUT' || (!isNumeric && rawStatus !== 'LOS')) {
              statusBadge = 'UNTESTED'
              badgeClass = 'text-slate-500'
            } else if (rawStatus === 'LOS' || !isNumeric) {
              statusBadge = 'LOS'
              badgeClass = 'text-purple-700'
            } else {
              const num = Number(rxVal)
              if (num <= critThreshold || rawStatus === 'CRITICAL') {
                statusBadge = 'CRITICAL'
                badgeClass = 'text-rose-700'
              } else if (num <= warnThreshold || rawStatus === 'WARNING') {
                statusBadge = 'WARNING'
                badgeClass = 'text-amber-700'
              } else {
                statusBadge = 'NORMAL'
                badgeClass = 'text-emerald-700'
              }
            }

            return (
              <div
                key={`mobile-${cId}`}
                className={`bg-white rounded-xl border p-3 font-mono transition shadow-2xs ${
                  isSelected ? 'border-cyan-500 bg-cyan-50/40 ring-1 ring-cyan-400' : 'border-sky-200/90'
                }`}
              >
                {/* Top Bar Card: Checkbox, ID, Status Redaman & Online */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
                        )
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold text-xs text-cyan-900">{cId}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold uppercase ${badgeClass}`}>
                      {statusBadge === 'UNTESTED' ? 'BELUM CEK' : statusBadge}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        isOnline ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>

                {/* Body Card: Nama, Alamat, Info Modem & Redaman */}
                <div className="py-2.5 space-y-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(c)}
                      className="font-sans font-bold text-sm text-slate-900 hover:text-cyan-800 text-left cursor-pointer"
                    >
                      {c.nama || c.name}
                    </button>
                    <div className="text-xs text-slate-600 font-sans truncate">{c.alamat || '-'}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg border border-sky-100">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">IP ONT / Router</div>
                      <div className="font-bold text-slate-800">{c.ip_ont || c.ip_router || '-'}</div>
                      <div className="text-[10px] text-slate-500">{c.jenis_modem || 'ZTE GM220-S'}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Sinyal Redaman</div>
                      <div
                        className={`font-black text-xs ${
                          statusBadge === 'UNTESTED'
                            ? 'text-slate-400'
                            : statusBadge === 'CRITICAL'
                            ? 'text-rose-600'
                            : statusBadge === 'WARNING'
                            ? 'text-amber-600'
                            : statusBadge === 'LOS'
                            ? 'text-purple-700'
                            : 'text-emerald-600'
                        }`}
                      >
                        {statusBadge === 'UNTESTED' ? '-' : isNumeric ? `${Number(rxVal).toFixed(2)} dBm` : rxVal}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        WiFi: {c.nama_wifi || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar: Probe & Opsi Menu */}
                <div className="pt-2 border-t border-sky-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSingleProbe(cId)}
                    disabled={isDisabled}
                    className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      !isOfficeActive
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : !isOnline
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : cooldown > 0
                        ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed'
                        : isProbing
                        ? 'bg-cyan-100 text-cyan-800 border-cyan-300 cursor-wait'
                        : 'bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 border-cyan-200 shadow-2xs cursor-pointer'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isProbing ? 'Mengecek...' : cooldown > 0 ? `Jeda (${cooldown}s)` : 'Cek Sinyal'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDetail(c)}
                    className="p-1.5 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 text-cyan-800 cursor-pointer"
                    title="Lihat Detail Lengkap"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c, c)}
                    className="p-1.5 rounded-lg border border-sky-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Edit Pelanggan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(cId)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Hapus Pelanggan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tampilan Desktop: Tabel Lebar Standar (hidden md:table) */}
      <table className="hidden md:table w-full text-left border-collapse table-auto">
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
              className={`py-2.5 px-3 cursor-pointer select-none transition w-32 ${
                sortField === 'id' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'
              }`}
              onClick={() => handleSort('id')}
            >
              <div className="flex items-center gap-1">
                <span>ID Pelanggan</span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${sortField === 'id' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`}
                />
                {sortField === 'id' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition ${
                sortField === 'nama' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'
              }`}
              onClick={() => handleSort('nama')}
            >
              <div className="flex items-center gap-1">
                <span>Nama Pelanggan</span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${sortField === 'nama' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`}
                />
                {sortField === 'nama' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition w-36 ${
                ['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField)
                  ? 'bg-cyan-100/90 text-cyan-950 font-black'
                  : 'hover:bg-cyan-100/60'
              }`}
              onClick={handleSortIpRouter}
              title="Klik untuk ganti urutan: 1. Router -> 2. ONT -> 3. Modem -> Normal (-)"
            >
              <div className="flex items-center gap-1">
                <span>
                  {sortField === 'ip_router'
                    ? 'IP Router'
                    : sortField === 'ip_ont'
                    ? 'IP ONT'
                    : sortField === 'jenis_modem'
                    ? 'Modem'
                    : 'IP & Router'}
                </span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${
                    ['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField)
                      ? 'text-cyan-800 font-bold'
                      : 'text-slate-400'
                  }`}
                />
                {['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) && (
                  <span className="text-[10px] text-cyan-800 font-black">▲</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 cursor-pointer select-none transition w-44 ${
                sortField === 'status_kredensial'
                  ? 'bg-cyan-100/90 text-cyan-950 font-black'
                  : 'hover:bg-cyan-100/60'
              }`}
              onClick={() => handleSort('status_kredensial')}
            >
              <div className="flex items-center gap-1">
                <span>WiFi &amp; Admin ONT</span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${
                    sortField === 'status_kredensial' ? 'text-cyan-800 font-bold' : 'text-slate-400'
                  }`}
                />
                {sortField === 'status_kredensial' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 text-right cursor-pointer select-none transition w-32 ${
                sortField === 'rx_power' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'
              }`}
              onClick={() => handleSort('rx_power')}
            >
              <div className="flex items-center justify-end gap-1">
                <span>Redaman (dBm)</span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${sortField === 'rx_power' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`}
                />
                {sortField === 'rx_power' && (
                  <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
            </th>
            <th
              className={`py-2.5 px-3 text-center cursor-pointer select-none transition w-28 ${
                sortField === 'status_koneksi'
                  ? 'bg-cyan-100/90 text-cyan-950 font-black'
                  : 'hover:bg-cyan-100/60'
              }`}
              onClick={() => handleSort('status_koneksi')}
            >
              <div className="flex items-center justify-center gap-1">
                <span>Status</span>
                <ArrowUpDown
                  className={`w-3.5 h-3.5 ${
                    sortField === 'status_koneksi' ? 'text-cyan-800 font-bold' : 'text-slate-400'
                  }`}
                />
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
              <td colSpan="10" className="text-center py-10 text-slate-400 font-mono">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                <div>Memuat data pelanggan...</div>
              </td>
            </tr>
          ) : customers.length === 0 ? (
            <tr>
              <td colSpan="10" className="text-center py-10 text-slate-400 font-mono">
                Tidak ada data pelanggan ditemukan.
              </td>
            </tr>
          ) : (
            customers.map((c, idx) => {
              const cId = c.id_pelanggan || c.id
              const rowNo = (page - 1) * limit + idx + 1
              const isSelected = selectedIds.includes(cId)

              return (
                <tr key={cId} className={`transition ${isSelected ? 'bg-cyan-50/70' : 'hover:bg-cyan-50/40'}`}>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
                        )
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 font-bold text-xs">{rowNo}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-900">{cId}</td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(c)}
                      className="font-sans font-bold text-slate-900 hover:text-cyan-800 hover:underline text-left cursor-pointer transition block"
                      title="Klik untuk melihat Detail Lengkap & Kontak Pelanggan"
                    >
                      {c.nama || c.name}
                    </button>
                    <div className="text-xs text-slate-600 font-sans truncate max-w-xs">
                      {c.alamat || c.address || '-'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      {c.ip_ont && (
                        <div className="text-slate-900 font-bold font-mono text-[11px] flex items-center gap-1.5">
                          <span className="text-[9px] text-cyan-800 font-black tracking-tight uppercase">ONT</span>
                          <span>{c.ip_ont}</span>
                        </div>
                      )}
                      {c.ip_router && c.ip_router !== c.ip_ont && (
                        <div className="text-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-600 font-black tracking-tight uppercase">
                            Router
                          </span>
                          <span>{c.ip_router}</span>
                        </div>
                      )}
                      {!c.ip_ont && !c.ip_router && (
                        <div className="text-slate-400 font-mono text-[11px] italic">-</div>
                      )}
                      <div className="flex items-center gap-1 pt-0.5">
                        {c.jenis_modem ? (
                          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-tight">
                            {c.jenis_modem}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">-</span>
                        )}
                        {c.mac_address && (
                          <span
                            className="text-[10px] font-mono text-slate-500 truncate max-w-[110px]"
                            title={`MAC: ${c.mac_address}`}
                          >
                            {c.mac_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono truncate max-w-[170px]">
                      <Wifi className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                      <span className="font-bold truncate">{c.nama_wifi || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
                      <span className="font-semibold text-slate-700">
                        {c.user_admin || 'admin'}:{c.pass_admin || '***'}
                      </span>
                      {(() => {
                        const kStatus = (c.status_kredensial || '').toUpperCase()
                        if (kStatus === 'VALID') {
                          return (
                            <span
                              className="text-[10px] font-bold uppercase tracking-tight text-emerald-700 shrink-0"
                              title="Kredensial modem terverifikasi cocok"
                            >
                              VALID
                            </span>
                          )
                        }
                        return (
                          <span
                            className="text-[10px] font-bold uppercase tracking-tight text-rose-700 shrink-0"
                            title="Kredensial modem belum valid / ditolak"
                          >
                            INVALID
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {(() => {
                      const rxVal = c.rx_power ?? c.rx ?? c.redaman_current ?? c.redaman_baseline
                      const isNumeric = rxVal !== null && rxVal !== undefined && !isNaN(Number(rxVal))
                      const rawStatus = (c.status_koneksi || c.status || 'NORMAL').toUpperCase()

                      let statusBadge = 'NORMAL'
                      let badgeClass = 'text-emerald-700'

                      if (rawStatus === 'UNTESTED' || rawStatus === 'LOCKOUT' || (!isNumeric && rawStatus !== 'LOS')) {
                        statusBadge = 'UNTESTED'
                        badgeClass = 'text-slate-500'
                      } else if (rawStatus === 'LOS' || !isNumeric) {
                        statusBadge = 'LOS'
                        badgeClass = 'text-purple-700'
                      } else {
                        const num = Number(rxVal)
                        if (num <= critThreshold || rawStatus === 'CRITICAL') {
                          statusBadge = 'CRITICAL'
                          badgeClass = 'text-rose-700'
                        } else if (num <= warnThreshold || rawStatus === 'WARNING') {
                          statusBadge = 'WARNING'
                          badgeClass = 'text-amber-700'
                        } else {
                          statusBadge = 'NORMAL'
                          badgeClass = 'text-emerald-700'
                        }
                      }

                      return (
                        <div className="flex flex-col items-end gap-0.5">
                          {statusBadge === 'LOS' ? (
                            <span className="font-black font-mono text-xs text-purple-700">LOS</span>
                          ) : (
                            <>
                              <span
                                className={`font-black font-mono ${
                                  statusBadge === 'UNTESTED'
                                    ? 'text-slate-400'
                                    : statusBadge === 'CRITICAL'
                                    ? 'text-rose-600'
                                    : statusBadge === 'WARNING'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {statusBadge === 'UNTESTED'
                                  ? '-'
                                  : isNumeric
                                  ? `${Number(rxVal).toFixed(1)} dBm`
                                  : '-'}
                              </span>
                              <span className={`text-xs font-bold uppercase ${badgeClass}`}>
                                {statusBadge === 'UNTESTED' ? 'BELUM CEK' : statusBadge}
                              </span>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {(() => {
                      const isOnline =
                        c.status_lease === 'bound' &&
                        c.status_koneksi !== 'OFFLINE' &&
                        c.status !== 'OFFLINE' &&
                        Boolean(c.is_monitored !== false)
                      if (isOnline) {
                        return (
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                            ONLINE
                          </span>
                        )
                      }
                      return (
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          OFFLINE
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 relative">
                      {(() => {
                        const isOnline =
                          c.status_lease === 'bound' &&
                          c.status_koneksi !== 'OFFLINE' &&
                          c.status !== 'OFFLINE' &&
                          Boolean(c.is_monitored !== false)
                        const cooldown = probeCooldowns[cId] || 0
                        const isProbing = probingId === cId
                        const isDisabled = isProbing || cooldown > 0 || !isOfficeActive || !isOnline

                        return (
                          <button
                            onClick={() => handleSingleProbe(cId)}
                            disabled={isDisabled}
                            className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold transition shadow-2xs ${
                              !isOfficeActive
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                : !isOnline
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                : cooldown > 0
                                ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed font-mono'
                                : isProbing
                                ? 'bg-cyan-100 text-cyan-800 border-cyan-300 cursor-wait'
                                : 'bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 border-cyan-200 cursor-pointer'
                            }`}
                            title={
                              !isOfficeActive
                                ? 'Kantor nonaktif. Aktifkan kantor untuk menguji sinyal ONT.'
                                : !isOnline
                                ? 'Perangkat sedang Offline (DHCP/PPPoE tidak aktif). Cek redaman tidak tersedia.'
                                : cooldown > 0
                                ? `Tunggu jeda cooldown (${cooldown} detik) sebelum memeriksa ulang redaman ONT`
                                : 'Cek Sinyal Redaman ONT Langsung'
                            }
                          >
                            {isProbing
                              ? 'Mengecek...'
                              : !isOfficeActive
                              ? 'Nonaktif'
                              : !isOnline
                              ? 'Offline'
                              : cooldown > 0
                              ? `Tunggu (${cooldown}s)`
                              : 'Cek Redaman'}
                          </button>
                        )
                      })()}

                      {/* Menu Titik Tiga (Aksi Popover) */}
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === cId ? null : cId)
                          }}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            activeMenuId === cId
                              ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="Menu Aksi Pelanggan"
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
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 font-bold flex items-center gap-2 transition cursor-pointer"
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
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveMenuId(null)
                                    handleOpenEdit(c, c)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-100 font-bold flex items-center gap-2 transition cursor-pointer"
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
                                  className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition cursor-pointer"
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
