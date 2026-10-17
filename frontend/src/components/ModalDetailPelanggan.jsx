import React, { useState } from 'react'
import {
  UserPlus,
  Phone,
  MapPin,
  ChevronRight,
  Wifi,
  Activity,
  ShieldAlert,
  Edit2,
  X,
  FileText,
  Server
} from 'lucide-react'

export function ModalDetailPelanggan({
  customer,
  onClose,
  activeOffice = 'cabang',
  onOpenEdit,
  onToggleIsolir,
  isolirLoadingId
}) {
  const [activeTab, setActiveTab] = useState('profil') // 'profil' | 'jaringan'

  if (!customer) return null

  const cId = customer.id_pelanggan || customer.id
  const isIsolirLoading = isolirLoadingId === cId
  const rawWa = customer.no_wa || customer.no_hp || ''
  const hasValidWa = rawWa && rawWa !== '-'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-sky-200 space-y-3 sm:space-y-4 font-mono max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-sky-100 pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20 shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-sans truncate">
                {customer.nama || customer.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-cyan-700 font-bold truncate">
                ID: {cId} • Wilayah: <span className="uppercase">{customer.kantor || activeOffice || 'cabang'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Profil Pelanggan vs Jaringan & Modem) */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0 font-sans text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'profil'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-600" />
            <span>Profil &amp; Kontak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jaringan')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'jaringan'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>Jaringan &amp; Modem</span>
          </button>
        </div>

        {/* Tab Body (Scrollable jika layar HP pendek) */}
        <div className="overflow-y-auto space-y-3 text-xs pr-0.5 flex-1">
          {activeTab === 'profil' && (
            <div className="space-y-3">
              {/* Box Kontak & WhatsApp */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 font-sans">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kontak WhatsApp Pelanggan</span>
                  </span>
                  <div className="text-xs font-black text-emerald-800 font-mono">
                    {hasValidWa ? rawWa : 'Nomor WhatsApp belum terdaftar'}
                  </div>
                </div>

                {hasValidWa && (
                  <a
                    href={`https://wa.me/${rawWa.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                      `Halo Bapak/Ibu ${customer.nama || customer.name}, kami dari Tim Teknis NOC TeknoGuard ingin mengonfirmasi terkait koneksi internet modem Anda (IP: ${customer.ip_router || '-'}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition shadow-xs shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Kirim Pesan WA</span>
                  </a>
                )}
              </div>

              {/* Grid Informasi Pribadi & Layanan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Paket Layanan</span>
                  <div className="font-bold text-slate-800 font-sans truncate">{customer.paket || '-'}</div>
                </div>

                {/* Titik Lokasi GPS (Klik langsung buka Google Maps) */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-600 shrink-0" />
                    <span>Titik Lokasi GPS</span>
                  </span>
                  {customer.lokasi_gps ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.lokasi_gps)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 text-xs truncate transition"
                      title="Buka lokasi di Google Maps"
                    >
                      <span className="truncate">{customer.lokasi_gps}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                    </a>
                  ) : customer.alamat ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.alamat)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 text-xs truncate transition"
                      title="Cari alamat di Google Maps"
                    >
                      <span className="truncate">Cari di GMaps</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-[11px] block">-</span>
                  )}
                </div>
              </div>

              {/* Alamat Pemasangan Fisik */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Alamat Lengkap Rumah / Lokasi Pemasangan</span>
                </span>
                <p className="text-xs text-slate-800 font-sans font-medium leading-relaxed">
                  {customer.alamat || customer.address || 'Alamat fisik belum diisi'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'jaringan' && (
            <div className="space-y-3">
              {/* Detail Kredensial WiFi & Router ONT */}
              <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-2">
                <span className="text-[10px] text-cyan-900 font-bold uppercase flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Kredensial WiFi Rumah &amp; Login Modem</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama WiFi (SSID):</span>
                    <span className="font-bold text-slate-900">{customer.nama_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Password WiFi:</span>
                    <span className="font-bold text-slate-900">{customer.password_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">IP ONT (GPON/VLAN):</span>
                    <span className="font-bold text-cyan-800">{customer.ip_ont || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">IP Router (DHCP/LAN):</span>
                    <span className="font-bold text-slate-800">{customer.ip_router || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">User Admin Modem:</span>
                    <span className="font-bold text-slate-900 font-mono">{customer.user_admin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Password Admin Modem:</span>
                    <span className="font-bold text-slate-900 font-mono">{customer.pass_admin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jenis Modem:</span>
                    <span className="font-bold text-slate-900">{customer.jenis_modem || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Detail MikroTik & Pemakaian Kuota Real-Time */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-950 font-bold uppercase flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Status Jaringan &amp; Kuota MikroTik</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    customer.status_isolir
                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {customer.status_isolir ? 'TERISOLIR (SUSPENDED)' : 'AKTIF NORMAL'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Terpakai (Bln Ini):</span>
                    <span className="font-black text-slate-900 font-sans text-xs">{(customer.kuota_terpakai_gb || 0).toFixed(2)} GB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Upload Traffic:</span>
                    <span className="font-bold text-slate-800 font-mono text-[11px]">▲ {((customer.upload_bytes || 0) / (1024**3)).toFixed(2)} GB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Download Traffic:</span>
                    <span className="font-bold text-slate-800 font-mono text-[11px]">▼ {((customer.download_bytes || 0) / (1024**3)).toFixed(2)} GB</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[10px]">Rule Simple Queue:</span>
                    <span className="font-bold text-indigo-900 font-mono text-[11px] truncate block">{customer.queue_name || customer.nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sync Terakhir:</span>
                    <span className="font-mono text-slate-600 text-[11px]">{customer.last_sync_mikrotik || 'Otomatis'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-sky-100 shrink-0">
          <button
            type="button"
            onClick={() => onToggleIsolir && onToggleIsolir(customer)}
            disabled={isIsolirLoading}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition flex items-center gap-1.5 ${
              customer.status_isolir
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {isIsolirLoading
                ? 'Memproses...'
                : customer.status_isolir
                ? 'Buka Isolir'
                : 'Isolir Akses'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEdit && onOpenEdit(customer)}
              className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Informasi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-mono transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
