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
  ChevronRight,
  ChevronDown,
  MapPin,
  Phone,
  Router,
  Bell,
  X,
  Wifi,
  Pencil
} from 'lucide-react';
import { PortalProfilService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';

export function TabProfilPelanggan({ customer, dashboardData, onNavigate, onLogout }) {
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Profile Data Edit State
  const [nama, setNama] = useState(customer?.nama || '');
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
      setNama(customer.nama || '');
      setNoHp(customer.no_hp || '');
      setAlamat(customer.alamat || '');
    }
  }, [customer]);

  // Inisial avatar (2 huruf)
  const getInitials = (namaStr) => {
    if (!namaStr || namaStr === '-') return 'US';
    const parts = namaStr.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const res = await PortalProfilService.updateProfile({
        nama: nama,
        no_hp: noHp,
        alamat: alamat
      });
      if (res.ok && res.data?.ok) {
        setProfileMessage({ type: 'success', text: res.data.message || 'Data diri berhasil disimpan!' });
        if (res.data.customer) {
          setCurrentCustomer((prev) => ({ ...prev, ...res.data.customer }));
        }
        setIsEditModalOpen(false);
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
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
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

          {/* ═══ CARD PUTIH PROFIL & DATA DIRI (PERSIS SEPERTI GAMBAR USER) ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
            {/* Card Header Identitas Pelanggan */}
            <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-black text-sm font-mono shadow-xs"
                  style={{ background: '#2563eb' }}
                >
                  {getInitials(currentCustomer?.nama)}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-black text-gray-900 leading-tight truncate">
                    {currentCustomer?.nama || 'Profil Pelanggan'}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 font-mono font-medium">
                    {currentCustomer?.id_pelanggan || '-'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Data</span>
              </button>
            </div>

            {/* Card Body: Rincian Data Diri */}
            <div className="p-4 pt-3">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">Kantor Layanan</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    Kantor {currentCustomer?.kantor || 'Cabang'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">No. WhatsApp / Telp</span>
                  <span className="font-mono font-bold text-gray-900">{currentCustomer?.no_hp || '-'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-50">
                  <span className="text-gray-600 shrink-0">Alamat Lengkap</span>
                  <span className="font-semibold text-gray-900 text-right">{currentCustomer?.alamat || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">Paket Internet</span>
                  <span className="font-bold text-gray-900">{currentCustomer?.paket || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600">IP Modem Router</span>
                  <span className="font-mono font-bold text-gray-900">{currentCustomer?.ip_router || currentCustomer?.ip_ont || '-'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ MENU PENGATURAN & LAYANAN (GAYA GOJEK LIST ROW) ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {/* 1. Pengaturan WiFi Rumah */}
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('wifi')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Pengaturan WiFi Rumah</div>
                  <div className="text-[11px] text-gray-500 font-medium">Ubah Nama SSID & Kata Sandi WiFi</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {/* 2. Ganti Kata Sandi Akun */}
            <div>
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
                    <div className="text-[11px] text-gray-500 font-medium">Amankan akses masuk portal mandiri</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isPasswordExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isPasswordExpanded && (
                <div className="p-4 pt-1 space-y-4 border-t border-gray-100 bg-gray-50/50">
                  {passwordMessage.text && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
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

                  <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-semibold">
                    <div className="space-y-1.5">
                      <label className="text-gray-700 block">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showPasswordBaru ? 'text' : 'password'}
                          required
                          value={passwordBaru}
                          onChange={(e) => setPasswordBaru(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 min-h-[42px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 cursor-pointer"
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
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 min-h-[42px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordKonfirm(!showPasswordKonfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 cursor-pointer"
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
          </section>

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

      {/* ═══ MODAL POPUP EDIT DATA DIRI (NAMA, NO WA, ALAMAT) ═══ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleUp">
            <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-gray-900">Ubah Data Diri</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4 space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nama Lengkap Pelanggan</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama Lengkap..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-blue-600 min-h-[42px]"
                />
              </div>

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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Data</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

