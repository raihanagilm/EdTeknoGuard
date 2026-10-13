import React, { useState } from 'react';
import {
  Wifi,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Bell,
  Smartphone
} from 'lucide-react';
import { PortalWifiService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';

export function TabWifiPelanggan({ customer, dashboardData }) {
  const [namaWifi, setNamaWifi] = useState(customer?.nama_wifi || 'AISYAH');
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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU TERPADU DENGAN JUDUL HALAMAN AKTIF ═══ */}
      <PortalHeader
        title="Kelola WiFi Rumah"
        subtitle="Ubah Nama & Kata Sandi SSID Mandiri"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-24 space-y-3">

          {/* Feedback Notifikasi Alert */}
          {message.text && (
            <div className="px-3">
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
            </div>
          )}

          {/* ═══ CARD PUTIH (naik menimpa header) ═══ */}
          <div className="relative mx-3">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">

              <div className="p-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-black text-gray-900 leading-tight">Kelola WiFi Rumah</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight font-medium">
                      Ubah nama WiFi (SSID) dan kata sandi tanpa perlu memanggil teknisi
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangeWifi} className="p-4 space-y-3.5 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-slate-700 block">Nama WiFi (SSID) Baru</label>
                  <div className="relative">
                    <Wifi className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={namaWifi}
                      onChange={(e) => setNamaWifi(e.target.value)}
                      placeholder="Contoh: WiFi-Keluarga-Berkah"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 block">Kata Sandi WiFi Baru (Minimal 8 Karakter)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordWifi}
                      onChange={(e) => setPasswordWifi(e.target.value)}
                      placeholder="Minimal 8 karakter kombinasi"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 block">Konfirmasi Kata Sandi Baru</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={konfirmasiPassword}
                      onChange={(e) => setKonfirmasiPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  style={{ background: '#2563eb' }}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan WiFi</span>
                    </>
                  )}
                </button>
              </form>

              <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2.5" style={{ background: '#eff6ff' }}>
                <Smartphone className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-gray-900 mb-1">Pemberitahuan Setelah Ganti Sandi:</div>
                  <p className="text-[10.5px] text-gray-600 leading-relaxed">
                    Setelah menyimpan nama/kata sandi baru, seluruh HP dan laptop di rumah Anda akan terputus sesaat. Silakan sambungkan ulang HP Anda menggunakan kata sandi yang baru.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default TabWifiPelanggan;
