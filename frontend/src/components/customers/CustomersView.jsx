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
  Check,
  Activity,
  MoreVertical,
  ExternalLink
} from 'lucide-react'
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar
} from '../common/CommonUI'
import { CustomersFilterBar } from './CustomersFilterBar'
import { CustomersTable } from './CustomersTable'
import { CustomerImportWizard } from './CustomerImportWizard'
import { CustomerDetailModal } from './CustomerDetailModal'
import { ConfirmDialogModal } from '../common/ConfirmDialogModal'
import { ToastNotification } from '../common/ToastNotification'

export function CustomersView({
  activeOffice = 'cabang',
  isOfficeActive = true,
  warnThreshold,
  critThreshold,
  initialSearch = '',
  onClearInitialSearch,
  initialStatus = 'ALL',
  onClearInitialStatus
}) {
  const [customers, setCustomers] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [filterStatus, setFilterStatus] = useState(initialStatus || 'ALL')
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
    invalid: 0,
    monitored_inactive: 0
  })

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Modal Detail State (Informasi Pribadi & Kontak WA)
  const [detailCustomer, setDetailCustomer] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [returnToDetailCustomer, setReturnToDetailCustomer] = useState(null)

  // Modal Edit Pelanggan State
  const [modalOpen, setModalOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [formData, setFormData] = useState({
    id_pelanggan: '',
    nama: '',
    ip_router: '',
    kantor: '',
    paket: '',
    jenis_modem: '',
    user_admin: '',
    pass_admin: '',
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

  // Floating Toast Notification (Pojok Kanan Bawah)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  // Persistent Cooldown via localStorage: { [id_pelanggan]: expiryTimestampMillis }
  const [probeCooldowns, setProbeCooldowns] = useState(() => {
    try {
      const saved = localStorage.getItem('tekno_probe_cooldowns')
      if (saved) {
        const parsed = JSON.parse(saved)
        const now = Date.now()
        const active = {}
        Object.keys(parsed).forEach(id => {
          const remainingSecs = Math.ceil((parsed[id] - now) / 1000)
          if (remainingSecs > 0) {
            active[id] = remainingSecs
          }
        })
        return active
      }
    } catch (e) {
      // Ignore parse error
    }
    return {}
  })

  // Cooldown countdown timer ticker (Real-time & Persisten)
  useEffect(() => {
    const hasActiveCooldown = Object.values(probeCooldowns).some(secs => secs > 0)
    if (!hasActiveCooldown) return

    const timer = setInterval(() => {
      const now = Date.now()
      let rawObj = {}
      try {
        rawObj = JSON.parse(localStorage.getItem('tekno_probe_cooldowns') || '{}')
      } catch (e) {}

      setProbeCooldowns(prev => {
        const next = {}
        let changed = false
        const nextStorage = { ...rawObj }

        Object.keys(prev).forEach(id => {
          const expiry = nextStorage[id] || (now + prev[id] * 1000)
          const remaining = Math.ceil((expiry - now) / 1000)
          if (remaining > 0) {
            next[id] = remaining
            nextStorage[id] = expiry
            if (remaining !== prev[id]) changed = true
          } else {
            delete nextStorage[id]
            changed = true
          }
        })

        if (changed) {
          try {
            localStorage.setItem('tekno_probe_cooldowns', JSON.stringify(nextStorage))
          } catch (e) {}
        }

        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [probeCooldowns])

  const [popOptions, setPopOptions] = useState([])
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch || '')

  // Debounce search input agar tidak memicu query beruntun dan halaman tidak glitch
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sync initialSearch if prop changes
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch)
      setDebouncedSearch(initialSearch)
      setPage(1)
    }
  }, [initialSearch])

  // Sync initialStatus if prop changes
  useEffect(() => {
    if (initialStatus !== undefined && initialStatus !== null) {
      setFilterStatus(initialStatus)
      setPage(1)
    }
  }, [initialStatus])

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
          setDetailCustomer((prev) => ({
            ...prev,
            ...json.customer,
            suhu_ont: json.customer.suhu_ont ?? prev?.suhu_ont,
            latency_ms: json.customer.latency_ms ?? prev?.latency_ms,
            rx_power: json.customer.rx_power ?? prev?.rx_power ?? prev?.rx,
            status_koneksi: json.customer.status_koneksi ?? prev?.status_koneksi ?? prev?.status,
          }))
        }
      }
    } catch (err) {
      console.warn('Gagal memuat detail mendalam, gunakan data lokal:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Toggle sorting khusus kolom IP & Router (Siklus: Router -> ONT -> Modem -> Reset ID -> Router)
  const handleSortIpRouter = () => {
    if (sortField === 'ip_router') {
      setSortField('ip_ont')
      setSortDir('asc')
    } else if (sortField === 'ip_ont') {
      setSortField('jenis_modem')
      setSortDir('asc')
    } else if (sortField === 'jenis_modem') {
      setSortField('id')
      setSortDir('asc')
    } else {
      setSortField('ip_router')
      setSortDir('asc')
    }
    setPage(1)
  }

  // Toggle sorting standar untuk kolom lain
  const handleSort = (field) => {
    if (field === 'ip_router' || field === 'ip_ont' || field === 'jenis_modem') {
      handleSortIpRouter()
      return
    }
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  // Fetch Customers From FastAPI Backend (/api/customers)
  const fetchCustomers = async () => {
    setLoading(true)
    try {
      let url = `/api/customers?page=${page}&limit=${limit}&sort_by=${sortField}&sort_dir=${sortDir}`
      if (activeOffice && activeOffice !== 'all') url += `&kantor=${encodeURIComponent(activeOffice)}`
      if (debouncedSearch && debouncedSearch.trim()) url += `&q=${encodeURIComponent(debouncedSearch.trim())}`
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`
      if (filterPop !== 'ALL') url += `&pop=${encodeURIComponent(filterPop)}`

      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setCustomers(json.data)
          setTotalRecords(json.total || json.data.length)
          if (json.stats) setStats(json.stats)
          if (json.pops && Array.isArray(json.pops) && json.pops.length > 0) {
            setPopOptions(json.pops)
          }
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
  }, [page, limit, filterStatus, filterPop, activeOffice, sortField, sortDir, debouncedSearch])

  // State Modal Konfirmasi Kustom
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Batal',
    variant: 'danger',
    onConfirm: () => {},
    isLoading: false,
    loadingText: 'Memproses...'
  })

  // Bulk Delete Selected Customers
  const handleBulkDelete = () => {
    if (selectedIds.length === 0 || bulkDeleting) return

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Massal Data Pelanggan?',
      message: (
        <div className="space-y-2">
          <p>
            Apakah Anda yakin ingin menghapus{' '}
            <strong className="text-slate-900">{selectedIds.length} data pelanggan terpilih</strong>?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
            <p className="font-bold">?? PERINGATAN CASCADE DATABASE:</p>
            <p>Seluruh relasi data anak (log performa, riwayat redaman, tiket kendala, dan rekaman kuota) akan dihapus secara fisik dan permanen.</p>
          </div>
        </div>
      ),
      confirmText: `Ya, Hapus ${selectedIds.length} Pelanggan`,
      variant: 'danger',
      isLoading: false,
      loadingText: 'Menghapus massal...',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }))
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
            showToast(`Berhasil menghapus ${selectedIds.length} data pelanggan beserta seluruh riwayatnya.`, 'success')
          } else {
            const errJson = await res.json().catch(() => ({}))
            showToast(errJson.detail || 'Gagal menghapus data terpilih.', 'error')
          }
        } catch (err) {
          console.error('Error bulk delete customers:', err)
          showToast('Terjadi kesalahan koneksi saat menghapus massal.', 'error')
        } finally {
          setBulkDeleting(false)
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  // Single on-demand ONT probe
  const handleSingleProbe = async (id_pelanggan) => {
    if (probeCooldowns[id_pelanggan] > 0) return
    setProbingId(id_pelanggan)
    try {
      const res = await fetch(`/api/monitoring/scan/${id_pelanggan}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProbeResult(data)

        const custName = data.nama || id_pelanggan
        const rxVal = data.rx_power
        const rxStr = (rxVal !== null && rxVal !== undefined) ? `${Number(rxVal).toFixed(1)} dBm` : (data.status_koneksi || 'LOS')
        const isSuccess = Boolean(data.success && data.rx_power !== null)
        const isLockout = data.error_type === 'LOCKOUT'
        const isAuthFailed = data.error_type === 'AUTH_FAILED' || data.status_kredensial === 'INVALID'

        if (isSuccess) {
          showToast(`Cek Redaman Berhasil! ${custName}: ${rxStr} (Status: ${data.status_koneksi || 'NORMAL'})`, 'success')
          // Jika sukses dan kredensial valid, TIDAK DIKUNCI COOLDOWN
          setProbeCooldowns(prev => {
            const next = { ...prev }
            delete next[id_pelanggan]
            try {
              const raw = JSON.parse(localStorage.getItem('tekno_probe_cooldowns') || '{}')
              delete raw[id_pelanggan]
              localStorage.setItem('tekno_probe_cooldowns', JSON.stringify(raw))
            } catch (e) {}
            return next
          })
          // Perbarui langsung baris pelanggan di tabel (termasuk kredensial baru jika otomatis diganti)
          setCustomers(prev => prev.map(c => {
            if (c.id_pelanggan === id_pelanggan) {
              return {
                ...c,
                user_admin: data.user_admin || c.user_admin,
                pass_admin: data.pass_admin || c.pass_admin,
                status_kredensial: data.status_kredensial || 'VALID',
                rx_power: data.rx_power,
                status_koneksi: data.status_koneksi,
                jenis_modem: data.jenis_modem || c.jenis_modem,
                nama_wifi: data.nama_wifi || c.nama_wifi,
                password_wifi: data.password_wifi || c.password_wifi
              }
            }
            return c
          }))
        } else if (isLockout) {
          const waitSecs = Number(data.lockout_remaining_seconds) || 60
          showToast(`Modem ${custName} terkunci keamanan ONT (${waitSecs}s). Harap tunggu jeda sebelum mencoba lagi.`, 'warning')
          
          // Perbarui status koneksi pelanggan di tabel menjadi LOCKOUT
          setCustomers(prev => prev.map(c => {
            if (c.id_pelanggan === id_pelanggan) {
              return {
                ...c,
                status_koneksi: 'LOCKOUT'
              }
            }
            return c
          }))

          // Simpan cooldown ke state & localStorage
          const expiry = Date.now() + (waitSecs * 1000)
          setProbeCooldowns(prev => ({ ...prev, [id_pelanggan]: waitSecs }))
          try {
            const raw = JSON.parse(localStorage.getItem('tekno_probe_cooldowns') || '{}')
            raw[id_pelanggan] = expiry
            localStorage.setItem('tekno_probe_cooldowns', JSON.stringify(raw))
          } catch (e) {}
        } else if (isAuthFailed) {
          showToast(`Login Gagal ke modem ${custName}. Seluruh kredensial default telah dicoba dan tidak ada yang cocok.`, 'error')
          // Hapus cooldown paksa agar tombol tetap bertuliskan 'Cek Redaman' dan siap dicoba lagi
          setProbeCooldowns(prev => {
            const next = { ...prev }
            delete next[id_pelanggan]
            try {
              const raw = JSON.parse(localStorage.getItem('tekno_probe_cooldowns') || '{}')
              delete raw[id_pelanggan]
              localStorage.setItem('tekno_probe_cooldowns', JSON.stringify(raw))
            } catch (e) {}
            return next
          })
        } else {
          showToast(`Pemeriksaan selesai: ${data.keterangan || data.message || 'Data diperbarui'}`, 'info')
        }

        fetchCustomers()
      } else {
        const errJson = await res.json().catch(() => ({}))
        showToast(errJson.detail || 'Gagal menghubungi server untuk cek redaman', 'error')
      }
    } catch (err) {
      console.error('Probe failed:', err)
      showToast('Koneksi terputus saat memeriksa modem ONT', 'error')
    } finally {
      setProbingId(null)
    }
  }



  const [mikrotikSyncing, setMikrotikSyncing] = useState(false)

  // Trigger manual sync kuota Simple Queues MikroTik ke database
  const handleSyncMikrotik = async () => {
    setMikrotikSyncing(true)
    try {
      const res = await fetch('/api/mikrotik/sync-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kantor: activeOffice || 'cabang' })
      })
      if (res.ok) {
        const json = await res.json()
        setMikrotikSyncing(false)
        await fetchCustomers()
        const addedPart = json.added_customers ? ` (${json.added_customers} Baru)` : ''
        const quotaPart = ` ${json.total_synced || 0} Kuota & Traffic tersinkronkan.`
        showToast(`Sinkronisasi MikroTik Berhasil!${addedPart}${quotaPart}`, 'success')
      } else {
        setMikrotikSyncing(false)
        const errJson = await res.json().catch(() => ({}))
        showToast(errJson.detail || 'Gagal sinkronisasi dengan router MikroTik.', 'error')
      }
    } catch (err) {
      console.error('MikroTik sync error:', err)
      showToast('Terjadi kesalahan koneksi ke server saat sinkronisasi MikroTik.', 'error')
    } finally {
      setMikrotikSyncing(false)
    }
  }


  // Open Modal Edit Pelanggan
  const handleOpenEdit = (customer, fromDetail = null) => {
    setReturnToDetailCustomer(fromDetail || customer)
    setFormData({
      id_pelanggan: customer.id_pelanggan || customer.id || '',
      nama: customer.nama || customer.name || '',
      ip_router: customer.ip_router || customer.ip || '',
      kantor: customer.kantor || activeOffice || '',
      paket: customer.paket || '',
      jenis_modem: customer.jenis_modem || '',
      user_admin: customer.user_admin && customer.user_admin !== '-' ? customer.user_admin : '',
      pass_admin: customer.pass_admin && customer.pass_admin !== '-' ? customer.pass_admin : '',
      nama_wifi: customer.nama_wifi && customer.nama_wifi !== '-' ? customer.nama_wifi : '',
      password_wifi: customer.password_wifi && customer.password_wifi !== '-' ? customer.password_wifi : '',
      no_wa: customer.no_wa && customer.no_wa !== '-' ? customer.no_wa : (customer.no_hp && customer.no_hp !== '-' ? customer.no_hp : ''),
      alamat: customer.alamat && customer.alamat !== '-' ? customer.alamat : (customer.address && customer.address !== '-' ? customer.address : ''),
      is_monitored: customer.is_monitored !== undefined ? customer.is_monitored : true
    })
    setFormError('')
    setFormSuccess('')
    setModalOpen(true)
  }

  // Save Customer Update
  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    setFormSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      const payload = {
        ...formData,
        no_hp: formData.no_wa
      }

      const res = await fetch(`/api/customers/${formData.id_pelanggan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setFormSuccess('Data pelanggan berhasil diperbarui!')
        setTimeout(() => {
          setModalOpen(false)
          fetchCustomers()
        }, 1000)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setFormError(errJson.detail || 'Gagal menyimpan data pelanggan.')
      }
    } catch (err) {
      console.error('Update customer error:', err)
      setFormError('Terjadi kesalahan koneksi saat memperbarui data pelanggan.')
    } finally {
      setFormSaving(false)
    }
  }

  // Delete Single Customer
  const handleDeleteCustomer = (id_pelanggan) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Pelanggan?',
      message: (
        <div className="space-y-2">
          <p>
            Yakin ingin menghapus pelanggan <strong className="text-slate-900">{id_pelanggan}</strong>?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <strong>?? CASCADE DELETE:</strong> Seluruh riwayat log redaman, tiket gangguan, dan data kuota pelanggan ini akan dibersihkan permanen dari database.
          </div>
        </div>
      ),
      confirmText: 'Ya, Hapus Pelanggan',
      variant: 'danger',
      isLoading: false,
      loadingText: 'Menghapus...',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }))
        try {
          const res = await fetch(`/api/customers/${id_pelanggan}`, { method: 'DELETE' })
          if (res.ok) {
            fetchCustomers()
            showToast(`Data pelanggan ${id_pelanggan} berhasil dihapus.`, 'success')
          } else {
            const errJson = await res.json().catch(() => ({}))
            showToast(errJson.detail || 'Gagal menghapus pelanggan.', 'error')
          }
        } catch (err) {
          console.error('Delete failed:', err)
          showToast('Koneksi terputus saat menghapus pelanggan.', 'error')
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
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
            subLabel: `> ${warnThreshold !== undefined ? Number(warnThreshold).toFixed(1) : '-26.0'} dBm`
          },
          {
            label: 'Waspada',
            value: stats.warning || 0,
            colorScheme: 'amber',
            isActive: filterStatus === 'WARNING',
            onClick: () => setFilterStatus('WARNING'),
            subLabel: `= ${warnThreshold !== undefined ? Number(warnThreshold).toFixed(1) : '-26.0'} dBm`
          },
          {
            label: 'Kritis',
            value: stats.critical || 0,
            colorScheme: 'rose',
            isActive: filterStatus === 'CRITICAL',
            onClick: () => setFilterStatus('CRITICAL'),
            subLabel: `= ${critThreshold !== undefined ? Number(critThreshold).toFixed(1) : '-27.0'} dBm`
          },
          {
            label: 'LOS',
            value: stats.los || 0,
            colorScheme: 'purple',
            isActive: filterStatus === 'LOS',
            onClick: () => setFilterStatus('LOS'),
            subLabel: 'Putus'
          },
          {
            label: 'Invalid',
            value: stats.invalid || 0,
            colorScheme: 'orange',
            isActive: filterStatus === 'INVALID',
            onClick: () => setFilterStatus('INVALID'),
            subLabel: 'Kredensial'
          }
        ]}
      />

      {/* 2. Filter Bar & Tombol Aksi Ringkas */}
      <CustomersFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setPage={setPage}
        handleSyncMikrotik={handleSyncMikrotik}
        mikrotikSyncing={mikrotikSyncing}
        isOfficeActive={isOfficeActive}
        setImportModalOpen={setImportModalOpen}
        activeOffice={activeOffice}
        fetchCustomers={fetchCustomers}
        loading={loading}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        handleBulkDelete={handleBulkDelete}
        bulkDeleting={bulkDeleting}
      />

      {/* 3. Tabel Pelanggan */}
      <CustomersTable
        customers={customers}
        loading={loading}
        page={page}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        totalRecords={totalRecords}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        sortField={sortField}
        sortDir={sortDir}
        handleSort={handleSort}
        handleSortIpRouter={handleSortIpRouter}
        probingId={probingId}
        probeCooldowns={probeCooldowns}
        handleSingleProbe={handleSingleProbe}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        handleOpenDetail={handleOpenDetail}
        handleOpenEdit={handleOpenEdit}
        handleDeleteCustomer={handleDeleteCustomer}
        isOfficeActive={isOfficeActive}
        warnThreshold={warnThreshold}
        critThreshold={critThreshold}
      />

      {/* Modal Edit Pelanggan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <div className="flex items-center gap-2">
                {returnToDetailCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      setDetailCustomer(returnToDetailCustomer)
                    }}
                    className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 text-slate-600 transition flex items-center gap-1 text-[11px] font-bold"
                    title="Kembali ke Detail Pelanggan"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Detail</span>
                  </button>
                )}
                <h3 className="text-sm font-black text-slate-900">
                  Edit Pelanggan: {formData.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  if (returnToDetailCustomer) {
                    setDetailCustomer(returnToDetailCustomer)
                  }
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                title="Tutup Modal"
              >
                ?
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
              {/* Baris 1: ID Pelanggan (Locked) & Nama Lengkap (Editable) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>ID Pelanggan</span>
                    <span className="text-[9px] text-slate-400 font-normal">Terkunci (Auto)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id_pelanggan}
                    readOnly
                    disabled
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-500 text-xs font-bold cursor-not-allowed select-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-sans font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Baris 2: IP Perangkat (Locked) & Paket Internet (Locked) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>IP Router / ONT</span>
                    <span className="text-[9px] text-slate-400 font-normal">Sinkron MikroTik</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ip_router || '-'}
                    readOnly
                    disabled
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-500 text-xs font-bold cursor-not-allowed select-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>Paket Internet</span>
                    <span className="text-[9px] text-slate-400 font-normal">Simple Queue</span>
                  </label>
                  <input
                    type="text"
                    value={formData.paket || '-'}
                    readOnly
                    disabled
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-500 text-xs font-bold cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Baris 3: Nomor WhatsApp (Editable) & Wilayah Kantor (Informasi) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={formData.no_wa}
                    onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                    placeholder="0812..."
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Wilayah Kantor</label>
                  <div className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 text-xs font-black uppercase tracking-wider select-none">
                    {formData.kantor || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nama WiFi (SSID)</label>
                  <input
                    type="text"
                    value={formData.nama_wifi}
                    onChange={(e) => setFormData({ ...formData, nama_wifi: e.target.value })}
                    placeholder="Contoh: WiFi_Rumah"
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Password WiFi</label>
                  <input
                    type="text"
                    value={formData.password_wifi}
                    onChange={(e) => setFormData({ ...formData, password_wifi: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">User Admin Modem (HTTP/S)</label>
                  <input
                    type="text"
                    value={formData.user_admin}
                    onChange={(e) => setFormData({ ...formData, user_admin: e.target.value })}
                    placeholder="Contoh: admin"
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Password Admin Modem</label>
                  <input
                    type="text"
                    value={formData.pass_admin}
                    onChange={(e) => setFormData({ ...formData, pass_admin: e.target.value })}
                    placeholder="Contoh: tekno2024"
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none font-mono"
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
                  onClick={() => {
                    setModalOpen(false)
                    if (returnToDetailCustomer) {
                      setDetailCustomer(returnToDetailCustomer)
                    }
                  }}
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

      {/* Modal Detail Pelanggan (Komponen Terpisah 2-Tab: Profil & Jaringan) */}
      <CustomerDetailModal
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        activeOffice={activeOffice}
        onOpenEdit={(targetToEdit) => {
          setDetailCustomer(null)
          handleOpenEdit(targetToEdit, targetToEdit)
        }}
      />

      {/* Component Wizard Import Pelanggan Terpisah */}
      <CustomerImportWizard
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        activeOffice={activeOffice}
        onSuccess={fetchCustomers}
        onNotify={showToast}
      />
      {/* Floating Toast Notification (Pojok Kanan Bawah) */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      {/* Modal Konfirmasi Kustom */}
      <ConfirmDialogModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          if (!confirmModal.isLoading) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
          }
        }}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
        loadingText={confirmModal.loadingText}
      />
    </div>
  )
}
