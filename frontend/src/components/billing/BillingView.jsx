import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BillingService } from '../../services/api'
import { SegmentedStatusBar } from '../common/CommonUI'
import { BillingFilterBar } from './BillingFilterBar'
import { BillingTable } from './BillingTable'
import { BillingMessageModal } from './BillingMessageModal'
import { ToastNotification } from '../common/ToastNotification'

export function BillingView({ activeOffice, currentUser, onNavigateCustomer }) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({})
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total_records: 0, total_pages: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedIds, setSelectedIds] = useState([])
  const [syncingId, setSyncingId] = useState(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [copiedVA, setCopiedVA] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [resultReminder, setResultReminder] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'info', title: '' })

  const showToast = (message, type = 'info', title = '') => {
    setToast({ show: true, message, type, title })
  }

  const formatRupiah = (val) => `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await BillingService.getOverview({
        kantor: activeOffice,
        q: searchQuery,
        status: statusFilter,
        sort_by: sortField || undefined,
        sort_dir: sortDir || undefined,
        page,
        limit: 15
      })
      if (res) {
        const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
        setData(items)
        setSummary(res.summary || {})
        setPagination(res.pagination || { page: 1, limit: 15, total_records: 0, total_pages: 1 })
      }
    } catch (err) {
      showToast('Gagal memuat data pembayaran: ' + (err.message || 'Error server'), 'error')
    } finally {
      setLoading(false)
    }
  }, [activeOffice, searchQuery, statusFilter, page, sortField, sortDir])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'total_tagihan' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const handleSyncSingle = async (idPelanggan) => {
    setSyncingId(idPelanggan)
    try {
      const res = await BillingService.syncSingle(idPelanggan)
      if (res && res.ok) {
        showToast(res.message || 'Sinkronisasi berhasil', 'success', 'Berhasil')
        loadData()
      } else {
        showToast(res.message || 'Gagal sinkronisasi data', 'error', 'Peringatan')
      }
    } catch (err) {
      showToast('Error sinkronisasi: ' + (err.message || 'Koneksi gagal'), 'error', 'Gagal')
    } finally {
      setSyncingId(null)
    }
  }

  const handleSyncAll = async () => {
    setSyncingAll(true)
    try {
      const res = await BillingService.syncAll(activeOffice)
      if (res && res.ok) {
        showToast(res.message || 'Sinkronisasi tagihan kantor berhasil', 'success', 'Berhasil')
        await loadData()
      } else {
        showToast(res.message || 'Gagal sinkronisasi data kantor', 'error', 'Peringatan')
      }
    } catch (err) {
      showToast('Error sinkronisasi kantor: ' + (err.message || 'Koneksi gagal'), 'error', 'Gagal')
    } finally {
      setSyncingAll(false)
    }
  }

  const handleCopyVA = (va) => {
    if (!va || va === '-') return
    navigator.clipboard.writeText(va)
    setCopiedVA(va)
    showToast(`Nomor VA ${va} disalin ke clipboard`, 'success', 'Tersalin')
    setTimeout(() => setCopiedVA(null), 2500)
  }

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllCurrentPage = () => {
    if (!Array.isArray(data)) return
    const pageIds = data.map((p) => p.id_pelanggan)
    const isAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const selectedCustomers = useMemo(() => {
    if (!Array.isArray(data)) return []
    return data.filter((p) => selectedIds.includes(p.id_pelanggan))
  }, [data, selectedIds])

  const handleSendReminders = async ({ sendFcm, customMessage }) => {
    setSending(true)
    try {
      const res = await BillingService.sendReminders({
        kantor: activeOffice,
        id_pelanggan_list: selectedIds,
        pesan_kustom: customMessage,
        kirim_fcm: sendFcm
      })
      setResultReminder(res)
      showToast(res.message || 'Pengingat berhasil diproses', 'success', 'Terkirim')
      loadData()
    } catch (err) {
      showToast('Gagal kirim pengingat: ' + (err.message || 'Error server'), 'error', 'Gagal')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Toast Alert */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* 1. Segmented Status Bar Terpadu (Satu Garis Penuh Konsisten dengan Menu Lain) */}
      <SegmentedStatusBar
        items={[
          {
            label: 'Total Terdata',
            value: `${summary.total_pelanggan || 0}`,
            colorScheme: 'cyan',
            isActive: statusFilter === 'ALL',
            onClick: () => {
              setStatusFilter('ALL')
              setPage(1)
            },
            subLabel: `Tunggakan: ${formatRupiah(summary.total_nominal_tunggakan || 0)}`
          },
          {
            label: 'Sudah Lunas',
            value: `${summary.total_lunas || 0}`,
            colorScheme: 'emerald',
            isActive: statusFilter === 'LUNAS',
            onClick: () => {
              setStatusFilter('LUNAS')
              setPage(1)
            },
            subLabel: 'Layanan Lancar'
          },
          {
            label: 'Belum Lunas',
            value: `${summary.total_belum_bayar || 0}`,
            colorScheme: 'amber',
            isActive: statusFilter === 'BELUM_BAYAR',
            onClick: () => {
              setStatusFilter('BELUM_BAYAR')
              setPage(1)
            },
            subLabel: 'Menunggu Bayar'
          },
          {
            label: 'Jatuh Tempo',
            value: `${summary.total_overdue || 0}`,
            colorScheme: 'rose',
            isActive: statusFilter === 'OVERDUE',
            onClick: () => {
              setStatusFilter('OVERDUE')
              setPage(1)
            },
            subLabel: 'Perlu Pengingat'
          }
        ]}
      />

      {/* 2. Filter Bar Ringkas & Tombol Aksi */}
      <BillingFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setPage={setPage}
        selectedCount={selectedIds.length}
        onOpenReminderModal={() => {
          setResultReminder(null)
          setModalOpen(true)
        }}
        onClearSelection={handleClearSelection}
        onRefresh={loadData}
        onSyncAll={handleSyncAll}
        syncingAll={syncingAll}
        loading={loading}
        lastSyncTime={summary.terakhir_sinkron || '-'}
      />

      {/* 3. Tabel Data Tagihan */}
      <BillingTable
        data={data}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAllCurrentPage={handleSelectAllCurrentPage}
        onSyncSingle={handleSyncSingle}
        syncingId={syncingId}
        onCopyVA={handleCopyVA}
        copiedVA={copiedVA}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        onNavigateCustomer={onNavigateCustomer}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Modal Pengiriman Pesan */}
      <BillingMessageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedCustomers={selectedCustomers}
        onSendReminders={handleSendReminders}
        sending={sending}
        resultData={resultReminder}
        onResetResult={() => setResultReminder(null)}
      />
    </div>
  )
}
export default BillingView
