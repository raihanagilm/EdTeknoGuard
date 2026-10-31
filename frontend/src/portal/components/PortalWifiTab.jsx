import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { PortalWifiService } from '../services/portalApi';
import { PortalActiveMascot } from './PortalActiveMascot';
import { PortalHeader } from './PortalHeader';
import { PortalToastNotification } from './PortalToastNotification';
import { Users } from 'lucide-react';
import { ConnectedDevicesModal } from './ConnectedDevicesModal';

export function PortalWifiTab({ customer, dashboardData }) {
  // Current WiFi Info
  const [currentWifi, setCurrentWifi] = useState({
    nama_wifi: customer?.nama_wifi || '',
    password_wifi: customer?.password_wifi || '',
    is_connected_to_home_wifi: false,
    client_ip: '',
    ip_router: ''
  });
  const [fetchingWifi, setFetchingWifi] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [namaWifi, setNamaWifi] = useState('');
  const [passwordWifi, setPasswordWifi] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success', title: '' });

  // State Modal Perangkat Terhubung
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [scanningDevices, setScanningDevices] = useState(false);
  const [lastDeviceUpdate, setLastDeviceUpdate] = useState('');

  const fetchConnectedDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await PortalWifiService.getConnectedDevices();
      if (res.ok && res.data) {
        setDevicesList(res.data.devices || []);
        const now = new Date();
        setLastDeviceUpdate(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleScanDevices = async () => {
    setScanningDevices(true);
    try {
      const res = await PortalWifiService.scanConnectedDevices();
      if (res.ok && res.data) {
        setDevicesList(res.data.devices || []);
        const now = new Date();
        setLastDeviceUpdate(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanningDevices(false);
    }
  };

  const handleDeviceStatusUpdate = (macAddress, isBlocked) => {
    setDevicesList((prev) =>
      prev.map((dev) =>
        dev.mac_address === macAddress
          ? { ...dev, is_blocked: isBlocked, blocked_at: isBlocked ? new Date().toISOString() : null }
          : dev
      )
    );
  };

  const openDevicesModal = () => {
    setShowDevicesModal(true);
    fetchConnectedDevices();
  };

  const fetchWifiDetails = async () => {
    setFetchingWifi(true);
    try {
      const res = await PortalWifiService.getWifi();
      if (res.ok && res.data) {
        setCurrentWifi(res.data);
        setNamaWifi(res.data.nama_wifi || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingWifi(false);
    }
  };

  useEffect(() => {
    fetchWifiDetails();
  }, []);

  const handleCopyPassword = () => {
    if (!currentWifi.password_wifi) return;
    navigator.clipboard.writeText(currentWifi.password_wifi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangeWifi = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!currentWifi.is_connected_to_home_wifi) {
      setToast({
        show: true,
        type: 'error',
        title: 'Belum Tersambung',
        message: 'Perangkat Anda belum tersambung ke WiFi rumah ini. Sambungkan WiFi HP Anda terlebih dahulu!'
      });
      setLoading(false);
      return;
    }

    if (passwordWifi !== konfirmasiPassword) {
      setToast({
        show: true,
        type: 'error',
        title: 'Tidak Cocok',
        message: 'Konfirmasi kata sandi tidak cocok!'
      });
      setLoading(false);
      return;
    }

    try {
      const payload = {
        nama_wifi: namaWifi,
        password_wifi: passwordWifi,
        konfirmasi_password: konfirmasiPassword
      };

      const res = await PortalWifiService.changeWifi(payload);
      if (res.ok && res.data.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'WiFi Diperbarui',
          message: res.data.message || 'Nama & Kata Sandi WiFi berhasil diperbarui!'
        });
        setPasswordWifi('');
        setKonfirmasiPassword('');
        // Refresh data terbaru
        fetchWifiDetails();
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Memperbarui',
          message: res.data?.message || 'Gagal mengubah pengaturan WiFi.'
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
        title="Kelola WiFi Rumah"
        subtitle="Ubah Nama & Kata Sandi SSID Mandiri"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="pb-24 space-y-3">

          {/* ═══ CARD 1: INFORMASI WIFI SAAT INI (KATA SANDI SEKARANG) ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700 shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-gray-900 leading-tight">WiFi Rumah Anda Saat Ini</h2>
                  <p className="text-[11px] text-gray-500 font-medium">Informasi nama & sandi yang aktif</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchWifiDetails}
                aria-label="Muat ulang informasi WiFi"
                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingWifi ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Nama WiFi / SSID */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                <span className="text-gray-600 font-medium">Nama WiFi (SSID)</span>
                <span className="font-bold text-gray-900 font-mono text-[13px]">
                  {currentWifi.nama_wifi || '-'}
                </span>
              </div>

              {/* Kata Sandi WiFi Sekarang */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                <span className="text-gray-600 font-medium">Kata Sandi Sekarang</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900 text-[13px]">
                    {showCurrentPassword ? currentWifi.password_wifi || '-' : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-800 cursor-pointer"
                    aria-label="Lihat kata sandi"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 rounded-md text-blue-600 hover:text-blue-800 cursor-pointer"
                    aria-label="Salin kata sandi"
                    title="Salin Kata Sandi"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Status Lokasi Sambungan (Dalam WiFi Rumah / Luar Jangkauan) */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-500 text-[11px] font-medium">Status Sambungan HP:</span>
                {currentWifi.is_connected_to_home_wifi ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tersambung di WiFi Rumah
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Tidak Tersambung di WiFi Rumah
                  </span>
                )}
              </div>
            </div>

            {/* Tombol Cepat: Cek Siapa Saja Yang Terhubung */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={openDevicesModal}
                className="w-full py-2.5 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/70 text-xs font-bold flex items-center justify-between transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Lihat Siapa Saja Yang Terhubung</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                  Cek Sekarang
                </span>
              </button>
            </div>
          </section>

          {/* ═══ CARD 2: PENGATURAN GANTI NAMA & KATA SANDI (COLLAPSIBLE DROPDOWN) ═══ */}
          <section className="mx-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header Accordion / Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 leading-tight">Ubah Nama & Kata Sandi WiFi</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Pengaturan mandiri SSID dan kata sandi modem</p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                {isFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Konten Formulir & Banner Edukasi Terpadu (Ditampilkan saat isFormOpen true) */}
            {isFormOpen && (
              <div className="border-t border-gray-100">
                {/* ═══ SATU BANNER INFORMASI TERPADU (SEBELUM & SETELAH PENGGANTIAN) ═══ */}
                <div className="m-4 mb-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-blue-900 block">Petunjuk Penggantian WiFi Rumah:</span>
                      <ul className="text-[11px] text-blue-800/90 space-y-1 mt-1 leading-relaxed">
                        <li>
                          • <b>Sebelum Ganti:</b> Pastikan HP Anda terhubung ke sinyal WiFi rumah ini (tidak dapat diubah dari luar jangkauan).
                        </li>
                        <li>
                          • <b>Setelah Ganti:</b> Seluruh HP & laptop di rumah akan terputus sesaat. Cukup sambungkan kembali dengan sandi yang baru.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Form Wrapper dengan Maskot Overlay Jika Belum Tersambung */}
                <div className="relative">
                  <form onSubmit={handleChangeWifi} className="p-4 pt-2 space-y-3.5 text-xs font-semibold">
                    <div className="space-y-1.5">
                      <label className="text-gray-700 block">Nama WiFi (SSID) Baru</label>
                      <div className="relative">
                        <Wifi className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          disabled={!currentWifi.is_connected_to_home_wifi}
                          value={namaWifi}
                          onChange={(e) => setNamaWifi(e.target.value)}
                          placeholder="Contoh: WiFi-Keluarga-Berkah"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-700 block">Kata Sandi WiFi Baru (Minimal 8 Karakter)</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type={showPasswordNew ? 'text' : 'password'}
                          required
                          disabled={!currentWifi.is_connected_to_home_wifi}
                          minLength={8}
                          value={passwordWifi}
                          onChange={(e) => setPasswordWifi(e.target.value)}
                          placeholder="Minimal 8 karakter kombinasi"
                          className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={!currentWifi.is_connected_to_home_wifi}
                          onClick={() => setShowPasswordNew(!showPasswordNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer disabled:pointer-events-none"
                        >
                          {showPasswordNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-700 block">Konfirmasi Kata Sandi Baru</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type={showPasswordConfirm ? 'text' : 'password'}
                          required
                          disabled={!currentWifi.is_connected_to_home_wifi}
                          minLength={8}
                          value={konfirmasiPassword}
                          onChange={(e) => setKonfirmasiPassword(e.target.value)}
                          placeholder="Ketik ulang kata sandi baru"
                          className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={!currentWifi.is_connected_to_home_wifi}
                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer disabled:pointer-events-none"
                        >
                          {showPasswordConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !currentWifi.is_connected_to_home_wifi}
                      className="w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
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

                  {/* ═══ OVERLAY MASKOT: JIKA BELUM TERSAMBUNG KE MODEM WIFI ═══ */}
                  {!currentWifi.is_connected_to_home_wifi && (
                    <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 rounded-b-2xl">
                      <div className="w-28 h-24 mb-1 drop-shadow-md">
                        <PortalActiveMascot
                          mascotKey="security"
                          className="w-full h-full"
                        />
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-black uppercase tracking-wider mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Proteksi Keamanan WiFi</span>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 mb-1.5 leading-snug">
                        Anda Belum Tersambung ke Modem WiFi
                      </h4>
                      <p className="text-xs text-gray-600 max-w-xs leading-relaxed mb-4 font-normal">
                        Untuk keamanan agar tidak diubah dari luar, pastikan HP atau laptop Anda sudah terhubung ke sinyal WiFi rumah ini terlebih dahulu.
                      </p>
                      <button
                        type="button"
                        onClick={fetchWifiDetails}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
                        style={{ background: '#2563eb' }}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${fetchingWifi ? 'animate-spin' : ''}`} />
                        <span>Cek Ulang Sambungan</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* ═══ MODAL POP-UP PERANGKAT TERHUBUNG MODEM ONT ═══ */}
      <ConnectedDevicesModal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        devices={devicesList}
        loading={loadingDevices}
        scanning={scanningDevices}
        onRefresh={handleScanDevices}
        onDeviceUpdate={handleDeviceStatusUpdate}
        lastUpdated={lastDeviceUpdate}
      />

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

export default PortalWifiTab;

