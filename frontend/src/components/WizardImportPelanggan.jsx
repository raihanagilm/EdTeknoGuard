import React, { useState } from 'react'
import {
  Upload,
  RefreshCw,
  X,
  ChevronRight,
  ArrowLeft,
  Wand2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Download
} from 'lucide-react'

export function WizardImportPelanggan({
  isOpen,
  onClose,
  activeOffice = 'cabang',
  onSuccess
}) {
  const [importStep, setImportStep] = useState(1) // 1: Upload & Analisis, 2: Pemetaan Kolom, 3: Pratinjau & Eksekusi
  const [importFile, setImportFile] = useState(null)
  const [importAnalyzing, setImportAnalyzing] = useState(false)
  const [isExcelFile, setIsExcelFile] = useState(false)
  const [importSheets, setImportSheets] = useState([])
  const [importSelectedSheet, setImportSelectedSheet] = useState('')
  const [importColumns, setImportColumns] = useState([])
  const [importMapping, setImportMapping] = useState({})
  const [importPreviewData, setImportPreviewData] = useState([])
  const [selectedImportIndices, setSelectedImportIndices] = useState([])
  const [existingDbIds, setExistingDbIds] = useState([])
  const [existingDbIps, setExistingDbIps] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL | VALID | DUPLICATE | ERROR

  // Field Database untuk Pemetaan Kolom (SOP EdTeknoGuard: Kantor Wilayah otomatis dari navbar kantor aktif)
  const DB_IMPORT_FIELDS = [
    { key: 'nama', label: 'Nama Pelanggan', required: true, hint: 'Wajib diisi (identitas pelanggan)' },
    { key: 'ip_router', label: 'IP Router / ONT', required: true, hint: 'Wajib diisi (format: 10.10.x.x / 192.168.x.x)' },
    { key: 'id_pelanggan', label: 'ID Pelanggan', required: false, hint: 'Opsional (dibuat terstruktur unik jika kosong)' },
    { key: 'no_wa', label: 'Nomor WhatsApp', required: false, hint: 'Nomor kontak HP / WhatsApp pelanggan' },
    { key: 'pop', label: 'Lokasi POP / ODP', required: false, hint: 'Default: POP-01' },
    { key: 'paket', label: 'Paket Layanan', required: false, hint: 'Default: 20 Mbps Unlimited' },
    { key: 'jenis_modem', label: 'Tipe Modem ONT', required: false, hint: 'Default: ZTE GM220-S' },
    { key: 'user_admin', label: 'Username ONT', required: false, hint: 'Default: admin' },
    { key: 'pass_admin', label: 'Password ONT', required: false, hint: 'Default: tekno2024' },
    { key: 'nama_wifi', label: 'Nama WiFi (SSID)', required: false, hint: 'SSID WiFi Pelanggan' },
    { key: 'password_wifi', label: 'Password WiFi', required: false, hint: 'Kata sandi WiFi' },
    { key: 'alamat', label: 'Alamat Pemasangan', required: false, hint: 'Alamat fisik pelanggan' }
  ]

  // Helper generator ID pelanggan terstruktur sesuai standar aturan DB-05 (antislop-vibecoding): cust<YYYYMMDD><4 digit acak>
  const generateStructuredCustomerId = (existingSet) => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}${mm}${dd}`

    let candidate = ''
    do {
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
      candidate = `cust${dateStr}${randomDigits}`
    } while (existingSet && existingSet.has(candidate))

    return candidate
  }

  const autoMapColumns = (cols) => {
    const currentCols = cols || importColumns
    if (!currentCols || currentCols.length === 0) return
    const cleanStr = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')

    const aliases = {
      id_pelanggan: ['idpelanggan', 'id', 'cid', 'nopelanggan', 'nomerpelanggan', 'no'],
      nama: ['nama', 'namapelanggan', 'customer', 'name', 'client', 'namalengkap', 'pelanggan'],
      no_wa: ['nowa', 'nohp', 'hp', 'telepon', 'whatsapp', 'wa', 'telp', 'phone', 'nomorhp', 'kontak'],
      ip_router: ['iprouter', 'ip', 'ipaddress', 'ipont', 'ipmodem', 'ipaddressont', 'routerip'],
      pop: ['pop', 'odpbaru', 'odplama', 'odp', 'lokasipop', 'server', 'area'],
      nama_wifi: ['namawifi', 'wifi', 'ssid', 'wifibaru', 'namassid', 'ssidwifi'],
      password_wifi: ['passwordwifi', 'passwifi', 'pswd', 'passbaru', 'sandiwifi', 'passwordwifibaru'],
      user_admin: ['useradmin', 'user', 'username', 'adminuser', 'userlogin', 'useront'],
      pass_admin: ['passadmin', 'pass', 'password', 'adminpass', 'passlogin', 'passont'],
      jenis_modem: ['jenismodem', 'tipemodem', 'modem', 'type', 'tipe', 'onttype'],
      paket: ['paket', 'profile', 'bandwidth', 'speed', 'layanan', 'paketinternet'],
      alamat: ['alamat', 'alamatpasang', 'address', 'lokasipasang', 'lokasi']
    }

    const mapping = {}
    DB_IMPORT_FIELDS.forEach((field) => {
      const targetKey = field.key
      const matchPatterns = aliases[targetKey] || [cleanStr(field.label)]
      let matchedCol = ''

      for (const col of currentCols) {
        const normCol = cleanStr(col)
        if (matchPatterns.includes(normCol)) {
          matchedCol = col
          break
        }
      }

      if (!matchedCol) {
        for (const col of currentCols) {
          const normCol = cleanStr(col)
          for (const pat of matchPatterns) {
            if (normCol.includes(pat) || pat.includes(normCol)) {
              matchedCol = col
              break
            }
          }
          if (matchedCol) break
        }
      }

      mapping[targetKey] = matchedCol || ''
    })
    setImportMapping(mapping)
  }

  const handleImportFileSelected = async (file) => {
    if (!file) return
    setImportFile(file)
    setImportError('')
    setImportAnalyzing(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/customers/import/analyze', {
        method: 'POST',
        body: formDataUpload
      })
      const data = await res.json()

      if (res.ok && data.result) {
        const resData = data.result
        setIsExcelFile(!!resData.is_excel)
        const sheets = resData.sheets || []
        setImportSheets(sheets)

        if (sheets.length > 0) {
          const firstSheet = sheets[0]
          setImportSelectedSheet(firstSheet.name)
          setImportColumns(firstSheet.columns || [])
          autoMapColumns(firstSheet.columns || [])
        }
      } else {
        setImportError(data.detail || 'Gagal menganalisis file spreadsheet.')
      }
    } catch (err) {
      setImportError('Gagal menghubungkan ke server untuk analisis file.')
    } finally {
      setImportAnalyzing(false)
    }
  }

  const handleSheetChange = (sheetName) => {
    setImportSelectedSheet(sheetName)
    const found = importSheets.find((s) => s.name === sheetName)
    if (found) {
      const cols = found.columns || []
      setImportColumns(cols)
      autoMapColumns(cols)
    }
  }

  const handleProceedToStep2 = () => {
    if (!importFile) {
      setImportError('Pilih berkas Excel atau CSV terlebih dahulu!')
      return
    }
    if (importColumns.length === 0) {
      setImportError('Berkas tidak memuat kolom data yang valid.')
      return
    }
    setImportError('')
    setImportStep(2)
  }

  const handleProceedToStep3 = async () => {
    if (!importMapping.nama || !importMapping.ip_router) {
      setImportError('Kolom "Nama Pelanggan" dan "IP Router" wajib dipetakan!')
      return
    }

    setImportLoading(true)
    setImportError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', importFile)
      formDataUpload.append('sheet_name', importSelectedSheet || '')
      formDataUpload.append('mapping', JSON.stringify(importMapping))

      const res = await fetch('/api/customers/import/preview', {
        method: 'POST',
        body: formDataUpload
      })
      const data = await res.json()

      if (res.ok && data.result) {
        const rawPreview = data.result.preview_data || []
        setExistingDbIds(data.result.existing_ids || [])
        setExistingDbIps(data.result.existing_ips || [])
        setImportPreviewData(rawPreview)
        setSelectedImportIndices([])
        setStatusFilter('ALL')
        setImportStep(3)
      } else {
        setImportError(data.detail || 'Gagal membuat pratinjau data import.')
      }
    } catch (err) {
      setImportError('Gagal menghubungi backend saat memproses pratinjau.')
    } finally {
      setImportLoading(false)
    }
  }

  // Filtered rows for Step 3 Preview Table based on KPI card filter
  const filteredIndices = importPreviewData
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => {
      if (statusFilter === 'VALID') return row._status === 'valid' && row._action !== 'skip'
      if (statusFilter === 'DUPLICATE') return row._status === 'duplicate'
      if (statusFilter === 'ERROR') return row._status === 'error'
      return true
    })
    .map(({ idx }) => idx)

  const toggleSelectAllImport = () => {
    const isAllFilteredSelected =
      filteredIndices.length > 0 &&
      filteredIndices.every((idx) => selectedImportIndices.includes(idx))

    if (isAllFilteredSelected) {
      setSelectedImportIndices(selectedImportIndices.filter((idx) => !filteredIndices.includes(idx)))
    } else {
      const newSelected = new Set([...selectedImportIndices, ...filteredIndices])
      setSelectedImportIndices(Array.from(newSelected))
    }
  }

  const toggleSelectImportRow = (idx) => {
    if (selectedImportIndices.includes(idx)) {
      setSelectedImportIndices(selectedImportIndices.filter((i) => i !== idx))
    } else {
      setSelectedImportIndices([...selectedImportIndices, idx])
    }
  }

  const updatePreviewRow = (idx, field, val) => {
    const updated = [...importPreviewData]
    if (updated[idx]) {
      updated[idx].data = { ...updated[idx].data, [field]: val }
      const currentId = updated[idx].data.id_pelanggan
      const currentIp = updated[idx].data.ip_router
      if (existingDbIds.includes(currentId)) {
        updated[idx]._status = 'duplicate'
        updated[idx]._message = `ID '${currentId}' sudah terdaftar di database`
      } else if (existingDbIps.includes(currentIp)) {
        updated[idx]._status = 'duplicate'
        updated[idx]._message = `IP '${currentIp}' sudah terdaftar di database`
      } else {
        updated[idx]._status = 'valid'
        updated[idx]._message = 'Data baru siap di-import'
      }
      setImportPreviewData(updated)
    }
  }

  const makeRowUnique = (idx) => {
    const updated = [...importPreviewData]
    if (updated[idx]) {
      const rowData = updated[idx].data
      const allIds = new Set([
        ...existingDbIds,
        ...updated.map((r, i) => (i !== idx ? r.data?.id_pelanggan : null)).filter(Boolean)
      ])
      const candidate = generateStructuredCustomerId(allIds)
      rowData.id_pelanggan = candidate
      updated[idx]._status = 'valid'
      updated[idx]._action = 'insert'
      updated[idx]._message = `ID diubah menjadi ${candidate} (Terstruktur & Unik)`
      setImportPreviewData(updated)
    }
  }

  const autoMakeAllDuplicatesUnique = () => {
    const updated = [...importPreviewData]
    let changed = 0
    const allIds = new Set([
      ...existingDbIds,
      ...updated.map((r) => r.data?.id_pelanggan).filter(Boolean)
    ])

    const targetIndices = selectedImportIndices.length > 0
      ? selectedImportIndices
      : updated.map((_, i) => i)

    targetIndices.forEach((idx) => {
      const row = updated[idx]
      if (row && (row._status === 'duplicate' || row._status === 'valid')) {
        const rowData = row.data
        const candidate = generateStructuredCustomerId(allIds)
        allIds.add(candidate)
        rowData.id_pelanggan = candidate
        row._status = 'valid'
        row._action = 'insert'
        row._message = `ID diubah menjadi ${candidate} (Terstruktur & Unik)`
        changed++
      }
    })
    setImportPreviewData(updated)
    setImportSuccess(`${changed} baris terpilih berhasil diperbarui dengan ID terstruktur unik!`)
    setTimeout(() => setImportSuccess(''), 3500)
  }

  const setAllDuplicatesAction = (action) => {
    const updated = [...importPreviewData]
    const targetIndices = selectedImportIndices.length > 0
      ? selectedImportIndices
      : updated.map((_, i) => i)

    targetIndices.forEach((idx) => {
      if (updated[idx]) {
        updated[idx]._action = action
      }
    })
    setImportPreviewData(updated)
  }

  const handleExecuteImport = async () => {
    const validRows = importPreviewData.filter((r) => r._status !== 'error' && r._action !== 'skip')
    if (validRows.length === 0) {
      setImportError('Tidak ada data valid yang dapat disimpan ke database.')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportSuccess('')

    try {
      const res = await fetch('/api/customers/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: validRows,
          target_kantor: activeOffice || 'cabang'
        })
      })

      const data = await res.json()
      if (res.ok && data.status === 'success') {
        setImportSuccess(data.message || 'Import data pelanggan berhasil disimpan ke database!')
        setTimeout(() => {
          onClose()
          if (onSuccess) onSuccess()
        }, 1500)
      } else {
        setImportError(data.detail || data.message || 'Gagal menyimpan data import ke database.')
      }
    } catch (err) {
      setImportError('Gagal menghubungkan ke backend untuk eksekusi import.')
    } finally {
      setImportLoading(false)
    }
  }

  if (!isOpen) return null

  // Check condition of selected rows
  const selectedRows = selectedImportIndices.map((i) => importPreviewData[i]).filter(Boolean)
  const hasSelectedDuplicates = selectedRows.some((r) => r._status === 'duplicate')
  const hasSelectedErrors = selectedRows.some((r) => r._status === 'error')
  const allSelectedAreValid = selectedRows.length > 0 && selectedRows.every((r) => r._status === 'valid')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white rounded-3xl border border-sky-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 w-full my-auto ${
          importStep === 3 ? 'max-w-5xl' : 'max-w-2xl'
        } p-5 sm:p-6 transition-all`}
      >
        {/* Modal Header & Step Indicator */}
        <div className="border-b border-sky-100 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Wizard Import Data Pelanggan
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Unggah berkas Excel / CSV dengan pemetaan kolom &amp; resolusi duplikasi terintegrasi
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Step Interactive / Informative Progress Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
            <div
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                importStep === 1
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : importStep > 1
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  importStep === 1
                    ? 'bg-cyan-600 text-white'
                    : importStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {importStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="truncate">1. Unggah Berkas</span>
            </div>

            <div
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                importStep === 2
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : importStep > 2
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  importStep === 2
                    ? 'bg-cyan-600 text-white'
                    : importStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {importStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="truncate">2. Pemetaan Kolom</span>
            </div>

            <div
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                importStep === 3
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  importStep === 3 ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </div>
              <span className="truncate">3. Pratinjau &amp; Simpan</span>
            </div>
          </div>
        </div>

        {/* Error & Success Notification Alerts */}
        {importError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold font-sans flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
        {importSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* ==================== LANGKAH 1: UPLOAD & ANALISIS ==================== */}
        {importStep === 1 && (
          <div className="space-y-4 font-mono text-xs">
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

            {/* Template Download Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Perlu contoh format template standar?</span>
              </div>
              <a
                href="/api/customers/template-excel"
                download="template_import_pelanggan.xlsx"
                className="font-bold text-cyan-700 hover:text-cyan-800 underline flex items-center gap-1.5 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-cyan-200 shadow-2xs hover:bg-cyan-50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Excel</span>
              </a>
            </div>

            {/* Step 1 Footer */}
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

        {/* ==================== LANGKAH 2: PEMETAAN KOLOM ==================== */}
        {importStep === 2 && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-cyan-50/60 p-3 rounded-2xl border border-cyan-200">
              <div>
                <h4 className="font-bold text-slate-900 font-sans text-xs flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-cyan-600" />
                  <span>Cocokkan Kolom Berkas ke Kolom Database</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-sans">
                  Pastikan kolom <strong className="text-cyan-900">Nama Pelanggan</strong> dan{' '}
                  <strong className="text-cyan-900">IP Router</strong> terpetakan dengan benar.
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
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {DB_IMPORT_FIELDS.map((field) => {
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
        )}

        {/* ==================== LANGKAH 3: PRATINJAU & EKSEKUSI ==================== */}
        {importStep === 3 && (
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
                onClick={() => setStatusFilter('VALID')}
                className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
                  statusFilter === 'VALID'
                    ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/40 shadow-xs'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/50'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 block">Siap Diimpor (Valid)</span>
                <strong className="text-base font-black">
                  {importPreviewData.filter((r) => r._status === 'valid' && r._action !== 'skip').length}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('DUPLICATE')}
                className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
                  statusFilter === 'DUPLICATE'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/50'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 block">Duplikat Terdeteksi</span>
                <strong className="text-base font-black">
                  {importPreviewData.filter((r) => r._status === 'duplicate').length}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ERROR')}
                className={`p-3 rounded-2xl text-left transition border cursor-pointer ${
                  statusFilter === 'ERROR'
                    ? 'bg-rose-100/90 border-rose-400 text-rose-950 ring-2 ring-rose-400/40 shadow-xs'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100/50'
                }`}
              >
                <span className="text-[10px] font-bold text-rose-700 block">Tidak Lengkap (Error)</span>
                <strong className="text-base font-black">
                  {importPreviewData.filter((r) => r._status === 'error').length}
                </strong>
              </button>
            </div>

            {/* Action Bar (Hanya muncul jika ada baris yang dicentang / terpilih) */}
            {selectedImportIndices.length > 0 && (
              <div
                className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 duration-150 ${
                  hasSelectedDuplicates || hasSelectedErrors
                    ? 'bg-amber-50/80 border-amber-200'
                    : 'bg-emerald-50/80 border-emerald-200'
                }`}
              >
                <div className="space-y-0.5">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 font-sans ${
                      hasSelectedDuplicates || hasSelectedErrors ? 'text-amber-950' : 'text-emerald-950'
                    }`}
                  >
                    {hasSelectedDuplicates || hasSelectedErrors ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>
                      {hasSelectedDuplicates
                        ? `Resolusi Duplikasi Data (${selectedImportIndices.length} Baris Tercentang)`
                        : `Aksi Baris Terpilih (${selectedImportIndices.length} Baris Tercentang)`}
                    </span>
                  </span>
                  <p
                    className={`text-[11px] font-sans ${
                      hasSelectedDuplicates || hasSelectedErrors ? 'text-amber-800' : 'text-emerald-800'
                    }`}
                  >
                    {hasSelectedDuplicates
                      ? 'Gunakan tombol di sebelah kanan untuk memberikan ID unik baru secara otomatis atau lewati data duplikat.'
                      : 'Seluruh baris terpilih dalam kondisi valid dan siap diimpor ke database.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0 font-sans">
                  {/* Jika ada yang teridentifikasi duplikat: tombol generate id unik dan abikan baris */}
                  {hasSelectedDuplicates && (
                    <>
                      <button
                        type="button"
                        onClick={autoMakeAllDuplicatesUnique}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Ubah seluruh ID baris terpilih menjadi ID unik baru"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Generate ID Unik Otomatis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllDuplicatesAction('skip')}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition cursor-pointer"
                      >
                        Abaikan Baris Terpilih
                      </button>
                    </>
                  )}

                  {/* Jika SELURUH yang tercentang aman (valid): hanya muncul tombol Simpan Baris Terpilih */}
                  {allSelectedAreValid && (
                    <button
                      type="button"
                      onClick={() => setAllDuplicatesAction('insert')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Baris Terpilih</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="max-h-[340px] overflow-y-auto border border-sky-200 rounded-2xl shadow-2xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-cyan-50 border-b border-sky-200 text-slate-700 text-[10px] uppercase font-bold z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredIndices.length > 0 &&
                          filteredIndices.every((idx) => selectedImportIndices.includes(idx))
                        }
                        onChange={toggleSelectAllImport}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                        title="Pilih / Centang Semua Baris pada Filter Ini"
                      />
                    </th>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">ID Pelanggan</th>
                    <th className="py-2.5 px-3">Nama Pelanggan</th>
                    <th className="py-2.5 px-3">No WA</th>
                    <th className="py-2.5 px-3">IP Router ONT</th>
                    <th className="py-2.5 px-3">POP / Wilayah</th>
                    <th className="py-2.5 px-3">Status &amp; Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 text-[11px]">
                  {filteredIndices.map((idx) => {
                    const row = importPreviewData[idx]
                    const d = row.data || {}
                    const isDup = row._status === 'duplicate'
                    const isErr = row._status === 'error'
                    const isSkip = row._action === 'skip'

                    return (
                      <tr
                        key={idx}
                        className={`transition ${
                          selectedImportIndices.includes(idx)
                            ? 'bg-amber-50/70 border-l-2 border-l-amber-500'
                            : isSkip
                            ? 'opacity-40 bg-slate-50'
                            : isErr
                            ? 'bg-rose-50/40'
                            : isDup
                            ? 'bg-amber-50/40'
                            : 'hover:bg-cyan-50/30'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedImportIndices.includes(idx)}
                            onChange={() => toggleSelectImportRow(idx)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold font-mono">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={d.id_pelanggan || ''}
                              onChange={(e) => updatePreviewRow(idx, 'id_pelanggan', e.target.value)}
                              className="w-28 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold font-mono focus:outline-none focus:border-cyan-500 bg-white"
                            />
                            {isDup && (
                              <button
                                type="button"
                                onClick={() => makeRowUnique(idx)}
                                className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold shrink-0 transition cursor-pointer"
                                title="Buat ID Unik Otomatis"
                              >
                                Buat Unik
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{d.nama || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{d.no_wa || d.no_hp || '-'}</td>
                        <td className="py-2 px-3 font-mono text-cyan-900">{d.ip_router || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="font-bold text-slate-700">{d.pop || 'POP-01'}</span>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            {d.kantor || activeOffice || 'cabang'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {isErr ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <AlertCircle className="w-3 h-3" />
                              <span>{row._message}</span>
                            </span>
                          ) : isDup ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{row._message}</span>
                            </span>
                          ) : isSkip ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px]">
                              <span>Dilewati (Skip)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <Check className="w-3 h-3" />
                              <span>{row._message || 'Siap Diimpor'}</span>
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
                disabled={
                  importLoading ||
                  importPreviewData.filter((r) => r._status !== 'error' && r._action !== 'skip').length === 0
                }
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
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      Simpan ke Database (
                      {importPreviewData.filter((r) => r._status !== 'error' && r._action !== 'skip').length} Baris)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
