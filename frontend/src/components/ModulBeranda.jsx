import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  ZapOff,
  Radio,
  Clock,
  CheckCircle2,
  Users,
  Ticket,
  Database,
  FileText,
  Settings,
  UserCheck,
  Smartphone,
  Building2,
  ScrollText,
  Sliders,
  History,
  Play,
  Pause,
  Square,
  RefreshCw,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ShieldCheck,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart2
} from 'lucide-react'
import Chart from 'chart.js/auto'
import { MonitoringService } from '../services/api'
import { ModuleHeader, MetricCard, SegmentedStatusBar } from './CommonUI'

// Transformasi Non-linear Sumbu Y (Piecewise Stretched Scale)
const TICK_DBM_LIST = [0, 5, 10, 15, 20, 25.0, 25.5, 26.0, 26.5, 27.0, 30.0, 35.0]

function transformDbm(val) {
  if (val === null || val === undefined || isNaN(val)) return null
  const v = Math.abs(Number(val))
  if (v <= 25.0) {
    return (v / 25.0) * 30.0
  } else if (v <= 27.0) {
    return 30.0 + ((v - 25.0) / 2.0) * 45.0
  } else {
    const clamped = Math.min(v, 35.0)
    return 75.0 + ((clamped - 27.0) / 8.0) * 25.0
  }
}

