import React from 'react'
import {
  Search,
  Send,
  RefreshCw,
  X,
  Clock,
  ArrowDownToLine
} from 'lucide-react'
import { FilterContainer } from '../common/CommonUI'

export function BillingFilterBar({
  searchQuery,
  setSearchQuery,
  setPage,
  selectedCount = 0,
  onOpenReminderModal,
  onClearSelection,
  onRefresh,
  onSyncAll,
  syncingAll = false,
  loading = false,
  lastSyncTime = '-'
}) {
  return (
    <div className="relative z-30">
      <FilterContainer>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Kotak Pencarian */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64839E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('')
                    setPage(1)
                  }
                }}
                placeholder="Cari ID, Nama, No. WA, Nomor VA..."
                className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] text-xs font-sans text-[#0B2545] focus:outline-none focus:border-[#026AA7] min-h-[34px] sm:min-h-[36px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#64839E] hover:text-[#0B2545] hover:bg-[#E2EDF8] transition cursor-pointer"
                  title="Hapus pencarian (Esc)"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tombol Aksi & Segarkan */}
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="px-2.5 py-1.5 rounded-lg border border-[#CCDDF0] bg-white hover:bg-slate-50 text-[#3B5B78] text-[11px] sm:text-xs font-sans font-semibold flex items-center gap-1 transition shadow-2xs min-h-[34px] sm:min-h-[36px] cursor-pointer"
                title="Batalkan pilihan pelanggan"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal ({selectedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenReminderModal}
              disabled={selectedCount === 0}
              className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs min-h-[34px] sm:min-h-[36px] cursor-pointer ${
                selectedCount > 0
                  ? 'bg-[#026AA7] hover:bg-[#035388] text-white'
                  : 'bg-[#F1F6FC] text-[#64839E] border border-[#CCDDF0] cursor-not-allowed opacity-60'
              }`}
              title={selectedCount > 0 ? 'Kirim pengingat tagihan ke pelanggan terpilih' : 'Centang minimal 1 pelanggan untuk kirim pengingat'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Pengingat {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || syncingAll}
              className="px-3 py-1.5 rounded-lg border border-[#CCDDF0] bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#026AA7] text-[11px] sm:text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs min-h-[34px] sm:min-h-[36px] cursor-pointer"
              title={`Sinkronisasi Latar Terakhir: ${lastSyncTime}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Memuat...' : 'Segarkan'}</span>
            </button>

            {onSyncAll && (
              <button
                type="button"
                onClick={onSyncAll}
                disabled={loading || syncingAll}
                className="px-3 py-1.5 rounded-lg border border-[#026AA7] bg-[#E2EDF8] hover:bg-[#D0E2F4] text-[#026AA7] text-[11px] sm:text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs min-h-[34px] sm:min-h-[36px] cursor-pointer"
                title="Tarik live seluruh data tagihan & status jatuh tempo kantor dari Network Bill"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${syncingAll ? 'animate-bounce' : ''}`} />
                <span>{syncingAll ? 'Menyinkronkan...' : 'Sinkronkan POP'}</span>
              </button>
            )}
          </div>
        </div>
      </FilterContainer>
    </div>
  )
}
