import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  Phone,
  MapPin,
  ChevronRight,
  Wifi,
  Activity,
  Edit2,
  X,
  FileText,
  Server,
  Thermometer,
  Gauge,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  DollarSign
} from 'lucide-react'

export function CustomerDetailModal({
  customer,
  onClose,
  activeOffice = 'cabang',
  onOpenEdit,
}) {
  const [activeTab, setActiveTab] = useState('profil') // 'profil' | 'jaringan' | 'pembayaran'
  const [billingData, setBillingData] = useState(null)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [billingError, setBillingError] = useState(null)
  const [copiedVa, setCopiedVa] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const cId = customer?.id_pelanggan || customer?.id || ''
  const rawWa = customer?.no_wa || customer?.no_hp || ''
  const hasValidWa = Boolean(rawWa && rawWa !== '-')

  const fetchBilling = async () => {
    if (!cId) return
    setLoadingBilling(true)
    setBillingError(null)
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(cId)}/billing`)
      if (!res.ok) {
        throw new Error(`Server menjawab status ${res.status}`)
      }
      const data = await res.json()
      setBillingData(data)
    } catch (err) {
      console.warn('Gagal mengambil data billing live:', err)
      setBillingError(err.message || 'Gagal terhubung ke sistem tagihan Network Bill.')
    } finally {
      setLoadingBilling(false)
    }
  }

  // Hook 7: Reset state saat customer berganti
  useEffect(() => {
    setBillingData(null)
    setBillingError(null)
    setActiveTab('profil')
  }, [cId])

  // Hook 8: Fetch billing saat tab pembayaran dibuka
  useEffect(() => {
    if (!customer || !cId) return
    if (activeTab === 'pembayaran' && !billingData && !loadingBilling) {
      fetchBilling()
    }
  }, [activeTab, cId, customer, billingData, loadingBilling])

  if (!customer) return null

  const handleCopyVa = (vaNumber, channelKey) => {
    if (!vaNumber) return
    navigator.clipboard.writeText(vaNumber)
    setCopiedVa(channelKey)
    setTimeout(() => setCopiedVa(null), 2000)
  }

  const handleToggleLocalStatus = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(cId)}/status-pembayaran?status_pembayaran=${newStatus}`, {
        method: 'PUT'
      })
      if (res.ok) {
        setBillingData(prev => prev ? { ...prev, status_pembayaran_lokal: newStatus } : prev)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200/90 space-y-3 sm:space-y-4 font-sans max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-cyan-700 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {customer.nama || customer.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                ID: <span className="font-mono text-slate-700 font-semibold">{cId}</span>
                <span className="inline-block mx-1.5 h-3 w-px bg-slate-200 align-middle" />
                Wilayah: <span className="uppercase font-semibold text-slate-700">{customer.kantor || activeOffice || 'cabang'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0 cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Profil vs Jaringan vs Pembayaran) */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0 font-sans text-[11px] sm:text-xs font-bold gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span className="truncate">Profil &amp; Kontak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jaringan')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'jaringan'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Jaringan &amp; Modem</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pembayaran')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'pembayaran'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Tagihan &amp; Bayar</span>
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
                  <div>
                    <span className="text-slate-400 block text-[10px]">MAC Address:</span>
                    <span className="font-bold text-slate-900 font-mono">{customer.mac_address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] flex items-center gap-0.5">
                      <Thermometer className="w-2.5 h-2.5 text-amber-600" />
                      <span>Suhu ONT Terakhir:</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      {customer.suhu_ont !== undefined && customer.suhu_ont !== null
                        ? `${customer.suhu_ont}°C`
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] flex items-center gap-0.5">
                      <Gauge className="w-2.5 h-2.5 text-cyan-600" />
                      <span>Latensi Terakhir:</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      {customer.latency_ms !== undefined && customer.latency_ms !== null
                        ? `${customer.latency_ms} ms`
                        : '-'}
                    </span>
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

          {activeTab === 'pembayaran' && (
            <div className="space-y-3">
              {/* Header Tab & Tombol Refresh Live API */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-emerald-600" />
                  <span>Network Bill API v1 (Live)</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchBilling()}
                  disabled={loadingBilling}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold font-sans text-slate-600 flex items-center gap-1 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Segarkan data tagihan langsung dari Network Bill"
                >
                  <RotateCw className={`w-3 h-3 text-cyan-600 ${loadingBilling ? 'animate-spin' : ''}`} />
                  <span>{loadingBilling ? 'Memuat...' : 'Segarkan'}</span>
                </button>
              </div>

              {/* Loading State */}
              {loadingBilling && !billingData && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <RotateCw className="w-6 h-6 text-cyan-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Membaca tagihan &amp; Virtual Account dari Network Bill...</p>
                  <p className="text-[10px] text-slate-400">Menghubungi endpoint /invoices dan /virtual-account secara live</p>
                </div>
              )}

              {/* Error State */}
              {billingError && !billingData && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Gagal Memuat Data Tagihan</span>
                  </div>
                  <p className="text-[11px] text-rose-700 font-sans">{billingError}</p>
                  <button
                    type="button"
                    onClick={() => fetchBilling()}
                    className="mt-1 px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Content Rendered */}
              {billingData && (
                <>
                  {/* Hero Status Card */}
                  {(() => {
                    const b = billingData.billing || {}
                    const unpaidList = b.unpaid || []
                    const hasUnpaid = unpaidList.length > 0
                    const nextBill = b.next_bill
                    const isOverdue = unpaidList.some(item => item.overdue)
                    const isLinked = billingData.linked

                    if (!isLinked) {
                      return (
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5 font-sans">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Status Pembayaran Lokal</span>
                            </span>
                            <span className="text-xs font-bold text-amber-900">
                              {billingData.status_pembayaran_lokal || 'LUNAS'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 font-sans leading-relaxed">
                            Pelanggan ini belum tertaut dengan ID numerik di Network Bill. Status pembayaran dicatat secara manual di EdTeknoGuard.
                          </p>
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-[10px] text-amber-900 font-bold">Ubah Status Cepat:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleLocalStatus(billingData.status_pembayaran_lokal === 'LUNAS' ? 'BELUM_BAYAR' : 'LUNAS')}
                              disabled={updatingStatus}
                              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-[10px] hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                            >
                              {updatingStatus ? 'Menyimpan...' : (billingData.status_pembayaran_lokal === 'LUNAS' ? 'Tandai Belum Bayar' : 'Tandai Lunas')}
                            </button>
                          </div>
                        </div>
                      )
                    }

                    if (hasUnpaid) {
                      const totalDue = b.unpaid_total || nextBill?.total || 0
                      return (
                        <div className={`p-3 sm:p-3.5 rounded-2xl border ${isOverdue ? 'bg-rose-50/80 border-rose-200 text-rose-950' : 'bg-amber-50/80 border-amber-200 text-amber-950'} space-y-1.5`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold flex items-center gap-1.5 font-sans">
                              {isOverdue ? <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" /> : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                              <span>{isOverdue ? 'JATUH TEMPO / OVERDUE' : 'MENUNGGU PEMBAYARAN'}</span>
                            </span>
                            <span className={`text-xs font-bold ${isOverdue ? 'text-rose-800' : 'text-amber-900'}`}>
                              {unpaidList.length} Tagihan Tertunggak
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between pt-0.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Total yang Harus Dibayar:</span>
                            <span className={`text-base font-black font-sans ${isOverdue ? 'text-rose-700' : 'text-amber-800'}`}>
                              Rp {Number(totalDue).toLocaleString('id-ID')}
                            </span>
                          </div>
                          {nextBill?.due_date && (
                            <p className="text-[10px] text-slate-500 font-sans">
                              Jatuh tempo terdekat: <span className="font-bold text-slate-700">{nextBill.due_date}</span>
                            </p>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold flex items-center gap-1.5 font-sans">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>TAGIHAN LUNAS (KONEKSI PRIMA)</span>
                          </span>
                          <span className="text-xs font-bold text-emerald-800">
                            LUNAS
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-sans">
                          Seluruh tagihan periode ini telah diselesaikan via Network Bill. Tidak ada tagihan yang tertunggak.
                        </p>
                      </div>
                    )
                  })()}

                  {/* Rincian Paket & Info Langganan */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Paket Layanan</span>
                      <div className="font-bold text-slate-800 font-sans truncate">
                        {billingData.paket_info?.nama || billingData.paket || customer.paket || '-'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Tarif Bulanan</span>
                      <div className="font-bold text-cyan-800 font-sans truncate">
                        {billingData.paket_info?.harga
                          ? `Rp ${Number(billingData.paket_info.harga).toLocaleString('id-ID')} / bln`
                          : '-'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-indigo-600" />
                        <span>Jatuh Tempo</span>
                      </span>
                      <div className="font-bold text-indigo-900 font-sans truncate" title={billingData.due_date_day ? `Siklus tanggal ${billingData.due_date_day} tiap bulan` : ''}>
                        {billingData.due_date_day 
                          ? `Tgl ${billingData.due_date_day} tiap bulan` 
                          : (billingData.active_due_date 
                              ? billingData.active_due_date 
                              : '-')}
                      </div>
                      {billingData.billing_mode && (
                        <div className="text-[9px] text-slate-400 uppercase font-bold">
                          Mode: {billingData.billing_mode}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kartu Tagihan Belum Lunas (Unpaid Invoices) */}
                  {billingData.billing?.unpaid && billingData.billing.unpaid.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Rincian Tagihan Belum Lunas</span>
                      </span>
                      <div className="space-y-1.5">
                        {billingData.billing.unpaid.map((inv) => (
                          <div key={inv.id || inv.number} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-900 font-mono truncate">{inv.number || `INV-${inv.id}`}</div>
                              <div className="text-[10px] text-slate-500">
                                Periode: <span className="font-semibold text-slate-700">{inv.billing_period || '-'}</span> • Jatuh Tempo: <span className="font-semibold text-slate-700">{inv.due_date || '-'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-amber-800 font-sans">
                                Rp {Number(inv.total || 0).toLocaleString('id-ID')}
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${inv.overdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                {inv.overdue ? 'Overdue' : 'Belum Lunas'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kanal Virtual Account Bank (Faspay / Network Bill) */}
                  {billingData.billing?.channels && billingData.billing.channels.length > 0 && (
                    <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-900 font-bold uppercase flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Kanal Virtual Account Bank</span>
                        </span>
                        <span className="text-[10px] text-cyan-700 font-mono">16-Digit VA</span>
                      </div>
                      <div className="space-y-2">
                        {billingData.billing.channels.map((ch) => {
                          const formattedVa = ch.va_number ? ch.va_number.replace(/(\d{4})/g, '$1 ').trim() : '-'
                          const isCopied = copiedVa === ch.channel
                          return (
                            <div key={ch.channel} className="p-2.5 rounded-lg bg-white border border-cyan-100 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{ch.bank}</div>
                                <div className="font-mono text-xs sm:text-sm font-black text-slate-900 tracking-wide">
                                  {formattedVa}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Biaya Admin: Rp {Number(ch.admin_fee || 0).toLocaleString('id-ID')} • Total: <span className="font-bold text-cyan-900">Rp {Number(ch.amount_to_pay || 0).toLocaleString('id-ID')}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyVa(ch.va_number, ch.channel)}
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition shrink-0 cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900'
                                }`}
                                title="Salin nomor Virtual Account"
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Riwayat Pembayaran Terakhir (History) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <span>Riwayat Pembayaran Terakhir</span>
                    </span>
                    {billingData.history && billingData.history.length > 0 ? (
                      <div className="space-y-1.5">
                        {billingData.history.slice(0, 5).map((inv) => (
                          <div key={inv.id || inv.number} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-800 font-mono truncate">{inv.number || `INV-${inv.id}`}</div>
                              <div className="text-[10px] text-slate-500">
                                Periode: <span className="font-semibold">{inv.billing_period || '-'}</span> • Tanggal: <span className="font-semibold">{inv.payment?.date || inv.issue_date || '-'}</span>
                              </div>
                              <div className="text-[10px] text-emerald-700 font-medium">
                                Metode: {inv.payment?.method_label || inv.payment?.method || 'Virtual Account'}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-emerald-800 font-sans">
                                Rp {Number(inv.total || 0).toLocaleString('id-ID')}
                              </div>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5 justify-end">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Lunas</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-slate-400 text-[11px] italic">
                        Belum ada riwayat pembayaran yang tercatat di sistem
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEdit && onOpenEdit(customer)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-cyan-800 text-xs font-semibold font-sans transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Informasi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-sans transition cursor-pointer shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
