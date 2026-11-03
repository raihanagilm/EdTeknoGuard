import React from 'react'
import {
  CheckCircle2,
  Check,
  Info,
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react'

export function ImportStepPreview({
  importPreviewData,
  setImportPreviewData,
  statusFilter,
  setStatusFilter,
  selectedImportIndices,
  setSelectedImportIndices,
  setAllDuplicatesAction,
  filteredIndices,
  isAllFilteredSelected,
  toggleSelectAllFiltered,
  toggleSelectRow,
  setImportStep,
  importLoading,
  handleExecuteImport
}) {
  const readyToSaveCount = importPreviewData.filter((r) => r._action !== 'skip').length

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 4 Clickable Summary Stat Cards for Filtering */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-cyan-100/90 border-cyan-400 text-cyan-950 ring-2 ring-cyan-400/40 shadow-xs'
              : 'bg-cyan-50/70 border-cyan-200 text-cyan-900 hover:bg-cyan-100/50'
          }`}
        >
          <span className="text-[10px] font-bold text-cyan-700 block">Total Baris</span>
          <strong className="text-base font-black">{importPreviewData.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('MATCH')}
          className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
            statusFilter === 'MATCH'
              ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/40 shadow-xs'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/50'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-700 block">Siap Lengkapi (Cocok)</span>
          <strong className="text-base font-black">
            {importPreviewData.filter((r) => r._status === 'match' && r._action !== 'skip').length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CONFLICT')}
          className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
            statusFilter === 'CONFLICT'
              ? 'bg-amber-100/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
              : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/50'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-700 block">Data Berbeda (Pilih Versi)</span>
          <strong className="text-base font-black">
            {importPreviewData.filter((r) => r._status === 'conflict').length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UNREGISTERED')}
          className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
            statusFilter === 'UNREGISTERED'
              ? 'bg-slate-200 border-slate-400 text-slate-900 ring-2 ring-slate-400/40 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-600 block">IP Belum Terdaftar</span>
          <strong className="text-base font-black">
            {importPreviewData.filter((r) => r._status === 'unregistered').length}
          </strong>
        </button>
      </div>

      {/* Action Bar (Hanya muncul jika ada baris yang dicentang / terpilih) */}
      {selectedImportIndices.length > 0 && (
        <div className="p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 duration-150 bg-cyan-50/70 border-cyan-200">
          <div className="space-y-0.5">
            <span className="text-xs font-bold flex items-center gap-1.5 font-sans text-cyan-950">
              <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>
                {statusFilter === 'UNREGISTERED'
                  ? `Aksi IP Belum Terdaftar (${selectedImportIndices.length} Baris Dipilih)`
                  : statusFilter === 'CONFLICT'
                  ? `Aksi Resolusi Data Berbeda (${selectedImportIndices.length} Baris Dipilih)`
                  : statusFilter === 'MATCH'
                  ? `Aksi Data Cocok (${selectedImportIndices.length} Baris Dipilih)`
                  : `Aksi Massal Baris Terpilih (${selectedImportIndices.length} Baris Dipilih)`}
              </span>
            </span>
            <p className="text-[11px] font-sans text-slate-600">
              {statusFilter === 'UNREGISTERED'
                ? 'Pilih apakah ingin mendaftarkan IP ini sebagai pelanggan baru offline atau melewatinya.'
                : statusFilter === 'CONFLICT'
                ? 'Pilih versi data yang akan digunakan untuk baris yang memiliki perbedaan.'
                : statusFilter === 'MATCH'
                ? 'Seluruh baris terpilih cocok dengan database dan siap diperbarui.'
                : 'Terapkan tindakan serentak untuk baris yang dicentang.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0 font-sans">
            {statusFilter === 'UNREGISTERED' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    selectedImportIndices.forEach((idx) => {
                      if (updated[idx] && updated[idx]._status === 'unregistered') {
                        updated[idx]._action = 'insert'
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>+ Daftarkan Offline Terpilih</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllDuplicatesAction('skip')}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Lewati (Skip)
                </button>
              </>
            )}

            {statusFilter === 'CONFLICT' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    selectedImportIndices.forEach((idx) => {
                      if (updated[idx]) {
                        updated[idx].selected_version = 'new'
                        updated[idx]._action = 'update'
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gunakan Data Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    selectedImportIndices.forEach((idx) => {
                      if (updated[idx]) {
                        updated[idx].selected_version = 'old'
                        updated[idx]._action = 'update'
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Pertahankan Data Database
                </button>
              </>
            )}

            {statusFilter === 'MATCH' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    selectedImportIndices.forEach((idx) => {
                      if (updated[idx]) {
                        updated[idx]._action = 'update'
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Sertakan untuk Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllDuplicatesAction('skip')}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Lewati (Skip)
                </button>
              </>
            )}

            {(statusFilter === 'ALL' || statusFilter === 'ERROR') && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    updated.forEach((row) => {
                      if (row._status === 'error' || !row.data?.ip_router) {
                        row._action = 'skip'
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer"
                >
                  Lewati Baris Error/Kosong
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...importPreviewData]
                    selectedImportIndices.forEach((idx) => {
                      if (updated[idx] && updated[idx]._status !== 'error') {
                        if (updated[idx]._status === 'unregistered') {
                          updated[idx]._action = 'insert'
                        } else {
                          updated[idx]._action = 'update'
                          updated[idx].selected_version = 'new'
                        }
                      }
                    })
                    setImportPreviewData(updated)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Sertakan Semua Valid</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="max-h-[380px] overflow-auto border border-sky-200 rounded-2xl">
        <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
          <thead className="bg-cyan-50/80 sticky top-0 border-b border-sky-200 font-bold text-slate-700">
            <tr>
              <th className="py-2 px-2.5 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              </th>
              <th className="py-2 px-2.5 w-10 text-center">No</th>
              <th className="py-2 px-2.5">IP Router &amp; ONT</th>
              <th className="py-2 px-2.5">Nama Pelanggan</th>
              <th className="py-2 px-2.5">No WhatsApp</th>
              <th className="py-2 px-2.5">Alamat Pemasangan</th>
              <th className="py-2 px-2.5">WiFi (SSID &amp; Pass)</th>
              <th className="py-2 px-2.5 text-right">Status &amp; Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredIndices.map((idx, rowNo) => {
              const row = importPreviewData[idx]
              if (!row) return null

              const isSelected = selectedImportIndices.includes(idx)
              const isConflict = row._status === 'conflict' || row.has_conflicts
              const isUnreg = row._status === 'unregistered'
              const isSkip = row._action === 'skip'
              const isNewVersion = row.selected_version === 'new'

              // Deteksi komparasi data lama vs data baru
              const hasOld = Boolean(row.old_data)
              const oldNama = row.old_data?.nama || ''
              const newNama = (row.data?.nama || '').trim()
              const isNamaDiff = hasOld && oldNama && newNama && oldNama.trim().toLowerCase() !== newNama.toLowerCase()

              const oldWa = row.old_data?.no_wa || ''
              const newWa = (row.data?.no_wa || row.data?.no_hp || '').trim()
              const isWaDiff = hasOld && oldWa && newWa && oldWa !== newWa

              const oldAlamat = row.old_data?.alamat || ''
              const newAlamat = (row.data?.alamat || '').trim()
              const isAlamatDiff = hasOld && oldAlamat && newAlamat && oldAlamat !== newAlamat

              const oldWifi = row.old_data?.nama_wifi || ''
              const newWifi = (row.data?.wifi_ssid || row.data?.nama_wifi || '').trim()
              const isWifiDiff = hasOld && oldWifi && newWifi && oldWifi !== newWifi

              // Daftar field yang berbeda untuk status badge
              const detectedConflicts = []
              if (isNamaDiff) detectedConflicts.push('Nama')
              if (isWaDiff) detectedConflicts.push('No. WA')
              if (isAlamatDiff) detectedConflicts.push('Alamat')
              if (isWifiDiff) detectedConflicts.push('WiFi')
              const conflictList = row.conflicts && row.conflicts.length > 0 ? row.conflicts : detectedConflicts

              return (
                <tr
                  key={idx}
                  className={`hover:bg-cyan-50/30 transition ${
                    isSkip ? 'opacity-50 bg-slate-50' : isSelected ? 'bg-cyan-50/50' : ''
                  }`}
                >
                  <td className="py-2 px-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(idx)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                    {rowNo + 1}
                  </td>
                  <td className="py-2 px-2.5">
                    <span className="font-bold text-slate-900 block">{row.data?.ip_router || '-'}</span>
                    {(row.data?.id_pelanggan || row.old_data?.id_pelanggan) && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {row.data?.id_pelanggan || row.old_data?.id_pelanggan}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-sans">
                    {isNamaDiff ? (
                      <div className="flex flex-col gap-1 min-w-[130px] py-0.5">
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            isNewVersion ? 'font-bold text-cyan-950' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              isNewVersion ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            Baru
                          </span>
                          <span className="truncate max-w-[160px]" title={`Data Baru: ${newNama}`}>
                            {newNama}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            !isNewVersion ? 'font-bold text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              !isNewVersion ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            Lama
                          </span>
                          <span className="truncate max-w-[160px]" title={`Data Database: ${oldNama}`}>
                            {oldNama}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-800">{newNama || oldNama || '-'}</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-sans">
                    {isWaDiff ? (
                      <div className="flex flex-col gap-1 min-w-[110px] py-0.5">
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            isNewVersion ? 'font-bold text-cyan-950' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              isNewVersion ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            Baru
                          </span>
                          <span className="font-mono text-[10px]">{newWa}</span>
                        </div>
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            !isNewVersion ? 'font-bold text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              !isNewVersion ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            Lama
                          </span>
                          <span className="font-mono text-[10px]">{oldWa}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-700">{newWa || oldWa || '-'}</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-sans max-w-[200px]">
                    {isAlamatDiff ? (
                      <div className="flex flex-col gap-1 py-0.5">
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            isNewVersion ? 'font-bold text-cyan-950' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              isNewVersion ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            Baru
                          </span>
                          <span className="truncate max-w-[160px]" title={`Alamat Baru: ${newAlamat}`}>
                            {newAlamat}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] flex items-center gap-1.5 transition-all ${
                            !isNewVersion ? 'font-bold text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              !isNewVersion ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            Lama
                          </span>
                          <span className="truncate max-w-[160px]" title={`Alamat Database: ${oldAlamat}`}>
                            {oldAlamat}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span
                        className="truncate block max-w-[180px] text-slate-700"
                        title={newAlamat || oldAlamat || '-'}
                      >
                        {newAlamat || oldAlamat || '-'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-mono text-[10px]">
                    {isWifiDiff ? (
                      <div className="flex flex-col gap-1 py-0.5">
                        <div
                          className={`flex items-center gap-1.5 transition-all ${
                            isNewVersion ? 'font-bold text-cyan-950' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 font-sans ${
                              isNewVersion ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            Baru
                          </span>
                          <span className="truncate max-w-[90px]">{newWifi}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 transition-all ${
                            !isNewVersion ? 'font-bold text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 font-sans ${
                              !isNewVersion ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            Lama
                          </span>
                          <span className="truncate max-w-[90px]">{oldWifi}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600">{newWifi || oldWifi || '-'}</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 text-right font-sans">
                    {isConflict ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-end gap-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Ada Perbedaan Data
                          </span>
                        </div>
                        {conflictList.length > 0 && (
                          <div className="text-[9px] text-amber-900/80 font-medium text-right">
                            Beda: {conflictList.join(', ')}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          <button
                            type="button"
                            title="Gunakan versi data baru dari file/API untuk memperbarui database"
                            onClick={() => {
                              const updated = [...importPreviewData]
                              updated[idx].selected_version = 'new'
                              updated[idx]._action = 'update'
                              setImportPreviewData(updated)
                            }}
                            className={`px-2 py-0.5 rounded-lg border transition cursor-pointer font-bold ${
                              isNewVersion
                                ? 'bg-cyan-700 text-white border-cyan-800 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Pakai Baru
                          </button>
                          <button
                            type="button"
                            title="Pertahankan data lama yang ada di database saat ini, hanya isi field kosong"
                            onClick={() => {
                              const updated = [...importPreviewData]
                              updated[idx].selected_version = 'old'
                              updated[idx]._action = 'update'
                              setImportPreviewData(updated)
                            }}
                            className={`px-2 py-0.5 rounded-lg border transition cursor-pointer font-bold ${
                              !isNewVersion
                                ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Pakai Lama
                          </button>
                        </div>
                      </div>
                    ) : isUnreg ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[10px]">
                          IP Belum Ada
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...importPreviewData]
                              updated[idx]._action = isSkip ? 'insert' : 'skip'
                              setImportPreviewData(updated)
                            }}
                            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
                              isSkip
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-emerald-600 text-white border-emerald-700'
                            }`}
                          >
                            {isSkip ? '+ Simpan Offline' : 'Didaftarkan Offline'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        <Check className="w-3 h-3" />
                        <span>Cocok</span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Step 3 Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-sky-100 font-sans">
        <button
          type="button"
          onClick={() => setImportStep(2)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Pemetaan</span>
        </button>
        <button
          type="button"
          disabled={importLoading || readyToSaveCount === 0}
          onClick={handleExecuteImport}
          className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {importLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan ke Database...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Terapkan Pengayaan ({readyToSaveCount} Data)</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

