import React from 'react'
import {
  Wand2,
  Sparkles,
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
    <div className="space-y-4 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-cyan-50/60 p-3 rounded-2xl border border-cyan-200">
        <div>
          <h4 className="font-bold text-slate-900 font-sans text-xs flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-cyan-600" />
            <span>Cocokkan Kolom Berkas ke Kolom Database</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-sans">
            Pastikan kolom <strong className="text-cyan-900">IP Router / ONT (10.10.x.x / 192.168.x.x)</strong> terpetakan sebagai kunci utama pencocokan ke pelanggan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => autoMapColumns()}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-cyan-100/70 text-cyan-800 border border-cyan-300 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>Auto-Map Kolom</span>
        </button>
      </div>

      {/* Mapping Grid */}
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3">
        {/* Seksi Kolom Utama */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Kolom Utama Pengayaan Data
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PRIMARY_FIELDS.map((field) => {
              const isMapped = !!importMapping[field.key]
              return (
                <div
                  key={field.key}
                  className={`p-3 rounded-2xl border transition ${
                    field.required && !isMapped
                      ? 'bg-amber-50/50 border-amber-300'
                      : isMapped
                      ? 'bg-cyan-50/30 border-cyan-200'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required ? (
                        <span className="text-rose-600 font-bold">*Wajib</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[10px]">(Opsional)</span>
                      )}
                    </label>
                    {isMapped && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                        Terpetakan
                      </span>
                    )}
                  </div>
                  <select
                    value={importMapping[field.key] || ''}
                    onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-cyan-500 ${
                      field.required && !isMapped ? 'border-amber-400 bg-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <option value="">-- [ Kosong / Nilai Default ] --</option>
                    {importColumns.map((col, cIdx) => (
                      <option key={cIdx} value={col}>
                        Kolom Berkas: {col}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">{field.hint}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Accordion Kolom Teknis Lanjutan */}
        <div className="pt-1 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
          >
            <span className="flex items-center gap-1.5">
              <span>Pengaturan Kolom Kredensial ONT (Username &amp; Password ONT)</span>
              <span className="text-[10px] font-normal text-slate-400">(Opsional)</span>
            </span>
            {showAdvancedFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2.5 animate-in fade-in duration-150">
              {ADVANCED_FIELDS.map((field) => {
                const isMapped = !!importMapping[field.key]
                return (
                  <div
                    key={field.key}
                    className={`p-3 rounded-2xl border transition ${
                      isMapped ? 'bg-cyan-50/30 border-cyan-200' : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <span>{field.label}</span>
                        <span className="text-slate-400 font-normal text-[10px]">(Opsional)</span>
                      </label>
                      {isMapped && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                          Terpetakan
                        </span>
                      )}
                    </div>
                    <select
                      value={importMapping[field.key] || ''}
                      onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-cyan-500 border-slate-300 bg-white"
                    >
                      <option value="">-- [ Kosong / Nilai Default ] --</option>
                      {importColumns.map((col, cIdx) => (
                        <option key={cIdx} value={col}>
                          Kolom Berkas: {col}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">{field.hint}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step 2 Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-sky-100 font-sans">
        <button
          type="button"
          onClick={() => setImportStep(1)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Upload</span>
        </button>
        <button
          type="button"
          disabled={importLoading || !importMapping.nama || !importMapping.ip_router}
          onClick={handleProceedToStep3}
          className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {importLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses Pratinjau...</span>
            </>
          ) : (
            <>
              <span>Lanjut ke Pratinjau Data</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

