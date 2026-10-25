import React from 'react';

/**
 * Standard Header Card used across all 8 modules (MVC View Component)
 */
export function ModuleHeader({
  badge,
  icon: Icon,
  title,
  subtitle,
  children
}) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-sky-200/80 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {badge && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-100/80 border border-cyan-300 text-cyan-900 font-mono text-[10px] font-bold">
                {badge}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-cyan-600 shrink-0" />}
            <span>{title}</span>
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">
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
  colorScheme = 'cyan', // 'cyan', 'emerald', 'amber', 'rose', 'purple'
  isActive = false,
  onClick,
  subLabel
}) {
  const schemes = {
    cyan: {
      bgActive: 'bg-cyan-50/90 border-cyan-400 ring-2 ring-cyan-200',
      iconBg: 'bg-cyan-100 text-cyan-800',
      textNum: 'text-slate-900',
      labelColor: 'text-slate-600',
    },
    emerald: {
      bgActive: 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-800',
      textNum: 'text-emerald-800',
      labelColor: 'text-emerald-800',
    },
    amber: {
      bgActive: 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-200',
      iconBg: 'bg-amber-100 text-amber-800',
      textNum: 'text-amber-800',
      labelColor: 'text-amber-800',
    },
    rose: {
      bgActive: 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-200',
      iconBg: 'bg-rose-100 text-rose-800',
      textNum: 'text-rose-800',
      labelColor: 'text-rose-800',
    },
    purple: {
      bgActive: 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200',
      iconBg: 'bg-purple-100 text-purple-800',
      textNum: 'text-purple-800',
      labelColor: 'text-purple-800',
    },
  };

  const scheme = schemes[colorScheme] || schemes.cyan;

  const content = (
    <>
      <div className={`p-2 sm:p-2.5 rounded-xl font-bold shrink-0 flex items-center justify-center ${scheme.iconBg}`}>
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </div>
      <div className="overflow-hidden text-left flex-1 min-w-0">
        <div className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider truncate leading-tight ${scheme.labelColor}`}>
          {label}
        </div>
        <div className={`text-sm sm:text-base font-black font-mono tracking-tight leading-tight mt-0.5 whitespace-nowrap ${scheme.textNum}`}>
          {value} {unit && <span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-0.5">{unit}</span>}
        </div>
        {subLabel && (
          <div className="hidden md:block text-[10px] sm:text-[11px] text-slate-500 font-mono truncate mt-0.5">{subLabel}</div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center gap-2 sm:gap-3 shadow-2xs cursor-pointer ${
          isActive
            ? scheme.bgActive
            : 'bg-white/95 border-sky-200/80 hover:bg-cyan-50/40 hover:border-cyan-300'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-white/95 border border-sky-200/80 shadow-2xs flex items-center gap-2 sm:gap-3">
      {content}
    </div>
  );
}

/**
 * Standard Unified Segmented Status Ticker Bar (Option B - Ultra-Clean Single-Container)
 */
export function SegmentedStatusBar({ items = [] }) {
  const schemes = {
    cyan: { active: 'bg-cyan-600 text-white shadow-xs', textNum: 'text-cyan-900', label: 'text-cyan-800' },
    emerald: { active: 'bg-emerald-600 text-white shadow-xs', textNum: 'text-emerald-900', label: 'text-emerald-800' },
    amber: { active: 'bg-amber-500 text-white shadow-xs', textNum: 'text-amber-900', label: 'text-amber-800' },
    rose: { active: 'bg-rose-600 text-white shadow-xs', textNum: 'text-rose-900', label: 'text-rose-800' },
    purple: { active: 'bg-purple-600 text-white shadow-xs', textNum: 'text-purple-900', label: 'text-purple-800' },
    orange: { active: 'bg-orange-600 text-white shadow-xs', textNum: 'text-orange-950', label: 'text-orange-900' },
    slate: { active: 'bg-slate-600 text-white shadow-xs', textNum: 'text-slate-700', label: 'text-slate-600' },
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-200/80 shadow-2xs p-1.5 flex items-center divide-x divide-sky-100">
      {items.map((it, idx) => {
        const sc = schemes[it.colorScheme || 'cyan'] || schemes.cyan;
        const isActive = Boolean(it.isActive);

        return (
          <button
            key={idx}
            type="button"
            onClick={it.onClick}
            className={`flex-1 py-1.5 px-1 sm:py-2.5 sm:px-2 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none ${it.className || ''} ${
              isActive
                ? `${sc.active} ring-1 ring-black/5`
                : 'hover:bg-cyan-50/50 text-slate-700'
            }`}
          >
            <span
              className={`text-[11px] font-mono font-bold uppercase tracking-wider truncate max-w-full ${
                isActive ? 'text-white' : sc.label
              }`}
            >
              {it.label}
            </span>
            <span
              className={`text-sm sm:text-base font-black font-mono tracking-tight leading-none mt-0.5 ${
                isActive ? 'text-white' : sc.textNum
              }`}
            >
              {it.value}
            </span>
            {it.subLabel && (
              <span
                className={`hidden md:block text-[11px] font-mono truncate mt-0.5 ${
                  isActive ? 'text-white/90' : 'text-slate-500'
                }`}
              >
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
    <div className={`bg-white/90 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 border border-sky-200/80 shadow-xs ${className}`}>
      {children}
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Helper to compute pagination items with ellipses (...)
 */
function getPaginationRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  // Selalu tampilkan halaman 1
  pages.push(1);

  if (currentPage > 3) {
    pages.push('...');
  }

  // Tampilkan halaman sekitar current
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  // Selalu tampilkan halaman terakhir
  pages.push(totalPages);

  return pages;
}

/**
 * Standard Data Table Container with Unified Modern Pagination Bar
 * - Sisi Kiri: Selector Tampilkan (15, 30, 50, 75, 100) & Ringkasan Data
 * - Sisi Kanan: Navigasi Nomor Halaman (< 1, 2, 3 ... 7, 8 >)
 */
export function DataTableContainer({
  children,
  page = 1,
  totalPages = 1,
  totalCount,
  totalItems, // Alias for totalCount if passed
  limit = 15,
  onLimitChange,
  onPageChange,
  onPrevPage,
  onNextPage,
  loading = false,
  emptyText = 'Tidak ada data ditemukan.',
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
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        {children}
      </div>

      <div className="p-3 sm:p-3.5 border-t border-sky-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600 bg-slate-50/50">
        {/* Sisi Kiri: Selector Rows Per Page & Ringkasan Data */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          {onLimitChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-bold">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  onLimitChange(newLimit);
                }}
                disabled={loading}
                className="px-2 py-1 bg-white border border-sky-200 rounded-lg text-slate-800 text-[11px] font-bold shadow-2xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
              >
                {limitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400">baris</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            Halaman <strong className="text-cyan-900 font-bold">{safePage}</strong> dari <strong className="text-cyan-900 font-bold">{safeTotalPages}</strong>
            {actualTotalCount !== undefined && (
              <span className="ml-1 text-slate-400 font-normal">
                ({actualTotalCount} data)
              </span>
            )}
          </div>
        </div>

        {/* Sisi Kanan: Navigasi Nomor Halaman (< 1, 2, 3 ... 7, 8 >) */}
        <div className="flex items-center gap-1 sm:gap-1.5 select-none w-full md:w-auto justify-center md:justify-end overflow-x-auto py-0.5">
          {/* Tombol Sebelumnya (<) */}
          <button
            type="button"
            disabled={safePage <= 1 || loading}
            onClick={handlePrev}
            className="p-1 sm:px-2 sm:py-1 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition font-bold flex items-center gap-0.5 shadow-2xs cursor-pointer text-[11px]"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Deretan Angka & Titik-titik */}
          <div className="flex items-center gap-1">
            {paginationItems.map((item, idx) => {
              if (item === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 py-1 text-slate-400 text-xs font-bold"
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
                      ? 'bg-cyan-700 text-white border border-cyan-800 ring-1 ring-cyan-500/30'
                      : 'bg-white border border-sky-200 text-slate-700 hover:bg-cyan-50 hover:border-cyan-300'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Tombol Berikutnya (>) */}
          <button
            type="button"
            disabled={safePage >= safeTotalPages || loading}
            onClick={handleNext}
            className="p-1 sm:px-2 sm:py-1 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition font-bold flex items-center gap-0.5 shadow-2xs cursor-pointer text-[11px]"
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
