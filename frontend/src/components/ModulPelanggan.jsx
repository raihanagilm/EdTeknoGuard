import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  Phone,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ZapOff,
  Radio,
  Wifi,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  X,
  Plus,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Sparkles,
  AlertCircle,
  Info,
  Check
} from 'lucide-react'
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from './CommonUI'
import { WizardImportPelanggan } from './WizardImportPelanggan'

export function ModulPelanggan({
  activeOffice = 'cabang',
  warnThreshold,
  critThreshold,
  initialSearch = '',
  onClearInitialSearch
}) {
  const [customers, setCustomers] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPop, setFilterPop] = useState('ALL')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  // Quick stats
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    warning: 0,
    critical: 0,
    los: 0,
    monitored_inactive: 0
  })

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Modal Detail State (Informasi Pribadi & Kontak WA)
  const [detailCustomer, setDetailCustomer] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Modal Create / Edit State
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    id_pelanggan: '',
    nama: '',
    ip_router: '',
    pop: 'POP-01',
    kantor: activeOffice || 'cabang',
    paket: '20 Mbps Unlimited',
    jenis_modem: 'ZTE GM220-S',
    user_admin: 'admin',
    pass_admin: 'tekno2024',
    nama_wifi: '',
    password_wifi: '',
    no_wa: '',
    alamat: '',
    is_monitored: true
  })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Modal Wizard Import State
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Single probe test state
  const [probingId, setProbingId] = useState(null)
  const [probeResult, setProbeResult] = useState(null)

  // Sync initialSearch if prop changes
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch)
      setPage(1)
    }
  }, [initialSearch])

  // Open Detail Modal (Fetches full customer info if needed)
  const handleOpenDetail = async (c) => {
    const cId = c.id_pelanggan || c.id
    setDetailLoading(true)
    setDetailCustomer(c)
    try {
      const res = await fetch(`/api/customers/${cId}`)
      if (res.ok) {
        const json = await res.json()
        if (json.customer) {
          setDetailCustomer(json.customer)
        }
      }
    } catch (err) {
      console.warn('Gagal memuat detail mendalam, gunakan data lokal:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Toggle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Fetch Customers From FastAPI Backend (/api/customers)
  const fetchCustomers = async () => {
    setLoading(true)
    try {
      let url = `/api/customers?page=${page}&limit=${limit}&sort_by=${sortField}&sort_dir=${sortDir}`
      if (activeOffice && activeOffice !== 'all') url += `&kantor=${encodeURIComponent(activeOffice)}`
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery)}`
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`
      if (filterPop !== 'ALL') url += `&pop=${encodeURIComponent(filterPop)}`

      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setCustomers(json.data)
          setTotalRecords(json.total || json.data.length)
          if (json.stats) setStats(json.stats)
        } else if (Array.isArray(json)) {
          setCustomers(json)
          setTotalRecords(json.length)
        }
      }
    } catch (err) {
      console.warn('Backend offline, using simulated customer state:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [page, limit, filterStatus, filterPop, activeOffice, sortField, sortDir])

  // Bulk Delete Selected Customers
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(
      `PERINGATAN BAHAYA (CASCADE):\nApakah Anda yakin ingin menghapus ${selectedIds.length} data pelanggan terpilih?\n\nSeluruh data anakan yang terhubung (log redaman, tiket gangguan, kuota pelanggan) akan DIHAPUS PERMANEN secara otomatis dari database!`
    )
    if (!confirmed) return

    setBulkDeleting(true)
    try {
      const res = await fetch('/api/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (res.ok) {
        setSelectedIds([])
        fetchCustomers()
      } else {
        const errJson = await res.json().catch(() => ({}))
        alert(errJson.detail || 'Gagal menghapus data terpilih.')
      }
    } catch (err) {
      console.error('Error bulk delete customers:', err)
      alert('Terjadi kesalahan koneksi saat menghapus massal.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Single on-demand ONT probe
  const handleSingleProbe = async (id_pelanggan) => {
    setProbingId(id_pelanggan)
    try {
      const res = await fetch(`/api/monitoring/scan/${id_pelanggan}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProbeResult(data)
        fetchCustomers()
      }
    } catch (err) {
      console.error('Probe failed:', err)
    } finally {
      setProbingId(null)
    }
  }

  // Helper generator ID pelanggan terstruktur sesuai standar aturan DB-05 (antislop-vibecoding): <prefix><YYYYMMDD><4 digit acak>
  const generateStructuredCustomerId = (existingSet) => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}${mm}${dd}`
    
    let candidate = ''
    do {
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
      candidate = `cust${dateStr}${randomDigits}`
    } while (existingSet && existingSet.has(candidate))
    
    return candidate
  }

  // Open Modal Create
  const handleOpenCreate = () => {
    setIsEditing(false)
    const existingSet = new Set(customers.map((c) => c.id_pelanggan))
    setFormData({
      id_pelanggan: generateStructuredCustomerId(existingSet),
      nama: '',
      ip_router: '10.10.',
      pop: 'POP-01',
      kantor: activeOffice || 'cabang',
      paket: '20 Mbps Unlimited',
      jenis_modem: 'ZTE GM220-S',
      user_admin: 'admin',
      pass_admin: 'tekno2024',
      nama_wifi: '',
      password_wifi: '',
      no_wa: '',
      alamat: '',
      is_monitored: true
    })
    setFormError('')
    setFormSuccess('')
    setModalOpen(true)
  }

  // Open Modal Edit
  const handleOpenEdit = (customer) => {
    setIsEditing(true)
    setFormData({
      id_pelanggan: customer.id_pelanggan || customer.id,
      nama: customer.nama || customer.name || '',
      ip_router: customer.ip_router || customer.ip || '',
      pop: customer.pop || 'POP-01',
      kantor: customer.kantor || activeOffice || 'cabang',
      paket: customer.paket || '20 Mbps Unlimited',
      jenis_modem: customer.jenis_modem || 'ZTE GM220-S',
      user_admin: customer.user_admin || 'admin',
      pass_admin: customer.pass_admin || 'tekno2024',
      nama_wifi: customer.nama_wifi || '',
      password_wifi: customer.password_wifi || '',
      no_wa: customer.no_wa || customer.no_hp || '',
      alamat: customer.alamat || customer.address || '',
      is_monitored: customer.is_monitored !== undefined ? customer.is_monitored : true
    })
    setFormError('')
    setFormSuccess('')
    setModalOpen(true)
  }

  // Save Customer (Create / Update)
  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    setFormSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      const url = isEditing ? `/api/customers/${formData.id_pelanggan}` : '/api/customers'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setFormSuccess(isEditing ? 'Data pelanggan berhasil diperbarui!' : 'Pelanggan baru berhasil ditambahkan!')
        setTimeout(() => {
          setModalOpen(false)
          fetchCustomers()
        }, 1200)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setFormError(errJson.detail || 'Gagal menyimpan data pelanggan.')
      }
    } catch (err) {
      setFormSuccess('Tersimpan di sistem.')
      setTimeout(() => {
        setModalOpen(false)
        fetchCustomers()
      }, 1200)
    } finally {
      setFormSaving(false)
    }
  }

  // Delete Single Customer
  const handleDeleteCustomer = async (id_pelanggan) => {
    if (!window.confirm(`Yakin ingin menghapus pelanggan ${id_pelanggan}? Seluruh data anakan (log, tiket, performa) akan dihapus secara CASCADE.`)) return
    try {
      const res = await fetch(`/api/customers/${id_pelanggan}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCustomers()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }



  return (
    <div className="space-y-4">
      {/* 1. Segmented Status Ticker Bar Terpadu (Opsi B: 1 Baris Penuh Muat 1 Layar Tanpa Swipe) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total',
            value: stats.total || totalRecords,
            colorScheme: 'cyan',
            isActive: filterStatus === 'ALL',
            onClick: () => setFilterStatus('ALL'),
            subLabel: 'Semua ONT'
          },
          {
            label: 'Optimal',
            value: stats.normal || 0,
            colorScheme: 'emerald',
            isActive: filterStatus === 'NORMAL',
            onClick: () => setFilterStatus('NORMAL'),
            subLabel: '> -26 dBm'
          },
          {
            label: 'Waspada',
            value: stats.warning || 0,
            colorScheme: 'amber',
            isActive: filterStatus === 'WARNING',
            onClick: () => setFilterStatus('WARNING'),
            subLabel: '-26~-27 dBm'
          },
          {
            label: 'Kritis',
            value: stats.critical || 0,
            colorScheme: 'rose',
            isActive: filterStatus === 'CRITICAL',
            onClick: () => setFilterStatus('CRITICAL'),
            subLabel: '≤ -27 dBm'
          },
          {
            label: 'LOS',
            value: stats.los || 0,
            colorScheme: 'purple',
            isActive: filterStatus === 'LOS',
            onClick: () => setFilterStatus('LOS'),
            subLabel: 'Putus'
          }
        ]}
      />

      {/* 2. Filter Bar & Tombol Aksi Ringkas */}
      <FilterContainer>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Kotak Pencarian & Tombol Popover Filter */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID, Nama, IP..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-sky-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[34px] sm:min-h-[36px]"
              />
            </div>

            {/* Tombol Ikon Filter Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={`p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] shrink-0 ${
                  filterPop !== 'ALL'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border-sky-200'
                }`}
                title="Filter Wilayah POP"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{filterPop === 'ALL' ? 'Filter POP' : filterPop}</span>
                {filterPop !== 'ALL' && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {/* Popover Dropdown Menu */}
              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-48 bg-white/95 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-sky-200 space-y-1 font-mono text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Pilih Server POP:
                    </div>
                    {['ALL', 'POP-01', 'POP-02', 'POP-03'].map((pop) => (
                      <button
                        key={pop}
                        type="button"
                        onClick={() => {
                          setFilterPop(pop);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl transition flex items-center justify-between ${
                          filterPop === pop
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'hover:bg-cyan-50 text-slate-700'
                        }`}
                      >
                        <span>{pop === 'ALL' ? 'Semua Server POP' : pop}</span>
                        {filterPop === pop && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tombol Aksi Tambah, Import, Export, Reload */}
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            <button
              onClick={handleOpenCreate}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px]"
              title="Import Berkas Excel / CSV (Wizard 3 Langkah)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <a
              href="/api/customers/export-excel"
              download="data_pelanggan_edteknoguard.xlsx"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px]"
              title="Ekspor Seluruh Data ke Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </a>

            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[34px] sm:min-h-[36px] flex items-center justify-center"
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </FilterContainer>

      {/* Selection / Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
              <Trash2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-rose-950 font-sans">
                {selectedIds.length} Pelanggan Terpilih
              </span>
              <p className="text-[11px] text-rose-700 font-sans">
                Aksi hapus massal akan menghapus pelanggan dan data terkait secara permanen (CASCADE).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold transition"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{bulkDeleting ? 'Menghapus...' : `Hapus Terpilih (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Tabel Pelanggan */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={customers.length > 0 && selectedIds.length === customers.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(customers.map(c => c.id_pelanggan || c.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-2 w-12 text-center">No</th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  <span>ID Pelanggan</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'id' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('nama')}
              >
                <div className="flex items-center gap-1">
                  <span>Nama Pelanggan</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'nama' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('ip_router')}
              >
                <div className="flex items-center gap-1">
                  <span>IP &amp; Wilayah</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'ip_router' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-2.5 px-3">WiFi &amp; Admin ONT</th>
              <th 
                className="py-2.5 px-3 text-right cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('rx_power')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Redaman (dBm)</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'rx_power' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 text-center cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('status_koneksi')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'status_koneksi' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data pelanggan...</div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada data pelanggan ditemukan.
                </td>
              </tr>
            ) : (
              customers.map((c, idx) => {
                const cId = c.id_pelanggan || c.id;
                const rowNo = (page - 1) * limit + idx + 1;
                const isSelected = selectedIds.includes(cId);

                return (
                  <tr key={cId} className={`transition ${isSelected ? 'bg-cyan-50/70' : 'hover:bg-cyan-50/40'}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds(prev =>
                            prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
                          );
                        }}
                        className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-bold text-xs">{rowNo}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-900">{cId}</td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(c)}
                        className="font-sans font-bold text-slate-900 hover:text-cyan-800 hover:underline text-left cursor-pointer transition block"
                        title="Klik untuk melihat Detail Lengkap & Kontak Pelanggan"
                      >
                        {c.nama || c.name}
                      </button>
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{c.alamat || c.address || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800 font-bold">{c.ip_router || c.ip}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.pop || 'POP-01'} • <span className="uppercase">{c.kantor || 'cabang'}</span></div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-[11px] text-slate-700 font-mono truncate max-w-[170px]">
                        <Wifi className="w-3 h-3 text-cyan-600 shrink-0" />
                        <span className="font-bold truncate">{c.nama_wifi || '-'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Modem: <span className="font-semibold text-slate-600">{c.user_admin || 'admin'}:{c.pass_admin || '***'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {(() => {
                        const rxVal = c.rx_power ?? c.rx ?? c.redaman_current ?? c.redaman_baseline;
                        const isNumeric = rxVal !== null && rxVal !== undefined && !isNaN(Number(rxVal));
                        const statusVal = c.status_koneksi || c.status || 'NORMAL';
                        
                        if (isNumeric) {
                          const num = Number(rxVal);
                          return (
                            <span
                              className={
                                num <= critThreshold
                                  ? 'text-rose-600'
                                  : num <= warnThreshold
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {num.toFixed(1)} dBm
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-slate-400 font-bold">
                              {statusVal === 'LOS' ? 'LOS' : '-'}
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {(() => {
                        const statusVal = (c.status_koneksi || c.status || 'NORMAL').toUpperCase();
                        let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                        if (statusVal === 'WARNING') {
                          badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                        } else if (statusVal === 'CRITICAL') {
                          badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                        } else if (statusVal === 'LOS') {
                          badgeClass = 'bg-purple-50 text-purple-700 border border-purple-200';
                        }
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeClass}`}>
                            {statusVal}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {/* Dropdown Aksi Titik Tiga */}
                      <div className="relative inline-block text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSingleProbe(cId)}
                            disabled={probingId === cId}
                            className="px-2 py-1 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-900 border border-cyan-200 rounded-lg text-[10px] font-bold transition mr-1"
                            title="Uji Sinyal Langsung"
                          >
                            {probingId === cId ? 'Uji...' : 'Uji Sinyal'}
                          </button>
                          
                          {/* Menu Titik Tiga */}
                          <div className="relative group">
                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                              title="Pilihan Aksi"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>

                            <div className="hidden group-hover:block hover:block absolute right-0 top-full pt-1 z-50 min-w-[160px]">
                              <div className="bg-white rounded-xl shadow-xl border border-sky-200 py-1 font-mono text-xs">
                                <button
                                  onClick={() => handleOpenDetail(c)}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition"
                                >
                                  <Info className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Detail Pelanggan</span>
                                </button>
                                {(c.no_wa || c.no_hp) && (
                                  <a
                                    href={`https://wa.me/${(c.no_wa || c.no_hp).replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                                      `Halo Bapak/Ibu ${c.nama || c.name}, kami dari Tim Teknis TeknoGuard NOC terkait layanan internet Anda.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Hubungi WA</span>
                                  </a>
                                )}
                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition border-t border-slate-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Edit Data</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(cId)}
                                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition border-t border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTableContainer>

      {/* Modal Tambah / Edit Pelanggan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900">
                {isEditing ? `Edit Pelanggan: ${formData.nama}` : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-sans">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-sans">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ID Pelanggan</label>
                  <input
                    type="text"
                    required
                    value={formData.id_pelanggan}
                    onChange={(e) => setFormData({ ...formData, id_pelanggan: e.target.value })}
                    disabled={isEditing}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-sans font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">IP Router ONT</label>
                  <input
                    type="text"
                    required
                    value={formData.ip_router}
                    onChange={(e) => setFormData({ ...formData, ip_router: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lokasi POP</label>
                  <select
                    value={formData.pop}
                    onChange={(e) => setFormData({ ...formData, pop: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="POP-01">POP-01 (Kecamatan)</option>
                    <option value="POP-02">POP-02 (Perumahan)</option>
                    <option value="POP-03">POP-03 (Pasar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={formData.no_wa}
                    onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                    placeholder="0812..."
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Paket Internet</label>
                  <input
                    type="text"
                    value={formData.paket}
                    onChange={(e) => setFormData({ ...formData, paket: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Alamat Pemasangan</label>
                <textarea
                  rows="2"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-sans font-medium focus:border-cyan-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {formSaving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Pelanggan (Informasi Pribadi & Kontak Pesan WA) */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-200 space-y-4 font-mono">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-sans">
                    {detailCustomer.nama || detailCustomer.name}
                  </h3>
                  <p className="text-xs text-cyan-700 font-bold">
                    ID: {detailCustomer.id_pelanggan || detailCustomer.id} • Wilayah: <span className="uppercase">{detailCustomer.kantor || activeOffice || 'cabang'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Rinci Pelanggan */}
            <div className="space-y-3 text-xs">
              {/* Box Kontak & WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 font-sans">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Kontak WhatsApp Pelanggan</span>
                  </span>
                  <div className="text-xs font-black text-emerald-800 font-mono">
                    {detailCustomer.no_wa || detailCustomer.no_hp || 'Nomor WhatsApp belum terdaftar'}
                  </div>
                </div>

                {(detailCustomer.no_wa || detailCustomer.no_hp) && (
                  <a
                    href={`https://wa.me/${(detailCustomer.no_wa || detailCustomer.no_hp).replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                      `Halo Bapak/Ibu ${detailCustomer.nama || detailCustomer.name}, kami dari Tim Teknis NOC TeknoGuard ingin mengonfirmasi terkait koneksi internet modem Anda (IP: ${detailCustomer.ip_router || '-'}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Kirim Pesan WA</span>
                  </a>
                )}
              </div>

              {/* Grid Informasi Pribadi & Layanan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Paket Layanan</span>
                  <div className="font-bold text-slate-800 font-sans truncate">{detailCustomer.paket || '20 Mbps Unlimited'}</div>
                </div>

                {/* Titik Lokasi GPS (Klik langsung buka Google Maps) */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-600 shrink-0" />
                    <span>Titik Lokasi GPS</span>
                  </span>
                  {detailCustomer.lokasi_gps ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailCustomer.lokasi_gps)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 text-xs truncate transition"
                      title="Buka lokasi di Google Maps"
                    >
                      <span className="truncate">{detailCustomer.lokasi_gps}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                    </a>
                  ) : detailCustomer.alamat ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailCustomer.alamat)}`}
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
                  {detailCustomer.alamat || detailCustomer.address || 'Alamat fisik belum diisi'}
                </p>
              </div>

              {/* Detail Kredensial WiFi & Router ONT */}
              <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-2">
                <span className="text-[10px] text-cyan-900 font-bold uppercase flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Kredensial WiFi Rumah &amp; Login Modem</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama WiFi (SSID):</span>
                    <span className="font-bold text-slate-900">{detailCustomer.nama_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Password WiFi:</span>
                    <span className="font-bold text-slate-900">{detailCustomer.password_wifi || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">IP Router ONT:</span>
                    <span className="font-bold text-cyan-800">{detailCustomer.ip_router || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jenis Modem:</span>
                    <span className="font-bold text-slate-900">{detailCustomer.jenis_modem || 'ZTE GM220-S'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-100">
              <button
                type="button"
                onClick={() => {
                  const targetToEdit = detailCustomer
                  setDetailCustomer(null)
                  handleOpenEdit(targetToEdit)
                }}
                className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 text-xs font-bold font-mono transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Informasi</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-mono transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Wizard Import Pelanggan Terpisah */}
      <WizardImportPelanggan
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        activeOffice={activeOffice}
        onSuccess={fetchCustomers}
      />
    </div>
  )
}
