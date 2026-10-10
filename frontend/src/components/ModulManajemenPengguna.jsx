import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { UsersService } from '../services/api';
import {
  ModuleHeader,
  FilterContainer,
  DataTableContainer
} from './CommonUI';

export function ModulManajemenPengguna() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState('username');
  const [sortDir, setSortDir] = useState('asc');
  const [allKantor, setAllKantor] = useState(['cabang', 'pusat', 'banyumas']);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formNoWa, setFormNoWa] = useState('');
  const [formRole, setFormRole] = useState('teknisi');
  const [formKantor, setFormKantor] = useState(['cabang']);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await UsersService.list();
      if (res.ok && res.data && res.data.users) {
        setUsers(res.data.users);
        if (res.data.all_kantor) setAllKantor(res.data.all_kantor);
      }
    } catch (err) {
      console.error('Gagal memuat pengguna:', err);
      showToast('Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentUserId(null);
    setFormUsername('');
    setFormPassword('');
    setFormNama('');
    setFormNoWa('');
    setFormRole('teknisi');
    setFormKantor(['cabang']);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setCurrentUserId(user.id);
    setFormUsername(user.username);
    setFormPassword('');
    setFormNama(user.nama_karyawan || '');
    setFormNoWa(user.no_wa || '');
    setFormRole(user.role);
    setFormKantor(user.allowed_kantor || ['cabang']);
    setFormError('');
    setModalOpen(true);
  };


  const handleKantorCheckbox = (k) => {
    if (formKantor.includes(k)) {
      if (formKantor.length > 1) {
        setFormKantor(formKantor.filter((item) => item !== k));
      }
    } else {
      setFormKantor([...formKantor, k]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formUsername.trim()) {
      setFormError('Username wajib diisi.');
      return;
    }
    if (modalMode === 'add' && !formPassword) {
      setFormError('Password wajib diisi untuk pengguna baru.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username: formUsername,
        password: formPassword || undefined,
        nama_karyawan: formNama,
        no_wa: formNoWa,
        role: formRole,
        kantor: formRole === 'super admin' ? allKantor : formKantor
      };

      const res = modalMode === 'add' 
        ? await UsersService.create(payload)
        : await UsersService.update(currentUserId, payload);

      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message);
        setModalOpen(false);
        fetchUsers();
      } else {
        setFormError(res.data?.message || 'Gagal menyimpan data.');
      }
    } catch (err) {
      console.error('Error simpan user:', err);
      setFormError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await UsersService.toggle(user.id, !user.is_active);
      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message);
        fetchUsers();
      } else {
        showToast(res.data?.message || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      console.error('Error toggle status:', err);
      showToast('Gagal terhubung ke server', 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Yakin ingin menghapus user "${user.username}" secara permanen?`)) {
      return;
    }

    try {
      const res = await UsersService.delete(user.id);
      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message);
        fetchUsers();
      } else {
        showToast(res.data?.message || 'Gagal menghapus user', 'error');
      }
    } catch (err) {
      console.error('Error delete user:', err);
      showToast('Gagal terhubung ke server', 'error');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    // Filter out 'admin' username protection
    const validUsersToDelete = users.filter(
      (u) => selectedIds.includes(u.id) && u.username !== 'admin'
    );

    if (validUsersToDelete.length === 0) {
      alert('Akun default super admin (admin) tidak dapat dihapus.');
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus ${validUsersToDelete.length} pengguna terpilih secara permanen?`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      let successCount = 0;
      for (const u of validUsersToDelete) {
        const res = await UsersService.delete(u.id);
        if (res.ok && res.data && res.data.status === 'success') {
          successCount++;
        }
      }
      showToast(`Berhasil menghapus ${successCount} pengguna.`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      console.error('Error bulk delete users:', err);
      showToast('Gagal menghapus beberapa pengguna', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredUsers = users
    .filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus === 'active' && !u.is_active) return false;
      if (filterStatus === 'inactive' && u.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.nama_karyawan && u.nama_karyawan.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // Tambah Kantor State (Khusus Super Admin)
  const [modalKantorOpen, setModalKantorOpen] = useState(false);
  const [kantorNama, setKantorNama] = useState('');
  const [kantorKode, setKantorKode] = useState('');
  const [kantorAlamat, setKantorAlamat] = useState('');
  const [kantorError, setKantorError] = useState('');
  const [kantorSubmitting, setKantorSubmitting] = useState(false);

  const handleAddKantorSubmit = async (e) => {
    e.preventDefault();
    setKantorError('');
    if (!kantorNama.trim()) {
      setKantorError('Nama kantor wajib diisi');
      return;
    }

    setKantorSubmitting(true);
    try {
      const res = await UsersService.addKantor({
        nama: kantorNama.trim(),
        kode: kantorKode.trim() || undefined,
        alamat: kantorAlamat.trim() || undefined
      });

      if (res.ok && res.data && res.data.status === 'success') {
        showToast(res.data.message || 'Kantor berhasil ditambahkan!');
        setModalKantorOpen(false);
        setKantorNama('');
        setKantorKode('');
        setKantorAlamat('');
        fetchUsers();
        // Emit global event agar dropdown kantor di navbar terupdate
        window.dispatchEvent(new CustomEvent('edtekno_kantor_updated'));
      } else {
        setKantorError(res.data?.message || 'Gagal menambahkan kantor');
      }
    } catch (err) {
      console.error('Error add kantor:', err);
      setKantorError('Gagal terhubung ke server');
    } finally {
      setKantorSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-mono font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Filter Bar & Aksi Ringkas */}
      <FilterContainer>
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Kotak Pencarian & Tombol Filter Popover */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[120px] sm:min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 sm:top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari user / nama..."
                className="w-full pl-8 pr-2 py-1.5 sm:py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
              />
            </div>

            {/* Tombol Popover Filter Role & Status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={`p-1.5 sm:p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1 min-h-[32px] sm:min-h-[36px] shrink-0 ${
                  filterRole !== 'all' || filterStatus !== 'all'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border-sky-200'
                }`}
                title="Filter Role & Status Akun"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {filterRole !== 'all' ? filterRole : filterStatus !== 'all' ? `Status: ${filterStatus}` : 'Filter'}
                </span>
                {(filterRole !== 'all' || filterStatus !== 'all') && (
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {/* Popover Menu Filter */}
              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <div className="absolute left-0 sm:left-0 top-full mt-1.5 z-50 w-60 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-sky-200 space-y-2.5 font-mono text-xs">
                    {/* Seksi 1: Role Pengguna */}
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Role Pengguna:
                      </div>
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
                      >
                        <option value="all">Semua Role</option>
                        <option value="super admin">Super Admin</option>
                        <option value="admin">Admin Cabang</option>
                        <option value="teknisi">Teknisi</option>
                      </select>
                    </div>

                    {/* Seksi 2: Status Akun */}
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Status Akun:
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'all', label: 'Semua' },
                          { id: 'active', label: 'Aktif' },
                          { id: 'inactive', label: 'Nonaktif' }
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setFilterStatus(st.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition ${
                              filterStatus === st.id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterRole('all');
                          setFilterStatus('all');
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700"
                      >
                        Reset Filter
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterDropdownOpen(false)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tombol Aksi Tambah Kantor, Tambah Pengguna, Refresh */}
          <div className="flex items-center gap-1 sm:gap-1.5 justify-end shrink-0">
            <button
              onClick={() => {
                setKantorError('');
                setKantorNama('');
                setKantorKode('');
                setKantorAlamat('');
                setModalKantorOpen(true);
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-sky-200 text-[11px] sm:text-xs font-mono font-bold transition flex items-center gap-1 min-h-[32px] sm:min-h-[36px]"
              title="Tambah Kantor Wilayah Baru"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />
              <span className="hidden sm:inline">Kantor</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-[11px] sm:text-xs font-mono font-bold transition flex items-center gap-1 min-h-[32px] sm:min-h-[36px] shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah User</span>
              <span className="sm:hidden">Tambah</span>
            </button>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition min-h-[32px] sm:min-h-[36px] flex items-center justify-center shrink-0"
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </FilterContainer>

      {/* Selection / Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
              <Trash2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-rose-950 font-sans">
                {selectedIds.length} Pengguna Terpilih
              </span>
              <p className="text-[11px] text-rose-700 font-sans">
                Hapus permanen akun pengguna yang dicentang (kecuali akun super admin default).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold transition"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{bulkDeleting ? 'Menghapus...' : `Hapus Terpilih (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Tabel Pengguna */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredUsers.map(u => u.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-2 w-12 text-center">No</th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center gap-1">
                  <span>Username / Nama</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'username' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-2.5 px-3">Kontak WA</th>
              <th 
                className="py-2.5 px-3 cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-1">
                  <span>Role Sistem</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'role' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-2.5 px-3">Wilayah Kantor</th>
              <th 
                className="py-2.5 px-3 text-center cursor-pointer select-none hover:bg-cyan-100/60 transition"
                onClick={() => handleSort('is_active')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'is_active' ? 'text-cyan-800' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data pengguna...</div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => {
                const isSelected = selectedIds.includes(u.id);

                return (
                  <tr key={u.id} className={`transition ${isSelected ? 'bg-cyan-50/70' : 'hover:bg-cyan-50/40'}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds(prev =>
                            prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-bold text-xs">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-cyan-900">{u.username}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{u.nama_karyawan || 'Karyawan NOC'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                      {u.no_wa ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {u.no_wa}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'super admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'admin'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {u.role === 'super admin' ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px] border border-purple-200">
                            Semua Kantor
                          </span>
                        ) : (
                          (u.allowed_kantor || []).map((k) => (
                            <span key={k} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] uppercase">
                              {k}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.username === 'admin'}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        } ${u.username === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {/* Menu Titik Tiga / Aksi Pengguna */}
                      <div className="relative inline-block text-left">
                        <div className="relative group">
                          <button
                            type="button"
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="Pilihan Aksi"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>

                          <div className="hidden group-hover:block hover:block absolute right-0 top-full pt-1 z-50 min-w-[130px]">
                            <div className="bg-white rounded-xl shadow-xl border border-sky-200 py-1 font-mono text-xs">
                              <button
                                onClick={() => openEditModal(u)}
                                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
                                <span>Edit Akun</span>
                              </button>
                              {u.username !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition border-t border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTableContainer>

      {/* Modal Form User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-sky-200 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900">
                {modalMode === 'add' ? 'Tambah Pengguna Baru' : `Edit Pengguna: ${formUsername}`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-sans">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={modalMode === 'edit' && formUsername === 'admin'}
                  placeholder="Username login..."
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nama Karyawan</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Nama lengkap petugas..."
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-sans font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nomor WhatsApp (WA)</label>
                <input
                  type="text"
                  value={formNoWa}
                  onChange={(e) => setFormNoWa(e.target.value)}
                  placeholder="Contoh: 081234567890..."
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-mono font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {modalMode === 'add' ? 'Password' : 'Password Baru (Kosongkan jika tetap)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={modalMode === 'add' ? 'Kata sandi akun...' : '••••••••'}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Role / Peran</label>
                <select
                  value={formRole}

                  onChange={(e) => setFormRole(e.target.value)}
                  disabled={modalMode === 'edit' && formUsername === 'admin'}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="super admin">Super Admin (Akses Penuh)</option>
                  <option value="admin">Admin Cabang (Kantor yang Diizinkan)</option>
                  <option value="teknisi">Teknisi (Pemantauan Saja)</option>
                </select>
              </div>

              {formRole !== 'super admin' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Wilayah Kantor yang Diizinkan</label>
                  <div className="flex flex-wrap gap-2">
                    {allKantor.map((k) => (
                      <label
                        key={k}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                          formKantor.includes(k)
                            ? 'bg-cyan-50 border-cyan-400 text-cyan-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formKantor.includes(k)}
                          onChange={() => handleKantorCheckbox(k)}
                          className="rounded text-cyan-600"
                        />
                        <span className="uppercase">{k}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah Kantor Wilayah */}
      {modalKantorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border border-sky-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
              <h3 className="text-sm font-black font-mono text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                <span>Tambah Kantor Wilayah Baru</span>
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

            <form onSubmit={handleAddKantorSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Nama Kantor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kantorNama}
                  onChange={(e) => {
                    setKantorNama(e.target.value);
                    if (!kantorKode) {
                      setKantorKode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  placeholder="Contoh: Purwokerto, Cilacap, Pusat..."
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Kode Kantor (Opsional - dibuat otomatis jika kosong)
                </label>
                <input
                  type="text"
                  value={kantorKode}
                  onChange={(e) => setKantorKode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="contoh: purwokerto"
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none lowercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Deskripsi / Alamat Kantor (Opsional)
                </label>
                <textarea
                  value={kantorAlamat}
                  onChange={(e) => setKantorAlamat(e.target.value)}
                  placeholder="Alamat atau keterangan kantor cabang..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setModalKantorOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={kantorSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {kantorSubmitting ? 'Menyimpan...' : 'Simpan Kantor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
