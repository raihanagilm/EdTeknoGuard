import React from 'react'
import { Play, Pause, Square, RefreshCw, Clock } from 'lucide-react'
import { formatDuration } from './dashboardUtils'

/**
 * DashboardControlBar — Mode: Operate (Architectural Clean Light Blue 60-30-10)
 * Kartu Bento Terpadu: Kontrol Status Pemantauan + Bar Progres + Bar Waktu + 6 Metrik Bersekat Rapat
 */
export function DashboardControlBar({
  activeOffice,
  getOfficeDisplayName,
  engineStatus,
  isOfficeActive,
  isConfigured,
  configError,
  isNetworkError,
  intervalMinutes,
  lastScanTime,
  nextRunTime,
  isScanning,
  isStartingScan,
  scanActionType,
  isToggling,
  scanProgress,
  isCurrentOfficeScan,
  canControlCurrentScan,
  isAdminOrSuper,
  isSuperAdmin,
  isAnyActionLoading,
  handleStartScan,
  handleToggleScheduler,
  handlePauseScan,
  handleResumeScan,
  handleOpenStopModal,
  kpi = {},
  activeMetric = 'total',
  setActiveMetric = () => {},
  onNavigate = () => {}
}) {
  const isCurrentlyScanning = isScanning && isCurrentOfficeScan
  const isRunning = engineStatus === 'RUNNING'

  let statusLabel = 'Aktif'
  let statusTextColor = 'text-[#026AA7]'

  if (isNetworkError) {
    statusLabel = 'Gangguan'
    statusTextColor = 'text-rose-600'
  } else if (!isOfficeActive) {
    statusLabel = 'Nonaktif'
    statusTextColor = 'text-[#64839E]'
  } else if (isCurrentlyScanning) {
    statusLabel = 'Memindai'
    statusTextColor = 'text-[#026AA7]'
  } else if (!isRunning) {
    statusLabel = 'Dihentikan'
    statusTextColor = 'text-[#026AA7]'
  }

  // Ambang batas dinamis
  const warningThresh = Number(kpi?.warning_threshold ?? -26.0).toFixed(1)
  const criticalThresh = Number(kpi?.critical_threshold ?? -27.0).toFixed(1)

  return (
    <div className="bg-white rounded-xl border border-[#CCDDF0] overflow-hidden shadow-2xs transition-all">
      {/* Bagian Atas: Kontrol Status Pemantauan */}
      <div className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h2 className="text-sm font-bold text-[#0B2545] tracking-tight">Status Pemantauan</h2>
            <span className="h-3.5 w-px bg-[#CCDDF0]"></span>
            <span className={`text-xs font-semibold ${statusTextColor}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-[#3B5B78] mt-1 flex-wrap">
            <span>
              Kantor: <strong className="text-[#0B2545] font-semibold">{getOfficeDisplayName(activeOffice)}</strong>
            </span>
            {isRunning && (
              <>
                <span className="h-3 w-px bg-[#CCDDF0]"></span>
                <span className="text-[#64839E]">Siklus {intervalMinutes} menit</span>
              </>
            )}
            {isNetworkError && (
              <>
                <span className="h-3 w-px bg-[#CCDDF0]"></span>
                <span className="text-rose-600 font-medium">Gateway tidak merespons</span>
              </>
            )}
          </div>
        </div>

        {/* Tombol Aksi Kontrol */}
        {isAdminOrSuper && (
          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {isToggling && (
              <div className="flex items-center gap-1.5 text-[#026AA7] text-xs font-medium shrink-0">
                <RefreshCw className="animate-spin h-3.5 w-3.5 text-[#026AA7]" />
                <span>Menyimpan...</span>
              </div>
            )}

            {/* Kondisi 1: Standby / Idle */}
            {(!isScanning || !isCurrentOfficeScan) && (
              <>
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={isAnyActionLoading || (isScanning && isCurrentOfficeScan) || !isOfficeActive || !isConfigured}
                  title={
                    !isOfficeActive
                      ? 'Kantor dalam status nonaktif.'
                      : !isConfigured
                      ? (configError || 'Pengaturan sistem kantor belum disetel di database.')
                      : isStartingScan
                      ? 'Sedang memproses perintah pemindaian...'
                      : 'Mulai pemindaian sinyal redaman'
                  }
                  className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs min-h-[36px] sm:min-h-[38px] cursor-pointer ${
                    !isOfficeActive || !isConfigured
                      ? 'bg-[#F1F6FC] text-[#64839E] border border-[#CCDDF0] cursor-not-allowed'
                      : isStartingScan
                      ? 'bg-[#035388] text-white cursor-wait opacity-80'
                      : 'bg-[#026AA7] hover:bg-[#035388] text-white'
                  }`}
                >
                  {isStartingScan ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className={`w-3.5 h-3.5 ${!isOfficeActive || !isConfigured ? 'fill-[#64839E] text-[#64839E]' : 'fill-white'}`} />
                  )}
                  <span>
                    {isStartingScan
                      ? 'Memulai...'
                      : !isOfficeActive
                      ? 'Kantor Nonaktif'
                      : !isConfigured
                      ? 'Pengaturan Kosong'
                      : activeOffice && activeOffice !== 'all'
                      ? `Pindai ${getOfficeDisplayName(activeOffice)}`
                      : 'Mulai Pemantauan'}
                  </span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleToggleScheduler}
                    disabled={isAnyActionLoading || !isOfficeActive}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#0B2545] border border-[#CCDDF0] text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs min-h-[36px] sm:min-h-[38px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isToggling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-[#026AA7] animate-spin shrink-0" />
                        <span>Menyimpan...</span>
                      </>
                    ) : isRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-[#026AA7]" />
                        <span>Hentikan Jadwal</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#026AA7] fill-current" />
                        <span>Aktifkan Jadwal</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Kondisi 2: Active Scanning */}
            {isScanning && isCurrentOfficeScan && canControlCurrentScan && scanProgress?.total > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePauseScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#0B2545] border border-[#CCDDF0] text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[36px] sm:min-h-[38px]"
                >
                  {scanActionType === 'pause' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-[#026AA7] animate-spin shrink-0" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-[#026AA7]" />
                  )}
                  <span>{scanActionType === 'pause' ? 'Memproses...' : 'Jeda Pemindaian'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[36px] sm:min-h-[38px]"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan'}</span>
                </button>
              </>
            )}

            {/* Kondisi 3: Scan Paused */}
            {isScanning && scanProgress && scanProgress.is_paused && isCurrentOfficeScan && canControlCurrentScan && (
              <>
                <button
                  type="button"
                  onClick={handleResumeScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[36px] sm:min-h-[38px]"
                >
                  {scanActionType === 'resume' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>{scanActionType === 'resume' ? 'Melanjutkan...' : 'Lanjutkan'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#0B2545] border border-[#CCDDF0] text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[36px] sm:min-h-[38px]"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-[#026AA7] animate-spin shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#026AA7] fill-[#026AA7]" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bar Progres (Tampil saat Memindai) */}
      {isScanning && isCurrentOfficeScan && scanProgress?.total > 0 && (
        <div className="px-5 py-3.5 border-t border-[#DAE7F5] bg-[#F1F6FC] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[#3B5B78] font-medium">
              <span>{scanProgress.is_paused ? 'Pemindaian Ditunda:' : 'Progres Pemindaian:'}</span>
              <span className="font-mono tabular-nums text-[#0B2545] font-bold">
                {scanProgress.current} / {scanProgress.total}
              </span>
              <span className="text-[#64839E]">Modem</span>
            </span>
            <span className="text-[#026AA7] font-mono font-bold tabular-nums text-xs">{scanProgress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#CCDDF0] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${scanProgress.is_paused ? 'bg-amber-500' : 'bg-[#026AA7]'}`}
              style={{ width: `${Math.min(100, Math.max(0, scanProgress.percent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#64839E]">
            <span>Berjalan: {formatDuration(scanProgress.elapsed_seconds)}</span>
            <span>
              Estimasi Sisa:{' '}
              {formatDuration(Math.max(0, (scanProgress.estimated_total_seconds || 0) - (scanProgress.elapsed_seconds || 0)))}
            </span>
          </div>
        </div>
      )}

      {/* Bar Informasi Waktu */}
      <div className="px-5 py-2.5 bg-[#F1F6FC] border-t border-b border-[#DAE7F5] flex items-center justify-between text-xs text-[#3B5B78]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#64839E] shrink-0" />
          <span>Terakhir:</span>
          <strong className="text-[#0B2545] font-mono tabular-nums font-semibold">{lastScanTime}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Jadwal Berikutnya:</span>
          <strong className="text-[#0B2545] font-mono tabular-nums font-semibold">
            {isRunning && nextRunTime && nextRunTime !== '-' && nextRunTime !== 'Jadwal Dijeda' && nextRunTime !== 'Kantor Nonaktif'
              ? nextRunTime
              : '-'}
          </strong>
        </div>
      </div>

      {/* Bagian Bawah Kartu Bento: 6 Metrik Bersekat Rapat (6 Kolom Penuh Presisi di Mobile Tanpa Wrap) */}
      <div className="grid grid-cols-6 divide-x divide-[#DAE7F5] bg-[#F1F6FC] w-full">
        {/* 1. Total */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('total')
            onNavigate('pelanggan', { status: 'ALL' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'total' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            Total
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.total_monitored ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] text-[#64839E] mt-0.5">
            {kpi?.offline !== undefined && kpi?.offline !== null
              ? `${kpi.offline} Offline`
              : kpi?.monitored_inactive > 0
              ? `${kpi.monitored_inactive} Offline`
              : 'Modem'}
          </span>
        </button>

        {/* 2. Optimal */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('normal')
            onNavigate('pelanggan', { status: 'NORMAL' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'normal' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            Optimal
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.normal ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] font-mono text-[#64839E] mt-0.5">&gt; {warningThresh} dBm</span>
        </button>

        {/* 3. Waspada */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('warning')
            onNavigate('pelanggan', { status: 'WARNING' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'warning' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            Waspada
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.warning ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] font-mono text-[#64839E] mt-0.5">&le; {warningThresh} dBm</span>
        </button>

        {/* 4. Kritis */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('critical')
            onNavigate('pelanggan', { status: 'CRITICAL' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'critical' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            Kritis
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.critical ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] font-mono text-[#64839E] mt-0.5">&le; {criticalThresh} dBm</span>
        </button>

        {/* 5. LOS */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('los')
            onNavigate('pelanggan', { status: 'LOS' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'los' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            LOS
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.los ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] text-[#64839E] mt-0.5">Putus</span>
        </button>

        {/* 6. Invalid */}
        <button
          type="button"
          onClick={() => {
            setActiveMetric('invalid')
            onNavigate('pelanggan', { status: 'INVALID' })
          }}
          className={`metric-cell py-2.5 sm:py-4 px-1 sm:px-4 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:bg-white transition ${
            activeMetric === 'invalid' ? 'active' : ''
          }`}
        >
          <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5B78] truncate w-full">
            Invalid
          </span>
          <span className="text-sm sm:text-xl font-bold font-mono tabular-nums tracking-tight text-[#0B2545] mt-0.5 sm:mt-1">
            {kpi?.invalid ?? 0}
          </span>
          <span className="hidden sm:block text-[11px] text-[#64839E] mt-0.5">Kredensial</span>
        </button>
      </div>
    </div>
  )
}
