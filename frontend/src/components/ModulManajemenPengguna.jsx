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
  X
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
  const [allKantor, setAllKantor] = useState(['cabang', 'pusat', 'banyumas']);

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

  const filteredUsers = users.filter((u) => {
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
  });

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

      {/* 1. Header Banner */}
      <ModuleHeader
        badge="HAK AKSES"
        icon={ShieldCheck}
        title="Manajemen Pengguna &amp; Role"
        subtitle="Pengelolaan akun pengguna NOC, penetapan hak akses role, dan alokasi kantor operasional."
      >
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 min-h-[38px] shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pengguna</span>
        </button>
      </ModuleHeader>

      {/* 2. Filter Bar */}
      <FilterContainer>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari username atau nama..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="all">Semua Role Pengguna</option>
              <option value="super admin">Super Admin</option>
              <option value="admin">Admin Cabang</option>
              <option value="teknisi">Teknisi</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-sky-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="all">Semua Status Akun</option>
              <option value="active">Status Aktif</option>
              <option value="inactive">Status Nonaktif</option>
            </select>
          </div>
        </div>
      </FilterContainer>

      {/* 3. Tabel Pengguna */}
      <DataTableContainer loading={loading}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cyan-50/80 border-y border-sky-200 text-slate-700 font-mono text-[10px] uppercase tracking-wider font-bold">
              <th className="py-2.5 px-3">Username / Nama</th>
              <th className="py-2.5 px-3">Kontak WA</th>
              <th className="py-2.5 px-3">Role Sistem</th>
              <th className="py-2.5 px-3">Wilayah Kantor</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-slate-400 font-mono">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Memuat data pengguna...</div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-slate-400 font-mono">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-cyan-50/40 transition">
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
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2 py-1 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-900 border border-cyan-200 rounded-lg text-[10px] font-bold transition"
                      >
                        Edit
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
    </div>
  );
}
