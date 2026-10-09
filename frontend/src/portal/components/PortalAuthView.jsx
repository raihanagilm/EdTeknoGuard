import React, { useState } from 'react';
import {
  Radio,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PortalAuthService } from '../services/portalApi';

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
    } catch (err) {
      setError('Gagal menghubungi server TeknoIndonet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 text-slate-900 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-xl space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/25">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tekno<span className="text-cyan-600">Cust</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Layanan Mandiri Khusus Pelanggan <strong className="text-cyan-700 font-semibold">TeknoIndonet</strong>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-slate-700 block">ID Pelanggan / No. WA / Nama Terdaftar</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan ID, No. WA, atau Nama"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition min-h-[42px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-700">Kata Sandi (Password)</label>
                <button
                  type="button"
                  onClick={onGoToReset}
                  className="text-[11px] font-bold text-cyan-600 hover:text-cyan-800 hover:underline"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition min-h-[42px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Lihat password"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Checkbox Ingat Saya */}
            <div className="flex items-center justify-start pt-0.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 focus:ring-offset-0 transition cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">Ingat Saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 active:scale-[0.99] transition min-h-[44px]"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Akun Saya</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Expandable Info Card (Click on text to expand) */}
          <div className="rounded-2xl bg-cyan-50/80 border border-cyan-200/80 overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-cyan-100/50 transition cursor-pointer"
            >
              <div className="font-bold text-cyan-950 flex items-center gap-2 text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Informasi Masuk Pelanggan</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-cyan-700 font-medium">
                <span className="hidden sm:inline">{isInfoExpanded ? 'Tutup' : 'Lihat'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isInfoExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            {isInfoExpanded && (
              <div className="px-3.5 pb-3.5 pt-0 text-[11px] text-slate-600 space-y-2 border-t border-cyan-200/50 animate-fadeIn">
                <p className="text-justify leading-relaxed pt-2">
                  Aplikasi ini khusus pelanggan <strong className="text-cyan-800">TeknoIndonet</strong>. Gunakan <strong>ID Pelanggan</strong>, <strong>No. WA</strong>, atau <strong>Nama</strong> yang Anda daftarkan/terdaftar saat pemasangan.
                </p>
                <p className="text-justify leading-relaxed text-slate-600">
                  Kata sandi awal adalah <strong className="text-cyan-800 font-mono">123456</strong>. Setelah berhasil login, Anda sangat disarankan untuk segera mengganti kata sandi demi keamanan.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="py-3 text-center text-[11px] text-slate-500 font-mono">
        &copy; 2026 TeknoCust &bull; Portal Layanan Mandiri Pelanggan TeknoIndonet
      </div>
    </div>
  );
}

export function PortalResetPasswordView({ onBackToLogin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 text-slate-900 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-700">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Lupa Password Pelanggan
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Bantuan reset kata sandi akun TeknoCust
            </p>
          </div>

          {/* Information Card */}
          <div className="p-4 rounded-2xl bg-cyan-50/90 border border-cyan-200 text-xs text-slate-700 space-y-3 leading-relaxed">
            <div className="font-bold text-cyan-950 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Dikelola Langsung Oleh Admin NOC</span>
            </div>
            <p>
              Untuk menjaga keamanan data dan mencegah akses tanpa izin, reset kata sandi pelanggan dihandle langsung oleh <strong>Admin TeknoGuard (NOC ISP TeknoIndonet)</strong>.
            </p>
            <div className="p-3 rounded-xl bg-white border border-cyan-100 space-y-1.5 text-[11px]">
              <div className="font-semibold text-slate-800">Petunjuk Pemulihan Akun:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Hubungi Admin/Teknisi TeknoIndonet yang melayani wilayah Anda.</li>
                <li>Sebutkan <strong>Nama Terdaftar</strong>, <strong>ID Pelanggan</strong>, atau <strong>IP Modem</strong> Anda.</li>
                <li>Admin TeknoGuard akan mereset sandi Anda kembali ke default (<strong className="font-mono text-cyan-700">123456</strong>) atau kata sandi baru yang Anda inginkan.</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition active:scale-[0.98] min-h-[42px]"
            >
              Kembali ke Halaman Masuk
            </button>
          </div>

        </div>
      </div>

      <div className="py-3 text-center text-[11px] text-slate-500 font-mono">
        &copy; 2026 TeknoCust &bull; Layanan Khusus Pelanggan TeknoIndonet
      </div>
    </div>
  );
}
