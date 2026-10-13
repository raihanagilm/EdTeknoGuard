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
  Router,
  Bell,
  X
} from 'lucide-react';
import { PortalProfilService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';

export function TabProfilPelanggan({ customer, dashboardData, onLogout }) {
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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ HEADER BIRU TERPADU DENGAN JUDUL HALAMAN AKTIF ═══ */}
      <PortalHeader
        title="Profil & Akun Pelanggan"
        subtitle="Informasi Layanan & Keamanan Kata Sandi"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-24 space-y-3">
          {/* Feedback Notifikasi Profil */}
          {profileMessage.text && (
            <div className="px-3">
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
                <button onClick={() => setProfileMessage({ type: '', text: '' })} className="p-1 hover:opacity-75 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ CARD PUTIH PROFIL & IDENTITAS (naik menimpa header) ═══ */}
          <div className="relative mx-3">
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
              {/* Card Header Identitas Pelanggan */}
              <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-black text-gray-900 leading-tight truncate">
                      {currentCustomer?.nama || 'Profil Pelanggan'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[10px] text-emerald-700 font-bold">Akun Terverifikasi</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfile(!isEditProfile)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>{isEditProfile ? 'Batal' : 'Edit Data'}</span>
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 pt-3">
                {isEditProfile ? (
                  /* Form Edit Data Diri */
                  <form onSubmit={handleSaveProfile} className="space-y-3 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-gray-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Nomor WhatsApp / Telp</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={noHp}
                        onChange={(e) => setNoHp(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 min-h-[42px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Alamat Lengkap Domisili</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        placeholder="Alamat rumah tempat terpasang modem..."
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                      ></textarea>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditProfile(false)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                        style={{ background: '#2563eb' }}
                      >
                        {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Data Diri</span>}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* View List Data Diri */
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">ID Pelanggan</span>
                      <span className="font-mono font-bold text-gray-900">{currentCustomer?.id_pelanggan || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">Kantor Layanan</span>
                      <span className="font-bold text-blue-700 uppercase text-[11px] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        Kantor {currentCustomer?.kantor || 'Cabang'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">No. WhatsApp / Telp</span>
                      <span className="font-mono font-bold text-gray-900">{currentCustomer?.no_hp || '-'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-50">
                      <span className="text-gray-500 shrink-0">Alamat Lengkap</span>
                      <span className="font-semibold text-gray-900 text-right">{currentCustomer?.alamat || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">Paket Internet</span>
                      <span className="font-bold text-gray-900">{currentCustomer?.paket || '20 Mbps Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-500">IP Modem Router</span>
                      <span className="font-mono font-bold text-gray-900">{currentCustomer?.ip_router || '10.10.12.45'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ CARD FORM GANTI PASSWORD EXPANDABLE ═══ */}
          <div className="mx-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Ganti Kata Sandi Akun</div>
                    <div className="text-[10px] text-gray-400">Klik untuk membuka / menutup form</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold">
                  <span>{isPasswordExpanded ? 'Tutup' : 'Ubah Sandi'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPasswordExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isPasswordExpanded && (
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100 animate-fadeIn">
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
                      <label className="text-gray-700 block">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showPasswordBaru ? 'text' : 'password'}
                          required
                          value={passwordBaru}
                          onChange={(e) => setPasswordBaru(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 min-h-[42px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                          aria-label="Lihat kata sandi baru"
                        >
                          {showPasswordBaru ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-700 block">Konfirmasi Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showPasswordKonfirm ? 'text' : 'password'}
                          required
                          value={konfirmasiPassword}
                          onChange={(e) => setKonfirmasiPassword(e.target.value)}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 min-h-[42px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordKonfirm(!showPasswordKonfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                          aria-label="Lihat konfirmasi kata sandi"
                        >
                          {showPasswordKonfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50"
                      style={{ background: '#2563eb' }}
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Kata Sandi Baru</span>}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ═══ TOMBOL LOGOUT DARI AKUN PORTAL ═══ */}
          <div className="mx-3">
            <button
              onClick={onLogout}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun Portal</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
