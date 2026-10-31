import React from 'react'
import {
  Search,
  Activity,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { FilterContainer } from '../CommonUI'

export function CustomersFilterBar({
  searchQuery,
  setSearchQuery,
  setPage,
  handleSyncMikrotik,
  mikrotikSyncing,
  isOfficeActive,
  setImportModalOpen,
  activeOffice,
  fetchCustomers,
  loading,
  selectedIds,
  setSelectedIds,
  handleBulkDelete,
  bulkDeleting
}) {
  return (
    <>
      <div className="relative z-30">
        <FilterContainer>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Kotak Pencarian */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari ID, Nama, IP..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-sky-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[34px] sm:min-h-[36px]"
                />
              </div>
            </div>

            {/* Tombol Aksi Lengkapi Data, Ekspor, Reload */}
            <div className="flex items-center gap-1.5 justify-end shrink-0">
              <button
                onClick={handleSyncMikrotik}
                disabled={mikrotikSyncing || !isOfficeActive}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px] ${
                  !isOfficeActive
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-200 cursor-pointer'
                }`}
                title={!isOfficeActive ? 'Kantor dalam status nonaktif. Sinkronisasi MikroTik dimatikan.' : 'Sinkronisasi Kuota & Traffic Real-Time dari Router MikroTik'}
              >
                <Activity className={`w-3.5 h-3.5 ${!isOfficeActive ? 'text-slate-400' : 'text-cyan-700'} ${mikrotikSyncing ? 'animate-spin' : ''}`} />
                <span>{mikrotikSyncing ? 'Syncing...' : !isOfficeActive ? 'Sync Mati' : 'Sync MikroTik'}</span>
              </button>

              <button
                onClick={() => setImportModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px] cursor-pointer"
                title="Lengkapi Data Pelanggan (No. WA, Alamat, Kredensial WiFi)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-200" />
                <span>Lengkapi Data</span>
              </button>

              <a
                href={`/api/customers/export-excel?kantor=${encodeURIComponent(activeOffice || 'cabang')}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                download={`data_pelanggan_${activeOffice || 'edteknoguard'}.xlsx`}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px]"
                title="Ekspor Seluruh Data ke Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor</span>
              </a>

              <button
                onClick={fetchCustomers}
                disabled={loading}
                className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[34px] sm:min-h-[36px] flex items-center justify-center cursor-pointer"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </FilterContainer>
      </div>

      {/* Selection / Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
              <Trash2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-rose-950 font-sans">
                {selectedIds.length} Pelanggan Terpilih
              </span>
              <p className="text-[11px] text-rose-700 font-sans">
                Aksi hapus massal akan menghapus pelanggan dan data terkait secara permanen (CASCADE).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold transition"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{bulkDeleting ? 'Menghapus...' : 'Hapus Terpilih'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

