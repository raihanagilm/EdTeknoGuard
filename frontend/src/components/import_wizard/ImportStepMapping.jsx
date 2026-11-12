import React from 'react'
import {
  Wand2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

export function ImportStepMapping({
  PRIMARY_FIELDS,
  ADVANCED_FIELDS,
  importMapping,
  setImportMapping,
  importColumns,
  autoMapColumns,
  showAdvancedFields,
  setShowAdvancedFields,
  setImportStep,
  importLoading,
  handleProceedToStep3
}) {
  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F1F6FC] p-3 rounded-lg border border-[#CCDDF0]">
        <div>
          <h4 className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-[#026AA7]" />
            <span>Cocokkan Kolom Berkas ke Kolom Database</span>
          </h4>
          <p className="text-[11px] text-[#64839E]">
            Pastikan kolom <strong className="text-[#0B2545]">IP Router / ONT (10.10.x.x / 192.168.x.x)</strong> terpetakan sebagai kunci utama pencocokan ke pelanggan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => autoMapColumns()}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E2EDF8] text-[#026AA7] border border-[#CCDDF0] font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 text-[#026AA7]" />
          <span>Auto-Map Kolom</span>
        </button>
      </div>

      {/* Mapping Grid */}
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3">
        {/* Seksi Kolom Utama */}
        <div>
          <span className="text-[10px] font-mono font-bold text-[#64839E] uppercase tracking-wider block mb-2">
            Kolom Utama Pengayaan Data
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PRIMARY_FIELDS.map((field) => {
              const isMapped = !!importMapping[field.key]
              return (
                <div
                  key={field.key}
                  className={`p-3 rounded-lg border transition ${
                    isMapped
                      ? 'bg-white border-[#CCDDF0] shadow-2xs'
                      : 'bg-[#F1F6FC]/50 border-[#CCDDF0]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#0B2545] flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required && (
                        <span className="text-rose-500 font-bold" title="Kolom Wajib">*</span>
                      )}
                    </span>
                    {isMapped && (
                      <span className="text-[10px] font-mono font-bold text-[#026AA7] bg-[#E0F0FF] border border-[#CCDDF0] px-1.5 py-0.2 rounded">
                        Terpetakan
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#64839E] mb-2">{field.desc}</p>
                  <select
                    value={importMapping[field.key] || ''}
                    onChange={(e) =>
                      setImportMapping({ ...importMapping, [field.key]: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition ${
                      isMapped
                        ? 'bg-[#F1F6FC] border-[#026AA7] text-[#0B2545]'
                        : 'bg-white border-[#CCDDF0] text-[#64839E]'
                    }`}
                  >
                    <option value="">-- Lewati Kolom Ini --</option>
                    {importColumns.map((col, idx) => (
                      <option key={idx} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* Seksi Kolom Tambahan (Advanced) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            className="flex items-center justify-between w-full p-2.5 rounded-lg bg-[#F1F6FC] hover:bg-[#E2EDF8] text-[#3B5B78] font-bold text-xs border border-[#CCDDF0] transition cursor-pointer"
          >
            <span>Kolom Tambahan (Kredensial ONT, Paket, WiFi, GPS)</span>
            {showAdvancedFields ? (
              <ChevronUp className="w-4 h-4 text-[#64839E]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#64839E]" />
            )}
          </button>

          {showAdvancedFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5">
              {ADVANCED_FIELDS.map((field) => {
                const isMapped = !!importMapping[field.key]
                return (
                  <div
                    key={field.key}
                    className={`p-3 rounded-lg border transition ${
                      isMapped
                        ? 'bg-white border-[#CCDDF0] shadow-2xs'
                        : 'bg-[#F1F6FC]/50 border-[#CCDDF0]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#0B2545]">{field.label}</span>
                      {isMapped && (
                        <span className="text-[10px] font-mono font-bold text-[#026AA7] bg-[#E0F0FF] border border-[#CCDDF0] px-1.5 py-0.2 rounded">
                          Terpetakan
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#64839E] mb-2">{field.desc}</p>
                    <select
                      value={importMapping[field.key] || ''}
                      onChange={(e) =>
                        setImportMapping({ ...importMapping, [field.key]: e.target.value })
                      }
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition ${
                        isMapped
                          ? 'bg-[#F1F6FC] border-[#026AA7] text-[#0B2545]'
                          : 'bg-white border-[#CCDDF0] text-[#64839E]'
                      }`}
                    >
                      <option value="">-- Lewati Kolom Ini --</option>
                      {importColumns.map((col, idx) => (
                        <option key={idx} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step 2 Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#CCDDF0]">
        <button
          type="button"
          onClick={() => setImportStep(1)}
          className="px-4 py-2 rounded-lg border border-[#CCDDF0] text-xs font-bold text-[#3B5B78] hover:bg-[#F1F6FC] hover:text-[#0B2545] flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
        <button
          type="button"
          disabled={importLoading}
          onClick={handleProceedToStep3}
          className="px-5 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-bold shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {importLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memvalidasi Data...</span>
            </>
          ) : (
            <>
              <span>Lanjut ke Pratinjau &amp; Simpan</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
