import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ReceiptText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { PortalPembayaranService } from '../../services/portalApi';

const BATAS_POLLING_MS = 120000;   // 2 menit
const JEDA_POLLING_MS = 10000;     // 10 detik
const BATAS_PROSES_MS = 900000;    // 15 menit

export function PaymentCheckModal({ invoiceId, onTutup, onLunas }) {
  const [state, setState] = useState('checking'); // checking | success | pending | stale | limited
  const [sisaDetik, setSisaDetik] = useState(Math.round(BATAS_POLLING_MS / 1000));
  const [pesan, setPesan] = useState('');

  const mulaiRef = useRef(Date.now());
  const timerRef = useRef(null);
  const hidupRef = useRef(true);

  useEffect(() => () => {
    hidupRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const periksa = useCallback(async () => {
    const res = await PortalPembayaranService.periksaPembayaran(invoiceId);
    if (!hidupRef.current) return;

    if (res.status === 429) {
      setPesan(res.data?.message || 'Permintaan sedang padat.');
      setState('limited');
      return;
    }

    if (res.ok && res.data?.settled) {
      setState('success');
      onLunas?.(res.data);
      return;
    }

    const lewat = Date.now() - mulaiRef.current;
    if (lewat >= BATAS_POLLING_MS) {
      setState(lewat >= BATAS_PROSES_MS ? 'stale' : 'pending');
      return;
    }

    timerRef.current = setTimeout(periksa, JEDA_POLLING_MS);
  }, [invoiceId, onLunas]);

  useEffect(() => {
    periksa();
    const tick = setInterval(() => {
      const sisa = Math.max(0, Math.round((BATAS_POLLING_MS - (Date.now() - mulaiRef.current)) / 1000));
      setSisaDetik(sisa);
      if (sisa === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [periksa]);

  const isi = {
    checking: {
      icon: Search,
      warna: 'text-blue-600',
      bg: 'bg-blue-50',
      judul: 'Memeriksa Pembayaran Anda',
      teks: `Mohon tunggu, kami sedang memastikan pembayaran Anda sudah tercatat. Pemeriksaan otomatis berhenti dalam ${sisaDetik} detik.`
    },
    success: {
      icon: CheckCircle2,
      warna: 'text-emerald-600',
      bg: 'bg-emerald-50',
      judul: 'Pembayaran Diterima!',
      teks: 'Terima kasih! Tagihan Anda sudah tercatat lunas dan koneksi internet Anda tetap lancar.'
    },
    pending: {
      icon: Clock,
      warna: 'text-amber-600',
      bg: 'bg-amber-50',
      judul: 'Pembayaran Sedang Diproses',
      teks: 'Pembayaran Anda sudah masuk ke bank. Pencatatan ke sistem memerlukan waktu beberapa menit. Anda tidak perlu membayar ulang.'
    },
    stale: {
      icon: AlertTriangle,
      warna: 'text-amber-600',
      bg: 'bg-amber-50',
      judul: 'Pembayaran Belum Tercatat',
      teks: 'Sudah lebih dari 15 menit dan tagihan Anda belum tercatat lunas. Silakan hubungi petugas kantor atau teknisi piket.'
    },
    limited: {
      icon: Clock,
      warna: 'text-gray-600',
      bg: 'bg-gray-100',
      judul: 'Antrean Sedang Padat',
      teks: pesan || 'Server tagihan sedang sibuk. Silakan coba periksa lagi sebentar.'
    }
  }[state];

  const Icon = isi.icon;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 pb-24 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onTutup}
    >
      <div
        className="w-full max-w-sm bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/50 gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Status Pembayaran
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-tight">
                Pemeriksaan otomatis via Bank Virtual Account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3.5 ${isi.bg}`}>
            <Icon className={`w-7 h-7 ${isi.warna} ${state === 'checking' ? 'animate-pulse' : ''}`} />
          </div>

          <h3 className="text-base font-black text-gray-900">{isi.judul}</h3>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed max-w-xs font-medium">
            {isi.teks}
          </p>

          {/* Info Card Keamanan */}
          <div className="w-full mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-left">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
              Sistem memverifikasi pelunasan secara otomatis dengan jaringan bank mitra tanpa perlu upload bukti transfer fisik.
            </p>
          </div>

          <div className="w-full mt-4">
            <button
              type="button"
              onClick={onTutup}
              className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default PaymentCheckModal;

