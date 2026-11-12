import React from 'react'
import {
  FileSpreadsheet,
  Globe,
  Upload,
  RefreshCw,
  ChevronRight,
  Database,
  Info
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
    <div className="space-y-4 font-sans text-xs">
      {/* Tab Pemilihan Sumber */}
      <div className="flex items-center gap-2 p-1 bg-[#F1F6FC] rounded-lg border border-[#CCDDF0]">
        <button
          type="button"
          onClick={() => setImportSource('file')}
          className={`flex-1 py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            importSource === 'file'
              ? 'bg-white text-[#0B2545] shadow-2xs border border-[#CCDDF0]'
              : 'text-[#3B5B78] hover:text-[#0B2545]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#026AA7]" />
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
          className={`flex-1 py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            importSource === 'network_bill'
              ? 'bg-white text-[#0B2545] shadow-2xs border border-[#CCDDF0]'
              : 'text-[#3B5B78] hover:text-[#0B2545]'
          }`}
        >
          <Globe className="w-4 h-4 text-[#026AA7]" />
          <span>Integrasi API Network Bill</span>
        </button>
      </div>

      {/* Opsi 1: File Spreadsheet */}
      {importSource === 'file' && (
        <div className="space-y-3">
          <div className="p-6 rounded-xl bg-[#F1F6FC] border-2 border-dashed border-[#CCDDF0] text-center space-y-3 hover:bg-[#E8F1FA] transition">
            <div className="w-12 h-12 rounded-xl bg-[#E0F0FF] text-[#026AA7] border border-[#CCDDF0] flex items-center justify-center mx-auto shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0B2545] mb-1 cursor-pointer">
                Pilih Berkas Excel (.xlsx, .xls) atau CSV (.csv)
              </label>
              <p className="text-[11px] text-[#64839E] mb-3">
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
                className="text-xs text-[#3B5B78] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#026AA7] file:text-white hover:file:bg-[#035388] cursor-pointer shadow-2xs transition"
              />
            </div>

            {importAnalyzing && (
              <div className="flex items-center justify-center gap-2 text-[#026AA7] font-bold text-xs pt-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#026AA7]" />
                <span>Sedang menganalisis struktur berkas...</span>
              </div>
            )}

            {importFile && !importAnalyzing && (
              <div className="p-3 rounded-lg bg-white border border-[#CCDDF0] text-left space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-[#0B2545]">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#026AA7]" />
                    <span>{importFile.name}</span>
                  </span>
                  <span className="text-[11px] text-[#64839E] font-mono">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {isExcelFile && importSheets.length > 0 && (
                  <div className="pt-2 border-t border-[#CCDDF0]/60 space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#0B2545]">
                      Pilih Lembar Kerja (Sheet Excel):
                    </label>
                    <select
                      value={importSelectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#CCDDF0] text-xs font-bold text-[#0B2545] focus:outline-none focus:border-[#026AA7] bg-[#F1F6FC]"
                    >
                      {importSheets.map((s, idx) => (
                        <option key={idx} value={s.name}>
                          {s.name} ({s.columns.length} Kolom terdeteksi, ~{s.row_count} baris data)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#026AA7]">
                      Pilih sheet yang sesuai dengan kantor aktif saat ini (<strong className="uppercase">{activeOffice}</strong>).
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-[#3B5B78]">
                  Terdeteksi <strong>{importColumns.length}</strong> kolom:{' '}
                  <span className="font-mono text-[10px] text-[#026AA7] bg-[#E0F0FF] px-1.5 py-0.5 rounded border border-[#CCDDF0]">
                    {importColumns.slice(0, 6).join(', ')}
                    {importColumns.length > 6 ? ` (+${importColumns.length - 6} lainnya)` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 1 File Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CCDDF0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CCDDF0] text-xs font-bold text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!importFile || importAnalyzing || importColumns.length === 0}
              onClick={handleProceedToStep2}
              className="px-5 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-bold shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
          <div className="p-5 rounded-xl bg-[#F1F6FC] border border-[#CCDDF0] text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#026AA7] text-white flex items-center justify-center shadow-2xs shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0B2545]">
                  Sinkronisasi Langsung dari Network Bill API (v1)
                </h4>
                <p className="text-[11px] text-[#64839E]">
                  Tarik data pelanggan, nomor WhatsApp, IP router, MAC address, dan koordinat ODP langsung dari server billing terpusat.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#0B2545] block">
                  Mode Penarikan Data (Pelanggan &amp; Jaringan):
                </label>
                <select
                  value={networkBillLimitMode}
                  onChange={(e) => setNetworkBillLimitMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CCDDF0] text-xs font-bold text-[#0B2545] bg-white focus:outline-none focus:border-[#026AA7]"
                >
                  <option value="1">Uji Coba 1 Data Pelanggan (Untuk Cek &amp; Bandingkan Format)</option>
                  <option value="all">Tarik Semua Pelanggan di Kantor Ini (Sinkron Massal)</option>
                </select>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Otomatis mengambil data untuk wilayah <strong className="uppercase">{activeOffice}</strong> (tanpa tagihan / billing).
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#CCDDF0] text-[11px] text-[#3B5B78] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#026AA7] shrink-0 mt-0.5" />
              <span>
                Data yang ditarik akan langsung dibandingkan dengan database lokal EdTeknoGuard pada Langkah 3 (Pratinjau). Anda dapat memilih versi data mana yang ingin disimpan sebelum disimpan ke database.
              </span>
            </div>
          </div>

          {/* Step 1 Network Bill Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CCDDF0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CCDDF0] text-xs font-bold text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={networkBillFetching}
              onClick={handleFetchNetworkBillPreview}
              className="px-5 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-bold shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {networkBillFetching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghubungi API Network Bill...</span>
                </>
              ) : (
                <>
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
