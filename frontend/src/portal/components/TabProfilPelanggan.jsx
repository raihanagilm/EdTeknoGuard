import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  MapPin,
  Phone,
  Router
} from 'lucide-react';
import { PortalProfilService } from '../services/portalApi';

export function TabProfilPelanggan({ customer, onLogout }) {
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [isEditProfile, setIsEditProfile] = useState(false);
  
  // Profile Data Edit State
  const [noHp, setNoHp] = useState(customer?.no_hp || '');
  const [alamat, setAlamat] = useState(customer?.alamat || '');
  const [currentCustomer, setCurrentCustomer] = useState(customer || {});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Password State
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showPasswordKonfirm, setShowPasswordKonfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (customer) {
      setCurrentCustomer(customer);
      setNoHp(customer.no_hp || '');
      setAlamat(customer.alamat || '');
    }
  }, [customer]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const res = await PortalProfilService.updateProfile({
        no_hp: noHp,
        alamat: alamat
      });
      if (res.ok && res.data?.ok) {
        setProfileMessage({ type: 'success', text: res.data.message || 'Data diri berhasil disimpan!' });
        if (res.data.customer) {
          setCurrentCustomer((prev) => ({ ...prev, ...res.data.customer }));
        }
        setIsEditProfile(false);
      } else {
        setProfileMessage({ type: 'error', text: res.data?.message || 'Gagal menyimpan perubahan profil.' });
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordMessage({ type: '', text: '' });

    if (passwordBaru.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Kata sandi baru minimal 6 karakter!' });
      setLoading(false);
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok!' });
      setLoading(false);
      return;
    }

    try {
      const res = await PortalProfilService.changePassword({
        password_baru: passwordBaru,
        konfirmasi_password: konfirmasiPassword
      });
      if (res.ok && res.data?.ok) {
        setPasswordMessage({ type: 'success', text: res.data.message || 'Kata sandi akun portal Anda berhasil diubah!' });
        setPasswordBaru('');
        setKonfirmasiPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: res.data?.message || 'Gagal mengubah kata sandi.' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {profileMessage.text && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            profileMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {profileMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{profileMessage.text}</span>
        </div>
      )}

      {/* Info Identitas Card */}
      <div className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {currentCustomer?.nama ? currentCustomer.nama.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">{currentCustomer?.nama || 'Pelanggan'}</div>
              <div className="text-xs text-emerald-600 font-semibold">
                Akun Terverifikasi
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditProfile(!isEditProfile)}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>{isEditProfile ? 'Batal' : 'Edit Data'}</span>
          </button>
        </div>

        {isEditProfile ? (
          /* Form Edit Data Diri */
          <form onSubmit={handleSaveProfile} className="pt-3 border-t border-slate-100 space-y-3 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-slate-700">Nomor WhatsApp / Telp</label>
              <input
                type="text"
                required
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700">Alamat Lengkap Domisili</label>
              <textarea
                rows={2}
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat rumah tempat terpasang modem..."
                className="w-full px-3.5 py-2 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
              ></textarea>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditProfile(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Data Diri</span>}
              </button>
            </div>
          </form>
        ) : (
          /* View List Data Diri (Setiap field hanya muncul tepat 1x) */
          <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ID Pelanggan</span>
              <span className="font-mono font-bold text-slate-900">{currentCustomer?.id_pelanggan || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Kantor Layanan</span>
              <span className="font-bold text-cyan-800 uppercase text-[11px] bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                Kantor {currentCustomer?.kantor || 'Cabang'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">No. WhatsApp / Telp</span>
              <span className="font-mono font-bold text-slate-900">{currentCustomer?.no_hp || '-'}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">Alamat Lengkap</span>
              <span className="font-semibold text-slate-900 text-right">{currentCustomer?.alamat || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Paket Internet</span>
              <span className="font-bold text-slate-900">{currentCustomer?.paket || '20 Mbps Unlimited'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">IP Modem Router</span>
              <span className="font-mono font-bold text-slate-900">{currentCustomer?.ip_router || '10.10.12.45'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Form Ganti Password Card */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-xs overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Ganti Kata Sandi Akun</div>
              <div className="text-[10px] text-slate-400">Klik untuk membuka / menutup form</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 font-semibold">
            <span>{isPasswordExpanded ? 'Tutup' : 'Ubah Sandi'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPasswordExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isPasswordExpanded && (
          <div className="p-5 pt-0 space-y-4 border-t border-slate-100 animate-fadeIn">
            {passwordMessage.text && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 mt-4 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-semibold mt-4">
              <div className="space-y-1.5">
                <label className="text-slate-700 block">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPasswordBaru ? 'text' : 'password'}
                    required
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    aria-label="Lihat kata sandi baru"
                  >
                    {showPasswordBaru ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPasswordKonfirm ? 'text' : 'password'}
                    required
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordKonfirm(!showPasswordKonfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    aria-label="Lihat konfirmasi kata sandi"
                  >
                    {showPasswordKonfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Kata Sandi Baru</span>}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px]"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun Portal</span>
      </button>
    </div>
  );
}
