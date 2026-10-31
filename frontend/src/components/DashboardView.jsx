import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users,
  Ticket,
  ChevronRight
} from 'lucide-react'
import { MonitoringService } from '../services/api'
import { SegmentedStatusBar } from './CommonUI'
import { ConfirmDialogModal } from './ConfirmDialogModal'
import { ToastNotification } from './ToastNotification'
import { DashboardControlBar } from './dashboard/DashboardControlBar'
import { DashboardQuickShortcuts } from './dashboard/DashboardQuickShortcuts'
import { DashboardChartSection } from './dashboard/DashboardChartSection'

export function DashboardView({
  activeOffice = 'all',
  currentUser = { role: 'super admin', name: 'Admin NOC' },
  kantorList = [],
  onNavigate = () => {}
}) {
  // Helper mendapatkan label nama kantor dinamis dari kantorList
  const getOfficeDisplayName = (code) => {
    if (!code || code === 'all') return 'Seluruh Kantor'
    const found = kantorList.find((k) => k.kode === code)
    if (found && found.nama) {
      return found.nama.replace(/^Kantor\s+/i, '').trim()
    }
    return code.charAt(0).toUpperCase() + code.slice(1)
  }

  // State Engine & Kontrol
  const [engineStatus, setEngineStatus] = useState('RUNNING')
  const [isOfficeActive, setIsOfficeActive] = useState(true)
  const [isConfigured, setIsConfigured] = useState(true)
  const [missingFields, setMissingFields] = useState([])
  const [configError, setConfigError] = useState(null)
  const [lastScanTime, setLastScanTime] = useState('-')
  const [nextRunTime, setNextRunTime] = useState('-')
  const [intervalMinutes, setIntervalMinutes] = useState(10)
  const [isScanning, setIsScanning] = useState(false)
  const [isStartingScan, setIsStartingScan] = useState(false)
  const [scanActionType, setScanActionType] = useState(null) // null | 'pause' | 'resume' | 'stop'
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0)

  // Mutex lock untuk mencegah double-click mikro saat request in-flight
  const actionInProgressRef = useRef(false)
  const isFetchingStatusRef = useRef(false)

  // State Progres Pemindaian
  const [scanProgress, setScanProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
    is_scanning: false,
    is_paused: false,
    elapsed_seconds: 0,
    estimated_total_seconds: 0,
    last_scan_duration: 0,
    target_kantor: 'all'
  })

  // State KPI
  const [kpi, setKpi] = useState({
    total_monitored: 0,
    normal: 0,
    warning: 0,
    critical: 0,
    los: 0,
    monitored_inactive: 0,
    warning_threshold: -26.0,
    critical_threshold: -27.0
  })

  // Helper tanggal lokal YYYY-MM-DD (WIB/Lokal)
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayStr = getLocalDateStr(new Date())
  const getYesterdayStr = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return getLocalDateStr(d)
  }
  const yesterdayStr = getYesterdayStr()

  // State Grafik & Filter
  const [chartRange, setChartRange] = useState('today')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [availableDates, setAvailableDates] = useState([])
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date())
  const [chartStats, setChartStats] = useState({
    avg: null,
    min: null,
    max: null,
    sampleCount: 0,
    threshold: -26.0,
    critical_threshold: -27.0
  })
  const [chartDatasetsState, setChartDatasetsState] = useState([])
  const [isChartEmpty, setIsChartEmpty] = useState(false)

  // Zoom / Pan State
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStartXRef = useRef(0)

  // Toast State
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'info'
  })

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type })
  }

  // Ref Chart.js
  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const rawChartDataRef = useRef({ labels: [], datasets: [], values: [], details: [] })

  // 1. Fetch KPI
  const fetchKpi = useCallback(async () => {
    try {
      const res = await MonitoringService.getKpi(activeOffice)
      if (res.ok && res.data) {
        setKpi((prev) => ({
          ...prev,
          ...res.data
        }))
      }
    } catch (err) {
      console.error('Gagal memuat KPI:', err)
    }
  }, [activeOffice])

  // 2. Fetch Status Engine & Scan Progress
  const fetchStatus = useCallback(async () => {
    if (isFetchingStatusRef.current) return
    isFetchingStatusRef.current = true
    try {
      const res = await MonitoringService.getStatus({ kantor: activeOffice })
      if (res.ok && res.data) {
        setIsNetworkError(false)
        const d = res.data
        setEngineStatus(d.scheduler_status || 'RUNNING')
        setIsOfficeActive(d.is_office_active !== undefined ? d.is_office_active : true)
        setIsConfigured(d.is_configured !== undefined ? d.is_configured : true)
        setMissingFields(d.missing_fields || [])
        setConfigError(d.config_error || null)
        setLastScanTime(d.last_scan_time || '-')
        setNextRunTime(d.next_run_time || '-')
        setIntervalMinutes(d.interval_minutes || 10)
        setIsScanning(d.is_scanning || false)
        setUnreadTicketsCount(d.unread_tickets_count || 0)

        if (d.scan_progress) {
          setScanProgress({
            current: d.scan_progress.current || 0,
            total: d.scan_progress.total || 0,
            percent: d.scan_progress.percent || 0,
            is_scanning: d.scan_progress.is_scanning || false,
            is_paused: d.scan_progress.is_paused || false,
            elapsed_seconds: d.scan_progress.elapsed_seconds || 0,
            estimated_total_seconds: d.scan_progress.estimated_total_seconds || 0,
            last_scan_duration: d.scan_progress.last_scan_duration || 0,
            target_kantor: d.scan_progress.target_kantor || 'all'
          })
        }
      }
    } catch (err) {
      console.error('Gagal mengambil status monitoring:', err)
      setIsNetworkError(true)
    } finally {
      isFetchingStatusRef.current = false
    }
  }, [activeOffice])

  // Initial Load
  useEffect(() => {
    fetchStatus()
    fetchKpi()

    // Polling interval status & progress scan (tiap 3 detik)
    const interval = setInterval(() => {
      fetchStatus()
    }, 3000)

    return () => clearInterval(interval)
  }, [fetchStatus, fetchKpi])

  // Fetch Available Dates for Logs
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await MonitoringService.getAvailableDates({ kantor: activeOffice })
        if (res.ok && res.data) {
          setAvailableDates(res.data.available_dates || res.data.dates || [])
        }
      } catch (err) {
        console.error('Gagal memuat daftar tanggal log:', err)
      }
    }
    fetchDates()
  }, [activeOffice])

  // Polling KPI berkala tiap 10 detik
  useEffect(() => {
    const kpiInterval = setInterval(() => {
      fetchKpi()
    }, 10000)
    return () => clearInterval(kpiInterval)
  }, [fetchKpi])

  // Aksi-aksi Pemindaian & Kontrol
  const handleStartScan = async () => {
    if (actionInProgressRef.current || isScanning || isStartingScan) return
    const targetLabel = activeOffice && activeOffice !== 'all' ? getOfficeDisplayName(activeOffice) : 'Seluruh Kantor'

    if (!isConfigured) {
      const errDetail = configError || 'Pengaturan sistem kantor belum disetel di database. Buka menu Pengaturan untuk menyimpan.'
      showToast(errDetail, 'error')
      return
    }

    actionInProgressRef.current = true
    setIsStartingScan(true)
    showToast(`Memulai pemindaian manual ONT ${targetLabel}...`, 'info')

    try {
      const res = await MonitoringService.triggerScanAll({ kantor: activeOffice })
      if (res.ok && res.data && res.data.status !== 'error') {
        setIsNetworkError(false)
        setIsScanning(true)
        showToast(res.data?.message || `Pemindaian ONT ${targetLabel} berhasil dimulai!`, 'success')
        await fetchStatus()
        await fetchKpi()
      } else {
        const errMsg = res.data?.message || 'Pemindaian gagal dimulai'
        showToast(errMsg, res.data?.error_type === 'CONFIG_MISSING' ? 'error' : 'info')
        if (res.data?.error_type === 'CONFIG_MISSING') {
          setIsConfigured(false)
          setConfigError(res.data?.message)
        }
      }
    } catch (err) {
      console.error('Gagal memicu pemindaian:', err)
      showToast('Koneksi Gagal: Tidak dapat menghubungi modem ONT (10.10.x.x)', 'error')
      setIsNetworkError(true)
    } finally {
      actionInProgressRef.current = false
      setIsStartingScan(false)
      fetchStatus()
      fetchKpi()
    }
  }

  const handlePauseScan = async () => {
    if (actionInProgressRef.current || scanActionType) return
    actionInProgressRef.current = true
    setScanActionType('pause')

    try {
      const res = await MonitoringService.pauseScan({ kantor: activeOffice })
      if (res.ok && res.data?.status !== 'error') {
        showToast('Pemindaian dijeda. Progres tersimpan ke sistem.', 'info')
        await fetchStatus()
      } else {
        showToast(res.data?.message || 'Gagal menjeda pemindaian', 'error')
      }
    } catch (err) {
      showToast('Gagal menjeda pemindaian', 'error')
    } finally {
      actionInProgressRef.current = false
      setScanActionType(null)
    }
  }

  const handleResumeScan = async () => {
    if (actionInProgressRef.current || scanActionType) return
    actionInProgressRef.current = true
    setScanActionType('resume')

    try {
      const res = await MonitoringService.resumeScan({ kantor: activeOffice })
      if (res.ok && res.data?.status !== 'error') {
        showToast('Melanjutkan pemindaian ONT dari posisi jeda...', 'success')
        setIsScanning(true)
        await fetchStatus()
      } else {
        showToast(res.data?.message || 'Gagal melanjutkan pemindaian', 'error')
      }
    } catch (err) {
      showToast('Gagal melanjutkan pemindaian', 'error')
    } finally {
      actionInProgressRef.current = false
      setScanActionType(null)
    }
  }

  const handleOpenStopModal = () => {
    if (actionInProgressRef.current || scanActionType) return
    setIsStopModalOpen(true)
  }

  const handleConfirmStopScan = async () => {
    if (actionInProgressRef.current) return
    actionInProgressRef.current = true
    setScanActionType('stop')

    try {
      const res = await MonitoringService.stopScan({ kantor: activeOffice })
      if (res.ok && res.data?.status !== 'error') {
        showToast('Pemindaian dihentikan paksa. Data progres dibersihkan.', 'info')
        setIsScanning(false)
        await fetchStatus()
        await fetchKpi()
      } else {
        showToast(res.data?.message || 'Gagal menghentikan pemindaian', 'error')
      }
    } catch (err) {
      showToast('Gagal menghentikan pemindaian', 'error')
    } finally {
      actionInProgressRef.current = false
      setScanActionType(null)
      setIsStopModalOpen(false)
    }
  }

  const handleToggleScheduler = async () => {
    if (actionInProgressRef.current || isToggling) return
    actionInProgressRef.current = true
    setIsToggling(true)

    const nextStatus = engineStatus === 'RUNNING' ? 'STOPPED' : 'RUNNING'
    try {
      const res = await MonitoringService.toggleScheduler(nextStatus, { kantor: activeOffice })
      if (res.ok) {
        setEngineStatus(nextStatus)
        showToast(
          nextStatus === 'RUNNING'
            ? 'Jadwal pemindaian otomatis diaktifkan'
            : 'Jadwal pemindaian otomatis dijeda',
          'success'
        )
        await fetchStatus()
      } else {
        showToast(res.data?.message || 'Gagal mengubah status jadwal', 'error')
      }
    } catch (err) {
      showToast('Koneksi Gagal: Tidak dapat menghubungi server', 'error')
    } finally {
      actionInProgressRef.current = false
      setIsToggling(false)
    }
  }

  // Hak Akses
  const isSuperAdmin = currentUser?.role === 'super admin'
  const isAdminOrSuper = isSuperAdmin || currentUser?.role === 'admin'
  const isAnyActionLoading = isStartingScan || scanActionType !== null || isToggling
  const scanTargetKantor = (scanProgress?.target_kantor || 'all').toLowerCase()
  const currentOfficeLower = (activeOffice || 'all').toLowerCase()
  const isCurrentOfficeScan = scanTargetKantor === 'all' || scanTargetKantor === currentOfficeLower
  const canControlCurrentScan = isSuperAdmin || (currentUser?.role === 'admin' && scanTargetKantor === currentOfficeLower)

  return (
    <div className="space-y-4 font-sans">
      {/* 1. STATUS ENGINE & ACTION BUTTONS */}
      <DashboardControlBar
        activeOffice={activeOffice}
        getOfficeDisplayName={getOfficeDisplayName}
        engineStatus={engineStatus}
        isOfficeActive={isOfficeActive}
        isConfigured={isConfigured}
        configError={configError}
        isNetworkError={isNetworkError}
        intervalMinutes={intervalMinutes}
        lastScanTime={lastScanTime}
        nextRunTime={nextRunTime}
        isScanning={isScanning}
        isStartingScan={isStartingScan}
        scanActionType={scanActionType}
        isToggling={isToggling}
        scanProgress={scanProgress}
        isCurrentOfficeScan={isCurrentOfficeScan}
        canControlCurrentScan={canControlCurrentScan}
        isAdminOrSuper={isAdminOrSuper}
        isSuperAdmin={isSuperAdmin}
        isAnyActionLoading={isAnyActionLoading}
        handleStartScan={handleStartScan}
        handleToggleScheduler={handleToggleScheduler}
        handlePauseScan={handlePauseScan}
        handleResumeScan={handleResumeScan}
        handleOpenStopModal={handleOpenStopModal}
      />

      {/* 2. MENU LAYANAN & OPERASIONAL (MOBILE ONLY QUICK TILES) */}
      <DashboardQuickShortcuts
        currentUser={currentUser}
        isSuperAdmin={isSuperAdmin}
        unreadTicketsCount={unreadTicketsCount}
        onNavigate={onNavigate}
      />

      {/* 3. SEGMENTED STATUS TICKER BAR TERPADU */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total',
            value: kpi.total_monitored,
            colorScheme: 'cyan',
            onClick: () => onNavigate('pelanggan', { status: 'ALL' }),
            subLabel: kpi.monitored_inactive > 0 ? `(${kpi.monitored_inactive} OFF)` : 'Modem'
          },
          {
            label: 'Optimal',
            value: kpi.normal,
            colorScheme: 'emerald',
            onClick: () => onNavigate('pelanggan', { status: 'NORMAL' }),
            subLabel: `> ${Number(kpi.warning_threshold ?? -26.0).toFixed(1)} dBm`
          },
          {
            label: 'Waspada',
            value: kpi.warning,
            colorScheme: 'amber',
            onClick: () => onNavigate('pelanggan', { status: 'WARNING' }),
            subLabel: `≤ ${Number(kpi.warning_threshold ?? -26.0).toFixed(1)} dBm`
          },
          {
            label: 'Kritis',
            value: kpi.critical,
            colorScheme: 'rose',
            onClick: () => onNavigate('pelanggan', { status: 'CRITICAL' }),
            subLabel: `≤ ${Number(kpi.critical_threshold ?? -27.0).toFixed(1)} dBm`
          },
          {
            label: 'LOS',
            value: kpi.los,
            colorScheme: 'purple',
            onClick: () => onNavigate('pelanggan', { status: 'LOS' }),
            subLabel: 'Putus'
          },
          {
            label: 'Invalid',
            value: kpi.invalid || 0,
            colorScheme: 'orange',
            onClick: () => onNavigate('pelanggan', { status: 'INVALID' }),
            subLabel: 'Kredensial'
          }
        ]}
      />

      {/* 4. VISUALISASI GRAFIK RIWAYAT REDAMAN (CHART.JS) */}
      <DashboardChartSection
        activeOffice={activeOffice}
        kpi={kpi}
      />

      {/* 5. QUICK SHORTCUT NAVIGATION (2 ACTION CARDS DESKTOP/TABLET) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onNavigate('pelanggan')}
          className="rounded-2xl p-4 bg-white hover:bg-sky-50/40 border border-sky-200 transition-colors flex items-center justify-between group text-left cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center group-hover:bg-cyan-700 group-hover:text-white transition-colors shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono group-hover:text-cyan-900 transition-colors">
                Kelola Master Pelanggan
              </h3>
              <p className="text-xs text-slate-600 font-medium">Tabel seluruh modem ONT, filter POP/Kantor, dan live probe</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('tiket')}
          className="rounded-2xl p-4 bg-white hover:bg-sky-50/40 border border-sky-200 transition-colors flex items-center justify-between group text-left cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center group-hover:bg-cyan-700 group-hover:text-white transition-colors shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono group-hover:text-cyan-900 transition-colors">
                Tiket Keluhan Pelanggan
              </h3>
              <p className="text-xs text-slate-600 font-medium">Pantau laporan aduan warga desa dan update status penanganan</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </div>

      {/* 6. TOAST NOTIFICATION FLOATING */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* 7. MODAL KONFIRMASI (Hentikan Pemindaian) */}
      <ConfirmDialogModal
        isOpen={isStopModalOpen}
        onClose={() => {
          if (scanActionType !== 'stop') setIsStopModalOpen(false)
        }}
        onConfirm={handleConfirmStopScan}
        title="Hentikan Paksa Pemindaian?"
        message={
          <div className="space-y-1.5">
            <p>
              Apakah Anda yakin ingin menghentikan pemindaian ONT di wilayah{' '}
              <strong className="text-slate-900">{getOfficeDisplayName(activeOffice)}</strong>?
            </p>
            <p className="text-rose-700 font-semibold text-xs">
              Seluruh antrean pemindaian saat ini akan dibatalkan dan progres akan direset ke awal.
            </p>
          </div>
        }
        confirmText="Ya, Hentikan Pemindaian"
        cancelText="Batal"
        variant="danger"
        isLoading={scanActionType === 'stop'}
        loadingText="Menghentikan..."
      />
    </div>
  )
}
