import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  Wifi,
  LogIn
} from 'lucide-react';
import { PortalActiveMascot } from './PortalActiveMascot';

export function PortalErrorView({
  errorCode = 404,
  title = "Halaman Tidak Ditemukan",
  description = "Tautan yang Anda tuju tidak tersedia atau rute di TeknoCust telah diperbarui.",
  primaryActionLabel = "Beranda",
  onRetry,
  onBackToHome
}) {
  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-sm w-full relative">

        {/* Karakter Maskot Resmi TeknoGuard (/mascots/bingung.svg atau pusing.svg) */}
        <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-3 flex items-center justify-center">
          <PortalActiveMascot
            mascotKey="bingung"
            className="w-full h-full drop-shadow-md animate-bounce"
            style={{ animationDuration: '3.5s' }}
          />
        </div>

        {/* Badge Status Code */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold mb-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>STATUS: {errorCode} NOT FOUND</span>
        </div>

        {/* Heading & Deskripsi */}
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed">
          {description}
        </p>

        {/* Tombol Aksi 1 Baris Horizontal */}
        <div className="mt-5 flex flex-row items-center justify-center gap-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else if (onBackToHome) {
                onBackToHome();
              } else {
                window.location.href = '/teknocust';
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[40px] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Kembali</span>
          </button>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[40px] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-700" />
              <span>Coba Lagi</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToHome || (() => { window.location.href = '/teknocust' })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition active:scale-[0.98] min-h-[40px] cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PortalErrorView;
