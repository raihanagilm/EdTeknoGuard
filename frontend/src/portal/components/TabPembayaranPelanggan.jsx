import React from 'react';
import { CreditCard, Clock, CheckCircle2, ChevronLeft, ShieldCheck, ArrowRight } from 'lucide-react';
import { PortalHeader } from './PortalHeader';

export function TabPembayaranPelanggan({ customer, dashboardData, onBack }) {
  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU TERPADU ═══ */}
      <PortalHeader
        title="Pembayaran & Tagihan"
        subtitle="Informasi Status Iuran & Pembayaran Mandiri"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-24 space-y-3">

          {/* ═══ CARD 1: BANNER SEGERA HADIR ═══ */}
          <div className="relative mx-3">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100 p-5 text-center">
              {/* Icon Segera Hadir */}
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-md" style={{ background: '#dbeafe' }}>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Fitur Segera Hadir</span>
              </div>

              <h2 className="text-base font-black text-gray-900 mt-1">
                Portal Pembayaran Online
              </h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                Fitur pembayaran otomatis melalui QRIS, Transfer Bank, dan Virtual Account sedang dalam tahap integrasi payment gateway.
              </p>

              {/* Garis pemisah */}
              <div className="my-4 border-t border-gray-100" />

              {/* Panduan Pembayaran Saat Ini */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-gray-800">Cara Pembayaran Saat Ini:</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Untuk saat ini, silakan melakukan pembayaran iuran bulanan langsung ke <strong>Petugas Kantor ISP</strong> terdekat atau melalui transfer rekening resmi yang tertera pada nota invoice bulanan Anda.
                </p>
              </div>

              {/* Tombol Kembali ke Beranda */}
              <button
                type="button"
                onClick={onBack}
                className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5"
                style={{ background: '#2563eb' }}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default TabPembayaranPelanggan;
