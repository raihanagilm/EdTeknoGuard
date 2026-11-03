import React from 'react'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  KeyRound
} from 'lucide-react'

export function SettingsCredentialsTab({
  onOpenConfirmModal,
  settingsLoading,
  modemCredentials,
  addModemCredentialRow,
  removeModemCredentialRow,
  updateModemCredentialRow,
  showModemPasswords,
  toggleModemPasswordVisibility,
  applyToInvalid,
  setApplyToInvalid,
  dragOverCredIdx,
  handleCredDragStart,
  handleCredDragOver,
  handleCredDrop,
  handleCredDragEnd
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onOpenConfirmModal()
      }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Daftar Kredensial Modem ONT (Multi-Fallback)</h3>
          <p className="text-xs text-slate-500">
            Sistem mencoba kredensial ini berurutan dari atas ke bawah saat login scraper ONT pelanggan gagal.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={addModemCredentialRow}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 text-xs font-bold flex items-center gap-1.5 transition min-h-[36px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>
        </div>
      </div>

      {/* Tabel Repeater Kredensial */}
      <div className="space-y-2.5">
        {modemCredentials.map((cred, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => handleCredDragStart(e, idx)}
            onDragOver={(e) => handleCredDragOver(e, idx)}
            onDrop={(e) => handleCredDrop(e, idx)}
            onDragEnd={handleCredDragEnd}
            className={`p-3 rounded-xl border bg-white/90 transition flex flex-col sm:flex-row sm:items-center gap-2.5 ${dragOverCredIdx === idx
              ? 'border-cyan-500 ring-2 ring-cyan-200 bg-cyan-50/40'
              : 'border-sky-200/80 hover:border-cyan-300'
              }`}
          >
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 shrink-0">
              <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600">⠿</span>
              <span className="w-5 text-center">#{idx + 1}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <input
                type="text"
                placeholder="Username modem (misal: admin)"
                value={cred.username}
                onChange={(e) => updateModemCredentialRow(idx, 'username', e.target.value)}
                required
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[36px]"
              />

              <div className="relative">
                <input
                  type={showModemPasswords[idx] ? 'text' : 'password'}
                  placeholder="Password modem (misal: tekno2024)"
                  value={cred.password}
                  onChange={(e) => updateModemCredentialRow(idx, 'password', e.target.value)}
                  required
                  className="w-full rounded-lg border border-sky-200 px-3 py-1.5 pr-8 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 min-h-[36px]"
                />
                <button
                  type="button"
                  onClick={() => toggleModemPasswordVisibility(idx)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showModemPasswords[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeModemCredentialRow(idx)}
              disabled={modemCredentials.length <= 1}
              className={`p-2 rounded-lg text-slate-400 transition ${modemCredentials.length > 1
                ? 'hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
                : 'opacity-30 cursor-not-allowed'
                }`}
              title="Hapus baris kredensial"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Checkbox Sinkronisasi Pelanggan Invalid */}
      <div className="pt-2">
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-50/50 border border-sky-200 cursor-pointer transition hover:bg-cyan-50">
          <input
            type="checkbox"
            checked={applyToInvalid}
            onChange={(e) => setApplyToInvalid(e.target.checked)}
            className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
          />
          <div className="text-xs flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Sinkronkan ke seluruh pelanggan berstatus INVALID</span>
              {applyToInvalid && (
                <span className="text-[11px] font-mono font-bold text-cyan-700">
                  Aktif Tersimpan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Otomatis menguji urutan kredensial baru ini ke semua pelanggan yang sebelumnya gagal login saat disimpan dan selama pemantauan.
            </p>
          </div>
        </label>
      </div>

      {/* Tombol Simpan Tab 2 */}
      <div className="pt-3 border-t border-sky-100 flex justify-end">
        <button
          type="submit"
          disabled={settingsLoading}
          className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition min-h-[42px] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Kredensial Modem</span>
        </button>
      </div>

      {/* Panduan Cara Kerja Multi-Kredensial (Khusus Desktop) */}
      <div className="hidden lg:block pt-3 border-t border-sky-100 space-y-2 text-xs">
        <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
          <KeyRound className="w-4 h-4 text-cyan-600" />
          <span>Cara Kerja Multi-Kredensial Fallback</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed font-sans pl-1">
          <li>Sistem mencoba kredensial tersimpan milik pelanggan terlebih dahulu.</li>
          <li>Jika ditolak, sistem mencoba semua username/password default di atas satu per satu.</li>
          <li>Jika berhasil, status kredensial pelanggan otomatis diperbarui menjadi <code className="text-emerald-700 font-mono text-[11px] font-bold">VALID</code>.</li>
        </ol>
      </div>
    </form>
  )
}

