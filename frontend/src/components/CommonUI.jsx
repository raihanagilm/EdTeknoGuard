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
      <div className={`p-2 rounded-lg font-bold shrink-0 ${scheme.iconBg}`}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div className="overflow-hidden text-left">
        <div className={`text-[11px] font-mono font-bold uppercase truncate ${scheme.labelColor}`}>
          {label}
        </div>
        <div className={`text-sm sm:text-base font-black font-mono tracking-tight ${scheme.textNum}`}>
          {value} {unit && <span className="text-xs font-normal text-slate-600">{unit}</span>}
        </div>
        {subLabel && (
          <div className="text-[11px] text-slate-600 font-mono truncate">{subLabel}</div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
          isActive ? scheme.bgActive : 'bg-white/90 border-sky-200/80 hover:bg-cyan-50/40'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-white/90 border border-sky-200/80 shadow-xs flex items-center gap-3">
      {content}
    </div>
  );
}

/**
 * Standard Filter Bar Container
 */
export function FilterContainer({ children }) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-sky-200/80 shadow-xs space-y-3">
      {children}
    </div>
  );
}

/**
 * Standard Data Table Container with Pagination Bar
 */
export function DataTableContainer({
  children,
  page,
  totalPages,
  totalCount,
  onPrevPage,
  onNextPage,
  loading = false,
  emptyText = 'Tidak ada data ditemukan.'
}) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        {children}
      </div>

      {(page !== undefined && totalPages !== undefined) && (
        <div className="p-3.5 border-t border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600 bg-cyan-50/30">
          <div>
            Halaman <span className="font-bold text-cyan-900">{page}</span> dari <span className="font-bold text-cyan-900">{totalPages}</span> {totalCount !== undefined && `(${totalCount} total rekaman)`}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={onPrevPage}
              className="px-3 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 disabled:opacity-40 transition font-bold"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={onNextPage}
              className="px-3 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 disabled:opacity-40 transition font-bold"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
