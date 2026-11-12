import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Standard Header Card used across all modules (MVC View Component)
 * Palet 60-30-10: Kartu Putih #FFFFFF, Border #CCDDF0, Teks #0B2545 & #3B5B78, Aksen #026AA7
 */
export function ModuleHeader({
  badge,
  icon: Icon,
  title,
  subtitle,
  children
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#CCDDF0] shadow-2xs relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          {badge && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#026AA7] bg-[#E0F0FF] px-2 py-0.5 rounded tracking-wide uppercase">
                {badge}
              </span>
            </div>
          )}
          <h1 className="text-base sm:text-lg font-bold text-[#0B2545] tracking-tight flex items-center gap-2.5">
            {Icon && <Icon className="w-5 h-5 text-[#026AA7] shrink-0" />}
            <span>{title}</span>
          </h1>
          {subtitle && (
            <p className="text-xs text-[#3B5B78] font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Standard Metric KPI Card with interactive click filter
 */
export function MetricCard({
  label,
  value,
  unit = '',
  icon: Icon,
  isActive = false,
  onClick,
  subLabel
}) {
  const content = (
    <>
      <div className="p-2 sm:p-2.5 rounded-lg bg-[#E0F0FF] text-[#026AA7] shrink-0 flex items-center justify-center">
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div className="overflow-hidden text-left flex-1 min-w-0">
        <div className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider truncate text-[#3B5B78]">
          {label}
        </div>
        <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-[#0B2545] whitespace-nowrap">
          {value} {unit && <span className="text-xs font-normal text-[#64839E] ml-0.5">{unit}</span>}
        </div>
        {subLabel && (
          <div className="hidden md:block text-[10px] text-[#64839E] font-mono truncate mt-0.5">{subLabel}</div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 shadow-2xs cursor-pointer ${
          isActive
            ? 'bg-white border-[#026AA7] ring-2 ring-[#026AA7]/20'
            : 'bg-white hover:bg-[#F1F6FC] border-[#CCDDF0]'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="w-full p-3 rounded-xl bg-white border border-[#CCDDF0] shadow-2xs flex items-center gap-3">
      {content}
    </div>
  );
}

/**
 * Standard Unified Segmented Status Ticker Bar (Bento Strip Berserat Rapat Tanpa Pelangi)
 */
export function SegmentedStatusBar({ items = [] }) {
  return (
    <div className="bg-[#F1F6FC] rounded-xl border border-[#CCDDF0] shadow-2xs p-1 flex items-center divide-x divide-[#DAE7F5] w-full">
      {items.map((it, idx) => {
        const isActive = Boolean(it.isActive);

        return (
          <button
            key={idx}
            type="button"
            onClick={it.onClick}
            className={`metric-cell flex-1 py-2 sm:py-3 px-1 sm:px-3 rounded-lg transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none min-w-0 ${
              isActive ? 'active' : 'hover:bg-white/80'
            } ${it.className || ''}`}
          >
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate max-w-full text-[#3B5B78] w-full">
              {it.label}
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-[#0B2545]">
              {it.value}
            </span>
            {it.subLabel && (
              <span className="hidden sm:block text-[11px] text-[#64839E] font-mono truncate mt-0.5">
                {it.subLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Standard Filter Bar Container
 */
export function FilterContainer({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-3 sm:p-3.5 border border-[#CCDDF0] shadow-2xs ${className}`}>
      {children}
    </div>
  );
}

/**
 * Helper to compute pagination items with ellipses (...)
 */
function getPaginationRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  pages.push(1);

  if (currentPage > 3) {
    pages.push('...');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  pages.push(totalPages);
  return pages;
}

/**
 * Standard Data Table Container with Unified Modern Pagination Bar
 */
export function DataTableContainer({
  children,
  page = 1,
  totalPages = 1,
  totalCount,
  totalItems,
  limit = 15,
  onLimitChange,
  onPageChange,
  onPrevPage,
  onNextPage,
  loading = false,
  limitOptions = [15, 30, 50, 75, 100]
}) {
  const actualTotalCount = totalCount !== undefined ? totalCount : totalItems;
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);

  const handlePrev = () => {
    if (safePage > 1 && !loading) {
      if (onPageChange) onPageChange(safePage - 1);
      else if (onPrevPage) onPrevPage();
    }
  };

  const handleNext = () => {
    if (safePage < safeTotalPages && !loading) {
      if (onPageChange) onPageChange(safePage + 1);
      else if (onNextPage) onNextPage();
    }
  };

  const handlePageSelect = (p) => {
    if (typeof p === 'number' && p !== safePage && !loading) {
      if (onPageChange) onPageChange(p);
      else if (p < safePage && onPrevPage) onPrevPage();
      else if (p > safePage && onNextPage) onNextPage();
    }
  };

  const paginationItems = getPaginationRange(safePage, safeTotalPages);

  return (
    <div className="bg-white rounded-xl border border-[#CCDDF0] shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        {children}
      </div>

      <div className="p-3 sm:p-3.5 border-t border-[#DAE7F5] flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-[#3B5B78] bg-[#F1F6FC]">
        {/* Sisi Kiri: Selector Rows Per Page & Ringkasan Data */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          {onLimitChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64839E] font-semibold">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  onLimitChange(newLimit);
                }}
                disabled={loading}
                className="px-2 py-1 bg-white border border-[#CCDDF0] rounded-lg text-[#0B2545] text-[11px] font-bold shadow-2xs focus:outline-none cursor-pointer"
              >
                {limitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[#64839E]">baris</span>
            </div>
          )}

          <div className="text-[11px] text-[#64839E]">
            Halaman <strong className="text-[#0B2545] font-bold">{safePage}</strong> dari <strong className="text-[#0B2545] font-bold">{safeTotalPages}</strong>
            {actualTotalCount !== undefined && (
              <span className="ml-1 text-[#64839E] font-normal">
                ({actualTotalCount} data)
              </span>
            )}
          </div>
        </div>

        {/* Sisi Kanan: Navigasi Nomor Halaman */}
        <div className="flex items-center gap-1 sm:gap-1.5 select-none w-full md:w-auto justify-center md:justify-end overflow-x-auto py-0.5">
          <button
            type="button"
            disabled={safePage <= 1 || loading}
            onClick={handlePrev}
            className="p-1 sm:px-2 sm:py-1 rounded-lg border border-[#CCDDF0] bg-white hover:bg-[#F1F6FC] text-[#0B2545] disabled:opacity-35 disabled:cursor-not-allowed transition font-semibold flex items-center gap-0.5 shadow-2xs cursor-pointer text-[11px]"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          <div className="flex items-center gap-1">
            {paginationItems.map((item, idx) => {
              if (item === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 py-1 text-[#64839E] text-xs font-bold"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === safePage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePageSelect(item)}
                  className={`min-w-[28px] sm:min-w-[30px] h-[28px] sm:h-[30px] px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs ${
                    isCurrent
                      ? 'bg-[#026AA7] text-white border border-[#035388]'
                      : 'bg-white border border-[#CCDDF0] text-[#0B2545] hover:bg-[#F1F6FC]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={safePage >= safeTotalPages || loading}
            onClick={handleNext}
            className="p-1 sm:px-2 sm:py-1 rounded-lg border border-[#CCDDF0] bg-white hover:bg-[#F1F6FC] text-[#0B2545] disabled:opacity-35 disabled:cursor-not-allowed transition font-semibold flex items-center gap-0.5 shadow-2xs cursor-pointer text-[11px]"
            title="Halaman Berikutnya"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
