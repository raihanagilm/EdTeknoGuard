import React from 'react'
import {
  FileSpreadsheet,
  Globe,
  Upload,
  RefreshCw,
  ChevronRight,
  Database,
  Info,
  Sparkles
} from 'lucide-react'

export function ImportStepUpload({
  importSource,
  setImportSource,
  networkBillPops,
  loadNetworkBillPops,
  handleImportFileSelected,
  importAnalyzing,
  importFile,
  isExcelFile,
  importSheets,
  importSelectedSheet,
  handleSheetChange,
  activeOffice,
  importColumns,
  onClose,
  handleProceedToStep2,
  networkBillLimitMode,
  setNetworkBillLimitMode,
  networkBillFetching,
  handleFetchNetworkBillPreview
}) {
  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Tab Pemilihan Sumber */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setImportSource('file')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            importSource === 'file'
              ? 'bg-white text-cyan-900 shadow-2xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
          <span>Unggah Berkas Spreadsheet (Excel / CSV)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setImportSource('network_bill')
            if (networkBillPops.length === 0) {
              loadNetworkBillPops()
            }
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            importSource === 'network_bill'
              ? 'bg-white text-cyan-900 shadow-2xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-600" />
          <span>Tarik dari Network Bill (API v1)</span>
        </button>
      </div>

      {/* Opsi 1: File Spreadsheet */}
      {importSource === 'file' && (
        <div className="space-y-3">
          <div className="p-6 rounded-3xl bg-cyan-50/40 border-2 border-dashed border-cyan-300 text-center space-y-3 hover:bg-cyan-50/70 transition">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1 cursor-pointer">
                Pilih Berkas Excel (.xlsx, .xls) atau CSV (.csv)
              </label>
              <p className="text-[11px] text-slate-500 font-sans mb-3">
                Sistem akan menganalisis nama lembar kerja (sheet) dan mendeteksi susunan header kolom secara otomatis.
              </p>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImportFileSelected(e.target.files[0])
                  }
                }}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 cursor-pointer shadow-xs transition"
              />
            </div>

            {importAnalyzing && (
              <div className="flex items-center justify-center gap-2 text-cyan-800 font-bold text-xs pt-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" />
                <span>Sedang menganalisis struktur berkas...</span>
              </div>
            )}

            {importFile && !importAnalyzing && (
              <div className="p-3 rounded-2xl bg-white border border-cyan-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-cyan-950">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                    <span>{importFile.name}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {isExcelFile && importSheets.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Pilih Lembar Kerja (Sheet Excel):
                    </label>
                    <select
                      value={importSelectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500 bg-cyan-50/30"
                    >
                      {importSheets.map((s, idx) => (
                        <option key={idx} value={s.name}>
                          {s.name} ({s.columns.length} Kolom terdeteksi, ~{s.row_count} baris data)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-cyan-800 font-sans">
                      Pilih sheet yang sesuai dengan kantor aktif saat ini (<strong className="uppercase">{activeOffice}</strong>).
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 font-sans">
                  Terdeteksi <strong>{importColumns.length}</strong> kolom:{' '}
                  <span className="font-mono text-[10px] text-cyan-900 bg-cyan-50 px-1.5 py-0.5 rounded">
                    {importColumns.slice(0, 6).join(', ')}
                    {importColumns.length > 6 ? ` (+${importColumns.length - 6} lainnya)` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 1 File Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-100 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!importFile || importAnalyzing || importColumns.length === 0}
              onClick={handleProceedToStep2}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>Lanjut ke Pemetaan Kolom</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Opsi 2: Network Bill API */}
      {importSource === 'network_bill' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-cyan-50/40 border border-cyan-200 text-left space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Sinkronisasi Langsung dari Network Bill API (v1)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tarik data pelanggan, nomor WhatsApp, IP router, MAC address, dan koordinat ODP langsung dari server billing terpusat.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Mode Penarikan Data (Pelanggan &amp; Jaringan):
                </label>
                <select
                  value={networkBillLimitMode}
                  onChange={(e) => setNetworkBillLimitMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cyan-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="1">Uji Coba 1 Data Pelanggan (Untuk Cek &amp; Bandingkan Format)</option>
                  <option value="all">Tarik Semua Pelanggan di Kantor Ini (Sinkron Massal)</option>
                </select>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Otomatis mengambil data untuk wilayah <strong className="uppercase">{activeOffice}</strong> (tanpa tagihan / billing).
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 border border-cyan-100 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <span>
                Data yang ditarik akan langsung dibandingkan dengan database lokal EdTeknoGuard pada Langkah 3 (Pratinjau). Anda dapat memilih versi data mana yang ingin disimpan sebelum disimpan ke database.
              </span>
            </div>
          </div>

          {/* Step 1 Network Bill Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-100 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={networkBillFetching}
              onClick={handleFetchNetworkBillPreview}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {networkBillFetching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghubungi API Network Bill...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tarik &amp; Bandingkan Data di Pratinjau</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

