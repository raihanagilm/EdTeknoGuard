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
  Play,
  Pause,
  Square,
  RefreshCw,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart2
} from 'lucide-react'
import Chart from 'chart.js/auto'
import { MonitoringService } from '../services/api'
import { ModuleHeader, MetricCard } from './CommonUI'

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
  onNavigate = () => {}
}) {
  // State Engine & Kontrol
  const [engineStatus, setEngineStatus] = useState('RUNNING')
  const [lastScanTime, setLastScanTime] = useState('-')
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
    monitored_inactive: 0
  })

  // State Grafik & Filter
  const [chartRange, setChartRange] = useState('today')
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [chartStats, setChartStats] = useState({
    avg_dbm: null,
    min_dbm: null,
    max_dbm: null,
    total_points: 0
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

  // 1. Fetch Engine Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await MonitoringService.getStatus()
      if (res.ok && res.data) {
        const data = res.data
        const wasScanning = isScanning
        setEngineStatus(data.status || 'RUNNING')
        setLastScanTime(data.last_scan_time || '-')
        setIsScanning(Boolean(data.is_scanning))

        if (data.scan_progress) {
          setScanProgress(data.scan_progress)
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
          if (chartRange === 'today') {
            loadChartData()
          }
        }
      }
    } catch (err) {
      console.error('Gagal mengambil status monitoring:', err)
      setIsNetworkError(true)
    }
  }, [isScanning, chartRange])

  // 2. Fetch KPI Metrics
  const fetchKpi = useCallback(async () => {
    try {
      const res = await MonitoringService.getKpi()
      if (res.ok && res.data) {
        setKpi(res.data)
        if (res.data.total_monitored > 0 && res.data.los === res.data.total_monitored) {
          setIsNetworkError(true)
        }
      }
    } catch (err) {
      console.error('Gagal mengambil metrik KPI:', err)
    }
  }, [])

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

  // 4. Load Chart Data
  const loadChartData = useCallback(async () => {
    if (!chartInstanceRef.current) return
    try {
      const params = { range: chartRange }
      if (selectedDate) {
        params.date = selectedDate
      }
      const res = await MonitoringService.getChartData(params)
      if (res.ok && res.data) {
        const json = res.data
        const rawLabels = json.labels || []
        const count = rawLabels.length
        const warnThreshold = json.threshold !== undefined ? json.threshold : -26.0
        const critThreshold = json.critical_threshold !== undefined ? json.critical_threshold : -27.0
        const warnVal = transformDbm(Math.abs(warnThreshold))
        const critVal = transformDbm(Math.abs(critThreshold))

        let datasets = []

        if (json.datasets && json.datasets.length > 0) {
          const isMulti = json.datasets.length > 1
          datasets = json.datasets.map((ds) => {
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
              borderWidth: json.datasets.length > 2 ? 2 : 2.5,
              fill: !isMulti,
              tension: 0.12,
              pointRadius: json.datasets.length > 2 ? 3.5 : 5,
              pointHoverRadius: json.datasets.length > 2 ? 6 : 8,
              pointBackgroundColor: ds.color || '#0891b2',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              showLine: true,
              spanGaps: true,
              isThreshold: false
            }
          })
        } else {
          const transformedValues = (json.values || []).map((v) =>
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
          total_points: json.total_points || 0
        })

        chartInstanceRef.current.update('none')
      }
    } catch (err) {
      console.warn('Gagal memuat data grafik:', err)
    }
  }, [chartRange, selectedDate])

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
              font: { size: 10.5, family: 'Inter', weight: '600' }
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
              font: { size: 11, family: 'Inter' },
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
            titleFont: { family: 'Inter', size: 11, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 10, weight: '500' },
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
    loadChartData()
  }, [chartRange, selectedDate, activeOffice, loadChartData])

  // Polling berkala
  useEffect(() => {
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

    const fastInterval = setInterval(() => {
      if (document.hidden) return
      if (isScanning || (scanProgress && scanProgress.is_scanning)) {
        fetchStatus()
      }
    }, 1500)

    return () => {
      clearInterval(regularInterval)
      clearInterval(fastInterval)
    }
  }, [isScanning, scanProgress, chartRange, fetchStatus, fetchKpi, fetchNotifications, loadChartData])

  // Handler Kontrol Pemindaian
  const handleStartScan = async () => {
    if (isScanning) return
    const targetLabel =
      activeOffice === 'banyumas'
        ? 'Banyumas'
        : activeOffice === 'cabang'
        ? 'Cabang'
        : activeOffice === 'pusat'
        ? 'Pusat'
        : 'Seluruh Kantor'
    showToast(`Memulai pemindaian manual ONT ${targetLabel}...`, 'info')
    setIsScanning(true)
    try {
      const res = await MonitoringService.triggerScanAll()
      if (res.ok && res.data && res.data.status !== 'error') {
        setIsNetworkError(false)
        showToast(`Pemindaian ONT ${targetLabel} berhasil selesai!`, 'success')
        await fetchStatus()
        await fetchKpi()
        await loadChartData()
      } else {
        showToast(res.data?.message || 'Pemindaian sedang berjalan di latar belakang', 'info')
      }
    } catch (err) {
      console.error('Gagal memicu pemindaian:', err)
      showToast('Koneksi Gagal: Tidak dapat menghubungi modem ONT (10.10.x.x)', 'error')
      setIsNetworkError(true)
    } finally {
      setIsScanning(false)
      fetchStatus()
      fetchKpi()
    }
  }

  const handlePauseScan = async () => {
    try {
      const res = await MonitoringService.pauseScan()
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
      const res = await MonitoringService.resumeScan()
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
      const res = await MonitoringService.stopScan()
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
      const res = await MonitoringService.toggleScheduler()
      if (res.ok && res.data) {
        setEngineStatus(res.data.scheduler_status)
        if (res.data.interval_minutes) setIntervalMinutes(res.data.interval_minutes)
        if (wasRunning) {
          showToast('Jadwal pemantauan otomatis dijeda (STOPPED)', 'info')
        } else {
          showToast('Jadwal pemantauan otomatis diaktifkan (RUNNING)', 'success')
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

  return (
    <div className="space-y-4 font-sans">
      {/* 1. HEADER UTAMA (MODERN CYAN GLASS MVC TOKEN) */}
      <ModuleHeader
        badge="PUSAT OPERASIONAL NOC"
        icon={Activity}
        title="Monitoring dan Deteksi Dini ONT"
        subtitle={`Pemeriksaan otomatis setiap ${intervalMinutes} menit ke seluruh modem ONT pelanggan`}
      >
        <button
          onClick={() => onNavigate('pelanggan')}
          className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 text-cyan-900 border border-sky-200 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-2xs min-h-[38px]"
        >
          <Users className="w-3.5 h-3.5 text-cyan-700" />
          <span>Kelola Pelanggan</span>
        </button>
      </ModuleHeader>

      {/* 2. MENU LAYANAN & OPERASIONAL (TABLER MODULAR ACTION TILES - KHUSUS MOBILE / AKSES CEPAT) */}
      <section className="lg:hidden bg-white/90 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-sky-200/80 shadow-xs">
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 bg-cyan-600 rounded-full" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 font-mono uppercase tracking-wide">
              Menu Layanan &amp; Operasional
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">Akses Cepat</span>
        </header>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {/* 1. Data Pelanggan */}
          <button
            onClick={() => onNavigate('pelanggan')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Pelanggan</span>
          </button>

          {/* 2. Tiket Keluhan */}
          <button
            onClick={() => onNavigate('tiket')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center relative"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition relative">
              <Ticket className="w-5 h-5" />
              {unreadTicketsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-center text-[9px] font-black text-white bg-rose-600 rounded-full border border-white shadow-xs animate-pulse">
                  {unreadTicketsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Tiket</span>
          </button>

          {/* 3. Pemantauan Kuota */}
          <button
            onClick={() => onNavigate('kuota')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Kuota</span>
          </button>

          {/* 4. Riwayat Redaman */}
          <button
            onClick={() => onNavigate('riwayat')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Redaman</span>
          </button>

          {/* 5. Log Aktivitas */}
          <button
            onClick={() => onNavigate('log')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Aktivitas</span>
          </button>

          {/* 6. Pengaturan Sistem */}
          {isAdminOrSuper && (
            <button
              onClick={() => onNavigate('pengaturan')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Pengaturan</span>
            </button>
          )}

          {/* 7. Manajemen Pengguna */}
          {isSuperAdmin && (
            <button
              onClick={() => onNavigate('pengguna')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">Pengguna</span>
            </button>
          )}

          {/* 8. Web Pelanggan (TeknoCust) */}
          <a
            href="/teknocust"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-cyan-50/40 hover:bg-cyan-50 border border-sky-200/60 hover:border-cyan-400 transition group text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 leading-tight">TeknoCust</span>
          </a>
        </div>
      </section>

      {/* 3. TABLER COMMAND CONTROL BAR: STATUS ENGINE & ACTION BUTTONS */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-sky-200/80 shadow-xs space-y-3.5 relative overflow-hidden">
        {/* Status Bar Top Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            isNetworkError
              ? 'bg-rose-500'
              : engineStatus === 'RUNNING'
              ? 'bg-emerald-500'
              : 'bg-amber-500'
          }`}
        />

        {/* Baris Utama: Status, Timer Interval & Tombol Kontrol */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 pt-1">
          {/* Sisi Kiri: Status Pemantau Otomatis */}
          <div className="flex items-center gap-3">
            <div
              className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                isNetworkError
                  ? 'bg-rose-500 shadow-xs shadow-rose-200'
                  : engineStatus === 'RUNNING'
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-200'
                  : 'bg-amber-500 shadow-xs shadow-amber-200'
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full bg-white ${
                  engineStatus === 'RUNNING' && !isNetworkError ? 'animate-ping' : ''
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {isNetworkError ? (
                    <span className="text-rose-600">Status: Gagal Terhubung ke Jaringan Modem ONT</span>
                  ) : engineStatus === 'RUNNING' ? (
                    <span>
                      Pemantauan Otomatis: Aktif (Setiap{' '}
                      <strong className="text-cyan-700 font-black underline decoration-cyan-300">
                        {intervalMinutes}
                      </strong>{' '}
                      Menit)
                    </span>
                  ) : (
                    <span className="text-amber-700">Pemantauan Otomatis: Dijeda</span>
                  )}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono uppercase tracking-wide border ${
                    isNetworkError
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : engineStatus === 'RUNNING'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isNetworkError ? 'GAGAL JARINGAN' : engineStatus === 'RUNNING' ? 'BERJALAN' : 'DIJEDA'}
                </span>
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5 font-mono">
                <span>Pemeriksaan Terakhir:</span>
                <strong className="text-slate-800 font-bold">{lastScanTime}</strong>
                <span className="text-slate-300">|</span>
                <span
                  className={`text-[11px] font-bold ${
                    isNetworkError
                      ? 'text-rose-600'
                      : engineStatus === 'RUNNING'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {isNetworkError
                    ? 'Gateway modem ONT tidak merespons (Periksa koneksi LAN/VLAN)'
                    : engineStatus === 'RUNNING'
                    ? `Sedang Berjalan: Memindai otomatis setiap ${intervalMinutes} menit`
                    : 'Sedang Dijeda: Jadwal pemantauan dihentikan sementara'}
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Kontrol Cerdas */}
          {isAdminOrSuper && (
            <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-sky-100">
              {isToggling && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-bold shrink-0">
                  <RefreshCw className="animate-spin h-3.5 w-3.5 text-cyan-600" />
                  <span>Menyimpan...</span>
                </div>
              )}

              {/* Kondisi 1: Standby / Idle */}
              {!isScanning && (!scanProgress || !scanProgress.is_paused) && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleStartScan}
                    disabled={isToggling}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs shadow-cyan-600/20 min-h-[38px]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      {activeOffice && activeOffice !== 'all'
                        ? `Pindai ${
                            activeOffice === 'banyumas'
                              ? 'Banyumas'
                              : activeOffice === 'cabang'
                              ? 'Cabang'
                              : 'Pusat'
                          }`
                        : 'Mulai Pemantauan (Semua)'}
                    </span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={handleToggleScheduler}
                      disabled={isToggling}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-cyan-50/60 text-slate-700 font-mono text-xs font-bold border border-sky-200 transition flex items-center justify-center gap-1.5 min-h-[38px]"
                      title={
                        engineStatus === 'RUNNING'
                          ? 'Klik untuk menjeda jadwal pemindaian otomatis'
                          : 'Klik untuk mengaktifkan kembali jadwal pemindaian otomatis'
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

              {/* Kondisi 2: Sedang Memindai */}
              {isScanning && (
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

              {/* Kondisi 3: Pemindaian Dijeda */}
              {!isScanning && scanProgress && scanProgress.is_paused && (
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
          {/* Sedang Memindai */}
          {(isScanning || (scanProgress && scanProgress.is_scanning)) && (
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
                  className="bg-gradient-to-r from-cyan-500 to-sky-600 h-2.5 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.max(scanProgress.percent || 3, 3)}%` }}
                />
              </div>
            </div>
          )}

          {/* Pemindaian Terjeda */}
          {!isScanning && scanProgress && scanProgress.is_paused && (
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
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(scanProgress.percent || 3, 3)}%` }}
                />
              </div>
            </div>
          )}

          {/* Standby */}
          {!isScanning && (!scanProgress || (!scanProgress.is_scanning && !scanProgress.is_paused)) && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700 bg-cyan-50/40 px-3.5 py-2.5 rounded-xl border border-sky-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-700" />
                <span className="text-slate-500 font-medium">Durasi Pemindaian Terakhir:</span>
                <strong className="text-slate-800 font-bold">
                  {scanProgress?.last_scan_duration > 0
                    ? `${formatDuration(scanProgress.last_scan_duration)} / siklus`
                    : 'Belum ada riwayat pemindaian'}
                </strong>
              </div>
              <div className="text-[11px] text-slate-500 font-bold">
                <span>Total Target: {scanProgress?.total || kpi.total_monitored || 0} Modem ONT</span>
              </div>
            </div>
          )}
        </div>

        {/* Informasi Edukatif Jaringan Lokal */}
        <div className="hidden sm:flex pt-3 border-t border-sky-100 items-start gap-2.5 text-xs text-slate-600 bg-cyan-50/40 p-3 rounded-xl border border-sky-100">
          <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900 font-mono">Panduan Jaringan:</strong> Server pemantau{' '}
            <span className="text-slate-900 font-semibold underline decoration-cyan-300">
              harus berada dalam satu segmen jaringan atau VLAN ISP yang sama
            </span>{' '}
            dengan modem ONT pelanggan (contoh: IP gateway{' '}
            <code className="font-mono bg-cyan-100/80 px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-900 font-bold">
              10.10.x.x
            </code>
            ) agar status perangkat terbaca normal.
          </div>
        </div>
      </div>

      {/* 4. TABLER MODULAR KPI STAT CARDS (4 KARTU KESEHATAN JARINGAN KONSISTEN COMMONUI) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Terpantau"
          value={kpi.total_monitored}
          unit="Modem"
          icon={Activity}
          colorScheme="cyan"
          subLabel={kpi.monitored_inactive > 0 ? `(${kpi.monitored_inactive} OFF)` : 'Modem aktif terdaftar'}
        />

        <MetricCard
          label="Sinyal Normal"
          value={kpi.normal}
          unit="> -26 dBm"
          icon={CheckCircle2}
          colorScheme="emerald"
          subLabel="Kondisi sinyal prima"
        />

        <MetricCard
          label="Peringatan Redaman"
          value={kpi.warning}
          unit="≤ -26 dBm"
          icon={AlertTriangle}
          colorScheme="amber"
          subLabel="Kabel tertekuk / redaman turun"
        />

        <MetricCard
          label="Modem Putus / Mati"
          value={kpi.los + kpi.critical}
          unit="Offline"
          icon={ZapOff}
          colorScheme="rose"
          subLabel="Sinyal putus / modem padam"
        />
      </div>

      {/* 5. VISUALISASI GRAFIK RIWAYAT REDAMAN (CHART.JS TELEMETRY DENGAN STYLE KACA MODERN) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-sky-200/80 shadow-sm relative overflow-hidden space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 pt-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <span>Tren Riwayat Kualitas Redaman (dBm)</span>
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Batas Peringatan: -26.0 dBm
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Pemantauan kurva fluktuasi sinyal optik rata-rata jaringan ISP dari tabel database
            </p>
          </div>

          {/* Filter Tanggal & Segmented Control */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto font-mono">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setChartRange('custom')
              }}
              title="Pilih tanggal spesifik"
              className="px-2.5 py-1.5 text-xs bg-cyan-50/40 hover:bg-cyan-50 focus:bg-white text-slate-800 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-h-[36px] font-bold transition cursor-pointer"
            />

            <div className="flex items-center bg-cyan-50/60 p-1 rounded-xl border border-sky-200 text-xs font-bold">
              <button
                onClick={() => {
                  setChartRange('today')
                  setSelectedDate(todayStr)
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  chartRange === 'today' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => {
                  setChartRange('yesterday')
                  setSelectedDate(todayStr)
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  chartRange === 'yesterday' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kemarin
              </button>
              <button
                onClick={() => {
                  setChartRange('week')
                  setSelectedDate(todayStr)
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  chartRange === 'week' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
            </div>
          </div>
        </div>

        {/* Data Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-cyan-50/40 rounded-xl border border-sky-100 text-xs text-slate-700 font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Rata-rata:
              </span>
              <span className="font-extrabold text-slate-800">
                {chartStats.avg_dbm !== null ? `${chartStats.avg_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                Terbaik:
              </span>
              <span className="font-extrabold text-emerald-700">
                {chartStats.min_dbm !== null ? `${chartStats.min_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                Terendah:
              </span>
              <span className="font-extrabold text-rose-700">
                {chartStats.max_dbm !== null ? `${chartStats.max_dbm} dBm` : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Sampel:
              </span>
              <span className="font-extrabold text-slate-800">{chartStats.total_points} Scan</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas Container dengan Zoom Controls */}
        <div className="relative w-full h-[250px] sm:h-[290px] overflow-hidden rounded-xl bg-white border border-sky-100">
          {/* Zoom Buttons Mobile */}
          <div className="sm:hidden absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-sky-200 shadow-xs">
            <button
              onClick={handleZoomIn}
              className="w-6 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 flex items-center justify-center transition active:scale-90"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-6 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 flex items-center justify-center transition active:scale-90"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1.5 h-6 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-mono font-extrabold flex items-center justify-center gap-1 transition active:scale-90"
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
        <div className="pt-3 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            {activeDatasets
              .filter((d) => !d.isThreshold)
              .map((ds, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleDataset(ds.index)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition select-none cursor-pointer"
                  title={`Klik untuk menyembunyikan/menampilkan ${ds.label}`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: ds.color }}
                  />
                  <span
                    className={`font-bold text-slate-700 ${
                      ds.hidden ? 'line-through opacity-40' : ''
                    }`}
                  >
                    {ds.label}
                  </span>
                </button>
              ))}

            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-sky-200">
              <span className="h-0.5 w-3 bg-amber-400 inline-block" />
              <span className="text-amber-700 font-bold">Garis Warning (-26.0 dBm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-rose-400 inline-block" />
              <span className="text-rose-700 font-bold">Garis Kritis (-27.0 dBm)</span>
            </div>
          </div>
          <div>
            Nilai optimal: <span className="font-extrabold text-emerald-600">-12 s/d -25.9 dBm</span>
          </div>
        </div>
      </div>

      {/* 6. QUICK SHORTCUT NAVIGATION (2 MODULAR FEATURE CARDS BERDESAIN KACA CYAN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onNavigate('pelanggan')}
          className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-sky-200/80 shadow-xs hover:border-cyan-400 hover:shadow-md transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono group-hover:text-cyan-800 transition">
                Kelola Master Pelanggan
              </h3>
              <p className="text-xs text-slate-500 font-medium">Tabel seluruh modem ONT, filter POP/Kantor, dan live probe</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('tiket')}
          className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-sky-200/80 shadow-xs hover:border-cyan-400 hover:shadow-md transition flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-mono group-hover:text-cyan-800 transition">
                Tiket Keluhan Pelanggan
              </h3>
              <p className="text-xs text-slate-500 font-medium">Pantau laporan aduan warga desa dan update status penanganan</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition shrink-0" />
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
