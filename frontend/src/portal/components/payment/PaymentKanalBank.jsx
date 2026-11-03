import React, { useState } from 'react';
import { Landmark, ChevronDown, Check, Copy, Info } from 'lucide-react';
import { rupiah, vaTampil } from './paymentUtils';

export function BarisNominal({ label, nilai, tebal = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${tebal ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`tabular-nums ${tebal ? 'text-sm font-black text-blue-600' : 'text-xs font-semibold text-gray-800'}`}>
        {nilai}
      </span>
    </div>
  );
}

/** Satu kanal bank Virtual Account. Tertutup secara bawaan; dibuka dengan sentuhan. */
export function PaymentKanalBank({ kanal, tagihanTotal, terbuka, onToggle }) {
  const [tersalin, setTersalin] = useState(false);

  const salinNomor = async (e) => {
    e.stopPropagation();
    const bersih = String(kanal.va_number || '');
    try {
      await navigator.clipboard.writeText(bersih);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = bersih;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* fallback clipboard aman */
      }
      document.body.removeChild(ta);
    }
    setTersalin(true);
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => setTersalin(false), 1800);
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      terbuka ? 'border-blue-400 bg-blue-50/50 shadow-xs' : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[48px] text-left cursor-pointer active:bg-gray-100/70"
        aria-expanded={terbuka}
      >
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          terbuka ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
        }`}>
          <Landmark className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-black text-gray-900 truncate">
            Virtual Account {kanal.bank}
          </span>
          <span className="block text-[11px] text-gray-500 font-medium">
            {terbuka ? 'Klik tombol salin di bawah' : 'Ketuk untuk melihat nomor & rincian'}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
          terbuka ? 'rotate-180 text-blue-600' : ''
        }`} />
      </button>

      {terbuka && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-100 pt-3 bg-white">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nomor Virtual Account {kanal.bank}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-black text-gray-900 tracking-wider tabular-nums">
                {vaTampil(kanal.va_number)}
              </span>
              <button
                type="button"
                onClick={salinNomor}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tersalin ? 'bg-blue-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                }`}
              >
                {tersalin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tersalin ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
            <BarisNominal label="Tagihan Pokok" nilai={rupiah(tagihanTotal)} />
            <BarisNominal label="Biaya Admin Bank" nilai={rupiah(kanal.admin_fee || 0)} />
            <div className="pt-1.5 border-t border-gray-100">
              <BarisNominal label="Total Yang Harus Dibayar" nilai={rupiah(kanal.amount_to_pay)} tebal />
            </div>
          </div>

          <p className="text-[11px] text-gray-500 flex items-center gap-1.5 font-medium pt-1">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Bayar persis <strong>{rupiah(kanal.amount_to_pay)}</strong> agar transaksi diverifikasi otomatis.</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default PaymentKanalBank;

