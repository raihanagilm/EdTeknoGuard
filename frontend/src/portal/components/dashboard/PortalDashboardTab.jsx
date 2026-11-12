import React, { useState, useEffect } from 'react';
import {
  Activity,
  Signal,
  Thermometer,
  Timer,
  Wifi,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  Info,
  Bell,
  CreditCard,
  ChevronRight,
  Receipt,
  CheckCircle2,
  Clock,
  User
} from 'lucide-react';
import { PortalActiveMascot } from '../common/PortalActiveMascot';
import { PortalHeader } from '../layout/PortalHeader';
import { Smartphone, Laptop, SmartphoneNfc } from 'lucide-react';
import { ConnectedDevicesModal } from '../modals/ConnectedDevicesModal';
import { SpeedTestModal } from '../modals/SpeedTestModal';
import { Gauge, Play } from 'lucide-react';
import { PortalDashboardService, PortalWifiService } from '../../services/portalApi';

export function PortalDashboardTab({ data, onNavigate, onOpenNotifications , hasUnreadNotifications}) {
  const signal = data?.signal || {
    rx_power: null,
    status_koneksi: 'NORMAL',
    latency_ms: null,
    suhu_ont: null
  };
  const customer = data?.customer || {
    nama: '-',
    paket: '-',
    ip_router: '-',
    status_pembayaran: 'LUNAS'
  };

  const kuotaData = data?.kuota || {
    kuota_terpakai_gb: 0,
    periode_bulan: '-'
  };

  const kuotaTerpakai = kuotaData.kuota_terpakai_gb !== undefined && kuotaData.kuota_terpakai_gb !== null
    ? Number(kuotaData.kuota_terpakai_gb).toFixed(1)
    : '0.0';

  // Nilai pembacaan metrik real-time
  const rxPowerValue = signal.rx_power !== undefined && signal.rx_power !== null
    ? Number(signal.rx_power).toFixed(2)
    : '-';
  const suhuOntValue = signal.suhu_ont !== undefined && signal.suhu_ont !== null
    ? Math.round(signal.suhu_ont)
    : '-';
  const latencyValue = signal.latency_ms !== undefined && signal.latency_ms !== null
    ? Math.round(signal.latency_ms)
    : '-';

  // Format Nama Paket agar tidak terjadi duplikasi "Paket Paket 10 Mbps"
  const cleanPaketLabel = (rawPaket) => {
    if (!rawPaket || rawPaket === '-') return '-';
    const trimmed = String(rawPaket).trim();
    if (/^paket\s+/i.test(trimmed)) {
      return trimmed;
    }
    return `Paket ${trimmed}`;
  };



  // Kuota bar: representasi pemakaian wajar bulan berjalan (misal skala proporsional dinamis hingga 100GB+)
  const kuotaNum = parseFloat(kuotaTerpakai) || 0;
  const kuotaBarPercent = Math.min(100, Math.max(5, Math.round((kuotaNum / Math.max(50, Math.ceil(kuotaNum / 50) * 50)) * 100)));

  // Inisial Nama Pelanggan
  const getInitials = (namaStr) => {
    if (!namaStr || namaStr === '-') return 'US';
    const parts = namaStr.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const customerInitials = getInitials(customer.nama);

  // State Modal Perangkat Terhubung (Menu Cepat)
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [scanningDevices, setScanningDevices] = useState(false);
  const [lastDeviceUpdate, setLastDeviceUpdate] = useState('');
  const [showSpeedTestModal, setShowSpeedTestModal] = useState(false);
  const [liveSignal, setLiveSignal] = useState(null);
  const [lastSpeedTestData, setLastSpeedTestData] = useState(customer?.last_speed_test || null);

  useEffect(() => {
    if (customer?.last_speed_test) {
      setLastSpeedTestData(customer.last_speed_test);
    }
  }, [customer?.last_speed_test]);

  const targetSpeedMbps = (() => {
    const raw = String(customer.paket || '');
    const m = raw.match(/(\d+)\s*(?:mbps|m)/i);
    return m ? parseInt(m[1], 10) : 10;
  })();

  const handleOpenSpeedTestModal = () => {
    setShowSpeedTestModal(true);
  };

  const handleProbeSignalLive = () => {
    PortalDashboardService.liveProbeSignal().then((res) => {
      if (res && res.ok && res.data?.signal) {
        setLiveSignal(res.data.signal);
      }
    }).catch(() => {});
  };

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

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#EEF2F6] text-slate-900">
      {/* ═══ HEADER BIRU TERPADU DENGAN MASKOT & KONDISI PERANGKAT DI AREA BIRU ═══ */}
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        greeting="Selamat Datang,"
        title={customer.nama || '-'}
        avatarInitials={customerInitials}
        dashboardData={data}
        customer={customer}
      >
        {/* Konten Hero Kondisi Perangkat di Area Biru (Persis Sesuai Gambar Acuan) */}
        <div className="flex items-center gap-4 pt-1">
          {/* Maskot Kiri Besar & Gagah */}
          <div className="shrink-0 relative w-28 h-24 sm:w-32 sm:h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
            <div className="relative z-10 pointer-events-none select-none transition-transform hover:scale-105">
              <PortalActiveMascot data={data} className="w-28 h-22 sm:w-32 sm:h-26 drop-shadow-lg" />
            </div>
          </div>

          {/* Judul + Subjudul + Tombol Uji Speed di Kanan */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-white leading-tight tracking-tight">
              Kondisi Perangkat
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5 leading-snug">
              Status fisik &amp; performa modem
            </p>

            {/* Baris Display Hasil Speed Test + Tombol Uji Speed Bersanding */}
            <div className="mt-2.5 flex items-center gap-3">
              {/* Display Hasil Speed Test */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-200 uppercase tracking-tight">
                  <Gauge className="w-3 h-3 text-cyan-300 shrink-0" />
                  <span>Speed Test</span>
                </div>
                {lastSpeedTestData && lastSpeedTestData.download !== null ? (
                  <div className="text-xs font-bold font-mono text-white leading-none mt-0.5">
                    ↓{Number(lastSpeedTestData.download).toFixed(1)}{' '}
                    <span className="text-[10px] text-cyan-200">
                      ↑{Number(lastSpeedTestData.upload).toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs font-bold font-mono text-white leading-none mt-0.5">
                    - <span className="text-[10px] text-blue-200 font-normal">Mbps</span>
                  </div>
                )}
              </div>

              {/* Tombol Uji Speed Pill Sesuai Gambar */}
              <button
                type="button"
                onClick={handleOpenSpeedTestModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:scale-98 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Gauge className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Uji Speed</span>
              </button>
            </div>
          </div>
        </div>
      </PortalHeader>

      {/* ═══ KONTEN DENGAN NEGATIVE MARGIN RINGAN DI ATAS KANVAS SEJUK ═══ */}
      <main className="scroll-area -mt-4 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3.5">

          {/* ═══ STATISTIK 2 KARTU SEJAJAR PUTIH ELEGAN (SUHU & REDAMAN) ═══ */}
          <section className="grid grid-cols-2 gap-2.5">
            {/* Kartu 1: Suhu ONT */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/70 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Suhu ONT</p>
              </div>
              <p className="font-mono text-xl font-bold text-slate-900 leading-none">
                {suhuOntValue}<span className="text-xs text-slate-400 font-sans ml-0.5">°C</span>
              </p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2.5">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{
                    width: typeof signal.suhu_ont === 'number'
                      ? `${Math.min(100, Math.max(10, (signal.suhu_ont / 70) * 100))}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Kartu 2: Daya Terima */}
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/70 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Signal className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Daya Terima</p>
              </div>
              <p className="font-mono text-xl font-bold text-slate-900 leading-none">
                {rxPowerValue}<span className="text-xs text-slate-400 font-sans ml-0.5">dBm</span>
              </p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2.5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: typeof signal.rx_power === 'number'
                      ? `${Math.min(100, Math.max(15, (Math.abs(signal.rx_power) / 35) * 100))}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </section>

          {/* ═══ MENU LAYANAN (SQUIRCLE BIRU SOLID SESUAI DESAIN ACUAN) ═══ */}
          <section className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] border border-slate-200/70 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-3.5 px-0.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Menu Layanan
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Akses Cepat
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {/* 1. Perangkat */}
              <button
                type="button"
                onClick={openDevicesModal}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <Smartphone className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  Perangkat
                </span>
              </button>

              {/* 2. WiFi */}
              <button
                type="button"
                onClick={() => onNavigate('wifi')}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <Wifi className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  WiFi
                </span>
              </button>

              {/* 3. Kendala */}
              <button
                type="button"
                onClick={() => onNavigate('kendala')}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <AlertTriangle className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  Kendala
                </span>
              </button>

              {/* 4. Kuota */}
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <PieChart className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  Kuota
                </span>
              </button>

              {/* 5. Bayar */}
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <CreditCard className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  Bayar
                </span>
              </button>

              {/* 6. Profil */}
              <button
                type="button"
                onClick={() => onNavigate('profil')}
                className="flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-all cursor-pointer group mt-2"
              >
                <div className="w-12 h-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight text-center leading-tight">
                  Profil
                </span>
              </button>
            </div>
          </section>

          {/* ═══ SECTION: BENTO GRID 2-KOLOM ASIMETRIS (KUOTA 5-KOLOM & TAGIHAN 7-KOLOM) ═══ */}
          <div className="grid grid-cols-12 gap-3 w-full">
            {/* KARTU KIRI: Pemakaian Kuota (Lebar 5 Kolom / ~42%) */}
            <div className="col-span-5 bg-white rounded-2xl p-3.5 border border-slate-200/70 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Pemakaian Kuota
              </h3>

              {/* Indikator Lingkaran Progress & Angka Kuota */}
              <div className="flex items-center gap-2.5 my-2.5">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    {/* Lingkaran Track */}
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#EFF6FF"
                      strokeWidth="5"
                    />
                    {/* Lingkaran Progress Biru Dinamis */}
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="5"
                      strokeDasharray="138"
                      strokeDashoffset={Math.max(10, 138 - (138 * (kuotaBarPercent || 0)) / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Ikon Gelombang di Tengah */}
                  <svg
                    className="absolute w-5 h-5 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M3 12C5.5 9 8 15 10.5 12C13 9 15.5 15 18 12C19.5 10.5 20.5 11.5 21 12"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <div className="font-mono text-xl font-bold text-slate-900 leading-none">
                    {kuotaTerpakai}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                    GB Terpakai
                  </div>
                </div>
              </div>

              {/* Tombol Akses Cepat ke Menu Kuota */}
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="w-full inline-flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 active:scale-98 transition pt-2 border-t border-slate-100 cursor-pointer text-left"
              >
                <span>Cek Detail Kuota</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              </button>
            </div>

            {/* KARTU KANAN: Tagihan Iuran Tema Biru dengan Lipatan Kertas (Lebar 7 Kolom / ~58%) */}
            <div
              className="col-span-7 relative bg-blue-600 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden shadow-xs text-white"
              style={{
                clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)",
              }}
            >
              {/* Elemen Lipatan Kertas (Folded Flap) di Pojok Kanan Atas */}
              <div
                className="absolute top-0 right-0 w-[24px] h-[24px] bg-blue-800 rounded-bl-lg pointer-events-none"
                style={{
                  clipPath: "polygon(0 0, 0 100%, 100% 100%)",
                }}
              />

              {/* Info Tagihan */}
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Tagihan Iuran
                </h3>
                <p className="text-xs font-medium text-blue-100 mt-0.5">
                  {customer.status_pembayaran === 'BELUM_BAYAR' || customer.status_tagihan === 'MENUNGGAK'
                    ? 'Belum Dibayar'
                    : 'Sudah Lunas'}
                </p>

                <div className="font-mono text-xl font-bold text-white tracking-tight mt-2 mb-2">
                  Rp {Number(customer.harga_paket || 150000).toLocaleString('id-ID')}
                </div>
              </div>

              {/* Tombol Aksi: Detail Tagihan */}
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="w-full bg-white hover:bg-blue-50 active:scale-[0.99] transition-all text-blue-900 font-bold text-xs py-2 px-3 rounded-xl cursor-pointer text-center shadow-xs"
              >
                Detail Tagihan
              </button>
            </div>
          </div>



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

      {/* ═══ MODAL / POP-UP HALAMAN SPEED TEST OOKLA STYLE ═══ */}
      <SpeedTestModal
        isOpen={showSpeedTestModal}
        onClose={() => setShowSpeedTestModal(false)}
        targetSpeed={targetSpeedMbps}
        latencyValue={latencyValue !== '-' ? latencyValue : null}
        customer={customer}
        onProbeSignal={handleProbeSignalLive}
        onTestComplete={(result) => {
          if (result) {
            setLastSpeedTestData(result);
          }
        }}
      />
    </div>
  );
}
