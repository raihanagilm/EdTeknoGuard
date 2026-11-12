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

  useEffect(() => {
    setBillingData(null)
    setBillingError(null)
    setActiveTab('profil')
  }, [cId])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B2545]/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-[#CCDDF0] space-y-3 sm:space-y-4 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#CCDDF0] pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#E0F0FF] border border-[#CCDDF0] flex items-center justify-center text-[#026AA7] shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#0B2545] truncate">
                {customer.nama || customer.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64839E] font-medium truncate">
                ID: <span className="font-mono text-[#0B2545] font-semibold">{cId}</span>
                <span className="inline-block mx-1.5 h-3 w-px bg-[#CCDDF0] align-middle" />
                Wilayah: <span className="uppercase font-semibold text-[#026AA7]">{customer.kantor || activeOffice || 'cabang'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F1F6FC] text-[#64839E] hover:text-[#0B2545] transition shrink-0 cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Profil vs Jaringan vs Pembayaran) */}
        <div className="flex rounded-lg bg-[#F1F6FC] p-1 border border-[#CCDDF0] shrink-0 font-sans text-[11px] sm:text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-md flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-white text-[#0B2545] shadow-2xs border border-[#CCDDF0]'
                : 'text-[#3B5B78] hover:text-[#0B2545]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#026AA7] shrink-0" />
            <span className="truncate">Profil &amp; Kontak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jaringan')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-md flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'jaringan'
                ? 'bg-white text-[#0B2545] shadow-2xs border border-[#CCDDF0]'
                : 'text-[#3B5B78] hover:text-[#0B2545]'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[#026AA7] shrink-0" />
            <span className="truncate">Jaringan &amp; Modem</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pembayaran')}
            className={`flex-1 py-1.5 px-2 sm:px-3 rounded-md flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'pembayaran'
                ? 'bg-white text-[#0B2545] shadow-2xs border border-[#CCDDF0]'
                : 'text-[#3B5B78] hover:text-[#0B2545]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#026AA7] shrink-0" />
            <span className="truncate">Tagihan &amp; Bayar</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto space-y-3 text-xs pr-0.5 flex-1 font-sans">
          
          {/* TAB 1: PROFIL */}
          {activeTab === 'profil' && (
            <div className="space-y-3">
              {/* Box Kontak & WhatsApp */}
              <div className="p-3.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-[#3B5B78] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#026AA7] shrink-0" />
                    <span>Kontak WhatsApp Pelanggan</span>
                  </span>
                  <div className="text-xs font-bold text-[#0B2545] font-mono">
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
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Kirim Pesan WA</span>
                  </a>
                )}
              </div>

              {/* Grid Informasi Pribadi & Layanan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-0.5">
                  <span className="text-[10px] text-[#64839E] font-bold uppercase">Paket Layanan</span>
                  <div className="font-bold text-[#0B2545] truncate">{customer.paket || '-'}</div>
                </div>

                {/* Titik Lokasi GPS */}
                <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-0.5">
                  <span className="text-[10px] text-[#64839E] font-bold uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#026AA7] shrink-0" />
                    <span>Titik Lokasi GPS</span>
                  </span>
                  {customer.lokasi_gps ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.lokasi_gps)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#026AA7] hover:underline flex items-center gap-1 text-xs truncate transition"
                      title="Buka lokasi di Google Maps"
                    >
                      <span className="truncate">{customer.lokasi_gps}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : customer.alamat ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.alamat)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#026AA7] hover:underline flex items-center gap-1 text-xs truncate transition"
                      title="Cari alamat di Google Maps"
                    >
                      <span className="truncate">Cari di GMaps</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[#64839E] italic text-[11px] block">-</span>
                  )}
                </div>
              </div>

              {/* Alamat Pemasangan Fisik */}
              <div className="p-3 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-1">
                <span className="text-[10px] text-[#64839E] font-bold uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#026AA7]" />
                  <span>Alamat Lengkap Rumah / Lokasi Pemasangan</span>
                </span>
                <p className="text-xs text-[#0B2545] font-medium leading-relaxed">
                  {customer.alamat || customer.address || 'Alamat fisik belum diisi'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: JARINGAN */}
          {activeTab === 'jaringan' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-2">
                <span className="text-[10px] text-[#026AA7] font-bold uppercase flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Kredensial WiFi Rumah &amp; Login Modem</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64839E] block text-[10px]">Nama WiFi (SSID):</span>
                    <span className="font-bold text-[#0B2545]">{customer.nama_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">Password WiFi:</span>
                    <span className="font-bold text-[#0B2545]">{customer.password_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">IP ONT (GPON/VLAN):</span>
                    <span className="font-bold text-[#026AA7]">{customer.ip_ont || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">IP Router (DHCP/LAN):</span>
                    <span className="font-bold text-[#0B2545]">{customer.ip_router || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">User Admin Modem:</span>
                    <span className="font-bold text-[#0B2545] font-mono">{customer.user_admin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">Password Admin Modem:</span>
                    <span className="font-bold text-[#0B2545] font-mono">{customer.pass_admin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">Jenis Modem:</span>
                    <span className="font-bold text-[#0B2545]">{customer.jenis_modem || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px]">MAC Address:</span>
                    <span className="font-bold text-[#0B2545] font-mono">{customer.mac_address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px] flex items-center gap-0.5">
                      <Thermometer className="w-2.5 h-2.5 text-[#026AA7]" />
                      <span>Redaman Baseline:</span>
                    </span>
                    <span className="font-bold font-mono text-[#0B2545]">
                      {customer.redaman_baseline ? `${customer.redaman_baseline} dBm` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64839E] block text-[10px] flex items-center gap-0.5">
                      <Gauge className="w-2.5 h-2.5 text-[#026AA7]" />
                      <span>Status Kredensial:</span>
                    </span>
                    <span className="font-bold font-mono text-[#0B2545]">
                      {customer.status_kredensial || 'UNTESTED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PEMBAYARAN */}
          {activeTab === 'pembayaran' && (
            <div className="space-y-3">
              {/* Header Bar API Info */}
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#026AA7] font-bold flex items-center gap-1.5 uppercase">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Network Bill API v1</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchBilling()}
                  disabled={loadingBilling}
                  className="px-2 py-1 rounded-md text-[#026AA7] hover:bg-[#E2EDF8] transition flex items-center gap-1 border border-[#CCDDF0] cursor-pointer"
                  title="Segarkan data tagihan dari server"
                >
                  <RotateCw className={`w-3 h-3 ${loadingBilling ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {/* Loading State */}
              {loadingBilling && (
                <div className="p-6 text-center space-y-2 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0]">
                  <RotateCw className="w-5 h-5 text-[#026AA7] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-[#0B2545]">Membaca tagihan dari Network Bill...</p>
                </div>
              )}

              {/* Error State */}
              {billingError && !billingData && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Gagal Memuat Data Tagihan</span>
                  </div>
                  <p className="text-[11px] text-rose-700">{billingError}</p>
                  <button
                    type="button"
                    onClick={() => fetchBilling()}
                    className="mt-1 px-3 py-1 rounded-md bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Content Rendered */}
              {billingData && (
                <>
                  {/* Clean Status Card: Tanpa Box Kuning Mencolok */}
                  {(() => {
                    const b = billingData.billing || {}
                    const unpaidList = b.unpaid || []
                    const hasUnpaid = unpaidList.length > 0
                    const isLinked = billingData.linked
                    const statusText = billingData.status_pembayaran_lokal || (hasUnpaid ? 'BELUM_BAYAR' : 'LUNAS')
                    const isLunas = statusText === 'LUNAS'

                    return (
                      <div className="p-3.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#3B5B78] flex items-center gap-1.5">
                            {isLunas ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{isLinked ? 'Status Tagihan Network Bill' : 'Status Pembayaran Lokal'}</span>
                          </span>
                          <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isLunas ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isLunas ? 'LUNAS' : 'BELUM BAYAR'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#3B5B78] leading-relaxed">
                          {isLinked
                            ? (isLunas 
                                ? 'Seluruh tagihan periode ini telah terselesaikan via Network Bill.' 
                                : `Terdapat ${unpaidList.length} tagihan tertunggak sebesar Rp ${Number(b.unpaid_total || 0).toLocaleString('id-ID')}.`)
                            : 'Pelanggan ini belum tertaut ID numerik di Network Bill. Status pembayaran dicatat secara manual di sistem EdTeknoGuard.'}
                        </p>

                        {!isLinked && (
                          <div className="pt-1 flex items-center gap-2 border-t border-[#CCDDF0]/60">
                            <span className="text-[10px] text-[#64839E] font-bold">Ubah Status Cepat:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleLocalStatus(isLunas ? 'BELUM_BAYAR' : 'LUNAS')}
                              disabled={updatingStatus}
                              className="px-2.5 py-1 rounded-md bg-white border border-[#CCDDF0] text-[#026AA7] hover:bg-[#E2EDF8] font-bold text-[10px] transition cursor-pointer"
                            >
                              {updatingStatus ? 'Menyimpan...' : (isLunas ? 'Tandai Belum Bayar' : 'Tandai Lunas')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Rincian Paket & Info Langganan */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-0.5">
                      <span className="text-[10px] text-[#64839E] font-bold uppercase">Paket Layanan</span>
                      <div className="font-bold text-[#0B2545] truncate">
                        {billingData.paket_info?.nama || billingData.paket || customer.paket || '-'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-0.5">
                      <span className="text-[10px] text-[#64839E] font-bold uppercase">Tarif Bulanan</span>
                      <div className="font-bold text-[#026AA7] font-mono truncate">
                        {billingData.paket_info?.harga
                          ? `Rp ${Number(billingData.paket_info.harga).toLocaleString('id-ID')}`
                          : '-'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#64839E] font-bold uppercase flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-[#026AA7]" />
                        <span>Jatuh Tempo</span>
                      </span>
                      <div className="font-bold text-[#0B2545] font-mono truncate">
                        {billingData.due_date_day 
                          ? `Tgl ${billingData.due_date_day} tiap bln` 
                          : (billingData.active_due_date || '-')}
                      </div>
                    </div>
                  </div>

                  {/* Riwayat Pembayaran Terakhir (History) */}
                  <div className="p-3 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] space-y-2">
                    <span className="text-[10px] text-[#64839E] font-bold uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#026AA7]" />
                      <span>Riwayat Pembayaran Terakhir</span>
                    </span>
                    {billingData.history && billingData.history.length > 0 ? (
                      <div className="space-y-1.5">
                        {billingData.history.slice(0, 5).map((inv) => (
                          <div key={inv.id || inv.number} className="p-2 rounded-md bg-white border border-[#CCDDF0] flex items-center justify-between text-[11px]">
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-[#0B2545] font-mono truncate">{inv.number || `INV-${inv.id}`}</div>
                              <div className="text-[10px] text-[#64839E]">
                                Periode: <span className="font-semibold">{inv.billing_period || '-'}</span> • Tanggal: <span className="font-semibold">{inv.payment?.date || inv.issue_date || '-'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-[#0B2545] font-mono">
                                Rp {Number(inv.total || 0).toLocaleString('id-ID')}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700">Lunas</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[#64839E] text-[11px] italic">
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
        <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-[#CCDDF0] shrink-0 font-sans">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEdit && onOpenEdit(customer)}
              className="px-3.5 py-1.5 rounded-lg border border-[#CCDDF0] bg-white hover:bg-[#F1F6FC] text-[#3B5B78] hover:text-[#0B2545] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#026AA7]" />
              <span>Edit Informasi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
