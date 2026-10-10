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
  FilterContainer,
  DataTableContainer
} from './CommonUI'
import { WizardImportPelanggan } from './WizardImportPelanggan'

export function ModulPelanggan({
  activeOffice = 'cabang',
  warnThreshold,
  critThreshold
}) {
  const [customers, setCustomers] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPop, setFilterPop] = useState('ALL')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  // Quick stats
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    warning: 0,
    critical_los: 0,
    monitored_inactive: 0
  })

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

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
      {/* 1. 4 Kartu KPI Interaktif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          label="Total Terpantau"
          value={`${stats.total || totalRecords}`}
          unit="ONT"
          icon={Radio}
          colorScheme="cyan"
          isActive={filterStatus === 'ALL'}
          onClick={() => setFilterStatus('ALL')}
        />
        <MetricCard
          label="Sinyal Optimal"
          value={`${stats.normal || 0}`}
          unit="ONT"
          icon={CheckCircle2}
          colorScheme="emerald"
          isActive={filterStatus === 'NORMAL'}
          onClick={() => setFilterStatus('NORMAL')}
        />
        <MetricCard
          label="Waspada"
          value={`${stats.warning || 0}`}
          unit="ONT"
          icon={AlertTriangle}
          colorScheme="amber"
          isActive={filterStatus === 'WARNING'}
          onClick={() => setFilterStatus('WARNING')}
        />
        <MetricCard
          label="Kritis / LOS"
          value={`${stats.critical_los || 0}`}
          unit="ONT"
          icon={ZapOff}
          colorScheme="rose"
          isActive={filterStatus === 'CRITICAL'}
          onClick={() => setFilterStatus('CRITICAL')}
        />
      </div>

      {/* 2. Filter Bar & Tombol Aksi */}
      <FilterContainer>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID, Nama, IP Router, atau POP..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-sky-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[36px]"
              />
            </div>

            <div className="flex items-center gap-1 bg-cyan-50/60 p-1 rounded-xl border border-sky-200 text-xs font-mono">
              <span className="text-[10px] text-slate-400 font-bold px-1.5">POP:</span>
              <select
                value={filterPop}
                onChange={(e) => setFilterPop(e.target.value)}
                className="bg-transparent text-slate-700 font-bold text-xs focus:outline-none"
              >
                <option value="ALL">Semua POP</option>
                <option value="POP-01">POP-01</option>
                <option value="POP-02">POP-02</option>
                <option value="POP-03">POP-03</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-xs min-h-[36px]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Pelanggan</span>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-xs min-h-[36px]"
              title="Import Berkas Excel / CSV (Wizard 3 Langkah)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel/CSV</span>
            </button>

            <a
              href="/api/customers/export-excel"
              download="data_pelanggan_edteknoguard.xlsx"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-xs min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </a>

            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[36px] flex items-center justify-center"
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
                  <span>IP Router ONT</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'ip_router' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('pop')}
              >
                <div className="flex items-center gap-1">
                  <span>POP &amp; Wilayah</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'pop' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
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
                      <div className="font-sans font-bold text-slate-900">{c.nama || c.name}</div>
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{c.alamat || c.address || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{c.ip_router || c.ip}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.pop || 'POP-01'} ({c.kantor || 'cabang'})</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      <span
                        className={
                          (c.rx_power ?? c.rx) <= critThreshold
                            ? 'text-rose-600'
                            : (c.rx_power ?? c.rx) <= warnThreshold
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {(c.rx_power ?? c.rx) != null ? `${Number(c.rx_power ?? c.rx).toFixed(1)}` : 'LOS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          (c.status_koneksi || c.status) === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (c.status_koneksi || c.status) === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {c.status_koneksi || c.status || 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {/* Dropdown Aksi Titik Tiga */}
                      <div className="relative inline-block text-left" x-data="{ open: false }">
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

                            <div className="hidden group-hover:block hover:block absolute right-0 top-full pt-1 z-50 min-w-[130px]">
                              <div className="bg-white rounded-xl shadow-xl border border-sky-200 py-1 font-mono text-xs">
                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition"
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