function inverseTransformDbm(u) {
  if (u <= 30.0) {
    return (u / 30.0) * 25.0
  } else if (u <= 75.0) {
    return 25.0 + ((u - 30.0) / 45.0) * 2.0
  } else {
    return 27.0 + ((u - 75.0) / 25.0) * 8.0
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  seconds = Math.floor(seconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (num) => num.toString().padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function ModulBeranda({
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
  const [isToggling, setIsToggling] = useState(false)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0)

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
  const [availableDates, setAvailableDates] = useState([])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date())
  const calendarRef = useRef(null)

  // Cek ketersediaan data historis untuk kemarin dan rentang 7 hari
  const hasYesterdayData = availableDates.includes(yesterdayStr)
  const hasWeekData = availableDates.some((d) => {
    if (d === todayStr) return false
    const dObj = new Date(d)
    const tObj = new Date(todayStr)
    const diffDays = Math.round((tObj - dObj) / (1000 * 60 * 60 * 24))
    return diffDays >= 1 && diffDays <= 7
  })

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Pilih Tanggal'
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const [y, m, d] = parts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const monthIdx = parseInt(m, 10) - 1
    return `${parseInt(d, 10)} ${months[monthIdx] || m} ${y}`
  }

  const formatMonthYear = (d) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  }
  const [chartStats, setChartStats] = useState({
    avg_dbm: null,
    min_dbm: null,
    max_dbm: null,
    total_points: 0,
    threshold: -26.0,
    critical_threshold: -27.0
  })
  const [activeDatasets, setActiveDatasets] = useState([])
  const [zoomScale, setZoomScale] = useState(1.0)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 4500)
  }

  // 1. Fetch KPI Metrics
  const fetchKpi = useCallback(async () => {
    try {
      const res = await MonitoringService.getKpi({ kantor: activeOffice })
      if (res.ok && res.data) {
        setKpi(res.data)
      }
    } catch (err) {
      console.error('Gagal mengambil metrik KPI:', err)
    }
  }, [activeOffice])

  // 2. Fetch Engine Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await MonitoringService.getStatus({ kantor: activeOffice })
      if (res.ok && res.data) {
        const data = res.data
        const wasScanning = isScanning
        setEngineStatus(data.status || 'RUNNING')
        if (data.is_office_active !== undefined) {
          setIsOfficeActive(Boolean(data.is_office_active))
        }
        if (data.is_configured !== undefined) {
          setIsConfigured(Boolean(data.is_configured))
        }
        if (data.missing_fields !== undefined) {
          setMissingFields(data.missing_fields || [])
        }
        if (data.config_error !== undefined) {
          setConfigError(data.config_error || null)
        }
        setLastScanTime(data.last_scan_time || '-')
        setNextRunTime(data.next_run_time || '-')
        setIsScanning(Boolean(data.is_scanning))

        if (data.scan_progress) {
          setScanProgress((prev) => {
            const serverElapsed = data.scan_progress.elapsed_seconds || 0
            // Pertahankan detik berjalan mulus, jangan biarkan waktu mundur karena delay response HTTP
            const smoothedElapsed = prev && prev.is_scanning
              ? Math.max(serverElapsed, prev.elapsed_seconds || 0)
              : serverElapsed
            return {
              ...data.scan_progress,
              elapsed_seconds: smoothedElapsed
            }
          })
          if (data.scan_progress.is_scanning) {
            setIsScanning(true)
          }
        }

        if (data.interval_minutes) {
          setIntervalMinutes(data.interval_minutes)
        }

        if (data.is_network_error !== undefined) {
          setIsNetworkError(Boolean(data.is_network_error))
        }

        if (wasScanning && !data.is_scanning) {
          fetchKpi()
          if (chartRange === 'today' && chartInstanceRef.current) {
            MonitoringService.getChartData({ range: 'today' }).catch(() => {})
          }
        }
      }
    } catch (err) {
      console.error('Gagal mengambil status monitoring:', err)
      setIsNetworkError(true)
    }
  }, [isScanning, chartRange, activeOffice, fetchKpi])

  // 3. Fetch Notifications / Unread Count
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await MonitoringService.pollNotifications()
      if (res.ok && res.data) {
        setUnreadTicketsCount(res.data.unread_tickets_count || 0)
      }
    } catch (err) {
      // Silent error
    }
  }, [])

  // 3b. Fetch Tanggal Tersedia di Database
  const fetchAvailableDates = useCallback(async () => {
    try {
      const res = await MonitoringService.getAvailableDates({ kantor: activeOffice })
      if (res.ok && res.data && Array.isArray(res.data.available_dates)) {
        setAvailableDates(res.data.available_dates)
      }
    } catch (err) {
      console.warn('Gagal memuat tanggal database:', err)
    }
  }, [activeOffice])

  useEffect(() => {
    fetchAvailableDates()
  }, [fetchAvailableDates])

  // Listener Klik di Luar Kalender untuk Menutup Popover
  useEffect(() => {
    if (!isCalendarOpen) return
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen])

  // Generator Grid Kalender
  const renderCalendarDays = () => {
    const year = calendarViewMonth.getFullYear()
    const month = calendarViewMonth.getMonth()

    // 0 = Senin, 6 = Minggu
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []

    // Padding hari kosong sebelum tanggal 1
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-7 w-7" />)
    }

    const availableSet = new Set(availableDates)

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0')
      const monthStr = String(month + 1).padStart(2, '0')
      const dateKey = `${year}-${monthStr}-${dayStr}`

      const hasData = availableSet.has(dateKey)
      const isSelected = selectedDate === dateKey && chartRange === 'custom'
      const isToday = dateKey === todayStr

      if (hasData) {
        cells.push(
          <button
            key={dateKey}
            type="button"
            onClick={() => {
              setSelectedDate(dateKey)
              setChartRange('custom')
              setIsCalendarOpen(false)
            }}
            className={`h-7 w-7 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center relative transition select-none cursor-pointer ${
              isSelected
                ? 'bg-cyan-700 text-white font-extrabold shadow-xs'
                : 'text-slate-800 hover:bg-sky-100 hover:text-cyan-900'
            } ${isToday && !isSelected ? 'ring-1 ring-cyan-500' : ''}`}
            title={`Pilih tanggal ${dateKey} (Tersedia di database)`}
          >
            <span className="leading-none">{d}</span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 ${
                isSelected ? 'bg-white' : 'bg-cyan-600'
              }`}
            />
          </button>
        )
      } else {
        cells.push(
          <div
            key={dateKey}
            className="h-7 w-7 rounded-lg text-[11px] text-slate-300 flex items-center justify-center cursor-not-allowed select-none opacity-30"
            title="Tidak ada data log pada tanggal ini"
          >
            <span className="leading-none">{d}</span>
          </div>
        )
      }
    }

    return cells
  }

  // 4. Load Chart Data
  const loadChartData = useCallback(async () => {
    if (!chartInstanceRef.current) return
    try {
      const params = { range: chartRange }
      if (selectedDate) {
        params.date = selectedDate
      }
      if (activeOffice) {
        params.kantor = activeOffice
      }
      const res = await MonitoringService.getChartData(params)
      if (res.ok && res.data) {
        const json = res.data
        let rawLabels = json.labels || []
        let rawDatasets = json.datasets || []
        let singleValues = json.values || []
        let singleDetails = json.details || []

        // Auto-trimming: Temukan indeks data pertama dan terakhir yang memiliki nilai riil (bukan null)
        if (rawLabels.length > 0) {
          let firstValidIdx = -1
          let lastValidIdx = -1

          if (rawDatasets && rawDatasets.length > 0) {
            for (let i = 0; i < rawLabels.length; i++) {
              const hasDataAtI = rawDatasets.some(
                (ds) => ds.values && ds.values[i] !== null && ds.values[i] !== undefined && !isNaN(ds.values[i])
              )
              if (hasDataAtI) {
                if (firstValidIdx === -1) firstValidIdx = i
                lastValidIdx = i
              }
            }
          } else if (singleValues && singleValues.length > 0) {
            for (let i = 0; i < rawLabels.length; i++) {
              if (singleValues[i] !== null && singleValues[i] !== undefined && !isNaN(singleValues[i])) {
                if (firstValidIdx === -1) firstValidIdx = i
                lastValidIdx = i
              }
            }
          }

          // Jika ditemukan rentang valid, potong label dan array data
          if (firstValidIdx !== -1 && lastValidIdx !== -1 && (firstValidIdx > 0 || lastValidIdx < rawLabels.length - 1)) {
            rawLabels = rawLabels.slice(firstValidIdx, lastValidIdx + 1)
            if (rawDatasets && rawDatasets.length > 0) {
              rawDatasets = rawDatasets.map((ds) => ({
                ...ds,
                values: (ds.values || []).slice(firstValidIdx, lastValidIdx + 1),
                details: (ds.details || []).slice(firstValidIdx, lastValidIdx + 1)
              }))
            }
            if (singleValues && singleValues.length > 0) {
              singleValues = singleValues.slice(firstValidIdx, lastValidIdx + 1)
              singleDetails = singleDetails.slice(firstValidIdx, lastValidIdx + 1)
            }
          }
        }

        const count = rawLabels.length
        const warnThreshold = json.threshold !== undefined ? json.threshold : -26.0
        const critThreshold = json.critical_threshold !== undefined ? json.critical_threshold : -27.0
        const warnVal = transformDbm(Math.abs(warnThreshold))
        const critVal = transformDbm(Math.abs(critThreshold))

        let datasets = []

        if (rawDatasets && rawDatasets.length > 0) {
          const isMulti = rawDatasets.length > 1
          datasets = rawDatasets.map((ds) => {
            const transformed = (ds.values || []).map((v) =>
              v !== null && !isNaN(v) && typeof v === 'number' ? transformDbm(v) : null
            )
            return {
              label: ds.label,
              data: transformed,
              rawValues: ds.values || [],
              details: ds.details || [],
              borderColor: ds.color || '#0891b2',
              backgroundColor: !isMulti ? 'rgba(8, 145, 178, 0.12)' : 'transparent',
              borderWidth: rawDatasets.length > 2 ? 2 : 2.5,
              fill: !isMulti,
              tension: 0.12,
              pointRadius: rawDatasets.length > 2 ? 3.5 : 5,
              pointHoverRadius: rawDatasets.length > 2 ? 6 : 8,
              pointBackgroundColor: ds.color || '#0891b2',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              showLine: true,
              spanGaps: true,
              isThreshold: false
            }
          })
        } else {
          const transformedValues = (singleValues || []).map((v) =>
            v !== null && !isNaN(v) && typeof v === 'number' ? transformDbm(v) : null
          )
          datasets.push({
            label: 'Nilai Redaman Rata-rata',
            data: transformedValues,
            rawValues: json.values || [],
            details: json.details || [],
            borderColor: '#0891b2',
            backgroundColor: 'rgba(8, 145, 178, 0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.12,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#0891b2',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            showLine: true,
            spanGaps: true,
            isThreshold: false
          })
        }

        // Garis Warning & Kritis
        datasets.push({
          label: `Garis Warning (${Number(warnThreshold).toFixed(1)} dBm)`,
          data: count > 0 ? new Array(count).fill(warnVal) : [],
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isThreshold: true
        })

        // Garis Kritis
        datasets.push({
          label: `Garis Kritis (${Number(critThreshold).toFixed(1)} dBm)`,
          data: count > 0 ? new Array(count).fill(critVal) : [],
          borderColor: '#ef4444',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isThreshold: true
        })

        // Pastikan instance Chart.js masih ada dan valid sebelum manipulasi data
        if (!chartInstanceRef.current || !chartInstanceRef.current.data) return

        chartInstanceRef.current.data.labels = rawLabels
        chartInstanceRef.current.data.datasets = datasets

        setActiveDatasets(
          datasets.map((d, i) => ({
            index: i,
            label: d.label,
            color: d.borderColor,
            isThreshold: Boolean(d.isThreshold),
            borderDash: Boolean(d.borderDash),
            hidden: false
          }))
        )

        setChartStats({
          avg_dbm: json.avg_dbm,
          min_dbm: json.min_dbm,
          max_dbm: json.max_dbm,
          total_points: json.total_points || 0,
          threshold: warnThreshold,
          critical_threshold: critThreshold
        })

        chartInstanceRef.current.update('none')
      }
    } catch (err) {
      console.warn('Gagal memuat data grafik:', err)
    }
  }, [chartRange, selectedDate, activeOffice])

  // Inisialisasi Chart.js
  useEffect(() => {
    if (!chartCanvasRef.current) return

    const ctx = chartCanvasRef.current.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            min: 0,
            max: 100,
            afterBuildTicks: (axis) => {
              axis.ticks = TICK_DBM_LIST.map((val) => ({
                value: transformDbm(val)
              }))
            },
            ticks: {
              callback: (val) => {
                const dbm = inverseTransformDbm(val)
                if (Math.abs(dbm) < 0.05) return '0 dBm'
                if (dbm >= 24.9) return `-${dbm.toFixed(1)} dBm`
                return `-${Math.round(dbm)} dBm`
              },
              color: '#64748B',
              font: { size: 10.5, family: "'Roboto Flex', system-ui, sans-serif", weight: '600' }
            },
            grid: {
              color: (ctx) => {
                if (!ctx.tick) return '#F1F5F9'
                const dbm = inverseTransformDbm(ctx.tick.value)
                if (Math.abs(dbm - 26.0) < 0.05) return 'rgba(245, 158, 11, 0.35)'
                if (Math.abs(dbm - 27.0) < 0.05) return 'rgba(239, 68, 68, 0.35)'
                return '#F1F5F9'
              }
            }
          },
          x: {
            ticks: {
              color: '#64748B',
              font: { size: 11, family: "'Roboto Flex', system-ui, sans-serif" },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
            },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            titleFont: { family: "'Roboto Flex', system-ui, sans-serif", size: 11, weight: 'bold' },
            bodyFont: { family: "'Roboto Flex', system-ui, sans-serif", size: 10, weight: '500' },
            padding: { top: 8, bottom: 8, left: 10, right: 10 },
            cornerRadius: 8,
            displayColors: false,
            filter: (tooltipItem) => !tooltipItem.dataset.isThreshold,
            callbacks: {
              title: (items) => {
                if (!items || !items.length) return ''
                return `Waktu: ${items[0].label} WIB`
              },
              label: (ctx) => {
                const ds = ctx.dataset
                const idx = ctx.dataIndex
                const rawVal = ds.rawValues ? ds.rawValues[idx] : null
                let valStr = '-'
                if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
                  valStr = `${Number(rawVal).toFixed(2)} dBm`
                }
                const lines = [`${ds.label}: ${valStr}`]
                if (ds.details && ds.details[idx]) {
                  const d = ds.details[idx]
                  lines.push(`Total Terpantau: ${d.total} ONT`)
                  lines.push(`• Normal: ${d.normal} | Warning: ${d.warning}`)
                  lines.push(`• Kritis: ${d.critical} | LOS: ${d.los}`)
                }
                return lines
              }
            }
          }
        }
      }
    })

    chartInstanceRef.current = chart

    fetchStatus()
    fetchKpi()
    fetchNotifications()
    loadChartData()

    return () => {
      chart.destroy()
      chartInstanceRef.current = null
    }
  }, [])

  // Auto-reload data saat activeOffice berubah atau filter range berubah
  useEffect(() => {
    fetchStatus()
    fetchKpi()
    loadChartData()
  }, [chartRange, selectedDate, activeOffice, loadChartData, fetchStatus, fetchKpi])

  // Polling berkala & Real-Time Stopwatch Ticker
  useEffect(() => {
    // 1. Polling reguler saat santai (tidak scanning)
    const regularInterval = setInterval(() => {
      if (document.hidden) return
      if (!isScanning) {
        fetchStatus()
        fetchKpi()
        fetchNotifications()
        if (chartRange === 'today') {
          loadChartData()
        }
      }
    }, 8000)

    // 2. Fast polling ke backend saat pemindaian aktif (dipercepat ke 800ms agar update data cepat)
    const fastInterval = setInterval(() => {
      if (document.hidden) return
      if (isScanning || (scanProgress && scanProgress.is_scanning)) {
        fetchStatus()
      }
    }, 800)

    // 3. Local stopwatch ticker 1 detik: berjalan mulus di client sehingga angka detik tidak pernah loncat
    const secondTicker = setInterval(() => {
      if (isScanning || (scanProgress && scanProgress.is_scanning)) {
        setScanProgress((prev) => {
          if (!prev || (!prev.is_scanning && !isScanning)) return prev
          return {
            ...prev,
            elapsed_seconds: (prev.elapsed_seconds || 0) + 1
          }
        })
      }
    }, 1000)

    return () => {
      clearInterval(regularInterval)
      clearInterval(fastInterval)
      clearInterval(secondTicker)
    }
  }, [isScanning, scanProgress?.is_scanning, chartRange, fetchStatus, fetchKpi, fetchNotifications, loadChartData])

  // Handler Kontrol Pemindaian
  const handleStartScan = async () => {
    if (isScanning) return
    const targetLabel = getOfficeDisplayName(activeOffice)

    if (!isConfigured) {
      const errDetail = configError || `Pengaturan kantor ${targetLabel} belum disetel di database. Buka menu Pengaturan.`
      showToast(errDetail, 'error')
      return
    }

    showToast(`Memulai pemindaian manual ONT ${targetLabel}...`, 'info')
    setIsScanning(true)
    try {
      const res = await MonitoringService.triggerScanAll({ kantor: activeOffice })
      if (res.ok && res.data && res.data.status !== 'error') {
        setIsNetworkError(false)
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
      fetchStatus()
      fetchKpi()
    }
  }

  const handlePauseScan = async () => {
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
    }
  }

  const handleResumeScan = async () => {
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
    }
  }

  const handleStopScan = async () => {
    if (!window.confirm('Hentikan paksa pemindaian? Progres pemindaian saat ini akan direset ke awal.')) return
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
    }
  }

  const handleToggleScheduler = async () => {
    if (isScanning || isToggling) return
    setIsToggling(true)
    try {
      const wasRunning = engineStatus === 'RUNNING'
      const res = await MonitoringService.toggleScheduler({ kantor: activeOffice })
      if (res.ok && res.data) {
        setEngineStatus(res.data.scheduler_status)
        if (res.data.interval_minutes) setIntervalMinutes(res.data.interval_minutes)
        const officeLabel = activeOffice?.toUpperCase() || 'SELURUH KANTOR'
        if (wasRunning) {
          showToast(`Jadwal pemantauan otomatis ${officeLabel} dijeda (STOPPED)`, 'info')
        } else {
          showToast(`Jadwal pemantauan otomatis ${officeLabel} diaktifkan (RUNNING)`, 'success')
        }
      }
    } catch (err) {
      showToast('Gagal mengubah jadwal pemantauan', 'error')
    } finally {
      setIsToggling(false)
    }
  }

  const toggleDataset = (idx) => {
    if (!chartInstanceRef.current || !activeDatasets[idx]) return
    const isHidden = !activeDatasets[idx].hidden
    const nextDatasets = [...activeDatasets]
    nextDatasets[idx].hidden = isHidden
    setActiveDatasets(nextDatasets)
    chartInstanceRef.current.setDatasetVisibility(idx, !isHidden)
    chartInstanceRef.current.update('none')
  }

  const handleZoomIn = () => {
    if (zoomScale < 3.0) setZoomScale((prev) => Math.min(3.0, +(prev + 0.35).toFixed(2)))
  }

  const handleZoomOut = () => {
    if (zoomScale > 0.8) setZoomScale((prev) => Math.max(0.8, +(prev - 0.35).toFixed(2)))
  }

  const handleZoomReset = () => {
    setZoomScale(1.0)
  }

  const isSuperAdmin = currentUser?.role === 'super admin'
  const isAdminOrSuper = currentUser?.role === 'admin' || isSuperAdmin

  // Logika Isolasi Multi-Kantor untuk Pemindaian (Gunakan case-insensitive agar kode kantor 'Slawi' vs 'slawi' selalu cocok)
  const scanTargetKantor = (scanProgress?.target_kantor || '').toLowerCase()
  const currentOfficeLower = (activeOffice || '').toLowerCase()
  const isScanActive = isScanning || Boolean(scanProgress?.is_scanning || scanProgress?.is_paused)
  const isCurrentOfficeScan = isScanActive
    ? (scanTargetKantor === currentOfficeLower || scanTargetKantor === 'all')
    : true
  const hasActiveScanInOtherOffice = isScanActive && scanTargetKantor && scanTargetKantor !== 'all' && scanTargetKantor !== currentOfficeLower
  const canControlCurrentScan = isSuperAdmin || (currentUser?.role === 'admin' && scanTargetKantor === currentOfficeLower)

  return (
    <div className="space-y-4 font-sans">

      {/* 1. TABLER COMMAND CONTROL BAR: STATUS ENGINE & ACTION BUTTONS (Ditaruh di Paling Atas) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 border border-sky-200/80 shadow-xs space-y-3 sm:space-y-3.5 relative overflow-hidden">
        {/* Baris Utama: Status, Timer Interval & Tombol Kontrol */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Sisi Kiri: Status Pemantau Otomatis */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                !isConfigured
                  ? 'bg-rose-500 shadow-xs shadow-rose-200'
                  : isNetworkError
                  ? 'bg-rose-500 shadow-xs shadow-rose-200'
                  : engineStatus === 'RUNNING'
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-200'
                  : 'bg-amber-500 shadow-xs shadow-amber-200'
              }`}
            >
              <div
                className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white ${
                  isConfigured && engineStatus === 'RUNNING' && !isNetworkError ? 'animate-ping' : ''
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono leading-tight">
                  {!isConfigured ? (
                    <span className="text-rose-600">
                      Pengaturan Belum Disetel di Database
                    </span>
                  ) : isNetworkError ? (
                    <span className="text-rose-600">
                      Pemantauan: Gagal Terhubung
                    </span>
                  ) : !isOfficeActive ? (
                    <span className="text-slate-500">
                      Kantor Nonaktif: Pemantauan Mati
                    </span>
                  ) : engineStatus === 'RUNNING' ? (
                    <span>
                      Pemantauan Otomatis: Aktif ({intervalMinutes}m)
                    </span>
                  ) : (
                    <span className="text-amber-800">Pemantauan Otomatis: Dijeda</span>
                  )}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono uppercase tracking-wide border ${
                    !isConfigured
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : isNetworkError
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : !isOfficeActive
                      ? 'bg-slate-100 text-slate-600 border-slate-300'
                      : engineStatus === 'RUNNING'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {!isConfigured ? 'BELUM DISETEL' : isNetworkError ? 'GAGAL JARINGAN' : !isOfficeActive ? 'NONAKTIF' : engineStatus === 'RUNNING' ? 'BERJALAN' : 'DIJEDA'}
                </span>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-600 flex flex-wrap items-center gap-1.5 mt-0.5 font-mono">
                <span>Cek Terakhir:</span>
                <strong className="text-slate-800 font-bold">{lastScanTime}</strong>
                {engineStatus === 'RUNNING' && isOfficeActive && nextRunTime && nextRunTime !== '-' && (
                  <>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="text-slate-500">Berikutnya:</span>
                    <strong className="text-cyan-800 font-bold">{nextRunTime}</strong>
                  </>
                )}
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span
                  className={`text-[11px] font-bold ${
                    isNetworkError
                      ? 'text-rose-600'
                      : !isOfficeActive
                      ? 'text-slate-500'
                      : engineStatus === 'RUNNING'
                      ? 'text-emerald-800'
                      : 'text-amber-800'
                  }`}
                >
                  {isNetworkError
                    ? 'Gateway tidak merespons'
                    : !isOfficeActive
                    ? 'Kantor dinonaktifkan (pemantauan mati)'
                    : engineStatus === 'RUNNING'
                    ? `Otomatis tiap ${intervalMinutes}m`
                    : 'Jadwal dihentikan'}
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Kontrol Cerdas */}
          {isAdminOrSuper && (
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-sky-100">
              {isToggling && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-mono font-bold shrink-0">
                  <RefreshCw className="animate-spin h-3.5 w-3.5 text-cyan-700" />
                  <span>Menyimpan...</span>
                </div>
              )}

              {/* Kondisi 1: Standby / Idle untuk Kantor Aktif Ini */}
              {(!isScanning || !isCurrentOfficeScan || !scanProgress || scanProgress.total === 0) && (!scanProgress || !scanProgress.is_paused || !isCurrentOfficeScan) && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleStartScan}
                    disabled={isToggling || (isScanning && isCurrentOfficeScan) || !isOfficeActive || !isConfigured}
                    title={
                      !isOfficeActive
                        ? 'Kantor dalam status nonaktif. Aktifkan kantor di menu Kantor Cabang untuk memindai.'
                        : !isConfigured
                        ? (configError || 'Pengaturan sistem kantor belum disetel di database. Buka menu Pengaturan untuk menyimpan.')
                        : 'Mulai pemindaian sinyal redaman'
                    }
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm min-h-[38px] ${
                      !isOfficeActive || !isConfigured
                        ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                        : 'bg-cyan-700 hover:bg-cyan-800 text-white cursor-pointer disabled:opacity-50'
                    }`}
                  >
                    <Play className={`w-4 h-4 ${!isOfficeActive || !isConfigured ? 'fill-slate-400 text-slate-400' : 'fill-white'}`} />
                    <span>
                      {!isOfficeActive
                        ? 'Kantor Nonaktif'
                        : !isConfigured
                        ? 'Pengaturan Kosong'
                        : activeOffice && activeOffice !== 'all'
                        ? `Pindai ${getOfficeDisplayName(activeOffice)}`
                        : 'Mulai Pemantauan (Semua)'}
                    </span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={handleToggleScheduler}
                      disabled={isToggling || !isOfficeActive}
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center gap-1.5 min-h-[38px] ${
                        !isOfficeActive
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : 'bg-white hover:bg-cyan-50/60 text-slate-700 border-sky-200 cursor-pointer'
                      }`}
                      title={
                        !isOfficeActive
                          ? 'Kantor nonaktif. Aktifkan kantor terlebih dahulu.'
                          : engineStatus === 'RUNNING'
                          ? 'Klik untuk menjeda jadwal pemindaian otomatis (Hanya Super Admin)'
                          : 'Klik untuk mengaktifkan kembali jadwal pemindaian otomatis (Hanya Super Admin)'
                      }
                    >
                      {engineStatus === 'RUNNING' ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          <span>Jeda Jadwal</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          <span>Aktifkan Jadwal</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Kondisi 2: Sedang Memindai di Kantor Aktif Ini */}
              {isScanning && isCurrentOfficeScan && canControlCurrentScan && scanProgress?.total > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
                  <button
                    onClick={handlePauseScan}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px]"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Jeda Pemindaian</span>
                  </button>

                  <button
                    onClick={handleStopScan}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px]"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Hentikan (Stop)</span>
                  </button>
                </div>
              )}

              {/* Kondisi 3: Pemindaian Dijeda di Kantor Aktif Ini */}
              {!isScanning && scanProgress && scanProgress.is_paused && isCurrentOfficeScan && canControlCurrentScan && (
                <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
                  <button
                    onClick={handleResumeScan}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Lanjutkan</span>
                  </button>

                  <button
                    onClick={handleStopScan}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px]"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Batalkan (Stop)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar Pemindaian Real-Time */}
        <div className="pt-3 border-t border-sky-100">
          {/* Sedang Memindai - Hanya tampil jika kantor cocok dan ada target pemindaian yang aktif */}
          {(isScanning || Boolean(scanProgress?.is_scanning)) && isCurrentOfficeScan && scanProgress?.total > 0 && (
            <div className="space-y-2.5 bg-cyan-50/40 border border-sky-200 p-3.5 sm:p-4 rounded-xl text-slate-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-ping shrink-0" />
                  <span className="font-extrabold text-slate-900 tracking-tight">
                    Proses Pemindaian{' '}
                    {scanProgress?.target_kantor && scanProgress.target_kantor !== 'all' && (
                      <span className="uppercase font-extrabold text-cyan-700">
                        [{scanProgress.target_kantor}]
                      </span>
                    )}
                    :{' '}
                    <span className="text-cyan-800 font-black text-sm">
                      {scanProgress.current || 0} / {scanProgress.total || 0} ONT
                    </span>
                    <span className="text-slate-500 font-semibold"> ({scanProgress.percent || 0}%)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] flex-wrap">
                  <span className="bg-white px-2 py-0.5 rounded border border-sky-200">
                    Waktu:{' '}
                    <strong className="text-slate-900 font-bold">
                      {formatDuration(scanProgress.elapsed_seconds)}
                    </strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-sky-200">
                    Estimasi Total:{' '}
                    <strong className="text-slate-900 font-bold">
                      ~{formatDuration(scanProgress.estimated_total_seconds)}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="w-full bg-cyan-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-cyan-700 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(scanProgress.percent || 3, 3)}%` }}
                />
              </div>
            </div>
          )}

          {/* Pemindaian Terjeda - Hanya tampil jika kantor cocok */}
          {!isScanning && scanProgress && scanProgress.is_paused && isCurrentOfficeScan && (
            <div className="space-y-2.5 bg-amber-50 border border-amber-200 p-3.5 sm:p-4 rounded-xl shadow-2xs font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    Pemindaian Terjeda{' '}
                    {scanProgress?.target_kantor && scanProgress.target_kantor !== 'all' && (
                      <span className="uppercase font-extrabold text-amber-700">
                        [{scanProgress.target_kantor}]
                      </span>
                    )}
                    :{' '}
                    <span className="text-amber-700 font-extrabold">
                      {scanProgress.current || 0} / {scanProgress.total || 0} ONT
                    </span>{' '}
                    <span>({scanProgress.percent || 0}%)</span>
                  </span>
                </div>
                <div className="text-[11px] text-amber-800">
                  Klik <strong>Lanjutkan</strong> untuk meneruskan atau <strong>Batalkan</strong> untuk stop.
                </div>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(scanProgress.percent || 3, 3)}%` }}
                />
              </div>
            </div>
          )}

          {/* OPSI B KHUSUS SUPER ADMIN: Tampilkan Notifikasi Informasi jika Kantor Lain Sedang Memindai */}
          {isSuperAdmin && hasActiveScanInOtherOffice && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-50/70 border border-sky-200 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping"></span>
                <span>
                  Informasi: Pemindaian Kantor{' '}
                  <strong className="uppercase text-cyan-800">[{scanTargetKantor}]</strong> sedang berjalan di latar belakang:{' '}
                  <strong>{scanProgress.current || 0} / {scanProgress.total || 0} ONT ({scanProgress.percent || 0}%)</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-sans hidden sm:inline">
                Pindah ke kantor {scanTargetKantor.toUpperCase()} untuk melihat progress lengkap &amp; kontrol.
              </span>
            </div>
          )}

          {/* Standby (Tampil jika idle atau sedang membuka kantor yang tidak sedang memindai) */}
          {((!isScanning && (!scanProgress || (!scanProgress.is_scanning && !scanProgress.is_paused))) || !isCurrentOfficeScan) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-slate-700 pt-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-800 shrink-0" />
                <span className="text-slate-600 font-medium">Durasi Terakhir:</span>
                <strong className="text-slate-800 font-bold">
                  {scanProgress?.last_scan_duration > 0
                    ? `${formatDuration(scanProgress.last_scan_duration)} / siklus`
                    : 'Belum ada data'}
                </strong>
              </div>
              <div className="text-[11px] text-slate-600 font-bold">
                <span>Target: {kpi.total_monitored || 0} ONT ({activeOffice.toUpperCase()})</span>
              </div>
            </div>
          )}
        </div>

        {/* Informasi Edukatif Jaringan Lokal */}
        <div className="hidden sm:flex pt-3 border-t border-sky-100 items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900 font-mono">Panduan Jaringan:</strong> Server pemantau{' '}
            <span className="text-slate-900 font-semibold underline decoration-cyan-400">
              harus berada dalam satu segmen jaringan atau VLAN ISP yang sama
            </span>{' '}
            dengan modem ONT pelanggan (contoh: IP gateway{' '}
            <code className="font-mono bg-cyan-100 px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-950 font-bold">
              10.10.x.x
            </code>
            ) agar status perangkat terbaca normal.
          </div>
        </div>
      </div>

      {/* 2. MENU LAYANAN & OPERASIONAL (TABLER MODULAR ACTION TILES - KHUSUS MOBILE / AKSES CEPAT) */}
      <section className="lg:hidden bg-white/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-sky-200/80 shadow-xs">
        <header className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 w-1 bg-cyan-700 rounded-full" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 font-mono uppercase tracking-wide">
              Menu Layanan
            </h2>
          </div>
          <span className="text-[11px] text-slate-600 font-mono font-bold">Akses Cepat</span>
        </header>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {/* 1. Data Pelanggan */}
          <button
            onClick={() => onNavigate('pelanggan')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Data Pelanggan</span>
          </button>

          {/* 2. Riwayat Redaman */}
          <button
            onClick={() => onNavigate('riwayat')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Riwayat Redaman</span>
          </button>

          {/* 3. Pemantauan Kuota */}
          <button
            onClick={() => onNavigate('kuota')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Pemantauan Kuota</span>
          </button>

          {/* 4. Tiket Keluhan */}
          <button
            onClick={() => onNavigate('tiket')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center relative min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition relative">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadTicketsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 min-w-[15px] text-center text-[9px] font-black text-white bg-rose-600 rounded-full border border-white shadow-xs">
                  {unreadTicketsCount}
                </span>
              )}
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Tiket Keluhan</span>
          </button>

          {/* 5. Log Aktivitas (Tidak terlihat oleh teknisi) */}
          {currentUser?.role !== 'teknisi' && (
            <button
              onClick={() => onNavigate('log')}
              className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
            >
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <ScrollText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Log Aktivitas</span>
            </button>
          )}

          {/* 6. Manajemen Kantor (Khusus Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={() => onNavigate('manajemen-kantor')}
              className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
            >
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Manajemen Kantor</span>
            </button>
          )}

          {/* 7. Pengaturan Sistem (Diperlihatkan untuk semua user, teknisi diarahkan ke tab personal/account) */}
          <button
            onClick={() => onNavigate('pengaturan', currentUser?.role === 'teknisi' ? 'account' : 'thresholds')}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-50/50 hover:bg-cyan-100/60 border border-sky-200/60 hover:border-cyan-400 transition group text-center min-h-[58px]"
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold text-slate-800 leading-tight">Pengaturan Sistem</span>
          </button>
        </div>
      </section>

      {/* 4. Segmented Status Ticker Bar Terpadu (Opsi B: 1 Baris Penuh Muat 1 Layar Tanpa Swipe) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total',
            value: kpi.total_monitored,
            colorScheme: 'cyan',
            onClick: () => onNavigate('pelanggan'),
            subLabel: kpi.monitored_inactive > 0 ? `(${kpi.monitored_inactive} OFF)` : 'Modem'
          },
          {
            label: 'Optimal',
            value: kpi.normal,
            colorScheme: 'emerald',
            onClick: () => onNavigate('pelanggan'),
            subLabel: `> ${Number(kpi.warning_threshold ?? -26.0).toFixed(1)} dBm`
          },
          {
            label: 'Waspada',
            value: kpi.warning,
            colorScheme: 'amber',
            onClick: () => onNavigate('pelanggan'),
            subLabel: `≤ ${Number(kpi.warning_threshold ?? -26.0).toFixed(1)} dBm`
          },
          {
            label: 'Kritis',
            value: kpi.critical,
            colorScheme: 'rose',
            onClick: () => onNavigate('pelanggan'),
            subLabel: `≤ ${Number(kpi.critical_threshold ?? -27.0).toFixed(1)} dBm`
          },
          {
            label: 'LOS',
            value: kpi.los,
            colorScheme: 'purple',
            onClick: () => onNavigate('pelanggan'),
            subLabel: 'Putus'
          },
          {
            label: 'Invalid',
            value: kpi.invalid || 0,
            colorScheme: 'orange',
            onClick: () => onNavigate('pelanggan'),
            subLabel: 'Kredensial'
          }
        ]}
      />

      {/* 5. VISUALISASI GRAFIK RIWAYAT REDAMAN (CHART.JS TELEMETRY DENGAN STYLE KACA MODERN) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 border border-sky-200/80 shadow-xs relative overflow-hidden space-y-3 sm:space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-700" />
                <span>Tren Kualitas Redaman</span>
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                Batas: {Number(chartStats.threshold ?? kpi.warning_threshold ?? -26.0).toFixed(1)} dBm
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
              Fluktuasi sinyal optik rata-rata jaringan ISP
            </p>
          </div>

          {/* Filter Tanggal & Segmented Control */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto font-mono relative" ref={calendarRef}>
            {/* Tombol Pemilih Kalender Popover */}
            <div className="relative flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                title="Pilih tanggal dari riwayat rekaman database"
                className={`w-full sm:w-auto px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs rounded-lg border min-h-[34px] sm:min-h-[36px] font-bold transition flex items-center justify-between sm:justify-start gap-1.5 cursor-pointer select-none ${
                  chartRange === 'custom'
                    ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs'
                    : 'bg-sky-50/70 hover:bg-sky-100/70 text-slate-800 border-sky-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-3.5 h-3.5 ${chartRange === 'custom' ? 'text-white' : 'text-cyan-700'}`} />
                  <span>{formatDisplayDate(selectedDate)}</span>
                </div>
              </button>

              {/* Popover Kalender Interaktif */}
              {isCalendarOpen && (
                <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-sky-200 p-3 w-[275px] sm:w-[290px] animate-in fade-in zoom-in-95 duration-150">
                  {/* Header Bulan & Navigasi */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-sky-100 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(calendarViewMonth)
                        prev.setMonth(prev.getMonth() - 1)
                        setCalendarViewMonth(prev)
                      }}
                      className="p-1 rounded hover:bg-sky-100 text-slate-600 transition cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800">
                      {formatMonthYear(calendarViewMonth)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarViewMonth)
                        next.setMonth(next.getMonth() + 1)
                        setCalendarViewMonth(next)
                      }}
                      className="p-1 rounded hover:bg-sky-100 text-slate-600 transition cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header Nama Hari */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-500 font-sans">
                    <span>Sen</span>
                    <span>Sel</span>
                    <span>Rab</span>
                    <span>Kam</span>
                    <span>Jum</span>
                    <span>Sab</span>
                    <span>Min</span>
                  </div>

                  {/* Grid Tanggal */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {renderCalendarDays()}
                  </div>

                  {/* Footer Keterangan */}
                  <div className="mt-2.5 pt-2 border-t border-sky-100 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 inline-block" />
                      <span>Data tersedia</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-cyan-700 font-bold hover:underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Filter Cepat */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setChartRange('today')
                  setSelectedDate(todayStr)
                  setIsCalendarOpen(false)
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition font-mono cursor-pointer ${
                  chartRange === 'today'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'bg-sky-50/70 text-slate-700 hover:bg-sky-100/70'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                disabled={!hasYesterdayData}
                onClick={() => {
                  if (!hasYesterdayData) return
                  setChartRange('yesterday')
                  setSelectedDate(todayStr)
                  setIsCalendarOpen(false)
                }}
                title={hasYesterdayData ? 'Bandingkan dengan hari kemarin' : 'Data kemarin belum ada di database'}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition font-mono ${
                  !hasYesterdayData
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                    : chartRange === 'yesterday'
                    ? 'bg-cyan-700 text-white shadow-xs cursor-pointer'
                    : 'bg-sky-50/70 text-slate-700 hover:bg-sky-100/70 cursor-pointer'
                }`}
              >
                Kemarin
              </button>
              <button
                type="button"
                disabled={!hasWeekData}
                onClick={() => {
                  if (!hasWeekData) return
                  setChartRange('week')
                  setSelectedDate(todayStr)
                  setIsCalendarOpen(false)
                }}
                title={hasWeekData ? 'Bandingkan tren 7 hari terakhir' : 'Riwayat 7 hari sebelumnya belum ada di database'}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition font-mono ${
                  !hasWeekData
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                    : chartRange === 'week'
                    ? 'bg-cyan-700 text-white shadow-xs cursor-pointer'
                    : 'bg-sky-50/70 text-slate-700 hover:bg-sky-100/70 cursor-pointer'
                }`}
              >
                7 Hari
              </button>
            </div>
          </div>
        </div>

        {/* Data Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-slate-700 font-mono">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-100 text-cyan-800 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">
                Rata-rata:
              </span>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {chartStats.avg_dbm !== null ? `${chartStats.avg_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider block">
                Terbaik:
              </span>
              <span className="font-extrabold text-emerald-800 text-xs sm:text-sm">
                {chartStats.min_dbm !== null ? `${chartStats.min_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-rose-100 text-rose-800 shrink-0">
              <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[11px] text-rose-800 font-bold uppercase tracking-wider block">
                Terendah:
              </span>
              <span className="font-extrabold text-rose-800 text-xs sm:text-sm">
                {chartStats.max_dbm !== null ? `${chartStats.max_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-200 text-slate-800 shrink-0">
              <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">
                Total Sampel:
              </span>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{chartStats.total_points} Scan</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas Container dengan Zoom Controls & Empty State Proteksi */}
        <div className="relative w-full h-[220px] sm:h-[290px] overflow-hidden rounded-xl bg-white border border-sky-100">
          {/* Empty State Overlay jika tidak ada data riil sama sekali */}
          {chartStats.total_points === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-xs p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-sky-100 text-cyan-700 flex items-center justify-center mb-2 shadow-xs">
                <Activity className="w-5 h-5 opacity-70" />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">
                Belum Ada Riwayat Log Redaman
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                Data rekaman untuk rentang atau tanggal ini belum tersimpan di database. Sistem akan memetakan grafik otomatis setelah monitoring berjalan.
              </p>
            </div>
          )}

          {/* Zoom Buttons Mobile */}
          <div className="sm:hidden absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-sky-200 shadow-xs">
            <button
              onClick={handleZoomIn}
              className="w-6 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-900 flex items-center justify-center transition active:scale-90"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-6 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-900 flex items-center justify-center transition active:scale-90"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1.5 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-950 text-[11px] font-mono font-extrabold flex items-center justify-center gap-0.5 transition active:scale-90"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div
            className="w-full h-full transition-transform duration-200 ease-out origin-center"
            style={{ transform: `scale(${zoomScale})` }}
          >
            <canvas ref={chartCanvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Legend Footer */}
        <div className="pt-2 sm:pt-3 border-t border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 text-[11px] font-mono text-slate-600">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {activeDatasets
              .filter((d) => !d.isThreshold)
              .map((ds, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleDataset(ds.index)}
                  className="flex items-center gap-1 hover:opacity-80 transition select-none cursor-pointer"
                  title={`Klik untuk toggle ${ds.label}`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: ds.color }}
                  />
                  <span
                    className={`font-bold text-slate-800 ${
                      ds.hidden ? 'line-through opacity-40' : ''
                    }`}
                  >
                    {ds.label}
                  </span>
                </button>
              ))}

            <div className="flex items-center gap-1 ml-0.5 pl-1.5 border-l border-sky-200">
              <span className="h-0.5 w-2 sm:w-3 bg-amber-500 inline-block" />
              <span className="text-amber-800 font-bold">
                Warning ({Number(chartStats.threshold ?? kpi.warning_threshold ?? -26.0).toFixed(1)}dBm)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-0.5 w-2 sm:w-3 bg-rose-500 inline-block" />
              <span className="text-rose-800 font-bold">
                Kritis ({Number(chartStats.critical_threshold ?? kpi.critical_threshold ?? -27.0).toFixed(1)}dBm)
              </span>
            </div>
          </div>
          <div className="text-slate-600 text-[11px]">
            Optimal: <span className="font-extrabold text-emerald-800">&gt; {Number(chartStats.threshold ?? kpi.warning_threshold ?? -26.0).toFixed(1)} dBm</span>
          </div>
        </div>
      </div>

      {/* 6. QUICK SHORTCUT NAVIGATION (2 MODULAR ACTION TILES) */}
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

      {/* 7. TOAST NOTIFICATION FLOATING */}
      {toast.show && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-6 z-50 max-w-sm rounded-2xl p-3.5 shadow-xl border text-xs font-mono font-bold flex items-center gap-3 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.type === 'info'
              ? 'bg-cyan-700 text-white border-cyan-600'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          <div className="shrink-0">
            {toast.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-100" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-100" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-100" />}
          </div>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="opacity-80 hover:opacity-100 p-1 text-white text-base"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
