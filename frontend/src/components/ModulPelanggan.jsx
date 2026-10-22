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
  ShieldAlert,
  MoreVertical,
  ExternalLink
} from 'lucide-react'
import {
  ModuleHeader,
  MetricCard,
  SegmentedStatusBar,
  FilterContainer,
  DataTableContainer
} from './CommonUI'
import { WizardImportPelanggan } from './WizardImportPelanggan'
import { ModalDetailPelanggan } from './ModalDetailPelanggan'

export function ModulPelanggan({
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
  const [availableCredentials, setAvailableCredentials] = useState([])
  const [updatingCredId, setUpdatingCredId] = useState(null)

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
          setDetailCustomer(json.customer)
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
          if (json.available_credentials && Array.isArray(json.available_credentials)) {
            setAvailableCredentials(json.available_credentials)
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

  // Ubah kredensial modem manual dari dropdown (Ambil dari DB Settings) & langsung pemicu uji coba (Opsi A)
  const handleChangeCredential = async (c, selectedCombo) => {
    if (!selectedCombo) return
    const [u, p] = selectedCombo.split(':::')
    const cId = c.id_pelanggan || c.id
    if (!u || !p) return
    if (c.user_admin === u && c.pass_admin === p) return

    setUpdatingCredId(cId)
    try {
      // 1. Simpan perubahan kredensial ke database pelanggan via PUT /api/customers/{id}
      const res = await fetch(`/api/customers/${encodeURIComponent(cId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_admin: u,
          pass_admin: p
        })
      })

      if (res.ok) {
        showToast(`Kredensial ${c.nama} diubah ke ${u}:${p}. Memulai uji coba live...`, 'info')
        // Optimistic update di tabel lokal
        setCustomers(prev => prev.map(item => {
          if ((item.id_pelanggan || item.id) === cId) {
            return { ...item, user_admin: u, pass_admin: p }
          }
          return item
        }))
        // 2. Langsung picu live test probe (Opsi A)
        await handleProbeCustomer(cId)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.detail || 'Gagal menyimpan kredensial ke database', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan saat memperbarui kredensial', 'error')
    } finally {
      setUpdatingCredId(null)
    }
  }

  // MikroTik sync & isolir action states
  const [mikrotikSyncing, setMikrotikSyncing] = useState(false)
  const [isolirLoadingId, setIsolirLoadingId] = useState(null)

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
        const addedText = json.added_customers ? `\n• ${json.added_customers} Pelanggan Baru ditambahkan` : ''
        const updatedText = json.updated_customers ? `\n• ${json.updated_customers} Pelanggan diperbarui statusnya` : ''
        const quotaText = `\n• ${json.total_synced || 0} Data Kuota & Traffic disinkronkan`
        setTimeout(() => {
          alert(`Sinkronisasi MikroTik Selesai!${addedText}${updatedText}${quotaText}`)
        }, 100)
      } else {
        setMikrotikSyncing(false)
        const errJson = await res.json().catch(() => ({}))
        alert(errJson.detail || 'Gagal sinkronisasi dengan router MikroTik.')
      }
    } catch (err) {
      console.error('MikroTik sync error:', err)
      alert('Terjadi kesalahan koneksi ke server saat sinkronisasi MikroTik.')
    } finally {
      setMikrotikSyncing(false)
    }
  }

  // Toggle isolir pelanggan on-demand (Firewall Address List)
  const handleToggleIsolir = async (c) => {
    const cId = c.id_pelanggan || c.id
    const currentIsolir = Boolean(c.status_isolir)
    const newStatus = !currentIsolir

    const actionText = newStatus ? 'MENGISOLIR (Memutus Akses Internet)' : 'MEMBUKA ISOLIR (Memulihkan Akses Internet)'
    const confirmed = window.confirm(
      `Konfirmasi Aksi MikroTik:\nApakah Anda yakin ingin ${actionText} untuk pelanggan:\n"${c.nama}" (ID: ${cId})?`
    )
    if (!confirmed) return

    setIsolirLoadingId(cId)
    try {
      const res = await fetch('/api/mikrotik/toggle-isolir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pelanggan: cId,
          isolir: newStatus
        })
      })

      if (res.ok) {
        await fetchCustomers()
      } else {
        const errJson = await res.json().catch(() => ({}))
        alert(errJson.detail || 'Gagal mengubah status isolir pelanggan di MikroTik.')
      }
    } catch (err) {
      console.error('Toggle isolir error:', err)
      alert('Terjadi kesalahan koneksi ke router MikroTik.')
    } finally {
      setIsolirLoadingId(null)
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
            subLabel: `> ${warnThreshold !== undefined ? Number(warnThreshold).toFixed(1) : '-26.0'} dBm`
          },
          {
            label: 'Waspada',
            value: stats.warning || 0,
            colorScheme: 'amber',
            isActive: filterStatus === 'WARNING',
            onClick: () => setFilterStatus('WARNING'),
            subLabel: `≤ ${warnThreshold !== undefined ? Number(warnThreshold).toFixed(1) : '-26.0'} dBm`
          },
          {
            label: 'Kritis',
            value: stats.critical || 0,
            colorScheme: 'rose',
            isActive: filterStatus === 'CRITICAL',
            onClick: () => setFilterStatus('CRITICAL'),
            subLabel: `≤ ${critThreshold !== undefined ? Number(critThreshold).toFixed(1) : '-27.0'} dBm`
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
      <div className="relative z-30">
        <FilterContainer>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Kotak Pencarian */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari ID, Nama, IP..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-sky-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[34px] sm:min-h-[36px]"
                />
              </div>
            </div>

            {/* Tombol Aksi Lengkapi Data, Ekspor, Reload */}
            <div className="flex items-center gap-1.5 justify-end shrink-0">
              <button
                onClick={handleSyncMikrotik}
                disabled={mikrotikSyncing || !isOfficeActive}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px] ${
                  !isOfficeActive
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 cursor-pointer'
                }`}
                title={!isOfficeActive ? 'Kantor dalam status nonaktif. Sinkronisasi MikroTik dimatikan.' : 'Sinkronisasi Kuota & Traffic Real-Time dari Router MikroTik'}
              >
                <Activity className={`w-3.5 h-3.5 ${!isOfficeActive ? 'text-slate-400' : 'text-indigo-600'} ${mikrotikSyncing ? 'animate-spin' : ''}`} />
                <span>{mikrotikSyncing ? 'Syncing...' : !isOfficeActive ? 'Sync Mati' : 'Sync MikroTik'}</span>
              </button>

              <button
                onClick={() => setImportModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs min-h-[34px] sm:min-h-[36px] cursor-pointer"
                title="Lengkapi Data Pelanggan (No. WA, Alamat, Kredensial WiFi)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-200" />
                <span>Lengkapi Data</span>
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
                className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[34px] sm:min-h-[36px] flex items-center justify-center cursor-pointer"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </FilterContainer>
      </div>

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
      <DataTableContainer
        page={page}
        totalPages={Math.max(1, Math.ceil(totalRecords / limit))}
        totalCount={totalRecords}
        onPrevPage={() => setPage(p => Math.max(1, p - 1))}
        onNextPage={() => setPage(p => Math.min(Math.max(1, Math.ceil(totalRecords / limit)), p + 1))}
        loading={loading}
      >
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
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
                className={`py-2.5 px-3 cursor-pointer select-none transition w-32 ${sortField === 'id' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  <span>ID Pelanggan</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'id' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {sortField === 'id' && (
                    <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th 
                className={`py-2.5 px-3 cursor-pointer select-none transition ${sortField === 'nama' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={() => handleSort('nama')}
              >
                <div className="flex items-center gap-1">
                  <span>Nama Pelanggan</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'nama' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {sortField === 'nama' && (
                    <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th 
                className={`py-2.5 px-3 cursor-pointer select-none transition w-36 ${['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={handleSortIpRouter}
                title="Klik untuk ganti urutan: 1. Router -> 2. ONT -> 3. Modem -> Normal (-)"
              >
                <div className="flex items-center gap-1">
                  <span>
                    {sortField === 'ip_router' ? 'IP Router' : sortField === 'ip_ont' ? 'IP ONT' : sortField === 'jenis_modem' ? 'Modem' : 'IP & Router'}
                  </span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {['ip_router', 'ip_ont', 'jenis_modem'].includes(sortField) && (
                    <span className="text-[10px] text-cyan-800 font-black">▲</span>
                  )}
                </div>
              </th>
              <th 
                className={`py-2.5 px-3 cursor-pointer select-none transition w-44 ${sortField === 'status_kredensial' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={() => handleSort('status_kredensial')}
              >
                <div className="flex items-center gap-1">
                  <span>WiFi &amp; Admin ONT</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status_kredensial' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {sortField === 'status_kredensial' && (
                    <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th 
                className={`py-2.5 px-3 text-right cursor-pointer select-none transition w-32 ${sortField === 'rx_power' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={() => handleSort('rx_power')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Redaman (dBm)</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'rx_power' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {sortField === 'rx_power' && (
                    <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th 
                className={`py-2.5 px-3 text-center cursor-pointer select-none transition w-28 ${sortField === 'status_koneksi' ? 'bg-cyan-100/90 text-cyan-950 font-black' : 'hover:bg-cyan-100/60'}`}
                onClick={() => handleSort('status_koneksi')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'status_koneksi' ? 'text-cyan-800 font-bold' : 'text-slate-400'}`} />
                  {sortField === 'status_koneksi' && (
                    <span className="text-[10px] text-cyan-800 font-black">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data pelanggan...</div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-10 text-slate-400 font-mono">
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
                      <div className="text-xs text-slate-600 font-sans truncate max-w-xs">{c.alamat || c.address || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        {c.ip_ont && (
                          <div className="text-slate-900 font-bold font-mono text-[11px] flex items-center gap-1.5">
                            <span className="text-[9px] text-cyan-800 bg-cyan-100/80 px-1 py-0.2 rounded font-black tracking-tight uppercase">ONT</span>
                            <span>{c.ip_ont}</span>
                          </div>
                        )}
                        {(c.ip_router && c.ip_router !== c.ip_ont) && (
                          <div className="text-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-black tracking-tight uppercase">Router</span>
                            <span>{c.ip_router}</span>
                          </div>
                        )}
                        {(!c.ip_ont && !c.ip_router) && (
                          <div className="text-slate-400 font-mono text-[11px] italic">-</div>
                        )}
                        <div className="flex items-center gap-1 pt-0.5">
                          {c.jenis_modem ? (
                            <span className="text-[9px] font-black uppercase tracking-tight bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.2 rounded font-mono">
                              {c.jenis_modem}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                              -
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono truncate max-w-[170px]">
                        <Wifi className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                        <span className="font-bold truncate">{c.nama_wifi || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
                        {/* Dropdown Kredensial Interaktif dari Database Settings */}
                        {(() => {
                          const currentCombo = `${c.user_admin || 'admin'}:::${c.pass_admin || ''}`;
                          // Gabungkan kredensial aktif pelanggan dengan semua kredensial default dari DB Settings
                          const allOptions = [];
                          if (c.user_admin && c.pass_admin) {
                            allOptions.push({ username: c.user_admin, password: c.pass_admin });
                          }
                          (availableCredentials || []).forEach(opt => {
                            if (opt.username && !allOptions.some(x => x.username === opt.username && x.password === opt.password)) {
                              allOptions.push(opt);
                            }
                          });

                          const isUpdating = updatingCredId === (c.id_pelanggan || c.id) || probingId === (c.id_pelanggan || c.id);

                          return (
                            <div className="relative inline-flex items-center">
                              <select
                                value={currentCombo}
                                disabled={isUpdating}
                                onChange={(e) => handleChangeCredential(c, e.target.value)}
                                className={`text-[11px] font-mono font-bold py-0.5 pl-1.5 pr-5 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[155px] truncate appearance-none ${
                                  isUpdating
                                    ? 'bg-slate-100 text-slate-400 border-slate-300 animate-pulse'
                                    : 'bg-white hover:bg-cyan-50/60 text-slate-800 border-sky-200'
                                }`}
                                title="Pilih kredensial dari Database Settings untuk langsung diuji coba"
                              >
                                {allOptions.map((opt, oIdx) => {
                                  const valKey = `${opt.username}:::${opt.password}`;
                                  return (
                                    <option key={oIdx} value={valKey} className="font-mono text-xs">
                                      {opt.username}:{opt.password}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <ArrowUpDown className="w-2.5 h-2.5" />
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const kStatus = (c.status_kredensial || '').toUpperCase();
                          if (kStatus === 'VALID') {
                            return (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0" title="Kredensial modem terverifikasi cocok">
                                VALID
                              </span>
                            );
                          }
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight bg-rose-100 text-rose-800 border border-rose-300 shrink-0" title="Kredensial modem ditolak / salah password">
                              INVALID
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {(() => {
                        const rxVal = c.rx_power ?? c.rx ?? c.redaman_current ?? c.redaman_baseline;
                        const isNumeric = rxVal !== null && rxVal !== undefined && !isNaN(Number(rxVal));
                        const rawStatus = (c.status_koneksi || c.status || 'NORMAL').toUpperCase();
                        
                        let statusBadge = 'NORMAL';
                        let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';

                        if (rawStatus === 'UNTESTED' || rawStatus === 'LOCKOUT' || (!isNumeric && rawStatus !== 'LOS')) {
                          statusBadge = 'UNTESTED';
                          badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                        } else if (rawStatus === 'LOS' || !isNumeric) {
                          statusBadge = 'LOS';
                          badgeClass = 'bg-purple-50 text-purple-800 border-purple-300';
                        } else {
                          const num = Number(rxVal);
                          if (num <= critThreshold || rawStatus === 'CRITICAL') {
                            statusBadge = 'CRITICAL';
                            badgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
                          } else if (num <= warnThreshold || rawStatus === 'WARNING') {
                            statusBadge = 'WARNING';
                            badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
                          } else {
                            statusBadge = 'NORMAL';
                            badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                          }
                        }

                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`font-black font-mono ${
                                statusBadge === 'UNTESTED'
                                  ? 'text-slate-400'
                                  : statusBadge === 'CRITICAL'
                                  ? 'text-rose-600'
                                  : statusBadge === 'WARNING'
                                  ? 'text-amber-600'
                                  : statusBadge === 'LOS'
                                  ? 'text-purple-700'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {statusBadge === 'UNTESTED' ? '-' : isNumeric ? `${Number(rxVal).toFixed(1)} dBm` : 'LOS'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeClass}`}>
                              {statusBadge === 'UNTESTED' ? 'BELUM CEK' : statusBadge}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {(() => {
                        const isOnline = (c.status_lease === 'bound') && (c.status_koneksi !== 'OFFLINE') && (c.status !== 'OFFLINE') && Boolean(c.is_monitored !== false);
                        if (isOnline) {
                          return (
                            <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 tracking-wider">
                              ONLINE
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-300 tracking-wider">
                            OFFLINE
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {(() => {
                          const isOnline = (c.status_lease === 'bound') && (c.status_koneksi !== 'OFFLINE') && (c.status !== 'OFFLINE') && Boolean(c.is_monitored !== false);
                          const cooldown = probeCooldowns[cId] || 0
                          const isProbing = probingId === cId
                          const isDisabled = isProbing || cooldown > 0 || !isOfficeActive || !isOnline

                          return (
                            <button
                              onClick={() => handleSingleProbe(cId)}
                              disabled={isDisabled}
                              className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold transition shadow-2xs ${
                                !isOfficeActive
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                  : !isOnline
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                  : cooldown > 0
                                  ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed font-mono'
                                  : isProbing
                                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300 cursor-wait'
                                  : 'bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 border-cyan-200 cursor-pointer'
                              }`}
                              title={
                                !isOfficeActive
                                  ? 'Kantor nonaktif. Aktifkan kantor untuk menguji sinyal ONT.'
                                  : !isOnline
                                  ? 'Perangkat sedang Offline (DHCP/PPPoE tidak aktif). Cek redaman tidak tersedia.'
                                  : cooldown > 0
                                  ? `Tunggu jeda cooldown (${cooldown} detik) sebelum memeriksa ulang redaman ONT`
                                  : 'Cek Sinyal Redaman ONT Langsung'
                              }
                            >
                              {isProbing ? 'Mengecek...' : !isOfficeActive ? 'Nonaktif' : !isOnline ? 'Offline' : cooldown > 0 ? `Tunggu (${cooldown}s)` : 'Cek Redaman'}
                            </button>
                          )
                        })()}

                        {/* Menu Titik Tiga (Aksi Popover) */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuId(activeMenuId === cId ? null : cId)
                            }}
                            className={`p-1.5 rounded-lg border transition ${
                              activeMenuId === cId
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title="Menu Aksi Pelanggan"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuId === cId && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveMenuId(null)
                                }}
                              />
                              <div
                                className={`absolute right-0 z-50 w-44 bg-white rounded-xl shadow-xl border border-sky-200 py-1.5 font-sans text-xs divide-y divide-slate-100 ${
                                  idx >= Math.max(0, customers.length - 3)
                                    ? 'bottom-full mb-1.5'
                                    : 'top-full mt-1.5'
                                }`}
                              >
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveMenuId(null)
                                      handleOpenDetail(c)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 font-bold flex items-center gap-2 transition"
                                  >
                                    <Info className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>Detail Pelanggan</span>
                                  </button>

                                  {c.no_wa && c.no_wa !== '-' && (
                                    <a
                                      href={`https://wa.me/${c.no_wa.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setActiveMenuId(null)}
                                      className="w-full text-left px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-2 transition"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Hubungi WA</span>
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveMenuId(null)
                                      handleToggleIsolir(c)
                                    }}
                                    className={`w-full text-left px-3 py-1.5 font-bold flex items-center gap-2 transition ${
                                      c.status_isolir
                                        ? 'text-emerald-700 hover:bg-emerald-50'
                                        : 'text-amber-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>{c.status_isolir ? 'Buka Isolir' : 'Isolir Akses'}</span>
                                  </button>
                                </div>

                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveMenuId(null)
                                      handleOpenEdit(c, c)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-100 font-bold flex items-center gap-2 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit Data</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveMenuId(null)
                                      handleDeleteCustomer(cId)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Hapus Data</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
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

      {/* Modal Edit Pelanggan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
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
      <ModalDetailPelanggan
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        activeOffice={activeOffice}
        onOpenEdit={(targetToEdit) => {
          setDetailCustomer(null)
          handleOpenEdit(targetToEdit, targetToEdit)
        }}
        onToggleIsolir={handleToggleIsolir}
        isolirLoadingId={isolirLoadingId}
      />

      {/* Component Wizard Import Pelanggan Terpisah */}
      <WizardImportPelanggan
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        activeOffice={activeOffice}
        onSuccess={fetchCustomers}
      />
      {/* Floating Toast Notification (Pojok Kanan Bawah) */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-start gap-2.5 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/50'
                : toast.type === 'warning'
                ? 'bg-amber-900/95 text-amber-100 border-amber-500/50'
                : toast.type === 'info'
                ? 'bg-cyan-900/95 text-cyan-100 border-cyan-500/50'
                : 'bg-rose-900/95 text-rose-100 border-rose-500/50'
            }`}
          >
            <div className="flex-1 text-xs font-sans leading-relaxed">
              <div className="font-bold mb-0.5">
                {toast.type === 'success'
                  ? 'Pemeriksaan Berhasil'
                  : toast.type === 'warning'
                  ? 'Perhatian / Terkunci'
                  : toast.type === 'info'
                  ? 'Informasi'
                  : 'Gagal / Kesalahan'}
              </div>
              <div>{toast.message}</div>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-white/60 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
