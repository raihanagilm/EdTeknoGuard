import React, { useState } from 'react';
import {
  Radio,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PortalAuthService } from '../services/portalApi';

export function PortalLoginView({ onLoginSuccess, onGoToReset }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await PortalAuthService.login(identifier, password);
      if (res.ok && res.data.ok) {
        onLoginSuccess(res.data.customer);
      } else {
        setError(res.data?.message || 'ID Pelanggan atau Kata Sandi salah!');
      }
    } catch (err) {
      setError('Gagal menghubungi server ISP.');
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
              Layanan Mandiri Pelanggan WiFi &amp; Lapor Kendala
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
              <label className="text-slate-700 block">ID Pelanggan / No. WA / Nama</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: CUST-0891 atau 08123456789"
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
                  className="text-[11px] text-cyan-600 hover:text-cyan-800 hover:underline"
                >
                  Lupa Sandi?
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
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
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

          {/* Quick Help Card */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-cyan-900 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-600" />
              <span>Informasi Masuk Pelanggan:</span>
            </div>
            <p>
              Akun didaftarkan langsung oleh kantor ISP. Kata sandi awal bagi pelanggan baru adalah: <strong className="text-cyan-800 font-mono">123456</strong>.
            </p>
          </div>

        </div>
      </div>

      <div className="py-3 text-center text-[11px] text-slate-500 font-mono">
        &copy; 2026 TeknoCust &bull; Portal Layanan Mandiri Pelanggan ISP
      </div>
    </div>
  );
}

export function PortalResetPasswordView({ onBackToLogin }) {
  const [ipRouter, setIpRouter] = useState('');
  const [nama, setNama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await PortalAuthService.resetPassword({
        ip_router: ipRouter,
        nama: nama,
        password_baru: passwordBaru
      });
      if (res.ok && res.data.ok) {
        setSuccess(res.data.message || 'Kata sandi berhasil diatur ulang!');
      } else {
        setError(res.data?.message || 'Data verifikasi tidak cocok!');
      }
    } catch (err) {
      setError('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 text-slate-900 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-xl space-y-6">
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reset Kata Sandi
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Verifikasi mandiri akun modem tanpa perlu telepon kantor
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-700 block">IP Router Modem (Opsi Tercepat)</label>
                <input
                  type="text"
                  value={ipRouter}
                  onChange={(e) => setIpRouter(e.target.value)}
                  placeholder="Contoh: 10.10.12.45 atau 192.168.1.1"
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 font-mono min-h-[42px]"
                />
                <span className="text-[10px] text-slate-400">Dapat dilihat di stiker bawah modem atau info WiFi HP</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Atau Nama Lengkap Terdaftar</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama sesuai saat pasang baru"
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 min-h-[42px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono min-h-[42px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition min-h-[42px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition min-h-[42px] flex items-center justify-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Sandi</span>}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
