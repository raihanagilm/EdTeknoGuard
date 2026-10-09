import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  WifiOff,
  ShieldAlert,
  ServerCrash
} from 'lucide-react';

export function ErrorView({
  errorCode = 404,
  title = "Halaman Tidak Ditemukan",
  description = "Maaf, rute atau halaman yang Anda tuju tidak tersedia atau telah dipindahkan oleh sistem NOC.",
  primaryActionLabel = "Beranda",
  onRetry,
  onBackToHome
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center">
      <div className="max-w-lg w-full relative">

        {/* Karakter Animasi Robot NOC / Jaringan (SVG Animated Vector) */}
        <div className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48 mb-4 flex items-center justify-center">
          <svg
            className="w-full h-full drop-shadow-md animate-bounce"
            style={{ animationDuration: '3s' }}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shadow Base */}
            <ellipse cx="100" cy="180" rx="60" ry="10" fill="#E2E8F0" className="animate-pulse" />

            {/* Cable Disconnected */}
            <path
              d="M30 160 C 50 140, 60 165, 80 155"
              stroke="#0284C7"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <circle cx="82" cy="154" r="5" fill="#EF4444" className="animate-ping" />

            {/* Robot NOC Body */}
            <rect x="55" y="60" width="90" height="85" rx="24" fill="#0891B2" stroke="#0E7490" strokeWidth="4" />
            <rect x="65" y="70" width="70" height="65" rx="16" fill="#0F172A" />

            {/* Robot Screen Glow */}
            <rect x="68" y="73" width="64" height="59" rx="13" fill="#1E293B" />

            {/* Robot Eyes (Dizzy / Error State) */}
            {errorCode === 404 ? (
              <g className="animate-pulse">
                {/* 404 Eyes */}
                <text x="73" y="110" fill="#38BDF8" fontFamily="monospace" fontWeight="900" fontSize="18">4</text>
                <circle cx="100" cy="103" r="8" fill="none" stroke="#F43F5E" strokeWidth="3" />
                <path d="M96 99 L104 107 M104 99 L96 107" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />
                <text x="113" y="110" fill="#38BDF8" fontFamily="monospace" fontWeight="900" fontSize="18">4</text>
              </g>
            ) : (
              <g className="animate-pulse">
                {/* X X Eyes */}
                <path d="M78 96 L90 108 M90 96 L78 108" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
                <path d="M110 96 L122 108 M122 96 L110 108" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
                <path d="M93 118 Q100 112 107 118" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>
            )}

            {/* Antena Signal Wave */}
            <line x1="100" y1="60" x2="100" y2="35" stroke="#0E7490" strokeWidth="4" strokeLinecap="round" />
            <circle cx="100" cy="30" r="8" fill="#F43F5E" className="animate-ping" />
            <circle cx="100" cy="30" r="6" fill="#FB7185" />

            {/* Blinking Signal Rings */}
            <path d="M85 22 A 18 18 0 0 1 115 22" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" className="opacity-80" />
            <path d="M75 14 A 30 30 0 0 1 125 14" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" fill="none" className="opacity-60" />

            {/* Side Ears / Ports */}
            <rect x="43" y="85" width="12" height="24" rx="4" fill="#0E7490" />
            <rect x="145" y="85" width="12" height="24" rx="4" fill="#0E7490" />
          </svg>
        </div>

        {/* Badge Error Code */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>STATUS CODE: {errorCode}</span>
        </div>

        {/* Heading & Deskripsi */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">
          {description}
        </p>

        {/* Action Buttons (1 Baris Horizontal di Mobile & Desktop) */}
        <div className="mt-6 flex flex-row items-center justify-center gap-2 sm:gap-3 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else if (onBackToHome) {
                onBackToHome();
              } else {
                window.location.href = '/';
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[42px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Kembali</span>
          </button>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-900 font-bold text-xs shadow-2xs transition active:scale-[0.98] min-h-[42px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-700" />
              <span>Coba Lagi</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToHome || (() => { window.location.href = '/' })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition active:scale-[0.98] min-h-[42px]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
