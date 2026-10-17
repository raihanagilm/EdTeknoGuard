import React, { useState } from 'react'
import {
  Upload,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)
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

  // 1. Kolom Utama Pengayaan Data (Fokus No WA, Alamat & WiFi)
  const PRIMARY_FIELDS = [
    { key: 'ip_router', label: 'IP Router / ONT (Kunci Pencocokan)', required: true, hint: 'Wajib diisi: 10.10.x.x (Standar ONT) atau 192.168.x.x (IP Lokal)' },
    { key: 'nama', label: 'Nama Pelanggan', required: false, hint: 'Opsional: Perbarui nama jika di database masih default' },
    { key: 'no_wa', label: 'Nomor WhatsApp / HP', required: false, hint: 'Diisi ke profil WhatsApp pelanggan' },
    { key: 'alamat', label: 'Alamat Pemasangan Rumah', required: false, hint: 'Alamat fisik pelanggan di lapangan' },
    { key: 'nama_wifi', label: 'Nama WiFi (SSID)', required: false, hint: 'SSID WiFi Pelanggan' },
    { key: 'password_wifi', label: 'Password WiFi', required: false, hint: 'Kata sandi WiFi' }
  ]

  // 2. Kolom Teknis Lanjutan (Opsional)
  const ADVANCED_FIELDS = [
    { key: 'pop', label: 'Lokasi POP / ODP', required: false, hint: 'Default: POP-01' },
    { key: 'paket', label: 'Paket Layanan', required: false, hint: 'Default: Sesuai MikroTik' },
    { key: 'jenis_modem', label: 'Tipe Modem ONT', required: false, hint: 'Opsional (Sesuai perangkat)' },
    { key: 'user_admin', label: 'Username ONT', required: false, hint: 'Sesuai kredensial ONT' },
    { key: 'pass_admin', label: 'Password ONT', required: false, hint: 'Sesuai kredensial ONT' },
    { key: 'id_pelanggan', label: 'ID Pelanggan', required: false, hint: 'Opsional (otomatis sesuai database)' }
  ]

  const DB_IMPORT_FIELDS = [...PRIMARY_FIELDS, ...ADVANCED_FIELDS]

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
    if (!importMapping.ip_router) {
      setImportError('Kolom "IP Router / ONT" wajib dipetakan sebagai kunci pencocokan data!')
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
        const matchCount = data.result.match_count || 0
        setExistingDbIds(data.result.existing_ids || [])
        setExistingDbIps(data.result.existing_ips || [])
        setImportPreviewData(rawPreview)
        setSelectedImportIndices([])
        setStatusFilter('ALL')
        setImportStep(3)

        if (rawPreview.length > 0 && matchCount === 0) {
          setImportError(
            `Perhatian: Tidak ada IP yang cocok dengan data pelanggan ${activeOffice.toUpperCase()} di database. Harap periksa kembali apakah lembar kerja (sheet) "${importSelectedSheet}" atau berkas Excel yang Anda pilih sudah sesuai dengan kantor aktif saat ini!`
          )
        }
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
      if (statusFilter === 'MATCH') return row._status === 'match'
      if (statusFilter === 'CONFLICT') return row._status === 'conflict'
      if (statusFilter === 'UNREGISTERED') return row._status === 'unregistered'
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
                  Lengkapi Data Pelanggan
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Lengkapi Nomor WhatsApp, Alamat Pemasangan, dan Kredensial WiFi berdasarkan IP Router ONT
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
                      <p className="text-[10px] text-cyan-800 font-sans">
                        Pilih sheet yang sesuai dengan kantor aktif saat ini (<strong className="uppercase">{activeOffice}</strong>). Contoh: sheet <span className="font-mono font-bold">PELANGGAN BMS</span> untuk Banyumas, atau <span className="font-mono font-bold">PELANGGAN CABANG</span> untuk Cabang.
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
                    <span>Pengaturan Kolom Teknis Lanjutan (Modem, User Admin, POP, Paket)</span>
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
              <div
                className="p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 duration-150 bg-cyan-50/70 border-cyan-200"
              >
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
                  {/* Kasus 1: Tab IP Belum Terdaftar (Gambar 1) */}
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
                        title="Daftarkan seluruh baris terpilih ke database sebagai pelanggan baru (status offline)"
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

                  {/* Kasus 2: Tab Data Berbeda (Gambar 2) */}
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
                        title="Gunakan data dari berkas Excel untuk semua baris tercentang"
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
                        title="Pertahankan data lama database untuk semua baris tercentang"
                      >
                        Pertahankan Data Database
                      </button>
                    </>
                  )}

                  {/* Kasus 3: Tab Cocok (Gambar 3) */}
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

                  {/* Kasus 4: Tab Total Baris (Semua) atau Error (Gambar 4) */}
                  {(statusFilter === 'ALL' || statusFilter === 'ERROR') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...importPreviewData]
                          // Skip baris yang error/IP kosong
                          updated.forEach((row) => {
                            if (row._status === 'error' || !row.data?.ip_router) {
                              row._action = 'skip'
                            }
                          })
                          setImportPreviewData(updated)
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer"
                        title="Otomatis lewati seluruh baris yang tidak memuat IP router valid"
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
            <div className="max-h-[380px] overflow-y-auto border border-sky-200 rounded-2xl shadow-2xs bg-white">
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
                    <th className="py-2.5 px-3">IP Router ONT</th>
                    <th className="py-2.5 px-3">Pelanggan</th>
                    <th className="py-2.5 px-3">No. WhatsApp (Baru vs Database)</th>
                    <th className="py-2.5 px-3">Alamat Pemasangan</th>
                    <th className="py-2.5 px-3">Kredensial WiFi</th>
                    <th className="py-2.5 px-3">Status &amp; Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 text-[11px]">
                  {filteredIndices.map((idx) => {
                    const row = importPreviewData[idx]
                    const d = row.data || {}
                    const old = row.old_data || {}
                    const isConflict = row._status === 'conflict'
                    const isUnreg = row._status === 'unregistered'
                    const isMatch = row._status === 'match'
                    const isErr = row._status === 'error'
                    const isSkip = row._action === 'skip'
                    const isNewVersion = row.selected_version === 'new'

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
                            : isConflict
                            ? 'bg-amber-50/40'
                            : isUnreg
                            ? 'bg-slate-50/60'
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
                        <td className="py-2 px-3 font-mono">
                          <span className="font-bold text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                            {d.ip_router || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <div className="font-bold text-slate-800">{d.nama || old.nama || '-'}</div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {d.id_pelanggan || old.id_pelanggan || '-'}
                          </span>
                        </td>
                        
                        {/* No WA (Perbandingan Baru vs Lama jika ada konflik) */}
                        <td className="py-2 px-3">
                          {isConflict && old.no_wa && (d.no_wa || d.no_hp) && old.no_wa !== (d.no_wa || d.no_hp) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400">Database:</span>
                                <span className={`font-mono ${!isNewVersion ? 'font-bold text-emerald-700 bg-emerald-50 px-1 rounded' : 'line-through text-slate-400'}`}>
                                  {old.no_wa}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-cyan-700 font-bold">Berkas:</span>
                                <span className={`font-mono ${isNewVersion ? 'font-bold text-cyan-900 bg-cyan-100/70 px-1 rounded' : 'line-through text-slate-400'}`}>
                                  {d.no_wa || d.no_hp}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-slate-700">
                              {d.no_wa || d.no_hp || old.no_wa || '-'}
                            </span>
                          )}
                        </td>

                        {/* Alamat Pemasangan */}
                        <td className="py-2 px-3 max-w-[180px]">
                          {isConflict && old.alamat && d.alamat && old.alamat !== d.alamat ? (
                            <div className="space-y-1 text-[10px]">
                              <div className="truncate text-slate-400" title={old.alamat}>
                                DB: <span className={!isNewVersion ? 'font-bold text-emerald-700' : 'line-through'}>{old.alamat}</span>
                              </div>
                              <div className="truncate text-cyan-900" title={d.alamat}>
                                Baru: <span className={isNewVersion ? 'font-bold text-cyan-900 bg-cyan-50 px-1 rounded' : 'line-through'}>{d.alamat}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="truncate text-slate-700" title={d.alamat || old.alamat || ''}>
                              {d.alamat || old.alamat || '-'}
                            </p>
                          )}
                        </td>

                        {/* WiFi */}
                        <td className="py-2 px-3 text-[10px]">
                          {d.nama_wifi || old.nama_wifi ? (
                            <div>
                              <span className="font-bold text-slate-800">{d.nama_wifi || old.nama_wifi}</span>
                              <span className="text-slate-400 block font-mono">
                                Pass: {d.password_wifi || old.password_wifi || '***'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">-</span>
                          )}
                        </td>

                        {/* Kolom Status & Aksi Interaktif */}
                        <td className="py-2 px-3">
                          {isErr ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <AlertCircle className="w-3 h-3" />
                              <span>{row._message}</span>
                            </span>
                          ) : isConflict ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Data Berbeda</span>
                              </span>
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...importPreviewData]
                                    updated[idx].selected_version = 'new'
                                    updated[idx]._action = 'update'
                                    setImportPreviewData(updated)
                                  }}
                                  className={`px-1.5 py-0.5 rounded border transition cursor-pointer ${
                                    isNewVersion
                                      ? 'bg-cyan-700 text-white border-cyan-800 font-bold'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Pakai Baru
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...importPreviewData]
                                    updated[idx].selected_version = 'old'
                                    updated[idx]._action = 'update'
                                    setImportPreviewData(updated)
                                  }}
                                  className={`px-1.5 py-0.5 rounded border transition cursor-pointer ${
                                    !isNewVersion
                                      ? 'bg-slate-700 text-white border-slate-800 font-bold'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Pakai Lama
                                </button>
                              </div>
                            </div>
                          ) : isUnreg ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[10px]">
                                <Info className="w-3 h-3 text-slate-600" />
                                <span>IP Belum Ada di DB</span>
                              </span>
                              <div className="flex items-center gap-1 text-[10px]">
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
                              <span>Cocok (Update No WA &amp; Alamat)</span>
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
                      Simpan Perubahan (
                      {importPreviewData.filter((r) => r._status !== 'error' && r._action !== 'skip').length} Pelanggan)
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
