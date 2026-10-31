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
  Pencil,
  Camera,
  Trash2
} from 'lucide-react';
import { PortalProfilService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';
import { PortalToastNotification } from './PortalToastNotification';

export function PortalProfileTab({ customer, dashboardData, onNavigate, onCustomerUpdate, onLogout }) {
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Floating Toast State (Pengganti banner inline)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success', title: '' });
  
  // Profile Data Edit State
  const [nama, setNama] = useState(customer?.nama || '');
  const [noHp, setNoHp] = useState(customer?.no_hp || '');
  const [alamat, setAlamat] = useState(customer?.alamat || '');
  const [currentCustomer, setCurrentCustomer] = useState(customer || {});
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoLoadError, setFotoLoadError] = useState(false);
  const fileInputRef = React.useRef(null);

  // Password State
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showPasswordKonfirm, setShowPasswordKonfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setCurrentCustomer(customer);
      setFotoLoadError(false);
      setNama(customer.nama || '');
      setNoHp(customer.no_hp || '');
      setAlamat(customer.alamat || '');
    }
  }, [customer]);

  /**
   * Mengompresi file gambar dari HP menjadi WebP maksimal 400x400 px, kualitas 80%
   */
  const compressImageToWebp = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // Ukuran avatar optimal
          let width = img.width;
          let height = img.height;

          // Hitung rasio crop persegi di tengah
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');
          
          // Gambar avatar persegi terpusat
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);

          // Ekspor ke WebP kualitas 0.82 (ukuran biasanya cuma 15KB - 30KB)
          const webpDataUrl = canvas.toDataURL('image/webp', 0.82);
          resolve(webpDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input agar bisa pilih file yang sama jika diinginkan
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setToast({
        show: true,
        type: 'error',
        title: 'Bukan Gambar',
        message: 'Mohon pilih berkas foto yang valid (JPG, PNG, atau WEBP).'
      });
      return;
    }

    setUploadingFoto(true);
    try {
      const compressedWebp = await compressImageToWebp(file);
      const res = await PortalProfilService.uploadFoto(compressedWebp);
      if (res.ok && res.data?.ok) {
        const newUrl = res.data.foto_profil;
        setCurrentCustomer((prev) => ({ ...prev, foto_profil: newUrl }));
        if (onCustomerUpdate) {
          onCustomerUpdate({ foto_profil: newUrl });
        }
        setToast({
          show: true,
          type: 'success',
          title: 'Foto Tersimpan',
          message: 'Foto profil Anda berhasil diunggah & diperbarui!'
        });
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Mengunggah',
          message: res.data?.message || 'Gagal menyimpan foto profil.'
        });
      }
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Kesalahan Kompresi',
        message: 'Gagal memproses gambar foto profil.'
      });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleDeleteFoto = async () => {
    if (!currentCustomer?.foto_profil) return;
    setUploadingFoto(true);
    try {
      const res = await PortalProfilService.deleteFoto();
      if (res.ok && res.data?.ok) {
        setCurrentCustomer((prev) => ({ ...prev, foto_profil: null }));
        if (onCustomerUpdate) {
          onCustomerUpdate({ foto_profil: null });
        }
        setToast({
          show: true,
          type: 'info',
          title: 'Foto Dihapus',
          message: 'Foto profil telah dihapus dan kembali ke inisial nama.'
        });
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Menghapus',
          message: res.data?.message || 'Gagal menghapus foto profil.'
        });
      }
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Gagal menghubungi server.'
      });
    } finally {
      setUploadingFoto(false);
    }
  };

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

    try {
      const res = await PortalProfilService.updateProfile({
        nama: nama,
        no_hp: noHp,
        alamat: alamat
      });
      if (res.ok && res.data?.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'Berhasil Disimpan',
          message: res.data.message || 'Data diri (Alamat & No. Kontak) berhasil diperbarui!'
        });
        if (res.data.customer) {
          setCurrentCustomer((prev) => ({ ...prev, ...res.data.customer }));
        }
        if (onCustomerUpdate && res.data.customer) {
          onCustomerUpdate(res.data.customer);
        }
        setIsEditModalOpen(false);
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Menyimpan',
          message: res.data?.message || 'Gagal menyimpan perubahan profil.'
        });
      }
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Gagal menghubungi server.'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (passwordBaru.length < 6) {
      setToast({
        show: true,
        type: 'error',
        title: 'Kata Sandi Lemah',
        message: 'Kata sandi baru minimal 6 karakter!'
      });
      setLoading(false);
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setToast({
        show: true,
        type: 'error',
        title: 'Tidak Cocok',
        message: 'Konfirmasi kata sandi baru tidak cocok!'
      });
      setLoading(false);
      return;
    }

    try {
      const res = await PortalProfilService.changePassword({
        password_baru: passwordBaru,
        konfirmasi_password: konfirmasiPassword
      });
      if (res.ok && res.data?.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'Kata Sandi Diperbarui',
          message: res.data.message || 'Kata sandi akun portal Anda berhasil diubah!'
        });
        setPasswordBaru('');
        setKonfirmasiPassword('');
        setIsPasswordExpanded(false);
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Mengubah Sandi',
          message: res.data?.message || 'Gagal mengubah kata sandi.'
        });
      }
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Gagal menghubungi server.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827] relative">
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

          {/* ═══ CARD PUTIH PROFIL & DATA DIRI (PERSIS SEPERTI GAMBAR USER) ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
            {/* Card Header Identitas Pelanggan */}
            <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar Bulat dengan Badge Tombol Kamera */}
                <div className="relative shrink-0">
                  {currentCustomer?.foto_profil && !fotoLoadError ? (
                    <img
                      src={currentCustomer.foto_profil}
                      alt=""
                      onError={() => setFotoLoadError(true)}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm font-mono shadow-xs border-2 border-white"
                      style={{ background: '#2563eb' }}
                    >
                      {getInitials(currentCustomer?.nama)}
                    </div>
                  )}

                  {/* Tombol Kamera Unggah Foto */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFoto}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    title="Ubah Foto Profil"
                    aria-label="Ubah Foto Profil"
                  >
                    {uploadingFoto ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </button>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-black text-gray-900 leading-tight truncate">
                    {currentCustomer?.nama || 'Profil Pelanggan'}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 font-mono font-medium flex items-center gap-2">
                    <span>{currentCustomer?.id_pelanggan || '-'}</span>
                    {currentCustomer?.foto_profil && (
                      <button
                        type="button"
                        onClick={handleDeleteFoto}
                        disabled={uploadingFoto}
                        className="text-[10px] text-gray-400 hover:text-rose-600 font-sans flex items-center gap-0.5 transition cursor-pointer"
                        title="Hapus Foto Profil"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Hapus</span>
                      </button>
                    )}
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

      {/* ═══ TOAST NOTIFIKASI MELAYANG (DI ATAS BOTTOM NAV) ═══ */}
      <PortalToastNotification
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

