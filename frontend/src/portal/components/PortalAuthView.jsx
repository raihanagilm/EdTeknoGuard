import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';
import { PortalAuthService } from '../services/portalApi';

/* ░░░ Komponen Maskot Animasi Si Router Menyapa (menyapa.html) ░░░ */
function RouterMenyapaMascot({ className = "w-32 h-24" }) {
  return (
    <div className={`${className} flex items-center justify-center pointer-events-none drop-shadow-md`}>
      <svg
        className="mascot-router-svg"
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="rig-torso">
          {/* Kaki Kiri & Kanan */}
          <g className="rig-leg-l">
            <path d="M85 118V156H101V118" fill="#20C5D2" />
            <path d="M85 118V156H101V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>
          <g className="rig-leg-r">
            <path d="M139 118V156H155V118" fill="#20C5D2" />
            <path d="M139 118V156H155V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>

          {/* Antena Kiri & Kanan */}
          <g className="rig-antenna-l">
            <path
              d="M78 53.9999L68 17.9999C67 13.9999 73 12.9999 76 15.9999L88 51.9999L78 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="rig-antenna-r">
            <path
              d="M162 53.9999L172 17.9999C173 13.9999 167 12.9999 164 15.9999L152 51.9999L162 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Bodi Router */}
          <g className="rig-body">
            <path
              d="M58 54C72 50 168 50 182 54C196 58 206 102 200 120C196 128 178 132 120 132C62 132 44 128 40 120C34 102 44 58 58 54Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="5.5"
              strokeLinejoin="round"
            />
            <path d="M44 114C70 118 170 118 196 114" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
            <path
              d="M120 125.5C121.933 125.5 123.5 123.933 123.5 122C123.5 120.067 121.933 118.5 120 118.5C118.067 118.5 116.5 120.067 116.5 122C116.5 123.933 118.067 125.5 120 125.5Z"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            <path d="M120 119V122" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Lampu Indikator LED */}
          <g className="rig-leds">
            <path
              className="router-led-1"
              d="M64 124.5C65.3807 124.5 66.5 123.381 66.5 122C66.5 120.619 65.3807 119.5 64 119.5C62.6193 119.5 61.5 120.619 61.5 122C61.5 123.381 62.6193 124.5 64 124.5Z"
              fill="#0F172A"
            />
            <path
              className="router-led-2"
              d="M72 124.5C73.3807 124.5 74.5 123.381 74.5 122C74.5 120.619 73.3807 119.5 72 119.5C70.6193 119.5 69.5 120.619 69.5 122C69.5 123.381 70.6193 124.5 72 124.5Z"
              fill="#0F172A"
            />
            <path
              className="router-led-3"
              d="M80 124.5C81.3807 124.5 82.5 123.381 82.5 122C82.5 120.619 81.3807 119.5 80 119.5C78.6193 119.5 77.5 120.619 77.5 122C77.5 123.381 78.6193 124.5 80 124.5Z"
              fill="#0F172A"
            />
          </g>

          {/* Bola Mata */}
          <g className="rig-eyes">
            <path
              d="M92 92.5C96.6944 92.5 100.5 88.6944 100.5 84C100.5 79.3056 96.6944 75.5 92 75.5C87.3056 75.5 83.5 79.3056 83.5 84C83.5 88.6944 87.3056 92.5 92 92.5Z"
              fill="#0F172A"
            />
            <path
              d="M94.5 84.5C96.1569 84.5 97.5 83.1569 97.5 81.5C97.5 79.8431 96.1569 78.5 94.5 78.5C92.8431 78.5 91.5 79.8431 91.5 81.5C91.5 83.1569 92.8431 84.5 94.5 84.5Z"
              fill="white"
            />
            <path
              d="M148 92.5C152.694 92.5 156.5 88.6944 156.5 84C156.5 79.3056 152.694 75.5 148 75.5C143.306 75.5 139.5 79.3056 139.5 84C139.5 88.6944 143.306 92.5 148 92.5Z"
              fill="#0F172A"
            />
            <path
              d="M150.5 84.5C152.157 84.5 153.5 83.1569 153.5 81.5C153.5 79.8431 152.157 78.5 150.5 78.5C148.843 78.5 147.5 79.8431 147.5 81.5C147.5 83.1569 148.843 84.5 150.5 84.5Z"
              fill="white"
            />
          </g>

          {/* Mulut Senyum */}
          <g className="rig-mouth">
            <path d="M112 95C114 103 126 103 128 95" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Tangan Kiri */}
          <g className="rig-arm-l">
            <path
              d="M38.3045 100.595C29.0621 97.48 20.1247 114.834 16.4254 128.863"
              stroke="#0F172A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M10.9165 127.006C9.85802 130.146 11.5456 133.549 14.6857 134.608C17.8258 135.666 21.2294 133.979 22.2879 130.839C23.3463 127.699 21.6588 124.295 18.5186 123.236C15.3785 122.178 11.9749 123.866 10.9165 127.006Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
          </g>

          {/* Tangan Kanan (Menyapa / Melambai) */}
          <g className="rig-arm-r">
            <path
              d="M200 95C209.753 94.8728 212.427 75.5364 211.263 61.0753"
              stroke="#0F172A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M217.076 60.9996C217.032 57.6861 214.311 55.0351 210.998 55.0783C207.685 55.1215 205.033 57.8426 205.077 61.156C205.12 64.4695 207.841 67.1205 211.154 67.0773C214.468 67.0341 217.119 64.313 217.076 60.9996Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function PortalLoginView({ onLoginSuccess, onGoToReset }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await PortalAuthService.login(identifier, password, rememberMe);
      if (res.ok && res.data?.ok) {
        onLoginSuccess(res.data.customer);
      } else {
        setError(res.data?.message || 'ID Pelanggan / No. WA / Nama atau Kata Sandi salah!');
      }
    } catch {
      setError('Gagal menghubungi server TeknoIndonet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-200 flex items-center justify-center p-0 sm:p-4 text-slate-900 font-sans overflow-hidden">
      <div className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[92dvh] bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-200/80 flex flex-col overflow-hidden relative">

        {/* ░░░ PANEL ATAS: gradient biru diperbesar sedikit + Maskot Si Router Menyapa ░░░ */}
        <div className="relative bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 h-[210px] sm:h-[230px] overflow-hidden shrink-0">
          {/* Ornamen dekoratif */}
          <div className="absolute -top-14 -right-14 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-cyan-300/10 rounded-full pointer-events-none" />

          {/* Header Brand Atas: Logo Frame 36 lebih besar + TeknoCust + Teks Layanan Mandiri */}
          <div className="relative z-10 pt-4 px-5">
            <div className="flex items-center gap-3">
              <img
                src="/frame-36.png"
                alt="TeknoIndonet Logo"
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="text-white text-xl sm:text-2xl font-black tracking-tight leading-none drop-shadow-xs">
                  Tekno<span className="text-cyan-200 font-extrabold">Cust</span>
                </div>
                <div className="text-blue-100/90 text-[11px] sm:text-xs mt-1 font-medium leading-tight">
                  Layanan Mandiri Khusus Pelanggan TeknoIndonet
                </div>
              </div>
            </div>
          </div>

          {/* MASKOT Si Router Menyapa di tengah panel biru */}
          <div className="absolute inset-0 flex items-center justify-center pt-14 pb-2 pointer-events-none">
            <RouterMenyapaMascot className="w-32 h-24 sm:w-36 sm:h-28" />
          </div>
        </div>

        {/* ░░░ PANEL BAWAH: card putih overlap + form login utama ░░░ */}
        <div className="relative -mt-5 bg-white rounded-t-[1.75rem] shadow-2xl flex-1 flex flex-col justify-between overflow-y-auto z-10">
          <div className="px-5 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5 flex flex-col justify-between min-h-full">
            <div>
              {/* Header Title: Login Aplikasi */}
              <div className="text-center mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Login Aplikasi
                </h1>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* FORM LOGIN */}
              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                {/* ID Pelanggan / No WA / Nama */}
                <div className="space-y-1">
                  <label htmlFor="identifier" className="text-[11px] font-semibold text-slate-700 block">
                    ID Pelanggan / No. WA / Nama Terdaftar
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan ID, No. WA, atau Nama"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition min-h-[42px]"
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[11px] font-semibold text-slate-700">
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={onGoToReset}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition font-mono min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Ingat Saya */}
                <div className="flex items-center pt-0.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 font-medium">Ingat Saya</span>
                  </label>
                </div>

                {/* Tombol Masuk */}
                <button
                  id="btn-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-2.5 sm:py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-600 hover:to-blue-800 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer min-h-[44px]"
                >
                  <span>{loading ? 'Memproses...' : 'Masuk ke Akun Saya'}</span>
                  {loading && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                </button>
              </form>

              {/* Info expandable */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mt-3 sm:mt-4 bg-white">
                <button
                  type="button"
                  onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                  className="w-full px-3 py-2 sm:py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Informasi Masuk Pelanggan</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>{isInfoExpanded ? 'Tutup' : 'Lihat'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isInfoExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isInfoExpanded && (
                  <div className="px-3 pb-3 text-[11px] text-slate-600 space-y-2 border-t border-slate-200 animate-fadeIn">
                    <p className="leading-relaxed pt-2">
                      Aplikasi ini khusus pelanggan <strong className="text-blue-700">TeknoIndonet</strong>. Gunakan <strong>ID Pelanggan</strong>, <strong>No. WA</strong>, atau <strong>Nama</strong> yang Anda daftarkan saat pemasangan.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                      Kata sandi awal adalah <strong className="text-blue-700 font-mono font-bold">123456</strong>. Setelah berhasil login, Anda sangat disarankan untuk segera mengganti kata sandi demi keamanan.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer copyright */}
            <div className="pt-3 pb-1 text-center text-[10px] text-slate-400 font-mono shrink-0">
              &copy; 2026 TeknoCust &bull; Portal Layanan Mandiri Pelanggan TeknoIndonet
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Re-export untuk kompatibilitas jika masih ada import dari file ini
export { PortalResetPasswordView } from './PortalResetPasswordView';
