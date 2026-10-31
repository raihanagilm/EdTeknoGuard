import React from 'react'
import {
  Activity,
  AlertTriangle,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock
} from 'lucide-react'
import { formatDuration } from './dashboardUtils'

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
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Engine Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isNetworkError
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : !isOfficeActive
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : isScanning && isCurrentOfficeScan
                ? 'bg-cyan-50 text-cyan-700 border-cyan-200 ring-2 ring-cyan-200/50'
                : engineStatus === 'RUNNING'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isNetworkError ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isScanning && isCurrentOfficeScan ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight">
                Status Sistem Pemantauan
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isNetworkError
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : !isOfficeActive
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : isScanning && isCurrentOfficeScan
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-300 animate-pulse'
                    : engineStatus === 'RUNNING'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isNetworkError
                  ? 'GANGGUAN JARINGAN'
                  : !isOfficeActive
                  ? 'KANTOR NONAKTIF'
                  : isScanning && isCurrentOfficeScan
                  ? 'SEDANG MEMINDAI'
                  : engineStatus === 'RUNNING'
                  ? 'TERJADWAL AKTIF'
                  : 'JADWAL DIJEDA'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5 flex-wrap">
              <span>Kantor: <strong className="text-slate-700">{getOfficeDisplayName(activeOffice)}</strong></span>
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

            {/* Kondisi 1: Standby / Idle */}
            {(!isScanning || !isCurrentOfficeScan || !scanProgress || scanProgress.total === 0) && (!scanProgress || !scanProgress.is_paused || !isCurrentOfficeScan) && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleStartScan}
                  disabled={isAnyActionLoading || (isScanning && isCurrentOfficeScan) || !isOfficeActive || !isConfigured}
                  title={
                    !isOfficeActive
                      ? 'Kantor dalam status nonaktif. Aktifkan kantor di menu Kantor Cabang untuk memindai.'
                      : !isConfigured
                      ? (configError || 'Pengaturan sistem kantor belum disetel di database. Buka menu Pengaturan untuk menyimpan.')
                      : isStartingScan
                      ? 'Sedang memproses perintah pemindaian...'
                      : 'Mulai pemindaian sinyal redaman'
                  }
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] ${
                    !isOfficeActive || !isConfigured
                      ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                      : isStartingScan
                      ? 'bg-cyan-800 text-white cursor-wait opacity-80'
                      : 'bg-cyan-700 hover:bg-cyan-800 text-white cursor-pointer disabled:opacity-50'
                  }`}
                >
                  {isStartingScan ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className={`w-4 h-4 ${!isOfficeActive || !isConfigured ? 'fill-slate-400 text-slate-400' : 'fill-white'}`} />
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
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center gap-1.5 min-h-[38px] ${
                      !isOfficeActive
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                        : isToggling
                        ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-wait opacity-75'
                        : 'bg-white hover:bg-cyan-50/60 text-slate-700 border-sky-200 cursor-pointer disabled:opacity-50'
                    }`}
                    title={
                      !isOfficeActive
                        ? 'Kantor nonaktif. Aktifkan kantor terlebih dahulu.'
                        : isToggling
                        ? 'Sedang mengubah jadwal pemantauan...'
                        : engineStatus === 'RUNNING'
                        ? 'Klik untuk menjeda jadwal pemindaian otomatis (Hanya Super Admin)'
                        : 'Klik untuk mengaktifkan kembali jadwal pemindaian otomatis (Hanya Super Admin)'
                    }
                  >
                    {isToggling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-700 animate-spin shrink-0" />
                        <span>Menyimpan...</span>
                      </>
                    ) : engineStatus === 'RUNNING' ? (
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
            {isScanning && isCurrentOfficeScan && canControlCurrentScan && scanProgress?.total > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
                <button
                  onClick={handlePauseScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] cursor-pointer"
                >
                  {scanActionType === 'pause' ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Pause className="w-4 h-4 shrink-0" />
                  )}
                  <span>{scanActionType === 'pause' ? 'Memproses...' : 'Jeda Pemindaian'}</span>
                </button>

                <button
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] cursor-pointer"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan (Stop)'}</span>
                </button>
              </div>
            )}

            {/* Kondisi 3: Pemindaian Dijeda */}
            {!isScanning && scanProgress && scanProgress.is_paused && isCurrentOfficeScan && canControlCurrentScan && (
              <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
                <button
                  onClick={handleResumeScan}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] cursor-pointer"
                >
                  {scanActionType === 'resume' ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Play className="w-4 h-4 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'resume' ? 'Melanjutkan...' : 'Lanjutkan Pemindaian'}</span>
                </button>

                <button
                  onClick={handleOpenStopModal}
                  disabled={isAnyActionLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs min-h-[38px] cursor-pointer"
                >
                  {scanActionType === 'stop' ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 fill-white shrink-0" />
                  )}
                  <span>{scanActionType === 'stop' ? 'Memproses...' : 'Hentikan (Stop)'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar Jika Sedang Memindai */}
      {((isScanning && isCurrentOfficeScan) || (scanProgress?.is_paused && isCurrentOfficeScan)) && (
        <div className="pt-2 border-t border-sky-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${scanProgress.is_paused ? 'bg-amber-500' : 'bg-cyan-600 animate-ping'}`} />
              {scanProgress.is_paused ? 'Pemindaian Ditunda:' : 'Progres Pemindaian:'} {scanProgress.current} / {scanProgress.total} Modem
            </span>
            <span className="text-cyan-800 font-extrabold">{scanProgress.percent}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                scanProgress.is_paused ? 'bg-amber-500' : 'bg-linear-to-r from-cyan-600 to-sky-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, scanProgress.percent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Berjalan: {formatDuration(scanProgress.elapsed_seconds)}</span>
            <span>Estimasi Sisa: {formatDuration(Math.max(0, (scanProgress.estimated_total_seconds || 0) - (scanProgress.elapsed_seconds || 0)))}</span>
          </div>
        </div>
      )}

      {/* Info Scan Terakhir & Jadwal Berikutnya */}
      <div className="pt-2 border-t border-sky-50 flex items-center justify-between text-xs font-mono text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Terakhir: <strong className="text-slate-700">{lastScanTime}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Jadwal Berikutnya: <strong className="text-cyan-800">{nextRunTime}</strong></span>
        </div>
      </div>
    </div>
  )
}

