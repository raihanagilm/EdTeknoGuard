import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  MapPin,
  Phone,
  Router
} from 'lucide-react';
import { PortalProfilService } from '../services/portalApi';

export function TabProfilPelanggan({ customer, onLogout }) {
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordBaru !== konfirmasiPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok!' });
      setLoading(false);
      return;
    }

    try {
      const res = await PortalProfilService.changePassword({
        password_lama: passwordLama,
        password_baru: passwordBaru,
        konfirmasi_password: konfirmasiPassword
      });
      if (res.ok && res.data.ok) {
        setMessage({ type: 'success', text: res.data.message || 'Kata sandi akun portal Anda berhasil diubah!' });
        setPasswordLama('');
        setPasswordBaru('');
        setKonfirmasiPassword('');
      } else {
        setMessage({ type: 'error', text: res.data?.message || 'Gagal mengubah kata sandi.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-slate-900">Profil Pelanggan</h2>
        <p className="text-[11px] text-slate-500">Informasi identitas langganan &amp; keamanan akun mandiri</p>
      </div>

      {/* Info Identitas Card */}
      <div className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-600 text-white flex items-center justify-center font-bold text-lg">
            {customer?.nama ? customer.nama.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">{customer?.nama || 'Pelanggan'}</div>
            <div className="text-xs text-slate-500 font-mono">{customer?.id_pelanggan}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Paket Internet</span>
            <span className="font-bold text-slate-900">{customer?.paket || '20 Mbps Unlimited'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">IP Modem Router</span>
            <span className="font-mono font-bold text-slate-900">{customer?.ip_router || '10.10.12.45'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status Akun</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
              TERVERIFIKASI
            </span>
          </div>
        </div>
      </div>

      {/* Form Ganti Password */}
      <div className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs space-y-4">
        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-600" />
          <span>Ganti Kata Sandi Akun Portal</span>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-slate-700">Kata Sandi Lama</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-700">Kata Sandi Baru (Minimal 6 Karakter)</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-700">Konfirmasi Kata Sandi Baru</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={konfirmasiPassword}
              onChange={(e) => setKonfirmasiPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Ubah Kata Sandi</span>}
          </button>
        </form>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun Portal</span>
      </button>
    </div>
  );
}
