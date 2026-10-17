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
  MoreVertical
} from 'lucide-react';
import { UsersService } from '../services/api';
import { FilterContainer } from './CommonUI';

export function ModulKantorCabang() {
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
  const [kantorAlamat, setKantorAlamat] = useState('');
  const [kantorMikrotikHost, setKantorMikrotikHost] = useState('');
  const [kantorMikrotikPort, setKantorMikrotikPort] = useState('');
  const [kantorMikrotikUser, setKantorMikrotikUser] = useState('');
  const [kantorMikrotikPass, setKantorMikrotikPass] = useState('');
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
    setKantorAlamat('');
    setKantorMikrotikHost('');
    setKantorMikrotikPort('');
    setKantorMikrotikUser('');
    setKantorMikrotikPass('');
    setKantorError('');
    setModalKantorOpen(true);
  };

  const openEditKantorModal = (k) => {
    setKantorModalMode('edit');
    setCurrentKantorId(k.id);
    setKantorNama(k.nama || '');
    setKantorKode(k.kode || '');
    setKantorAlamat(k.alamat || '');
    setKantorMikrotikHost(k.mikrotik_host || '');
    setKantorMikrotikPort(k.mikrotik_port ? String(k.mikrotik_port) : '');
    setKantorMikrotikUser(k.mikrotik_user || '');
    setKantorMikrotikPass(k.mikrotik_pass || '');
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
        alamat: kantorAlamat.trim() || undefined,
        mikrotik_host: kantorMikrotikHost.trim() || undefined,
        mikrotik_port: kantorMikrotikPort.trim() ? parseInt(kantorMikrotikPort.trim(), 10) : undefined,
        mikrotik_user: kantorMikrotikUser.trim() || undefined,
        mikrotik_pass: kantorMikrotikPass.trim() || undefined
      };

      if (kantorModalMode === 'add') {
        payload.kode = kantorKode.trim() || undefined;
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

  const handleDeleteKantor = async (k) => {
    if (!window.confirm(`Yakin ingin menghapus kantor "${k.nama}" (${k.kode}) secara permanen? Seluruh relasi data akan dibersihkan.`)) {
      return;
    }

    try {
      const res = await UsersService.deleteKantor(k.id);
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
  const [limit, setLimit] = useState(10);
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
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-mono font-bold transition-all max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

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

        {/* Baris Pagination DI ATAS TABEL */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-white/80 backdrop-blur-md rounded-xl border border-sky-200/80 font-mono text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Menampilkan <strong>{filteredKantors.length === 0 ? 0 : (page - 1) * limit + 1}</strong> - <strong>{Math.min(page * limit, filteredKantors.length)}</strong> dari <strong>{filteredKantors.length}</strong> kantor</span>
            <span className="text-slate-300">|</span>
            <span>Halaman <strong>{page}</strong> / <strong>{totalPages}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || kantorLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 disabled:opacity-40 transition font-bold text-[11px] cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages || kantorLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-sky-200 bg-white hover:bg-cyan-50 disabled:opacity-40 transition font-bold text-[11px] cursor-pointer disabled:cursor-not-allowed"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Kantor Cabang */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto md:table-fixed">
            <thead>
              <tr className="bg-cyan-50/80 border-b border-sky-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 w-36">Kode Kantor</th>
                <th className="py-2.5 px-3 w-48">Nama Wilayah</th>
                <th className="py-2.5 px-3 w-64">MikroTik RouterOS</th>
                <th className="py-2.5 px-3">Alamat / Keterangan</th>
                <th className="py-2.5 px-3 text-right w-36">Aksi & Sinkron</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 font-mono text-xs">
              {kantorLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 font-mono">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                    <div>Memuat data kantor...</div>
                  </td>
                </tr>
              ) : paginatedKantors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 font-mono">
                    Tidak ada kantor ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedKantors.map((k, idx) => {
                  const isSyncing = syncingId === k.id;
                  const isMenuOpen = activeMenuId === k.id;
                  const isBottomRow = idx >= paginatedKantors.length - 2;

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
                                      handleSyncMikrotik(k);
                                    }}
                                    disabled={isSyncing}
                                    className="w-full px-3 py-1.5 text-left text-cyan-800 hover:bg-cyan-50 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>{isSyncing ? 'Menarik...' : 'Sync MikroTik'}</span>
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
                                    handleDeleteKantor(k);
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
        </div>
      </div>

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

            <form onSubmit={handleKantorFormSubmit} className="space-y-3 font-mono text-xs">
              {/* Seksi 1: Data Identitas Kantor */}
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-cyan-900 pb-1 border-b border-sky-100 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-700" />
                  <span>1. Identitas Kantor</span>
                </div>

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

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Kode Kantor {kantorModalMode === 'add' ? '(Opsional - dibuat otomatis jika kosong)' : '(Permanen)'}
                  </label>
                  <input
                    type="text"
                    disabled={kantorModalMode === 'edit'}
                    value={kantorKode}
                    onChange={(e) => setKantorKode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="contoh: banyumas"
                    className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none lowercase disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Deskripsi / Alamat Kantor
                  </label>
                  <textarea
                    value={kantorAlamat}
                    onChange={(e) => setKantorAlamat(e.target.value)}
                    placeholder="Alamat atau keterangan operasional kantor cabang..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seksi 2: Konfigurasi Router MikroTik Kantor */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-cyan-900 pb-1 border-b border-sky-100 flex items-center gap-1.5">
                  <Router className="w-3.5 h-3.5 text-cyan-700" />
                  <span>2. Konfigurasi Router MikroTik (Auto-Sync DHCP & ARP 10.10.x.x)</span>
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
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-sky-100">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
