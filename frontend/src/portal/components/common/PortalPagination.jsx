import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Generate windowed pagination items with ellipses (e.g. 1 2 3 ... 7 8)
 */
export function getPaginationRange(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - 1, 1);
  const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 1;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 1;
    const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + 1 + i);
    return [1, '...', ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = [currentPage - 1, currentPage, currentPage + 1];
    return [1, '...', ...middleRange, '...', totalPages];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

export function PortalPagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = ''
}) {
  if (totalPages < 1) return null;

  const pages = getPaginationRange(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginasi Halaman"
      className={`flex items-center justify-center gap-1 sm:gap-1.5 pt-3 border-t border-gray-100 select-none ${className}`}
    >
      {/* Tombol Halaman Sebelumnya (<) */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
        aria-label="Halaman Sebelumnya"
        title="Halaman Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
      </button>

      {/* Deretan Tombol Angka & Elipsis */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((item, index) => {
          if (item === '...') {
            return (
              <span
                key={`dots-${index}`}
                className="w-6 h-8 flex items-center justify-center text-xs font-semibold text-gray-400 select-none"
              >
                ...
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-600 scale-[1.02]'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 shadow-2xs'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Tombol Halaman Selanjutnya (>) */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
        aria-label="Halaman Selanjutnya"
        title="Halaman Selanjutnya"
      >
        <ChevronRight className="w-4 h-4 stroke-[2.2]" />
      </button>
    </nav>
  );
}

export default PortalPagination;
