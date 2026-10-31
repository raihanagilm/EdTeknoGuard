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

// Technical English Standard View Components (P9-01)
import { DashboardView } from './components/DashboardView'
import { SettingsView } from './components/SettingsView'
import { CustomersView } from './components/CustomersView'
import { OpticalLogsView } from './components/OpticalLogsView'
import { TicketsView } from './components/TicketsView'
import { QuotaView } from './components/QuotaView'
import { ActivityLogsView } from './components/ActivityLogsView'
import { UsersView } from './components/UsersView'
import { BranchOfficesView } from './components/BranchOfficesView'
import { OfficeManagementView } from './components/OfficeManagementView'
import { NotificationsView } from './components/NotificationsView'
import { Sidebar, MobileNav } from './components/Navigation'
import { AppHeader } from './components/layout/AppHeader'
import { ErrorView } from './components/ErrorView'
import { ConfirmSaveModal } from './components/Modals'
import { LoginView } from './components/LoginView'
import { PortalCustomerApp as PortalPelangganApp } from './portal/PortalCustomerApp'

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('edtekno_auth_status') === 'logged_in' || document.cookie.includes('edteknoguard_session=')
  })

  // Navigation & Office Scope State (SOP Multi-Kantor)
  const [activeTab, setActiveTab] = useState('beranda')
  const [officeSubTab, setOfficeSubTab] = useState('kantor')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerStatusFilter, setCustomerStatusFilter] = useState('ALL')
  const [activeOffice, setActiveOffice] = useState(() => {
    const saved = localStorage.getItem('edtekno_active_office')
    return (saved && saved !== 'cabang') ? saved : 'banyumas'
  })
  const [kantorList, setKantorList] = useState([
    { kode: 'banyumas', nama: 'Banyumas' },
    { kode: 'pusat', nama: 'Pusat' }
  ])
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    username: 'admin',
    nama_lengkap: 'Administrator NOC',
    role: 'super admin',
    allowed_kantor: 'all'
  })
  const [unreadTickets, setUnreadTickets] = useState(0)
  const [totalUnreadNotifications, setTotalUnreadNotifications] = useState(0)
  const [notificationList, setNotificationList] = useState([])
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [logsInitialSearch, setLogsInitialSearch] = useState('')
  const [ticketInitialSearch, setTicketInitialSearch] = useState('')
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
      const res = await fetch('/api/kantor/list')
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

  // State Integrasi MikroTik RouterOS
  const [mikrotikHost, setMikrotikHost] = useState('192.168.202.50')
  const [mikrotikPort, setMikrotikPort] = useState(8728)
  const [mikrotikUser, setMikrotikUser] = useState('tekno')
  const [mikrotikPassword, setMikrotikPassword] = useState('')
  const [mikrotikKantor, setMikrotikKantor] = useState('banyumas')
  const [mikrotikAutoSync, setMikrotikAutoSync] = useState(true)

  // Fetch Settings From Backend FastAPI (Thresholds & Credentials per active office)
  const fetchBackendSettings = async (targetKantor = activeOffice) => {
    if (!isAuthenticated) return
    setSettingsLoading(true)
    try {
      const q = targetKantor && targetKantor !== 'all' ? `?kantor=${targetKantor}` : ''
      const res = await fetch(`/api/pengaturan${q}`)
      if (res.ok) {
        const data = await res.json()
        if (data.polling_interval_minutes !== undefined && data.polling_interval_minutes !== null) {
          setPollingInterval(data.polling_interval_minutes)
        }
        if (data.warning_threshold_dbm !== undefined && data.warning_threshold_dbm !== null) {
          setWarnThreshold(data.warning_threshold_dbm)
        }
        if (data.critical_threshold_dbm !== undefined && data.critical_threshold_dbm !== null) {
          setCritThreshold(data.critical_threshold_dbm)
        }
        if (data.app_vibration_enabled !== undefined) setAppVibration(data.app_vibration_enabled)
        if (data.alert_waiting_interval_minutes) setAlertWaitingInterval(data.alert_waiting_interval_minutes)
        if (data.night_mode_enabled !== undefined) setNightModeEnabled(data.night_mode_enabled)
        if (data.night_mode_start) setNightModeStart(data.night_mode_start)
        if (data.night_mode_end) setNightModeEnd(data.night_mode_end)
        if (data.default_modem_credentials !== undefined) {
          setModemCredentials(Array.isArray(data.default_modem_credentials) ? data.default_modem_credentials : [])
        }
        if (data.apply_to_invalid_customers !== undefined) {
          setApplyToInvalid(Boolean(data.apply_to_invalid_customers))
        }
        if (data.mikrotik_host) setMikrotikHost(data.mikrotik_host)
        if (data.mikrotik_port) setMikrotikPort(data.mikrotik_port)
        if (data.mikrotik_user) setMikrotikUser(data.mikrotik_user)
        if (data.mikrotik_password !== undefined) setMikrotikPassword(data.mikrotik_password)
        if (data.mikrotik_kantor) setMikrotikKantor(data.mikrotik_kantor)
        if (data.mikrotik_auto_sync !== undefined) setMikrotikAutoSync(data.mikrotik_auto_sync)
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
      const encodedOffice = encodeURIComponent(activeOffice)
      const q = activeOffice && activeOffice !== 'all' ? `?kantor=${encodedOffice}` : ''
      const [statusRes, kpiRes, custRes, meRes, notifRes] = await Promise.all([
        fetch(`/api/monitoring/status${q}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/monitoring/kpi${q}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/customers?limit=10${activeOffice && activeOffice !== 'all' ? `&kantor=${encodedOffice}` : ''}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/notifications/poll${q}`).then(r => r.ok ? r.json() : null).catch(() => null)
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

      if (notifRes) {
        // unread_tickets_count KHUSUS untuk tiket keluhan / kendala pelanggan
        if (typeof notifRes.unread_tickets_count === 'number') {
          setUnreadTickets(notifRes.unread_tickets_count)
        } else if (Array.isArray(notifRes.notifications)) {
          // Fallback: hitung notifikasi yang bertipe tiket
          const ticketNotifs = notifRes.notifications.filter(n => n.type === 'ticket' || n.target_tab === 'tiket')
          setUnreadTickets(ticketNotifs.length)
        }

        // total_unread untuk pusat notifikasi / lonceng
        if (typeof notifRes.total_unread === 'number') {
          setTotalUnreadNotifications(notifRes.total_unread)
        } else if (Array.isArray(notifRes.notifications)) {
          setTotalUnreadNotifications(notifRes.notifications.length)
        }

        if (Array.isArray(notifRes.notifications)) {
          setNotificationList(notifRes.notifications)
        }
      }
    } catch (e) {
      console.warn('Live monitoring poll failed:', e)
    }
  }

  useEffect(() => {
    fetchLiveDashboardData()
    const interval = setInterval(fetchLiveDashboardData, 8000)
    return () => clearInterval(interval)
  }, [activeOffice])

  // Notification Center Handlers
  const handleNotificationItemClick = async (item) => {
    setIsNotificationOpen(false)

    // Notifikasi KRITIS (LOS / CRITICAL) DILARANG DIHAPUS / DI-READ:
    // Hanya boleh hilang otomatis jika status modem kembali normal di hasil pemantauan
    if (item.level !== 'critical' && !item.is_critical) {
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: item.type,
            reference_id: item.reference_id || item.id
          })
        })
        // Update local state hanya untuk notifikasi non-kritis
        setNotificationList(prev => prev.filter(n => n.id !== item.id))
        setTotalUnreadNotifications(prev => Math.max(0, prev - 1))
        if (item.type === 'ticket' || item.target_tab === 'tiket') {
          setUnreadTickets(prev => Math.max(0, prev - 1))
        }
      } catch (e) {
        console.warn('Failed to mark notification read:', e)
      }
    }

    // Navigasi sesuai jenis notifikasi
    if (item.target_tab === 'tiket') {
      if (item.target_filter) {
        setTicketInitialSearch(item.target_filter)
      }
      handleTabChange('tiket')
    } else if (item.target_tab === 'logs') {
      if (item.target_filter) {
        setLogsInitialSearch(item.target_filter)
      }
      handleTabChange('riwayat')
    } else if (item.target_tab === 'pelanggan') {
      if (item.target_status) {
        setCustomerStatusFilter(item.target_status)
      } else {
        setCustomerStatusFilter('ALL')
      }
      if (item.target_filter) {
        setCustomerSearchQuery(item.target_filter)
      } else {
        setCustomerSearchQuery('')
      }
      handleTabChange('pelanggan')
    } else if (item.target_tab === 'beranda') {
      handleTabChange('beranda')
    } else {
      handleTabChange(item.target_tab || 'beranda')
    }
  }

  const handleDismissNotificationItem = async (item) => {
    // Notifikasi KRITIS dilarang di-dismiss secara manual
    if (item.level === 'critical' || item.is_critical) return

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          reference_id: item.reference_id || item.id
        })
      })
      setNotificationList(prev => prev.filter(n => n.id !== item.id))
      setTotalUnreadNotifications(prev => Math.max(0, prev - 1))
      if (item.type === 'ticket' || item.target_tab === 'tiket') {
        setUnreadTickets(prev => Math.max(0, prev - 1))
      }
    } catch (e) {
      console.warn('Failed to dismiss notification item:', e)
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      const nonCriticalItems = notificationList.filter(n => n.level !== 'critical' && !n.is_critical)
      if (nonCriticalItems.length === 0) return

      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: nonCriticalItems.map(n => ({
            type: n.type,
            reference_id: n.reference_id || n.id
          }))
        })
      })
      // Hanya bersihkan yang non-kritis, item kritis tetap dipertahankan
      const criticalOnly = notificationList.filter(n => n.level === 'critical' || n.is_critical)
      setNotificationList(criticalOnly)
      setTotalUnreadNotifications(criticalOnly.length)
      const criticalTickets = criticalOnly.filter(n => n.type === 'ticket' || n.target_tab === 'tiket')
      setUnreadTickets(criticalTickets.length)
    } catch (e) {
      console.warn('Failed to mark all notifications read:', e)
    }
  }

  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== 'teknisi') {
      fetchBackendSettings(activeOffice)
    }
  }, [isAuthenticated, currentUser?.role, activeOffice])

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
      kantor: activeOffice,
      polling_interval_minutes: isNaN(parseInt(pollingInterval, 10)) ? 20 : parseInt(pollingInterval, 10),
      warning_threshold_dbm: isNaN(parseFloat(warnThreshold)) ? -26.0 : parseFloat(warnThreshold),
      critical_threshold_dbm: isNaN(parseFloat(critThreshold)) ? -27.0 : parseFloat(critThreshold),
      scheduler_status: isScanningActive ? 'RUNNING' : 'STOPPED',
      default_modem_user: validCredentials[0]?.username || 'admin',
      default_modem_pass: validCredentials[0]?.password || 'tekno2024',
      default_modem_credentials: validCredentials.length > 0 ? validCredentials : [{ username: 'admin', password: 'tekno2024' }],
      apply_to_invalid_customers: Boolean(applyToInvalid),
      notification_alert_interval_hours: 1.0,
      night_mode_enabled: Boolean(nightModeEnabled),
      night_mode_start: nightModeStart || '22:00',
      night_mode_end: nightModeEnd || '06:00',
      app_vibration_enabled: Boolean(appVibration),
      alert_waiting_interval_minutes: isNaN(parseInt(alertWaitingInterval, 10)) ? 5 : parseInt(alertWaitingInterval, 10),
      mikrotik_host: mikrotikHost || '192.168.202.50',
      mikrotik_port: isNaN(parseInt(mikrotikPort, 10)) ? 8728 : parseInt(mikrotikPort, 10),
      mikrotik_user: mikrotikUser || 'tekno',
      mikrotik_password: mikrotikPassword || '',
      mikrotik_kantor: activeOffice || 'banyumas',
      mikrotik_auto_sync: Boolean(mikrotikAutoSync)
    }

    try {
      const res = await fetch('/api/pengaturan', {
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

  // Handle Real Backend Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.warn('Logout API error:', e)
    } finally {
      setIsAuthenticated(false)
      localStorage.removeItem('edtekno_auth_status')
      localStorage.removeItem('edtekno_last_active_time')
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
    if (clean === 'manajemen-kantor') return 'manajemen-kantor'
    if (clean === 'pengguna' || clean === 'users') return 'pengguna'
    if (clean === 'kantor') return 'kantor'
    if (clean === 'mikrotik' || clean === 'routeros') return 'mikrotik'
    if (clean === 'pengaturan' || clean === 'settings') return 'pengaturan'
    return '404_not_found'
  }

  // Path to URL path string mapper (Diselaraskan persis dengan nama navigasi)
  const getPathFromTab = (tab) => {
    switch (tab) {
      case 'beranda': return '/'
      case 'portal': return '/portal'
      case 'riwayat': return '/riwayat'
      case 'kuota': return '/kuota'
      case 'pelanggan': return '/pelanggan'
      case 'tiket': return '/tiket'
      case 'log': return '/log'
      case 'manajemen-kantor': return '/manajemen-kantor'
      case 'pengguna': return '/pengguna'
      case 'kantor': return '/kantor'
      case 'mikrotik': return '/mikrotik'
      case 'pengaturan': return '/pengaturan'
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

    const syncFromLocation = (authOverride = null) => {
      const auth = authOverride !== null ? authOverride : isAuthenticated
      const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase()

      // Jika user sudah login dan mengakses /login, alihkan otomatis ke beranda
      if (auth && currentPath === 'login') {
        window.history.replaceState({}, '', '/')
        setActiveTab('beranda')
        return
      }

      const initialTab = getTabFromPath(window.location.pathname)
      setActiveTab(initialTab === 'login' && auth ? 'beranda' : initialTab)
    }

    // Jika sedang di rute /portal atau /teknocust, jangan redirect ke /login admin NOC
    if (isPortalRoute) {
      syncFromLocation()
      const handlePopState = () => syncFromLocation()
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }

    const checkAuthStatus = async () => {
      // Validasi inaktivitas 30 hari (30 * 24 * 60 * 60 * 1000 ms = 2.592.000.000 ms)
      const lastActiveStr = localStorage.getItem('edtekno_last_active_time')
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10)
        const now = Date.now()
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
        if (!isNaN(lastActive) && now - lastActive > thirtyDaysMs) {
          // Melebihi 30 hari tidak pernah buka aplikasi / login -> hanguskan sesi dan paksa login ulang
          localStorage.removeItem('edtekno_auth_status')
          localStorage.removeItem('edtekno_last_active_time')
          document.cookie = "edteknoguard_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
          setIsAuthenticated(false)
          if (
            window.location.pathname !== '/login' &&
            !window.location.pathname.startsWith('/portal') &&
            !window.location.pathname.startsWith('/teknocust')
          ) {
            window.history.pushState({}, '', '/login')
          }
          return
        }
      }

      try {
        const res = await fetch('/api/auth/check')
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true)
          if (data.user) setCurrentUser(data.user)
          localStorage.setItem('edtekno_auth_status', 'logged_in')
          // Perbarui waktu aktif terakhir (Sliding Inactivity Window)
          localStorage.setItem('edtekno_last_active_time', String(Date.now()))
          syncFromLocation(true)
        } else {
          setIsAuthenticated(false)
          localStorage.removeItem('edtekno_auth_status')
          localStorage.removeItem('edtekno_last_active_time')
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
  // VIEW B: HALAMAN LOGIN NOC (Komponen Terpisah LoginView.jsx)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(userData) => {
          setIsAuthenticated(true)
          if (userData) setCurrentUser(userData)
          const targetTab = getTabFromPath(window.location.pathname)
          handleTabChange(targetTab === 'login' ? 'beranda' : targetTab)
        }}
      />
    )
  }

  // =========================================================================
  // VIEW C: HALAMAN 404 / MODUL TIDAK DITEMUKAN (FULL PAGE BERSIH TANPA SIDEBAR/HEADER)
  // =========================================================================
  if (activeTab === 'login') {
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
    setActiveTab('beranda')
    return null
  }

  const validModules = ['beranda', 'riwayat', 'kuota', 'pelanggan', 'tiket', 'log', 'manajemen-kantor', 'pengguna', 'kantor', 'mikrotik', 'pengaturan']
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
        <AppHeader
          activeTab={activeTab}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          totalUnreadNotifications={totalUnreadNotifications}
          notificationList={notificationList}
          activeOffice={activeOffice}
          currentUser={currentUser}
          handleNotificationItemClick={handleNotificationItemClick}
          handleDismissNotificationItem={handleDismissNotificationItem}
          handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          notificationLoading={notificationLoading}
          kantorList={kantorList}
          handleSwitchOffice={handleSwitchOffice}
          headerMenuRef={headerMenuRef}
          headerMenuOpen={headerMenuOpen}
          setHeaderMenuOpen={setHeaderMenuOpen}
          handleLogout={handleLogout}
        />

        {/* Dynamic Page Content (Modular Architecture) */}
        <main className="p-4 sm:p-6 flex-1">
          {activeTab === 'beranda' && (
            <DashboardView
              activeOffice={activeOffice}
              currentUser={currentUser}
              kantorList={kantorList}
              onNavigate={(tab, subTabOrOptions, maybeOptions) => {
                let subTab = typeof subTabOrOptions === 'string' ? subTabOrOptions : null
                let options = typeof subTabOrOptions === 'object' && subTabOrOptions !== null ? subTabOrOptions : (maybeOptions || {})
                
                if (tab === 'pengaturan' && subTab) {
                  setSettingsActiveSubTab(subTab)
                }
                if (tab === 'pelanggan') {
                  if (options.status) {
                    setCustomerStatusFilter(options.status)
                  }
                  if (options.search !== undefined) {
                    setCustomerSearchQuery(options.search)
                  }
                }
                handleTabChange(tab)
              }}
            />
          )}

          {activeTab === 'riwayat' && (
            <OpticalLogsView
              activeOffice={activeOffice}
              warnThreshold={warnThreshold}
              critThreshold={critThreshold}
              onNavigateCustomer={handleNavigateCustomer}
              initialSearch={logsInitialSearch}
              onClearInitialSearch={() => setLogsInitialSearch('')}
            />
          )}
          {activeTab === 'kuota' && (
            <QuotaView
              activeOffice={activeOffice}
              onNavigateCustomer={handleNavigateCustomer}
            />
          )}
          {activeTab === 'pelanggan' && (
            <CustomersView
              activeOffice={activeOffice}
              isOfficeActive={
                activeOffice === 'all'
                  ? true
                  : (kantorList.find(k => k.kode === activeOffice)?.is_active ?? true)
              }
              warnThreshold={warnThreshold}
              critThreshold={critThreshold}
              initialSearch={customerSearchQuery}
              onClearInitialSearch={() => setCustomerSearchQuery('')}
              initialStatus={customerStatusFilter}
              onClearInitialStatus={() => setCustomerStatusFilter('ALL')}
            />
          )}
          {activeTab === 'tiket' && (
            <TicketsView
              activeOffice={activeOffice}
              onNavigateCustomer={handleNavigateCustomer}
              initialSearch={ticketInitialSearch}
              onClearInitialSearch={() => setTicketInitialSearch('')}
            />
          )}
          {activeTab === 'log' && <ActivityLogsView activeOffice={activeOffice} />}
          {activeTab === 'manajemen-kantor' && (
            <OfficeManagementView
              initialSubTab={officeSubTab}
              onSubTabChange={setOfficeSubTab}
            />
          )}
          {activeTab === 'pengguna' && <UsersView />}
          {activeTab === 'kantor' && <BranchOfficesView />}

          {activeTab === 'pengaturan' && (
            <SettingsView
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
              activeOffice={activeOffice}
            />
          )}
        </main>

        {/* 3. MOBILE BOTTOM DOCK (Modular Component) */}
        <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} unreadTickets={unreadTickets} />
      </div>

      {/* 4. MODAL POP-UP (Confirm Save) */}
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
    </div>
  )
}
