import React, { useState } from 'react';
import {
  Users,
  Smartphone,
  Laptop,
  Wifi,
  Network,
  RefreshCw,
  X,
  ShieldCheck,
  CheckCircle2,
  Signal,
  Clock,
  HelpCircle,
  Ban,
  Unlock,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { PortalWifiService } from '../services/portalApi';

export function ModalPerangkatTerhubung({
  isOpen,
  onClose,
  devices,
  loading,
  scanning,
  onRefresh,
  onDeviceUpdate,
  lastUpdated
}) {
  const [blockingMac, setBlockingMac] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  if (!isOpen) return null;

  const onlineDevices = devices.filter((d) => d.status === 'ONLINE' && !d.is_blocked);
  const blockedDevices = devices.filter((d) => d.is_blocked);
  const offlineDevices = devices.filter((d) => d.status !== 'ONLINE' && !d.is_blocked);

  const handleToggleBlock = async (dev) => {
    const action = dev.is_blocked ? 'membuka blokir' : 'memblokir';
    const confirmText = dev.is_blocked
      ? `Izinkan kembali perangkat "${dev.hostname || dev.mac_address}" agar dapat tersambung ke internet WiFi?`
      : `Yakin ingin memblokir perangkat "${dev.hostname || dev.mac_address}"? Akses internet perangkat ini akan diputus.`;

    if (!window.confirm(confirmText)) return;

    setBlockingMac(dev.mac_address);
    setFeedbackMsg(null);
    try {
      const res = await PortalWifiService.toggleBlockDevice(dev.mac_address, !dev.is_blocked);
      if (res.ok) {
        setFeedbackMsg({
          type: 'success',
          text: res.data?.message || `Perangkat berhasil ${dev.is_blocked ? 'dibuka blokirnya' : 'diblokir'}.`
        });
        if (onDeviceUpdate) {
          onDeviceUpdate(dev.mac_address, !dev.is_blocked);
        } else if (onRefresh) {
          onRefresh();
        }
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.data?.message || 'Gagal mengubah status blokir perangkat.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: 'Terjadi kesalahan sistem saat menghubungi modem.' });
    } finally {
      setBlockingMac(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const getDeviceIcon = (dev) => {
    const host = (dev.hostname || '').toLowerCase();
    const tipe = (dev.tipe_koneksi || '').toUpperCase();
    if (tipe === 'LAN') {
      return <Network className="w-4 h-4 text-emerald-600" />;
    }
    if (host.includes('laptop') || host.includes('pc') || host.includes('macbook') || host.includes('desktop')) {
      return <Laptop className="w-4 h-4 text-blue-600" />;
    }
    return <Smartphone className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Perangkat Terhubung
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                  {onlineDevices.length} Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Siapa saja yang memakai WiFi modem Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Action Bar (Refresh / Scan) */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            {lastUpdated ? `Diperbarui: ${lastUpdated}` : 'Memuat data modem...'}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={scanning || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Memindai ONT...' : 'Pindai Ulang'}</span>
          </button>
        </div>

        {/* Feedback Alert jika berhasil blokir/unblokir */}
        {feedbackMsg && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body / Device List */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading && devices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Memeriksa sambungan modem ONT...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mengambil daftar perangkat terhubung</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <Wifi className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Belum Ada Perangkat Terdeteksi</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Tekan tombol <b>Pindai Ulang</b> di atas untuk menarik data perangkat yang sedang tersambung ke modem Anda.
              </p>
            </div>
          ) : (
            <>
              {/* Online Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Sedang Tersambung ({onlineDevices.length})
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Online
                  </span>
                </div>

                {onlineDevices.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 text-slate-400 text-xs text-center">
                    Tidak ada perangkat aktif saat ini
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {onlineDevices.map((dev) => (
                      <div
                        key={dev.id || dev.mac_address}
                        className="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-200 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            {getDeviceIcon(dev)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{dev.hostname || 'Perangkat Tanpa Nama'}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase">
                                {dev.tipe_koneksi || 'WIFI'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              {dev.ip_address && <span>{dev.ip_address}</span>}
                              <span className="text-[10px] text-slate-400">{dev.mac_address}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {dev.rssi !== null && dev.rssi !== undefined && (
                            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-mono font-semibold">
                              <Signal className="w-3 h-3 text-blue-500" />
                              <span>{dev.rssi} dBm</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(dev)}
                            disabled={blockingMac === dev.mac_address}
                            title="Blokir akses internet perangkat ini"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-[11px] font-bold border border-red-200/60 active:scale-95 transition cursor-pointer disabled:opacity-50"
                          >
                            <Ban className={`w-3.5 h-3.5 ${blockingMac === dev.mac_address ? 'animate-spin' : ''}`} />
                            <span>{blockingMac === dev.mac_address ? 'Proses...' : 'Blokir'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked Section (Perangkat yang Diblokir) */}
              {blockedDevices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Diblokir ({blockedDevices.length})
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold">Akses Terputus</span>
                  </div>

                  <div className="space-y-1.5">
                    {blockedDevices.map((dev) => (
                      <div
                        key={dev.id || dev.mac_address}
                        className="p-3 rounded-xl bg-red-50/40 border border-red-100 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 opacity-75">
                          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Ban className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <span className="line-through decoration-red-400">{dev.hostname || 'Perangkat Tanpa Nama'}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700 uppercase">
                                Diblokir
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              {dev.ip_address && <span>{dev.ip_address}</span>}
                              <span className="text-[10px] text-slate-400">{dev.mac_address}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBlock(dev)}
                          disabled={blockingMac === dev.mac_address}
                          title="Buka blokir perangkat ini agar dapat mengakses internet kembali"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold active:scale-95 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                        >
                          <Unlock className={`w-3.5 h-3.5 ${blockingMac === dev.mac_address ? 'animate-spin' : ''}`} />
                          <span>{blockingMac === dev.mac_address ? 'Proses...' : 'Buka Blokir'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline / Riwayat Perangkat Terakhir */}
              {offlineDevices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Riwayat Terhubung ({offlineDevices.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Pernah Tersambung</span>
                  </div>

                  <div className="space-y-1.5 opacity-75">
                    {offlineDevices.map((dev) => (
                      <div
                        key={dev.id || dev.mac_address}
                        className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                            {getDeviceIcon(dev)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-600 truncate">
                              {dev.hostname || 'Perangkat N/A'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {dev.mac_address}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBlock(dev)}
                          disabled={blockingMac === dev.mac_address}
                          title="Blokir perangkat ini"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[10px] font-semibold transition cursor-pointer"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Blokir</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info Card di Bagian Bawah Modal */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2 text-xs text-blue-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800">
              Jika menemukan perangkat asing mencurigakan yang tidak Anda kenal, segera ubah <b>Kata Sandi WiFi</b> Anda di menu WiFi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalPerangkatTerhubung;

