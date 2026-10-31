import React, { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Plus,
  Router,
  KeyRound,
  MapPin,
  X,
  Play,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { UsersService } from '../services/api';
import { FilterContainer, DataTableContainer } from './CommonUI';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { ToastNotification } from './ToastNotification';

export function BranchOfficesView() {
  const [kantorList, setKantorList] = useState([]);
  const [kantorLoading, setKantorLoading] = useState(false);
  const [kantorSearch, setKantorSearch] = useState('');
  
  // State Sync On-Demand MikroTik
  const [syncingId, setSyncingId] = useState(null);

  // Modal Kantor State
  const [modalKantorOpen, setModalKantorOpen] = useState(false);
  const [kantorModalMode, setKantorModalMode] = useState('add'); // 'add' | 'edit'
  const [currentKantorId, setCurrentKantorId] = useState(null);
  const [kantorNama, setKantorNama] = useState('');
  const [kantorKode, setKantorKode] = useState('');
  const [kantorIsActive, setKantorIsActive] = useState(true);
  const [kantorAlamat, setKantorAlamat] = useState('');
  const [kantorMikrotikHost, setKantorMikrotikHost] = useState('');
  const [kantorMikrotikPort, setKantorMikrotikPort] = useState('');
  const [kantorMikrotikUser, setKantorMikrotikUser] = useState('');
  const [kantorMikrotikPass, setKantorMikrotikPass] = useState('');
  const [kantorMikrotikSyncInterval, setKantorMikrotikSyncInterval] = useState('3');
  const [kantorActiveTab, setKantorActiveTab] = useState('identitas'); // 'identitas' | 'mikrotik'
  const [kantorError, setKantorError] = useState('');
  const [kantorSubmitting, setKantorSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const fetchKantors = async () => {
    setKantorLoading(true);
    try {
      const res = await UsersService.getKantors();
      if (res.ok && res.data && res.data.kantors) {
        setKantorList(res.data.kantors);
      }
    } catch (err) {
      console.error('Gagal memuat kantor:', err);
      showToast('Gagal memuat daftar kantor', 'error');
    } finally {
      setKantorLoading(false);
    }
  };

  useEffect(() => {
    fetchKantors();
  }, []);

  const openAddKantorModal = () => {
    setKantorModalMode('add');
    setCurrentKantorId(null);
    setKantorNama('');
    setKantorKode('');
    setKantorIsActive(true);
    setKantorAlamat('');
    setKantorMikrotikHost('');
    setKantorMikrotikPort('');
    setKantorMikrotikUser('');
    setKantorMikrotikPass('');
    setKantorMikrotikSyncInterval('3');
    setKantorActiveTab('identitas');
    setKantorError('');
    setModalKantorOpen(true);
  };

  const openEditKantorModal = (k) => {
    setKantorModalMode('edit');
    setCurrentKantorId(k.id);
    setKantorNama(k.nama || '');
    setKantorKode(k.kode || '');
    setKantorIsActive(k.is_active !== undefined ? Boolean(k.is_active) : true);
    setKantorAlamat(k.alamat || '');
    setKantorMikrotikHost(k.mikrotik_host || '');
    setKantorMikrotikPort(k.mikrotik_port ? String(k.mikrotik_port) : '');
    setKantorMikrotikUser(k.mikrotik_user || '');
    setKantorMikrotikPass(k.mikrotik_pass || '');
    setKantorMikrotikSyncInterval(k.mikrotik_sync_interval ? String(k.mikrotik_sync_interval) : '3');
    setKantorActiveTab('identitas');
    setKantorError('');
    setModalKantorOpen(true);
  };

  const handleKantorFormSubmit = async (e) => {
    e.preventDefault();
    setKantorError('');
    if (!kantorNama.trim()) {
      setKantorError('Nama kantor wajib diisi');
      return;
    }

    setKantorSubmitting(true);
    try {
      const payload = {
        nama: kantorNama.trim(),
        is_active: kantorIsActive,
        alamat: kantorAlamat.trim() || undefined,
        mikrotik_host: kantorMikrotikHost.trim() || undefined,
        mikrotik_port: kantorMikrotikPort.trim() ? parseInt(kantorMikrotikPort.trim(), 10) : undefined,
        mikrotik_user: kantorMikrotikUser.trim() || undefined,
        mikrotik_pass: kantorMikrotikPass.trim() || undefined,
        mikrotik_sync_interval: kantorMikrotikSyncInterval.trim() ? Math.max(1, parseInt(kantorMikrotikSyncInterval.trim(), 10)) : 3
      };

      if (kantorModalMode === 'add') {
        payload.kode = kantorKode.trim() ? kantorKode.trim().toLowerCase() : undefined;
      }

      const res = kantorModalMode === 'add'
        ? await UsersService.addKantor(payload)
        : await UsersService.updateKantor(currentKantorId, payload);

      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message || (kantorModalMode === 'add' ? 'Kantor berhasil ditambahkan!' : 'Data kantor berhasil diperbarui!'));
        setModalKantorOpen(false);
        fetchKantors();
        window.dispatchEvent(new CustomEvent('edtekno_kantor_updated'));
      } else {
        setKantorError(res.data?.message || 'Gagal memproses data kantor');
      }
    } catch (err) {
      console.error('Error submit kantor:', err);
      setKantorError('Gagal terhubung ke server');
    } finally {
      setKantorSubmitting(false);
    }
  };

  // State Modal Konfirmasi Hapus Kantor
  const [deleteConfirmKantor, setDeleteConfirmKantor] = useState(null);
  const [kantorDeleting, setKantorDeleting] = useState(false);

  const handleOpenDeleteConfirm = (k) => {
    setDeleteConfirmKantor(k);
  };

  const handleExecuteDeleteKantor = async () => {
    if (!deleteConfirmKantor || kantorDeleting) return;

    setKantorDeleting(true);
    try {
      const res = await UsersService.deleteKantor(deleteConfirmKantor.id);
      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message || 'Kantor berhasil dihapus!');
        fetchKantors();
        window.dispatchEvent(new CustomEvent('edtekno_kantor_updated'));
      } else {
        showToast(res.data?.message || 'Gagal menghapus kantor', 'error');
      }
    } catch (err) {
      console.error('Error delete kantor:', err);
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setKantorDeleting(false);
      setDeleteConfirmKantor(null);
    }
  };

  // On-demand manual sync dari router MikroTik kantor
  const handleSyncMikrotik = async (k) => {
    if (!k.mikrotik_host) {
      showToast(`Router MikroTik belum diatur untuk kantor ${k.nama}. Silakan edit kantor terlebih dahulu.`, 'error');
      return;
    }

    setSyncingId(k.id);
    try {
      const res = await fetch(`/users/api/kantor/sync/${k.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(data.message || `Sinkronisasi MikroTik ${k.nama} berhasil!`);
        // Beritahu modul pelanggan jika ada data baru
        window.dispatchEvent(new CustomEvent('edtekno_customers_synced'));
      } else {
        showToast(data.message || `Router MikroTik (${k.mikrotik_host}) tidak dapat dijangkau. Pastikan jaringan server terhubung ke jaringan router.`, 'error');
      }
    } catch (err) {
      console.error('Error sync mikrotik:', err);
      showToast(`Router MikroTik (${k.mikrotik_host}) tidak dapat dijangkau. Pastikan jaringan server terhubung ke jaringan router.`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredKantors = kantorList.filter((k) => {
    if (!kantorSearch) return true;
    const q = kantorSearch.toLowerCase();
    return (
      (k.nama && k.nama.toLowerCase().includes(q)) ||
      (k.kode && k.kode.toLowerCase().includes(q)) ||
      (k.alamat && k.alamat.toLowerCase().includes(q)) ||
      (k.mikrotik_host && k.mikrotik_host.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredKantors.length / limit));
  const paginatedKantors = filteredKantors.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      {/* Filter Bar & Pagination DI ATAS TABEL */}
      <div className="relative z-30 space-y-2.5">
        <FilterContainer>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[140px] sm:min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 sm:top-2.5" />
                <input
                  type="text"
                  value={kantorSearch}
                  onChange={(e) => {
                    setKantorSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama kantor / kode / router IP..."
                  className="w-full pl-8 pr-2 py-1.5 sm:py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 justify-end shrink-0">
              <button
                onClick={openAddKantorModal}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] sm:text-xs font-mono font-bold transition flex items-center gap-1 min-h-[32px] sm:min-h-[36px] shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Kantor</span>
                <span className="sm:hidden">Tambah</span>
              </button>
              <button
                onClick={fetchKantors}
                disabled={kantorLoading}
                className="p-1.5 sm:p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[32px] sm:min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer"
                title="Muat Ulang Daftar Kantor"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${kantorLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </FilterContainer>
      </div>

      {/* Tabel Kantor Cabang */}
      <DataTableContainer
        page={page}
        totalPages={totalPages}
        totalItems={filteredKantors.length}
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onPageChange={setPage}
        loading={kantorLoading}
      >
        <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-cyan-50/80 border-b border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 text-center whitespace-nowrap">No</th>
                <th className="py-2.5 px-3 w-32 whitespace-nowrap">Kode Kantor</th>
                <th className="py-2.5 px-3 w-40 whitespace-nowrap">Nama Wilayah</th>
                <th className="py-2.5 px-3 w-28 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 min-w-[200px] whitespace-nowrap">MikroTik RouterOS</th>
                <th className="py-2.5 px-3 min-w-[180px] whitespace-nowrap">Alamat / Keterangan</th>
                <th className="py-2.5 px-3 text-right w-36 whitespace-nowrap">Aksi & Sinkron</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 font-mono text-xs">
              {kantorLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                    <div>Memuat data kantor...</div>
                  </td>
                </tr>
              ) : paginatedKantors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 font-mono">
                    Tidak ada kantor ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedKantors.map((k, idx) => {
                  const isSyncing = syncingId === k.id;
                  const isMenuOpen = activeMenuId === k.id;
                  const isBottomRow = idx >= paginatedKantors.length - 2;
                  const isActive = k.is_active !== undefined ? Boolean(k.is_active) : true;

                  return (
                    <tr key={k.id || idx} className="hover:bg-cyan-50/40 transition">
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">{(page - 1) * limit + idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-black text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 uppercase text-[11px]">
                          {k.kode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>{k.nama}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {k.mikrotik_host ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                              <Router className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <span>{k.mikrotik_host}{k.mikrotik_port ? `:${k.mikrotik_port}` : ''}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>user: <strong>{k.mikrotik_user || '-'}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                Sync {k.mikrotik_sync_interval || 3}m
                              </span>
                              {k.last_mikrotik_sync && (
                                <span className="text-[10px] font-mono text-slate-400 truncate" title={`Terakhir sync: ${k.last_mikrotik_sync}`}>
                                  {k.last_mikrotik_sync.split(' ')[1] || k.last_mikrotik_sync}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-sans text-xs">
                        {k.alamat ? (
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{k.alamat}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : k.id);
                            }}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isMenuOpen ? 'bg-cyan-100 border-cyan-400 text-cyan-900' : 'hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                            title="Pilihan Aksi"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 z-50 min-w-[160px] ${
                                isBottomRow ? 'bottom-full pb-1' : 'top-full pt-1'
                              }`}
                            >
                              <div className="bg-white rounded-xl shadow-2xl border border-sky-300 py-1 font-mono text-xs divide-y divide-slate-100">
                                {/* Opsi Sync MikroTik */}
                                {k.mikrotik_host && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      if (k.is_active === false) {
                                        showToast(`Kantor '${k.nama}' dalam status Nonaktif. Aktifkan kantor terlebih dahulu sebelum menyinkronkan router MikroTik.`, 'error');
                                        return;
                                      }
                                      handleSyncMikrotik(k);
                                    }}
                                    disabled={isSyncing || k.is_active === false}
                                    title={k.is_active === false ? 'Kantor nonaktif (sync dimatikan)' : 'Tarik data lease & kuota sekarang'}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition ${
                                      k.is_active === false
                                        ? 'text-slate-400 hover:bg-slate-50 cursor-not-allowed opacity-60'
                                        : 'text-cyan-800 hover:bg-cyan-50 cursor-pointer disabled:opacity-50'
                                    }`}
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${k.is_active === false ? 'text-slate-400' : 'text-cyan-600'} ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>
                                      {isSyncing ? 'Menarik...' : (k.is_active === false ? 'Sync Mati (Nonaktif)' : 'Sync MikroTik')}
                                    </span>
                                  </button>
                                )}

                                {/* Opsi Edit Kantor */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openEditKantorModal(k);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Edit Kantor</span>
                                </button>

                                {/* Opsi Hapus Kantor */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenDeleteConfirm(k);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer font-bold"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Hapus Kantor</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </DataTableContainer>

      {/* Modal Tambah / Edit Kantor Wilayah & Setting Router MikroTik */}
      {modalKantorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-sky-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
              <h3 className="text-sm sm:text-base font-black font-mono text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span>{kantorModalMode === 'add' ? 'Tambah Kantor Wilayah Baru' : `Edit Kantor: ${kantorNama}`}</span>
              </h3>
              <button
                onClick={() => setModalKantorOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {kantorError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {kantorError}
              </div>
            )}

            {/* Tab Navigation Modal (2 Tab) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-sky-100 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setKantorActiveTab('identitas')}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  kantorActiveTab === 'identitas'
                    ? 'bg-white text-cyan-900 shadow-xs border border-sky-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${kantorActiveTab === 'identitas' ? 'text-cyan-700' : 'text-slate-400'}`} />
                <span>1. Identitas Kantor</span>
              </button>

              <button
                type="button"
                onClick={() => setKantorActiveTab('mikrotik')}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  kantorActiveTab === 'mikrotik'
                    ? 'bg-white text-cyan-900 shadow-xs border border-sky-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <Router className={`w-3.5 h-3.5 ${kantorActiveTab === 'mikrotik' ? 'text-cyan-700' : 'text-slate-400'}`} />
                <span>2. Router MikroTik</span>
              </button>
            </div>

            <form onSubmit={handleKantorFormSubmit} className="space-y-4 font-mono text-xs">
              {/* TAB 1: IDENTITAS KANTOR */}
              {kantorActiveTab === 'identitas' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Nama Kantor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={kantorNama}
                      onChange={(e) => {
                        setKantorNama(e.target.value);
                        if (kantorModalMode === 'add' && !kantorKode) {
                          setKantorKode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        }
                      }}
                      placeholder="Contoh: Kantor Banyumas, Kantor Cabang..."
                      className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {kantorModalMode === 'add' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Kode Kantor (Opsional - dibuat otomatis jika kosong)
                      </label>
                      <input
                        type="text"
                        value={kantorKode}
                        onChange={(e) => setKantorKode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="contoh: banyumas"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none lowercase"
                      />
                    </div>
                  )}

                  {/* Status Kantor (Aktif / Tidak Aktif) */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-sky-100 flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-700">
                        Status Kantor
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {kantorIsActive 
                          ? 'Kantor aktif dan terpantau dalam sistem.' 
                          : 'Kantor dinonaktifkan (dilewati pemindaian & sinkronisasi).'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKantorIsActive(!kantorIsActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        kantorIsActive ? 'bg-cyan-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          kantorIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Deskripsi / Alamat Kantor
                    </label>
                    <textarea
                      value={kantorAlamat}
                      onChange={(e) => setKantorAlamat(e.target.value)}
                      placeholder="Alamat atau keterangan operasional kantor cabang..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: KONFIGURASI ROUTER MIKROTIK */}
              {kantorActiveTab === 'mikrotik' && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-[11px] leading-relaxed">
                    Digunakan untuk penarikan otomatis DHCP Leases pelanggan bound dan penghitungan akumulasi kuota bulanan Simple Queues.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        IP Router / Host
                      </label>
                      <input
                        type="text"
                        value={kantorMikrotikHost}
                        onChange={(e) => setKantorMikrotikHost(e.target.value)}
                        placeholder="Contoh: 192.168.202.50"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Port API
                      </label>
                      <input
                        type="number"
                        value={kantorMikrotikPort}
                        onChange={(e) => setKantorMikrotikPort(e.target.value)}
                        placeholder="Contoh: 8095"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Username Router
                      </label>
                      <input
                        type="text"
                        value={kantorMikrotikUser}
                        onChange={(e) => setKantorMikrotikUser(e.target.value)}
                        placeholder="Contoh: tekno"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Password Router
                      </label>
                      <input
                        type="password"
                        value={kantorMikrotikPass}
                        onChange={(e) => setKantorMikrotikPass(e.target.value)}
                        placeholder="Contoh: tekno2025"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
                      <span>Interval Auto-Sync (Menit)</span>
                      <span className="text-[10px] text-cyan-700 font-normal normal-case">Tarik berkala lease & kuota</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={kantorMikrotikSyncInterval}
                        onChange={(e) => setKantorMikrotikSyncInterval(e.target.value)}
                        placeholder="3"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                      <div className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">
                        Menit
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Sinkronisasi otomatis RouterOS akan berjalan setiap <strong>{kantorMikrotikSyncInterval || 3} menit</strong>. Jika kantor dinonaktifkan, proses sinkronisasi otomatis maupun manual pada router ini otomatis dihentikan.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-sky-100">
                <div className="text-[11px] text-slate-400">
                  {kantorActiveTab === 'identitas' ? (
                    <button
                      type="button"
                      onClick={() => setKantorActiveTab('mikrotik')}
                      className="text-cyan-700 hover:text-cyan-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Lanjut ke Router MikroTik &rarr;</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setKantorActiveTab('identitas')}
                      className="text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>&larr; Kembali ke Identitas</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalKantorOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={kantorSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    {kantorSubmitting ? 'Menyimpan...' : (kantorModalMode === 'add' ? 'Simpan Kantor' : 'Simpan Perubahan')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kantor */}
      <ConfirmDialogModal
        isOpen={Boolean(deleteConfirmKantor)}
        onClose={() => {
          if (!kantorDeleting) setDeleteConfirmKantor(null);
        }}
        onConfirm={handleExecuteDeleteKantor}
        title="Hapus Kantor Cabang?"
        message={
          <div className="space-y-1.5">
            <p>
              Apakah Anda yakin ingin menghapus kantor{' '}
              <strong className="text-slate-900">{deleteConfirmKantor?.nama}</strong> ({deleteConfirmKantor?.kode}) secara permanen?
            </p>
            <p className="text-rose-700 font-semibold text-xs">
              Tindakan ini tidak dapat dibatalkan. Seluruh relasi data kantor akan dibersihkan.
            </p>
          </div>
        }
        confirmText="Ya, Hapus Kantor"
        cancelText="Batal"
        variant="danger"
        isLoading={kantorDeleting}
        loadingText="Menghapus..."
      />
    </div>
  );
}
