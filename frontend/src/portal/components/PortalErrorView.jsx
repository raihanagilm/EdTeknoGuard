import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  Wifi,
  LogIn
} from 'lucide-react';

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

        {/* Karakter Animasi Modem WiFi & Kabel Fiber Optik Warga (SVG Animated Vector) */}
        <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 mb-3 flex items-center justify-center">
          <svg
            className="w-full h-full drop-shadow-md animate-bounce"
            style={{ animationDuration: '3.5s' }}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Bayangan Dasar */}
            <ellipse cx="100" cy="175" rx="55" ry="9" fill="#E2E8F0" className="animate-pulse" />

            {/* Kabel Fiber Putus dengan Kilatan Indikator */}
            <path
              d="M35 155 C 55 140, 65 160, 85 150"
              stroke="#0891B2"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <circle cx="87" cy="149" r="4.5" fill="#F43F5E" className="animate-ping" />

            {/* Perangkat Modem Rumah (ONT Home Gateway) */}
            <rect x="45" y="75" width="110" height="70" rx="18" fill="#FFFFFF" stroke="#0891B2" strokeWidth="3.5" />
            <rect x="55" y="85" width="90" height="28" rx="8" fill="#F0F9FF" border="1px solid #BAE6FD" />

            {/* Antena Kiri & Kanan (Sudut Miring) */}
            <line x1="60" y1="75" x2="48" y2="35" stroke="#0891B2" strokeWidth="4" strokeLinecap="round" />
            <circle cx="47" cy="32" r="5" fill="#38BDF8" />

            <line x1="140" y1="75" x2="152" y2="35" stroke="#0891B2" strokeWidth="4" strokeLinecap="round" />
            <circle cx="153" cy="32" r="5" fill="#38BDF8" />

            {/* Indikator LOS (Lampu Merah Berkedip pada Modem) */}
            <g className="animate-pulse">
              <circle cx="70" cy="99" r="4.5" fill="#10B981" />
              <circle cx="85" cy="99" r="4.5" fill="#10B981" />
              <circle cx="100" cy="99" r="4.5" fill="#F43F5E" className="animate-ping" />
              <circle cx="100" cy="99" r="4" fill="#E11D48" />
              <circle cx="115" cy="99" r="4.5" fill="#CBD5E1" />
              <circle cx="130" cy="99" r="4.5" fill="#10B981" />
            </g>

            {/* Teks Digital 404 pada Panel Depan Modem */}
            <text x="100" y="133" textAnchor="middle" fill="#0369A1" fontFamily="monospace" fontWeight="900" fontSize="16" letterSpacing="2">
              404-LOS
            </text>

            {/* Gelombang WiFi Putus / Tanda Seru di Udara */}
            <path d="M85 24 A 20 20 0 0 1 115 24" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 3" fill="none" />
            <path d="M75 14 A 32 32 0 0 1 125 14" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" fill="none" className="opacity-70" />
            <circle cx="100" cy="28" r="3" fill="#F43F5E" />
          </svg>
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[40px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Kembali</span>
          </button>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-700" />
              <span>Coba Lagi</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToHome || (() => { window.location.href = '/teknocust' })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition active:scale-[0.98] min-h-[40px]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
