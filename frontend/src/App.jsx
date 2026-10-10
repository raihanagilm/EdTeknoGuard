import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Radio,
  Building2,
  Bell,
  MoreVertical,
  LogOut,
  Settings
} from 'lucide-react'

// Import Komponen Modular Berbahasa Indonesia (OOP & MVC Standard)
import { Sidebar, MobileNav } from './components/Navigation'
import { ModulBeranda } from './components/ModulBeranda'
import { ModulPengaturan } from './components/ModulPengaturan'
import { ModulPelanggan } from './components/ModulPelanggan'
import { ModulRiwayatRedaman } from './components/ModulRiwayatRedaman'
import { ModulTiketKeluhan } from './components/ModulTiketKeluhan'
import { ModulPemantauanKuota } from './components/ModulPemantauanKuota'
import { ModulLogAktivitas } from './components/ModulLogAktivitas'
import { ModulManajemenPengguna } from './components/ModulManajemenPengguna'
import { ErrorView } from './components/ErrorView'
import { ConfirmSaveModal, OntDetailModal } from './components/Modals'
import { PortalPelangganApp } from './portal/PortalPelangganApp'

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [loginUsername, setLoginUsername] = useState('admin')
  const [loginPassword, setLoginPassword] = useState('agiltampan')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Navigation & Office Scope State (SOP Multi-Kantor Cabang)
  const [activeTab, setActiveTab] = useState('beranda')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [activeOffice, setActiveOffice] = useState(() => {
    return localStorage.getItem('edtekno_active_office') || 'cabang'
  })
  const [kantorList, setKantorList] = useState([
    { kode: 'pusat', nama: 'Pusat' },
    { kode: 'cabang', nama: 'Cabang' },
    { kode: 'banyumas', nama: 'Banyumas' }
  ])
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    username: 'admin',
    nama_lengkap: 'Administrator NOC',
    role: 'super admin',
    allowed_kantor: 'all'
  })
  const [unreadTickets, setUnreadTickets] = useState(0)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef(null)

  const handleNavigateCustomer = (namaOrId) => {
    setCustomerSearchQuery(namaOrId || '')
    handleTabChange('pelanggan')
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setHeaderMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchOffice = (officeKey) => {
    setActiveOffice(officeKey)
    localStorage.setItem('edtekno_active_office', officeKey)
    document.cookie = `active_kantor=${officeKey}; path=/; max-age=2592000; samesite=lax`
  }

  // Fetch daftar kantor dinamis
  const fetchKantorList = async () => {
    try {
      const res = await fetch('/users/api/kantor/list')
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'success' && data.kantors && data.kantors.length > 0) {
          setKantorList(data.kantors)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch kantor list:', e)
    }
  }

  useEffect(() => {
    fetchKantorList()
    const handleKantorUpdate = () => fetchKantorList()
    window.addEventListener('edtekno_kantor_updated', handleKantorUpdate)
    return () => window.removeEventListener('edtekno_kantor_updated', handleKantorUpdate)
  }, [])

  // Telemetry Scanner & Realtime Clock State
  const [isScanningActive, setIsScanningActive] = useState(true)
  const [scanPercent, setScanPercent] = useState(78)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOnt, setSelectedOnt] = useState(null)
  const [currentTime, setCurrentTime] = useState('10:25:00 WIB')
  const canvasRef = useRef(null)

  // Master ONT Data
  const ontData = [
    { id: 'CUST-0891', name: 'Bpk. Hendro Prayogo', ip: '10.10.12.45', pop: 'POP-01 (Kecamatan)', rx: -19.4, tx: 2.1, temp: 42, status: 'NORMAL', phone: '0812-3456-7890', address: 'Jl. Merak No. 14, RT 02/03' },
    { id: 'CUST-0412', name: 'Ibu Hj. Siti Aminah', ip: '10.10.14.88', pop: 'POP-02 (Perumahan)', rx: -26.3, tx: 1.8, temp: 45, status: 'WARNING', phone: '0857-9821-4321', address: 'Perum Griya Indah Blok C-9' },
    { id: 'CUST-0103', name: 'CV Mitra Abadi Jaya', ip: '10.10.10.12', pop: 'POP-01 (Kecamatan)', rx: -27.8, tx: 1.2, temp: 49, status: 'CRITICAL', phone: '0813-9000-1122', address: 'Ruko Sentra Bisnis No. 03' },
    { id: 'CUST-0554', name: 'Warkop Nusantara & WiFi', ip: '10.10.18.90', pop: 'POP-03 (Pasar)', rx: -21.1, tx: 2.3, temp: 40, status: 'NORMAL', phone: '0821-4567-8899', address: 'Kios Pasar No. 12 Sisi Barat' },
    { id: 'CUST-0782', name: 'Klinik Sehat Medika 24 Jam', ip: '10.10.15.34', pop: 'POP-02 (Perumahan)', rx: null, tx: 0, temp: 0, status: 'CRITICAL', phone: '0811-2233-4455', address: 'Jl. Ahmad Yani No. 88' },
    { id: 'CUST-0919', name: 'Bpk. Ahmad Fadillah', ip: '10.10.19.12', pop: 'POP-01 (Kecamatan)', rx: -20.2, tx: 2.2, temp: 41, status: 'NORMAL', phone: '0878-1122-3344', address: 'Dusun Krajan RT 01/01' }
  ]

  // Default selected ONT for split gauge view
  const [activeGaugeOnt, setActiveGaugeOnt] = useState(ontData[0])

  // =========================================================================
  // STATE PENGATURAN SISTEM (3 TAB RESMI LENGKAP)
  // =========================================================================
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState('thresholds') // 'thresholds' | 'credentials' | 'notifications' | 'account'
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false)
  const [settingsSaveError, setSettingsSaveError] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Form Values Pengaturan (Terkoneksi Backend /api/settings)
  const [pollingInterval, setPollingInterval] = useState(5)
  const [warnThreshold, setWarnThreshold] = useState(-26.0)
  const [critThreshold, setCritThreshold] = useState(-27.0)
  const [appVibration, setAppVibration] = useState(true)
  const [alertWaitingInterval, setAlertWaitingInterval] = useState(5)
  const [nightModeEnabled, setNightModeEnabled] = useState(false)
  const [nightModeStart, setNightModeStart] = useState('22:00')
  const [nightModeEnd, setNightModeEnd] = useState('06:00')
  
  // Tab 2 Kredensial Modem ONT Repeater & Drag Drop State
  const [modemCredentials, setModemCredentials] = useState([
    { username: 'admin', password: 'tekno2024' },
    { username: 'admin', password: 'admin' },
    { username: 'tekno', password: 'tekno2025' }
  ])
  const [applyToInvalid, setApplyToInvalid] = useState(false)
  const [showModemPasswords, setShowModemPasswords] = useState({})
  const [draggedCredIdx, setDraggedCredIdx] = useState(null)
  const [dragOverCredIdx, setDragOverCredIdx] = useState(null)

  // Fetch Settings From Backend FastAPI (Thresholds & Credentials)
  const fetchBackendSettings = async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.polling_interval_minutes) setPollingInterval(data.polling_interval_minutes)
        if (data.warning_threshold_dbm !== undefined) setWarnThreshold(data.warning_threshold_dbm)
        if (data.critical_threshold_dbm !== undefined) setCritThreshold(data.critical_threshold_dbm)
        if (data.app_vibration_enabled !== undefined) setAppVibration(data.app_vibration_enabled)
        if (data.alert_waiting_interval_minutes) setAlertWaitingInterval(data.alert_waiting_interval_minutes)
        if (data.telegram_night_mode_enabled !== undefined) setNightModeEnabled(data.telegram_night_mode_enabled)
        if (data.telegram_night_mode_start) setNightModeStart(data.telegram_night_mode_start)
        if (data.telegram_night_mode_end) setNightModeEnd(data.telegram_night_mode_end)
        if (data.default_modem_credentials && Array.isArray(data.default_modem_credentials) && data.default_modem_credentials.length > 0) {
          setModemCredentials(data.default_modem_credentials)
        }
      }
    } catch (err) {
      console.warn('Backend offline / using simulated state:', err)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Live Monitoring State from Backend
  const [liveKpi, setLiveKpi] = useState({
    total_monitored: 0,
    normal: 0,
    warning: 0,
    critical: 0,
    los: 0,
    target_kantor: 'cabang'
  })
  const [liveScanProgress, setLiveScanProgress] = useState(0)

  const fetchLiveDashboardData = async () => {
    try {
      const [statusRes, kpiRes, custRes, meRes, notifRes] = await Promise.all([
        fetch('/api/monitoring/status').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/monitoring/kpi').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/customers?limit=10').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/notifications/poll').then(r => r.ok ? r.json() : null).catch(() => null)
      ])

      if (statusRes) {
        setIsScanningActive(statusRes.status === 'RUNNING' || statusRes.is_scanning)
        if (statusRes.scan_progress) {
          setLiveScanProgress(statusRes.scan_progress.percent || 0)
        }
      }

      if (kpiRes) {
        setLiveKpi(kpiRes)
      }

      if (meRes && meRes.authenticated && meRes.user) {
        setIsAuthenticated(true)
        setCurrentUser(meRes.user)
      }

      if (notifRes && typeof notifRes.unread_tickets_count === 'number') {
        setUnreadTickets(notifRes.unread_tickets_count)
      }
    } catch (e) {
      console.warn('Live monitoring poll failed:', e)
    }
  }

  useEffect(() => {
    fetchLiveDashboardData()
    const interval = setInterval(fetchLiveDashboardData, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (currentUser && currentUser.role !== 'teknisi') {
      fetchBackendSettings()
    }
  }, [currentUser?.role])

  // Save Settings To Backend FastAPI
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault()
    
    // Validasi kredensial tidak boleh kosong
    for (let i = 0; i < modemCredentials.length; i++) {
      if (!modemCredentials[i].username.trim() || !modemCredentials[i].password.trim()) {
        setSettingsSaveError(`Kredensial baris #${i + 1} belum lengkap (username dan password wajib diisi)!`)
        setSettingsActiveSubTab('credentials')
        return
      }
    }

    setConfirmModalOpen(false)
    setSettingsLoading(true)
    setSettingsSaveSuccess(false)
    setSettingsSaveError('')

    const validCredentials = (modemCredentials || [])
      .filter(c => c && c.username && c.password)
      .map(c => ({ username: String(c.username).trim(), password: String(c.password).trim() }))

    const payload = {
      polling_interval_minutes: isNaN(parseInt(pollingInterval, 10)) ? 5 : parseInt(pollingInterval, 10),
      warning_threshold_dbm: isNaN(parseFloat(warnThreshold)) ? -26.0 : parseFloat(warnThreshold),
      critical_threshold_dbm: isNaN(parseFloat(critThreshold)) ? -27.0 : parseFloat(critThreshold),
      scheduler_status: isScanningActive ? 'RUNNING' : 'STOPPED',
      default_modem_user: validCredentials[0]?.username || 'admin',
      default_modem_pass: validCredentials[0]?.password || 'tekno2024',
      default_modem_credentials: validCredentials.length > 0 ? validCredentials : [{ username: 'admin', password: 'tekno2024' }],
      apply_to_invalid_customers: Boolean(applyToInvalid),
      telegram_alert_interval_hours: 1.0,
      telegram_night_mode_enabled: Boolean(nightModeEnabled),
      telegram_night_mode_start: nightModeStart || '22:00',
      telegram_night_mode_end: nightModeEnd || '06:00',
      app_vibration_enabled: Boolean(appVibration),
      alert_waiting_interval_minutes: isNaN(parseInt(alertWaitingInterval, 10)) ? 5 : parseInt(alertWaitingInterval, 10)
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setSettingsSaveSuccess(true)
        setTimeout(() => setSettingsSaveSuccess(false), 4000)
      } else {
        const errJson = await res.json().catch(() => ({}))
        let errMsg = 'Gagal menyimpan konfigurasi ke database server.'
        if (typeof errJson?.detail === 'string') {
          errMsg = errJson.detail
        } else if (Array.isArray(errJson?.detail)) {
          errMsg = errJson.detail
            .map(item => (item?.msg ? `${item?.loc?.slice(1).join('.') || ''}: ${item.msg}` : JSON.stringify(item)))
            .join(', ')
        } else if (typeof errJson?.message === 'string') {
          errMsg = errJson.message
        }
        setSettingsSaveError(errMsg)
      }
    } catch (err) {
      // Fallback simulated success
      setSettingsSaveSuccess(true)
      setTimeout(() => setSettingsSaveSuccess(false), 4000)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Helper Repeater Kredensial Modem
  const addModemCredentialRow = () => {
    setModemCredentials([...modemCredentials, { username: '', password: '' }])
  }

  const removeModemCredentialRow = (idx) => {
    if (modemCredentials.length <= 1) return
    const updated = modemCredentials.filter((_, i) => i !== idx)
    setModemCredentials(updated)
  }

  const updateModemCredentialRow = (idx, field, val) => {
    const updated = [...modemCredentials]
    updated[idx][field] = val
    setModemCredentials(updated)
  }

  const toggleModemPasswordVisibility = (idx) => {
    setShowModemPasswords(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Reorder & Drag Drop Handlers
  const handleCredDragStart = (e, idx) => {
    setDraggedCredIdx(idx)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
    }
  }

  const handleCredDragOver = (e, idx) => {
    e.preventDefault()
    setDragOverCredIdx(idx)
  }

  const handleCredDrop = (e, targetIdx) => {
    e.preventDefault()
    if (draggedCredIdx === null || draggedCredIdx === targetIdx) {
      setDraggedCredIdx(null)
      setDragOverCredIdx(null)
      return
    }
    const updated = [...modemCredentials]
    const item = updated.splice(draggedCredIdx, 1)[0]
    updated.splice(targetIdx, 0, item)
    setModemCredentials(updated)
    setDraggedCredIdx(null)
    setDragOverCredIdx(null)
  }

  const handleCredDragEnd = () => {
    setDraggedCredIdx(null)
    setDragOverCredIdx(null)
  }

  // Realtime Clock simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date()
      const timeStr = d.toTimeString().split(' ')[0] + ' WIB'
      setCurrentTime(timeStr)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Scanner Progress Simulation
  useEffect(() => {
    if (!isScanningActive) return
    const interval = setInterval(() => {
      setScanPercent((prev) => {
        if (prev >= 100) return 0
        return prev + 2
      })
    }, 1200)
    return () => clearInterval(interval)
  }, [isScanningActive])

  // Canvas Optical Waveform Drawing (Frost Cyan Theme)
  useEffect(() => {
    if (activeTab !== 'beranda' || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    ctx.clearRect(0, 0, w, h)

    const pL = 38, pR = 16, pT = 16, pB = 28
    const plotW = w - pL - pR
    const plotH = h - pT - pB

    // Y thresholds: min -30, max -15
    const valToY = (v) => pT + ((v - (-15)) / (-30 - (-15))) * plotH
    const warnY = valToY(warnThreshold || -26.0)
    const critY = valToY(critThreshold || -27.0)

    // Grid lines & labels
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)'
    ctx.lineWidth = 1
    const ySteps = [-15, -20, -25, -30]
    ctx.fillStyle = '#64748b'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    ySteps.forEach((val) => {
      const y = valToY(val)
      ctx.beginPath()
      ctx.moveTo(pL, y)
      ctx.lineTo(w - pR, y)
      ctx.stroke()
      ctx.fillText(`${val}`, pL - 6, y)
    })

    // SOP Danger Zone Rect (-27 to -30)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)'
    ctx.fillRect(pL, critY, plotW, valToY(-30) - critY)

    // Warning Line
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pL, warnY)
    ctx.lineTo(w - pR, warnY)
    ctx.stroke()

    // Critical Line
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pL, critY)
    ctx.lineTo(w - pR, critY)
    ctx.stroke()
    ctx.setLineDash([])

    // Data points & Time X Axis
    const points = [-20.1, -19.8, -21.4, -20.9, -22.1, -26.2, -27.4, -23.1, -21.0, -19.9, -20.4, -21.3]
    const times = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
    const stepX = plotW / (points.length - 1)

    // Gradient Fill
    const grad = ctx.createLinearGradient(0, pT, 0, h - pB)
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)')
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)')

    // Draw Smooth Curve
    ctx.beginPath()
    points.forEach((val, i) => {
      const x = pL + i * stepX
      const y = valToY(val)
      if (i === 0) ctx.moveTo(x, y)
      else {
        const prevX = pL + (i - 1) * stepX
        const prevY = valToY(points[i - 1])
        const cX = (prevX + x) / 2
        ctx.bezierCurveTo(cX, prevY, cX, y, x, y)
      }
    })
    ctx.lineTo(pL + (points.length - 1) * stepX, h - pB)
    ctx.lineTo(pL, h - pB)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Draw Stroke Line
    ctx.beginPath()
    points.forEach((val, i) => {
      const x = pL + i * stepX
      const y = valToY(val)
      if (i === 0) ctx.moveTo(x, y)
      else {
        const prevX = pL + (i - 1) * stepX
        const prevY = valToY(points[i - 1])
        const cX = (prevX + x) / 2
        ctx.bezierCurveTo(cX, prevY, cX, y, x, y)
      }
    })
    ctx.strokeStyle = '#0891b2'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Draw Point Dots
    points.forEach((val, i) => {
      const x = pL + i * stepX
      const y = valToY(val)
      ctx.beginPath()
      ctx.arc(x, y, val <= critThreshold ? 4.5 : 3.5, 0, Math.PI * 2)
      ctx.fillStyle = val <= critThreshold ? '#ef4444' : val <= warnThreshold ? '#f59e0b' : '#0891b2'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    // X Time labels
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'center'
    const xLabelStep = plotW / (times.length - 1)
    times.forEach((t, i) => {
      ctx.fillText(t, pL + i * xLabelStep, h - 8)
    })
  }, [activeTab, warnThreshold, critThreshold])

  // Filtered ONT List
  const filteredOnt = ontData.filter((item) => {
    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchSearch =
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.ip.includes(q) ||
      item.pop.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // Gauge Speedometer Angle Mapping (-15 to -30 dBm -> -90 to +90 deg)
  const getGaugeRotation = (rx) => {
    if (rx === null || rx === undefined) return 90
    const clamped = Math.max(-30, Math.min(-15, rx))
    const ratio = (clamped - (-15)) / (-30 - (-15))
    return -90 + ratio * 180
  }

  // Handle Real Backend Login Authentication
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.ok) {
        setIsAuthenticated(true)
        if (data.user) setCurrentUser(data.user)
        localStorage.setItem('edtekno_auth_status', 'logged_in')
      } else {
        setLoginError(data.message || 'Kombinasi Pengguna atau Kata Sandi NOC tidak valid.')
      }
    } catch (err) {
      setLoginError('Gagal terhubung ke server backend FastAPI.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Handle Real Backend Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.warn('Logout API error:', e)
    } finally {
      setIsAuthenticated(false)
      localStorage.removeItem('edtekno_auth_status')
      document.cookie = "edteknoguard_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      window.history.pushState({}, '', '/login')
    }
  }

  // URL Path to Module Tab Mapping Helper
  const getTabFromPath = (path) => {
    const clean = path.replace(/^\/+|\/+$/g, '').toLowerCase()
    if (
      clean === 'portal' ||
      clean.startsWith('portal/') ||
      clean === 'teknocust' ||
      clean.startsWith('teknocust/')
    ) {
      return 'portal'
    }
    if (!clean || clean === 'teknoguard' || clean === 'dashboard' || clean === 'beranda') return 'beranda'
    if (clean === 'login') return 'login'
    if (clean === 'logs' || clean === 'riwayat') return 'riwayat'
    if (clean === 'kuota' || clean === 'admin/kuota') return 'kuota'
    if (clean === 'pelanggan') return 'pelanggan'
    if (clean === 'tiket' || clean === 'admin/tiket') return 'tiket'
    if (clean === 'log' || clean === 'activity-logs') return 'log'
    if (clean === 'pengguna' || clean === 'users') return 'pengguna'
    if (clean === 'pengaturan' || clean === 'settings') return 'pengaturan'
    return '404_not_found'
  }

  // Path to URL path string mapper
  const getPathFromTab = (tab) => {
    switch (tab) {
      case 'beranda': return '/'
      case 'portal': return '/portal'
      case 'riwayat': return '/logs'
      case 'kuota': return '/admin/kuota'
      case 'pelanggan': return '/pelanggan'
      case 'tiket': return '/admin/tiket'
      case 'log': return '/activity-logs'
      case 'pengguna': return '/users'
      case 'pengaturan': return '/settings'
      default: return `/${tab}`
    }
  }

  // Handle Tab Switch with URL PushState
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    const newPath = getPathFromTab(newTab)
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath)
    }
  }

  // Check backend session & sync browser URL on initial load and popstate
  useEffect(() => {
    const isPortalRoute =
      window.location.pathname.startsWith('/portal') ||
      window.location.pathname.startsWith('/teknocust')

    const syncFromLocation = () => {
      const initialTab = getTabFromPath(window.location.pathname)
      setActiveTab(initialTab)
    }

    // Jika sedang di rute /portal atau /teknocust, jangan redirect ke /login admin NOC
    if (isPortalRoute) {
      syncFromLocation()
      const handlePopState = () => syncFromLocation()
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }

    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/check')
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true)
          if (data.user) setCurrentUser(data.user)
          localStorage.setItem('edtekno_auth_status', 'logged_in')
          syncFromLocation()
        } else {
          setIsAuthenticated(false)
          localStorage.removeItem('edtekno_auth_status')
          if (
            window.location.pathname !== '/login' &&
            !window.location.pathname.startsWith('/portal') &&
            !window.location.pathname.startsWith('/teknocust')
          ) {
            window.history.pushState({}, '', '/login')
          }
        }
      } catch (err) {
        setIsAuthenticated(false)
        localStorage.removeItem('edtekno_auth_status')
      }
    }

    checkAuthStatus()

    const handlePopState = () => {
      syncFromLocation()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // =========================================================================
  // VIEW A: PORTAL PELANGGAN MANDIRI (TeknoCust)
  // =========================================================================
  if (
    activeTab === 'portal' ||
    window.location.pathname.startsWith('/portal') ||
    window.location.pathname.startsWith('/teknocust')
  ) {
    return <PortalPelangganApp />
  }

  // =========================================================================
  // VIEW B: HALAMAN LOGIN NOC
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 sm:p-6 text-slate-900 font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-xl space-y-6">
            
            {/* Header Login */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/25">
                <Radio className="w-7 h-7 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Tekno<span className="text-cyan-600">Guard</span> NOC
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistem Deteksi Dini &amp; Pemantauan Redaman Optik Terpadu
              </p>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form Login */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-700 block">Nama Pengguna (Username)</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition min-h-[40px] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Kata Sandi (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition min-h-[40px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 active:scale-[0.99] transition min-h-[42px]"
              >
                {loginLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Buka Panel Kendali</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-600 font-mono">
              Akun Bawaan: <strong className="text-cyan-800">admin</strong> / <strong className="text-cyan-800">agiltampan</strong>
            </div>
          </div>
        </div>

        <div className="py-4 text-center text-[11px] text-slate-500 font-mono">
          &copy; 2026 TeknoGuard NOC &bull; Sistem Monitoring Redaman Jaringan Fiber Optik
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW C: HALAMAN 404 / MODUL TIDAK DITEMUKAN (FULL PAGE BERSIH TANPA SIDEBAR/HEADER)
  // =========================================================================
  const validModules = ['beranda', 'riwayat', 'kuota', 'pelanggan', 'tiket', 'log', 'pengguna', 'pengaturan']
  if (!validModules.includes(activeTab)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 sm:p-6 text-slate-900 font-sans">
        <div className="flex-1 flex items-center justify-center">
          <ErrorView
            errorCode={404}
            title="Halaman Modul Tidak Ditemukan"
            description={`Rute URL "${window.location.pathname}" tidak terdaftar di sistem TeknoGuard NOC. Silakan periksa kembali tautan yang Anda masukkan.`}
            primaryActionLabel={isAuthenticated ? "Beranda" : "Halaman Login"}
            onBackToHome={() => {
              if (isAuthenticated) {
                handleTabChange('beranda')
              } else {
                window.location.href = '/login'
              }
            }}
          />
        </div>
        <div className="py-4 text-center text-[11px] text-slate-500 font-mono">
          &copy; 2026 TeknoGuard NOC &bull; Sistem Monitoring Redaman Jaringan Fiber Optik
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW D: PANEL UTAMA NOC (FROST CYAN & SPLIT VIEW KOMPAK)
  // =========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] text-[#0f172a] antialiased selection:bg-cyan-200 selection:text-cyan-900 pb-20 lg:pb-0 flex flex-col font-sans">
      
      {/* 1. DESKTOP SIDEBAR (Modular OOP Navigation) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        unreadTickets={unreadTickets}
        onLogout={handleLogout}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="lg:pl-60 flex-1 flex flex-col">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-sky-200/80 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-mono font-bold text-cyan-800 uppercase tracking-wide">
              {(() => {
                const tabTitles = {
                  beranda: 'Beranda Pemantauan',
                  riwayat: 'Riwayat Redaman',
                  kuota: 'Pemantauan Kuota',
                  pelanggan: 'Data Pelanggan',
                  tiket: 'Tiket Keluhan',
                  log: 'Log Aktivitas',
                  pengguna: 'Manajemen Pengguna',
                  pengaturan: 'Pengaturan Sistem'
                }
                return tabTitles[activeTab] || `Modul ${activeTab}`
              })()}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Ikon Lonceng Notifikasi Tiket (Dipindah ke Sebelah Kiri Kantor) */}
            <button
              type="button"
              onClick={() => handleTabChange('tiket')}
              className="relative p-2 rounded-xl bg-cyan-50/80 hover:bg-cyan-100 text-cyan-700 border border-sky-200/80 transition cursor-pointer flex items-center justify-center"
              title="Tiket Keluhan Pelanggan"
              aria-label="Tiket Keluhan Pelanggan"
            >
              <Bell className="w-4 h-4" />
              {unreadTickets > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center px-1 border-2 border-white animate-pulse">
                  {unreadTickets}
                </span>
              )}
            </button>

            {/* Office Switcher Dropdown (Pusat, Cabang, Banyumas, dsb - Sesuai Hak Akses Role) */}
            {(() => {
              // Hitung kantor yang diizinkan untuk user aktif
              let allowedCodes = [];
              if (currentUser?.role === 'super admin') {
                allowedCodes = kantorList.map(k => k.kode);
              } else if (Array.isArray(currentUser?.allowed_kantor)) {
                allowedCodes = currentUser.allowed_kantor;
              } else if (typeof currentUser?.allowed_kantor === 'string') {
                try {
                  const parsed = JSON.parse(currentUser.allowed_kantor);
                  allowedCodes = Array.isArray(parsed) ? parsed : [currentUser.allowed_kantor];
                } catch {
                  allowedCodes = currentUser.allowed_kantor.split(',').map(s => s.trim()).filter(Boolean);
                }
              }

              const visibleKantors = kantorList.filter(k => 
                currentUser?.role === 'super admin' || allowedCodes.includes(k.kode)
              );

              // Bersihkan nama kantor: "Kantor Pusat" -> "Pusat", "Kantor Cabang" -> "Cabang"
              const cleanOfficeName = (name, code) => {
                if (!name) return code ? code.toUpperCase() : 'Kantor';
                return name.replace(/^Kantor\s+/i, '').trim();
              };

              return (
                <div className="flex items-center gap-1.5 bg-cyan-50/90 hover:bg-cyan-100/80 p-1 pl-2 sm:pl-2.5 rounded-xl border border-sky-200 text-xs font-mono transition shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase hidden md:inline">Kantor:</span>
                  <select
                    value={activeOffice}
                    onChange={(e) => handleSwitchOffice(e.target.value)}
                    className="bg-transparent text-cyan-900 font-bold focus:outline-none cursor-pointer pr-1 py-0.5 text-xs"
                    title="Pilih Wilayah Kantor Operasional"
                  >
                    {visibleKantors.length > 0 ? (
                      visibleKantors.map((k) => (
                        <option key={k.kode} value={k.kode}>
                          {cleanOfficeName(k.nama, k.kode)}
                        </option>
                      ))
                    ) : (
                      <option value={activeOffice}>{activeOffice.toUpperCase()}</option>
                    )}
                  </select>
                </div>
              );
            })()}

            {/* Tombol Titik Tiga (More Menu & Logout Dropdown) */}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer flex items-center justify-center"
                title="Menu Akun &amp; Sesi"
                aria-label="Menu Akun dan Sesi"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {headerMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-sky-200/90 shadow-xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header Ringkas Info Akun */}
                  <div className="p-2.5 bg-cyan-50/60 rounded-xl border border-cyan-100/80 mb-1">
                    <span className="block text-xs font-bold text-slate-900 truncate">
                      {currentUser?.nama_lengkap || 'Administrator'}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-slate-500 font-mono">@{currentUser?.username || 'user'}</span>
                      <span className="text-[9px] uppercase font-bold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded-md">
                        {currentUser?.role || 'user'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Keluar Sesi (Logout) */}
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/60 hover:bg-rose-100 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Keluar Akun (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content (Modular Architecture) */}
        <main className="p-4 sm:p-6 flex-1">
          {activeTab === 'beranda' && (
            <ModulBeranda
              activeOffice={activeOffice}
              currentUser={currentUser}
              onNavigate={(tab) => handleTabChange(tab)}
            />
          )}

          {activeTab === 'riwayat' && (
            <ModulRiwayatRedaman
              activeOffice={activeOffice}
              warnThreshold={warnThreshold}
              critThreshold={critThreshold}
              onNavigateCustomer={handleNavigateCustomer}
            />
          )}
          {activeTab === 'kuota' && (
            <ModulPemantauanKuota
              activeOffice={activeOffice}
              onNavigateCustomer={handleNavigateCustomer}
            />
          )}
          {activeTab === 'pelanggan' && (
            <ModulPelanggan
              activeOffice={activeOffice}
              warnThreshold={warnThreshold}
              critThreshold={critThreshold}
              initialSearch={customerSearchQuery}
              onClearInitialSearch={() => setCustomerSearchQuery('')}
            />
          )}
          {activeTab === 'tiket' && (
            <ModulTiketKeluhan
              activeOffice={activeOffice}
              onNavigateCustomer={handleNavigateCustomer}
            />
          )}
          {activeTab === 'log' && <ModulLogAktivitas />}
          {activeTab === 'pengguna' && <ModulManajemenPengguna />}

          {activeTab === 'pengaturan' && (
            <ModulPengaturan
              settingsActiveSubTab={settingsActiveSubTab}
              setSettingsActiveSubTab={setSettingsActiveSubTab}
              settingsLoading={settingsLoading}
              settingsSaveSuccess={settingsSaveSuccess}
              settingsSaveError={settingsSaveError}
              pollingInterval={pollingInterval}
              setPollingInterval={setPollingInterval}
              warnThreshold={warnThreshold}
              setWarnThreshold={setWarnThreshold}
              critThreshold={critThreshold}
              setCritThreshold={setCritThreshold}
              appVibration={appVibration}
              setAppVibration={setAppVibration}
              alertWaitingInterval={alertWaitingInterval}
              setAlertWaitingInterval={setAlertWaitingInterval}
              nightModeEnabled={nightModeEnabled}
              setNightModeEnabled={setNightModeEnabled}
              nightModeStart={nightModeStart}
              setNightModeStart={setNightModeStart}
              nightModeEnd={nightModeEnd}
              setNightModeEnd={setNightModeEnd}
              modemCredentials={modemCredentials}
              addModemCredentialRow={addModemCredentialRow}
              removeModemCredentialRow={removeModemCredentialRow}
              updateModemCredentialRow={updateModemCredentialRow}
              showModemPasswords={showModemPasswords}
              toggleModemPasswordVisibility={toggleModemPasswordVisibility}
              applyToInvalid={applyToInvalid}
              setApplyToInvalid={setApplyToInvalid}
              draggedCredIdx={draggedCredIdx}
              dragOverCredIdx={dragOverCredIdx}
              handleCredDragStart={handleCredDragStart}
              handleCredDragOver={handleCredDragOver}
              handleCredDrop={handleCredDrop}
              handleCredDragEnd={handleCredDragEnd}
              fetchBackendSettings={fetchBackendSettings}
              onOpenConfirmModal={() => setConfirmModalOpen(true)}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onLogout={handleLogout}
            />
          )}
        </main>

        {/* 3. MOBILE BOTTOM DOCK (Modular Component) */}
        <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} unreadTickets={unreadTickets} />
      </div>

      {/* 4. MODAL POP-UPS (Confirm Save & ONT Details) */}
      <ConfirmSaveModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleSaveSettings}
        saving={settingsLoading}
        pollingInterval={pollingInterval}
        warnThreshold={warnThreshold}
        critThreshold={critThreshold}
        nightModeEnabled={nightModeEnabled}
        nightModeStart={nightModeStart}
        nightModeEnd={nightModeEnd}
        modemCredentialsCount={modemCredentials.length}
        applyToInvalid={applyToInvalid}
      />

      <OntDetailModal
        selectedOnt={selectedOnt}
        onClose={() => setSelectedOnt(null)}
        warnThreshold={warnThreshold}
        critThreshold={critThreshold}
      />
    </div>
  )
}
