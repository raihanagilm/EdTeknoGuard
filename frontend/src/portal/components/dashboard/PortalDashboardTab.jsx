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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-slate-50 text-slate-900">
      {/* ═══ HEADER BIRU TERPADU DENGAN GREETING & LONCENG NOTIFIKASI KONSISTEN ═══ */}
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        greeting="Selamat Datang,"
        title={customer.nama || '-'}
        avatarInitials={customerInitials}
        dashboardData={data}
        customer={customer}
      />

      {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) PERSIS TAB LAIN ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3.5">

          {/* ═══ KARTU UTAMA: KONDISI PERANGKAT & SPEED TEST JARINGAN ═══ */}
          <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200/90">
            {/* Header: Maskot di KIRI Judul Kondisi Perangkat & Tombol Speed Test di KANAN */}
            <div className="p-3.5 bg-slate-50/80 flex items-center justify-between gap-3 border-b border-slate-100">
              {/* Sisi Kiri: Maskot + Judul */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 pointer-events-none select-none">
                  <PortalActiveMascot data={data} className="w-12 h-10 drop-shadow-xs" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    Kondisi Perangkat
                  </h2>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                    Status fisik &amp; performa modem
                  </p>
                </div>
              </div>

              {/* Sisi Kanan: Tombol Mulai Speed Test */}
              <button
                type="button"
                onClick={handleOpenSpeedTestModal}
                title="Uji kecepatan internet riil (Speed Test)"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.98] transition cursor-pointer shrink-0"
              >
                <Gauge className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                <span className="text-xs font-semibold">Uji Speed</span>
              </button>
            </div>

            {/* 3 Metrik Baris Data Sejajar (Daya Terima | Suhu | Hasil Speed Test) */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 py-3 px-1 bg-white">
              {/* 1. Daya Terima (dBm) */}
              <div className="px-2 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 uppercase tracking-tight mb-1">
                  <Signal className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daya Terima</span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 leading-none">
                  {rxPowerValue}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1">dBm</span>
              </div>

              {/* 2. Suhu ONT (°C) */}
              <div className="px-2 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 uppercase tracking-tight mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  <span>Suhu ONT</span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 leading-none">
                  {suhuOntValue}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1">°C</span>
              </div>

              {/* 3. Hasil Speed Test Terakhir */}
              <div className="px-2 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 uppercase tracking-tight mb-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  <span>Speed Test</span>
                </div>
                {lastSpeedTestData && lastSpeedTestData.download !== null ? (
                  <>
                    <div className="text-sm font-bold font-mono text-slate-900 leading-none">
                      ↓{Number(lastSpeedTestData.download).toFixed(1)} <span className="text-[11px] font-bold text-blue-600">↑{Number(lastSpeedTestData.upload).toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      {lastSpeedTestData.ping ? `${lastSpeedTestData.ping}ms` : 'Mbps'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold font-mono text-slate-900 leading-none">
                      -
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      Mbps
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ═══ MENU LAYANAN (GRID 3x2 SEIMBANG & BERSIH) ═══ */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-3.5">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="text-sm font-bold text-slate-900">Menu Layanan</h2>
              <span className="text-xs text-slate-500 font-medium">Akses Mandiri</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 1. Perangkat Terhubung */}
              <button
                type="button"
                onClick={openDevicesModal}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Perangkat
                </span>
              </button>

              {/* 2. Kelola WiFi */}
              <button
                type="button"
                onClick={() => onNavigate('wifi')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <Wifi className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Kelola WiFi
                </span>
              </button>

              {/* 3. Lapor Kendala */}
              <button
                type="button"
                onClick={() => onNavigate('kendala')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Kendala
                </span>
              </button>

              {/* 4. Pemakaian Kuota */}
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <PieChart className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Kuota FUP
                </span>
              </button>

              {/* 5. Bayar Tagihan */}
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Bayar
                </span>
              </button>

              {/* 6. Profil Akun */}
              <button
                type="button"
                onClick={() => onNavigate('profil')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition active:scale-95 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                  Profil
                </span>
              </button>
            </div>
          </section>

          {/* ═══ SECTION: RINGKASAN KUOTA ═══ */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-sm font-bold text-slate-900">Ringkasan Kuota</h2>
              <button
                type="button"
                onClick={() => onNavigate('kuota')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Detail</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 leading-none mb-2.5">
              {kuotaTerpakai} <span className="text-sm font-sans font-medium text-slate-500">GB Terpakai</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden w-full mb-2.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${kuotaBarPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Pemakaian Bulan Ini</span>
              <span className="font-semibold text-slate-800">{cleanPaketLabel(customer.paket)}</span>
            </div>
          </section>

          {/* ═══ SECTION: TAGIHAN BULAN INI ═══ */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Tagihan Bulan Ini</h2>
              </div>
              {customer.status_pembayaran === 'BELUM_BAYAR' || customer.status_tagihan === 'MENUNGGAK' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Belum Dibayar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Lunas
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  Periode: {customer.periode_tagihan || kuotaData.periode_label || 'Bulan Ini'}
                </div>
                {customer.harga_paket ? (
                  <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    Rp {Number(customer.harga_paket).toLocaleString('id-ID')}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Jatuh tempo tgl 20 setiap bulan</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pembayaran')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95 transition cursor-pointer"
              >
                Detail Tagihan
              </button>
            </div>
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
