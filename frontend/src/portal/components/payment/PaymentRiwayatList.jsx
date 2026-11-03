import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  CheckCircle2,
  Banknote,
  ArrowLeftRight,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { rupiah, periodeTeks, tanggalTeks, jenisTagihanTeks } from './paymentUtils';

const ITEMS_PER_PAGE = 5;

export function PaymentRiwayatList({ riwayat, memuatRiwayat }) {
  const [filterYear, setFilterYear] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);

  const invoices = riwayat?.invoices || [];

  // Ekstrak daftar tahun unik dari riwayat
  const years = useMemo(() => {
    const setYears = new Set();
    invoices.forEach((inv) => {
      const p = inv.billing_period || inv.payment?.date || '';
      const y = String(p).split('-')[0];
      if (y && y.length === 4) setYears.add(y);
    });
    return Array.from(setYears).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // Saring data berdasarkan tahun terpilih
  const filteredInvoices = useMemo(() => {
    if (filterYear === 'semua') return invoices;
    return invoices.filter((inv) => {
      const p = inv.billing_period || inv.payment?.date || '';
      return String(p).startsWith(filterYear);
    });
  }, [invoices, filterYear]);

  // Paginasi
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const handleYearChange = (year) => {
    setFilterYear(year);
    setCurrentPage(1);
  };

  // Helper metode pembayaran
  const renderMetodeIcon = (method) => {
    const m = String(method || '').toLowerCase();
    if (m === 'tunai') return <Banknote className="w-3.5 h-3.5 text-gray-500" />;
    if (m === 'transfer') return <ArrowLeftRight className="w-3.5 h-3.5 text-gray-500" />;
    return <Landmark className="w-3.5 h-3.5 text-gray-500" />;
  };

  return (
    <div className="p-4 bg-white space-y-3.5">
      {/* ═══ SKELETON LOADING STATE ═══ */}
      {memuatRiwayat && !riwayat && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* ═══ STATE KOSONG ═══ */}
      {!memuatRiwayat && invoices.length === 0 && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2.5 bg-gray-100 text-gray-500">
            <ReceiptText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-gray-900">Belum Ada Riwayat Pembayaran</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto font-medium leading-relaxed">
            Pembayaran iuran yang sudah lunas akan otomatis dicatat dan tersimpan rapi di sini.
          </p>
        </div>
      )}

      {/* ═══ KONTEN RIWAYAT TERSTRUKTUR ═══ */}
      {invoices.length > 0 && (
        <>
          {/* Filter Tahun (Horizontal Pill Tabs) */}
          {years.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-100 scrollbar-none">
              <button
                type="button"
                onClick={() => handleYearChange('semua')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterYear === 'semua'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                }`}
              >
                Semua Tahun ({invoices.length})
              </button>
              {years.map((y) => {
                const count = invoices.filter((i) => String(i.billing_period || i.payment?.date || '').startsWith(y)).length;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearChange(y)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterYear === y
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                    }`}
                  >
                    {y} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Daftar Riwayat Compact (Bebas Box-in-Box, Ber-divider Bersih) */}
          <div className="divide-y divide-gray-100 -mx-4">
            {paginatedInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">
                    {periodeTeks(inv.billing_period) || inv.number}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate font-medium flex items-center gap-1.5">
                    <span>{inv.number}</span>
                    <span>·</span>
                    <span>{jenisTagihanTeks(inv.type)}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lunas</span>
                    </span>
                    {inv.payment?.method_label && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        {renderMetodeIcon(inv.payment.method)}
                        <span>{inv.payment.method_label}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-gray-900 font-mono">
                    {rupiah(inv.payment?.amount ?? inv.total)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                    {tanggalTeks(inv.payment?.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Kontrol Paginasi Bersih Ramah Mobile */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="text-gray-500 font-medium text-[11px]">
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PaymentRiwayatList;

