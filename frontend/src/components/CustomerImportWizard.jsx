import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  FileSpreadsheet,
  Building2
} from 'lucide-react'
import { ToastNotification } from './ToastNotification'
import { ImportStepUpload } from './import_wizard/ImportStepUpload'
import { ImportStepMapping } from './import_wizard/ImportStepMapping'
import { ImportStepPreview } from './import_wizard/ImportStepPreview'
export function CustomerImportWizard({
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

  // Mapping standar nama kantor EdTeknoGuard ke kemungkinan slug PoP di Network Bill
  const resolvePopSlugFromOffice = (office, popsList = []) => {
    const raw = (office || '').toLowerCase().trim()
    const cleanRaw = raw.replace(/\s+/g, '') // hilangkan spasi: 'karang gede' -> 'karanggede'

    // 1. Cek pencocokan ke daftar PoP jika sudah dimuat
    if (popsList && popsList.length > 0) {
      const match = popsList.find(
        (p) =>
          p.slug.toLowerCase() === raw ||
          p.slug.toLowerCase() === cleanRaw ||
          p.name.toLowerCase().replace(/\s+/g, '').includes(cleanRaw)
      )
      if (match) return match.slug
    }

    // 2. Mapping bawaan ISP EdTeknoGuard:
    if (cleanRaw === 'cabang' || cleanRaw === 'slawi') return 'slawi'
    if (cleanRaw === 'banyumas' || cleanRaw === 'bms') return 'banyumas'
    if (cleanRaw.includes('karanggede') || cleanRaw.includes('karang')) return 'karanggede'
    if (cleanRaw.includes('tengaran')) return 'tengaran'
    if (cleanRaw === 'pusat') return 'pusat'
    return cleanRaw || 'slawi'
  }

  // State Integrasi Network Bill API (api-v1)
  const [importSource, setImportSource] = useState('file') // 'file' | 'network_bill'
  const [networkBillPops, setNetworkBillPops] = useState([])
  const [selectedPop, setSelectedPop] = useState(() => resolvePopSlugFromOffice(activeOffice))
  const [networkBillLimitMode, setNetworkBillLimitMode] = useState('all') // default langsung tarik semua ('all')
  const [networkBillLoadingPops, setNetworkBillLoadingPops] = useState(false)
  const [networkBillFetching, setNetworkBillFetching] = useState(false)

  // Fungsi reset seluruh state wizard agar fresh kembali saat dibuka
  const resetWizardState = () => {
    setImportStep(1)
    setShowAdvancedFields(false)
    setImportFile(null)
    setImportAnalyzing(false)
    setIsExcelFile(false)
    setImportSheets([])
    setImportSelectedSheet('')
    setImportColumns([])
    setImportMapping({})
    setImportPreviewData([])
    setSelectedImportIndices([])
    setExistingDbIds([])
    setExistingDbIps([])
    setImportLoading(false)
    setImportError('')
    setImportSuccess('')
    setStatusFilter('ALL')
    setImportSource('file')
    setNetworkBillLimitMode('all')
    setNetworkBillFetching(false)
  }

  // Reset otomatis saat modal Lengkapi Data dibuka kembali
  useEffect(() => {
    if (isOpen) {
      resetWizardState()
    }
  }, [isOpen])

  // Otomatis update selectedPop saat user berpindah kantor aktif (activeOffice)
  useEffect(() => {
    if (activeOffice) {
      setSelectedPop(resolvePopSlugFromOffice(activeOffice, networkBillPops))
    }
  }, [activeOffice, networkBillPops])

  // 1. Kolom Utama Pengayaan Data (Fokus No WA, Alamat & Password WiFi)
  const PRIMARY_FIELDS = [
    { key: 'ip_router', label: 'IP Router / ONT (Kunci Pencocokan)', required: true, hint: 'Wajib diisi: 10.10.x.x (Standar ONT) atau 192.168.x.x (IP Lokal)' },
    { key: 'nama', label: 'Nama Pelanggan', required: false, hint: 'Opsional: Perbarui nama jika di database masih default' },
    { key: 'no_wa', label: 'Nomor WhatsApp / HP', required: false, hint: 'Diisi ke profil WhatsApp pelanggan' },
    { key: 'alamat', label: 'Alamat Pemasangan Rumah', required: false, hint: 'Alamat fisik pelanggan di lapangan' },
    { key: 'password_wifi', label: 'Password WiFi', required: false, hint: 'Kata sandi WiFi' }
  ]

  // 2. Kolom Teknis Lanjutan (Opsional)
  const ADVANCED_FIELDS = [
    { key: 'user_admin', label: 'Username ONT', required: false, hint: 'Sesuai kredensial ONT' },
    { key: 'pass_admin', label: 'Password ONT', required: false, hint: 'Sesuai kredensial ONT' }
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

  const loadNetworkBillPops = async () => {
    setNetworkBillLoadingPops(true)
    setImportError('')
    try {
      const res = await fetch('/api/customers/network-bill/pops')
      const data = await res.json()
      if (res.ok && data.result) {
        const pops = data.result || []
        setNetworkBillPops(pops)
        if (pops.length > 0 && !selectedPop) {
          setSelectedPop(pops[0].slug)
        }
      } else {
        setImportError(data.detail || 'Gagal memuat daftar PoP dari Network Bill.')
      }
    } catch (err) {
      setImportError('Gagal menghubungi backend untuk daftar PoP.')
    } finally {
      setNetworkBillLoadingPops(false)
    }
  }

  const handleFetchNetworkBillPreview = async () => {
    const pop = resolvePopSlugFromOffice(activeOffice, networkBillPops)
    const limit = networkBillLimitMode === '1' ? 1 : 0 // 0 = tarik semua pelanggan
    setNetworkBillFetching(true)
    setImportError('')

    try {
      const res = await fetch(`/api/customers/network-bill/preview?pop=${encodeURIComponent(pop)}&limit=${limit}`, {
        method: 'POST'
      })
      const data = await res.json()
      if (res.ok && data.result) {
        const rawPreview = data.result.preview_data || []
        setExistingDbIds(data.result.existing_ids || [])
        setExistingDbIps(data.result.existing_ips || [])
        setImportPreviewData(rawPreview)
        setSelectedImportIndices([])
        setStatusFilter('ALL')
        setImportStep(3) // Langsung lompat ke Langkah 3 Pratinjau & Perbandingan!
      } else {
        setImportError(data.detail || 'Gagal menarik data dari API Network Bill.')
      }
    } catch (err) {
      setImportError('Gagal menghubungi server untuk penarikan data Network Bill.')
    } finally {
      setNetworkBillFetching(false)
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
            `Perhatian: Tidak ada IP pada berkas yang cocok dengan data IP Router maupun IP ONT pelanggan di database. Pastikan kolom IP terpetakan dengan benar dan berkas yang Anda pilih sudah sesuai.`
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
          resetWizardState()
          onClose()
          if (onSuccess) onSuccess()
        }, 1200)
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
        className={`bg-white rounded-3xl border border-sky-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 w-full my-auto ${importStep === 3 ? 'max-w-5xl' : 'max-w-2xl'
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
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-sans">
                    Lengkapi Data Pelanggan
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-cyan-800 bg-cyan-100/90 px-2 py-0.5 rounded-lg uppercase tracking-tight border border-cyan-200">
                    <Building2 className="w-3 h-3 text-cyan-700 shrink-0" />
                    <span>Kantor {activeOffice}</span>
                  </span>
                </div>
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
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${importStep === 1
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : importStep > 1
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${importStep === 1
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
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${importStep === 2
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : importStep > 2
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${importStep === 2
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
              className={`flex items-center gap-2 p-2 rounded-xl border transition ${importStep === 3
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${importStep === 3 ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
              >
                3
              </div>
              <span className="truncate">3. Pratinjau &amp; Simpan</span>
            </div>
          </div>
        </div>

        {/* Error & Success Notification Alerts (Toast) */}
        <ToastNotification
          show={Boolean(importError)}
          type="error"
          title="Gagal Import"
          message={importError}
          onClose={() => setImportError('')}
        />
        <ToastNotification
          show={Boolean(importSuccess)}
          type="success"
          title="Import Berhasil"
          message={importSuccess}
          onClose={() => setImportSuccess('')}
        />

        
        {/* ==================== LANGKAH 1: SUMBER DATA ==================== */}
        {importStep === 1 && (
          <ImportStepUpload
            importSource={importSource}
            setImportSource={setImportSource}
            networkBillPops={networkBillPops}
            loadNetworkBillPops={loadNetworkBillPops}
            handleImportFileSelected={handleImportFileSelected}
            importAnalyzing={importAnalyzing}
            importFile={importFile}
            isExcelFile={isExcelFile}
            importSheets={importSheets}
            importSelectedSheet={importSelectedSheet}
            handleSheetChange={handleSheetChange}
            activeOffice={activeOffice}
            importColumns={importColumns}
            onClose={onClose}
            handleProceedToStep2={handleProceedToStep2}
            networkBillLimitMode={networkBillLimitMode}
            setNetworkBillLimitMode={setNetworkBillLimitMode}
            networkBillFetching={networkBillFetching}
            handleFetchNetworkBillPreview={handleFetchNetworkBillPreview}
          />
        )}

        {/* ==================== LANGKAH 2: PEMETAAN KOLOM ==================== */}
        {importStep === 2 && (
          <ImportStepMapping
            PRIMARY_FIELDS={PRIMARY_FIELDS}
            ADVANCED_FIELDS={ADVANCED_FIELDS}
            importMapping={importMapping}
            setImportMapping={setImportMapping}
            importColumns={importColumns}
            autoMapColumns={autoMapColumns}
            showAdvancedFields={showAdvancedFields}
            setShowAdvancedFields={setShowAdvancedFields}
            setImportStep={setImportStep}
            importLoading={importLoading}
            handleProceedToStep3={handleProceedToStep3}
          />
        )}

        {/* ==================== LANGKAH 3: PRATINJAU & EKSEKUSI ==================== */}
        {importStep === 3 && (
          <ImportStepPreview
            importPreviewData={importPreviewData}
            setImportPreviewData={setImportPreviewData}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedImportIndices={selectedImportIndices}
            setSelectedImportIndices={setSelectedImportIndices}
            setAllDuplicatesAction={setAllDuplicatesAction}
            filteredIndices={filteredIndices}
            isAllFilteredSelected={
              filteredIndices.length > 0 &&
              filteredIndices.every((idx) => selectedImportIndices.includes(idx))
            }
            toggleSelectAllFiltered={toggleSelectAllImport}
            toggleSelectRow={toggleSelectImportRow}
            setImportStep={setImportStep}
            importLoading={importLoading}
            handleExecuteImport={handleExecuteImport}
          />
        )}
      </div>
    </div>
  )
}
