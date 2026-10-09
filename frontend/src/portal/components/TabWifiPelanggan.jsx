import React, { useState } from 'react';
import {
  Wifi,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { PortalWifiService } from '../services/portalApi';

export function TabWifiPelanggan({ customer }) {
  const [namaWifi, setNamaWifi] = useState(customer?.nama_wifi || 'WiFi-Rumah');
  const [passwordWifi, setPasswordWifi] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChangeWifi = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordWifi !== konfirmasiPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok!' });
      setLoading(false);
      return;
    }

    try {
      const res = await PortalWifiService.changeWifi({
        nama_wifi: namaWifi,
        password_wifi: passwordWifi,
        konfirmasi_password: konfirmasiPassword
      });
      if (res.ok && res.data.ok) {
        setMessage({ type: 'success', text: res.data.message || 'Nama & Kata Sandi WiFi berhasil diperbarui!' });
        setPasswordWifi('');
        setKonfirmasiPassword('');
      } else {
        setMessage({ type: 'error', text: res.data?.message || 'Gagal mengubah pengaturan WiFi.' });
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
        <h2 className="text-base font-black text-slate-900">Kelola WiFi Rumah</h2>
        <p className="text-[11px] text-slate-500">Ubah nama WiFi (SSID) dan kata sandi tanpa perlu memanggil teknisi</p>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
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

      {/* Form Ganti WiFi */}
      <div className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs space-y-4">
        <form onSubmit={handleChangeWifi} className="space-y-3.5 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-slate-700">Nama WiFi (SSID) Baru</label>
            <div className="relative">
              <Wifi className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
              <input
                type="text"
                required
                value={namaWifi}
                onChange={(e) => setNamaWifi(e.target.value)}
                placeholder="Contoh: WiFi-Keluarga-Berkah"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-700">Kata Sandi WiFi Baru (Minimal 8 Karakter)</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordWifi}
                onChange={(e) => setPasswordWifi(e.target.value)}
                placeholder="Minimal 8 karakter kombinasi"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600"
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

          <div className="space-y-1">
            <label className="text-slate-700">Konfirmasi Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Perubahan WiFi</span>}
          </button>
        </form>
      </div>

      {/* Edukasi Warga */}
      <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 text-[11px] text-slate-600 space-y-1.5">
        <div className="font-bold text-cyan-900 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-cyan-600" />
          <span>Pemberitahuan Setelah Ganti Sandi:</span>
        </div>
        <p className="leading-relaxed">
          Setelah menyimpan nama/kata sandi baru, seluruh HP dan laptop di rumah Anda akan terputus sesaat. Silakan sambungkan ulang HP Anda menggunakan kata sandi yang baru.
        </p>
      </div>
    </div>
  );
}
