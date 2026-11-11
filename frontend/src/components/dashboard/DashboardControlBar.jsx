import React from 'react'
import { Play, Pause, Square, RefreshCw, Clock } from 'lucide-react'
import { formatDuration } from './dashboardUtils'

/**
 * DashboardControlBar (Impeccable Architectural Clean Light)
 * Mode: Operate (Mission-Control Telemetry Header)
 * - Strict Light Theme: Architectural white + slate-50 + crisp slate-200 borders
 * - Precision Typography: Natural sans-serif for labels, font-mono tabular-nums for metrics & time
 * - Zero AI Slop: No decorative halos, no fake monospace costumes on action buttons
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
  handleOpenStopModal
}) {
  // Status Visual Mapping (Pure Typography - No Boxes, No Borders, No Dots)
  const isCurrentlyScanning = isScanning && isCurrentOfficeScan
  const isRunning = engineStatus === 'RUNNING'

  let statusLabel = 'Aktif'
  let statusTextColor = 'text-emerald-700'

  if (isNetworkError) {
    statusLabel = 'Gangguan'
    statusTextColor = 'text-rose-700'
  } else if (!isOfficeActive) {
    statusLabel = 'Nonaktif'
    statusTextColor = 'text-slate-500'
  } else if (isCurrentlyScanning) {
    statusLabel = 'Memindai'
    statusTextColor = 'text-cyan-800'
  } else if (!isRunning) {
    statusLabel = 'Dihentikan'
    statusTextColor = 'text-amber-700'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col gap-4 transition-all">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Office Telemetry & Status (Pure Typography - No Decorative Icon Box, No Dots) */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Status Pemantauan
            </h2>
            <span className="h-3.5 w-px bg-slate-200 inline-block" />
            {/* Pure Typography Status - No Box, No Border, No Dot */}
            <span className={`text-xs font-semibold ${statusTextColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* Sub-Telemetry (Natural Indonesian Sans-Serif - Zero Tautology) */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span>
              Kantor:{' '}
              <strong className="text-slate-800 font-medium">
                {getOfficeDisplayName(activeOffice)}
              </strong>
            </span>
            {isRunning && (
              <>
                <span className="h-3 w-px bg-slate-200 inline-block" />
                <span className="text-slate-500 font-normal">
                  Siklus {intervalMinutes} menit
                </span>
              </>
            )}
            {isNetworkError && (
              <>
                <span className="h-3 w-px bg-slate-200 inline-block" />
                <span className="text-rose-600 font-medium">
                  Gateway tidak merespons
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Tactile Control Buttons */}
        {isAdminOrSuper && (
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {isToggling && (
              <div className="flex items-center gap-1.5 text-cyan-800 text-xs font-medium shrink-0">
                <RefreshCw className="animate-spin h-3.5 w-3.5 text-cyan-700" />
                <span>Menyimpan...</span>
              </div>
            )}

            {/* Condition 1: Standby / Idle */}
            {(!isScanning || !isCurrentOfficeScan) && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleStartScan}
                  disabled={isAnyActionLoading || (isScanning && isCurrentOfficeScan) || !isOfficeActive || !isConfigured}
                  title={
                    !isOfficeActive
                      ? 'Kantor dalam status nonaktif. Aktifkan kantor terlebih dahulu.'
                      : !isConfigured
                      ? (configError || 'Pengaturan sistem kantor belum disetel di database.')
                      : isStartingScan
                      ? 'Sedang memproses perintah pemindaian...'
                      : 'Mulai pemindaian sinyal redaman'
                  }
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-2xs min-h-[38px] active:scale-[0.98] ${
                    !isOfficeActive || !isConfigured
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : isStartingScan
                      ? 'bg-cyan-800 text-white cursor-wait opacity-80'
                      : 'bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-900 text-white border border-cyan-800/30 cursor-pointer'
                  }`}
                >
                  {isStartingScan ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className={`w-3.5 h-3.5 ${!isOfficeActive || !isConfigured ? 'fill-slate-400 text-slate-400' : 'fill-white'}`} />
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
                      : 'Mulai Pemantauan (Semua)'}
                  </span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={handleToggleScheduler}
                    disabled={isAnyActionLoading || !isOfficeActive}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 flex items-center justify-center gap-1.5 min-h-[38px] shadow-2xs active:scale-[0.98] ${
                      !isOfficeActive
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : isToggling
                        ? 'bg-slate-50 text-slate-500 border-slate-300 cursor-wait'
                        : 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border-slate-300 cursor-pointer'
                    }`}
                  >
                    {isToggling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-700 animate-spin shrink-0" />
                        <span>Menyimpan...</span>
                      </>
                    ) : isRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hentikan Jadwal</span>
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

            {/* Condition 2: Active Scanning */}
            {isScanning && isCurrentOfficeScan && canControlCurrentScan && scanProgress?.total > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePauseScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs min-h-[38px] cursor-pointer active:scale-[0.98]"
                >
                  {scanActionType === 'pause' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{scanActionType === 'pause' ? 'Memproses...' : 'Jeda Pemindaian'}</span>
                </button>

                <button
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs min-h-[38px] cursor-pointer active:scale-[0.98]"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan'}</span>
                </button>
              </div>
            )}

            {/* Condition 3: Scan Paused */}
            {isScanning && scanProgress && scanProgress.is_paused && isCurrentOfficeScan && canControlCurrentScan && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleResumeScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs min-h-[38px] cursor-pointer active:scale-[0.98]"
                >
                  {scanActionType === 'resume' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'resume' ? 'Melanjutkan...' : 'Lanjutkan'}</span>
                </button>

                <button
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-2xs min-h-[38px] cursor-pointer active:scale-[0.98]"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar (Visible During Active Scan) */}
      {isScanning && isCurrentOfficeScan && scanProgress?.total > 0 && (
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
            <span className="flex items-center gap-1.5">
              <span>{scanProgress.is_paused ? 'Pemindaian Ditunda:' : 'Progres Pemindaian:'}</span>
              <span className="font-mono tabular-nums text-slate-900 font-bold">{scanProgress.current} / {scanProgress.total}</span>
              <span className="text-slate-500">Modem</span>
            </span>
            <span className="text-cyan-800 font-mono font-bold tabular-nums text-sm">{scanProgress.percent}%</span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                scanProgress.is_paused ? 'bg-amber-500' : 'bg-cyan-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, scanProgress.percent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
            <span>Berjalan: {formatDuration(scanProgress.elapsed_seconds)}</span>
            <span>Estimasi Sisa: {formatDuration(Math.max(0, (scanProgress.estimated_total_seconds || 0) - (scanProgress.elapsed_seconds || 0)))}</span>
          </div>
        </div>
      )}

      {/* Telemetry Footer Row (Strict Precision Formatting) */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Terakhir:</span>
          <strong className="text-slate-800 font-mono tabular-nums font-semibold">{lastScanTime}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Jadwal Berikutnya:</span>
          <strong className="text-cyan-800 font-mono tabular-nums font-semibold">
            {isRunning && nextRunTime && nextRunTime !== '-' && nextRunTime !== 'Jadwal Dijeda' && nextRunTime !== 'Kantor Nonaktif' ? nextRunTime : '-'}
          </strong>
        </div>
      </div>
    </div>
  )
}
