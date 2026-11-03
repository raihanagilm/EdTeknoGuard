import React, { useState, useEffect } from 'react'
import {
  User,
  Phone,
  RefreshCw,
  Lock,
  ChevronDown,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react'

export function SettingsProfileTab({
  currentUser,
  setCurrentUser,
  onLogout,
  setProfileSuccess,
  setProfileError
}) {
  const [isEditProfile, setIsEditProfile] = useState(false)
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false)
  const [editNama, setEditNama] = useState(currentUser?.nama_lengkap || '')
  const [editNoWa, setEditNoWa] = useState(currentUser?.no_wa || '')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmPasswordBaru, setKonfirmPasswordBaru] = useState('')
  const [showPassBaru, setShowPassBaru] = useState(false)
  const [showKonfirmPass, setShowKonfirmPass] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setEditNama(currentUser.nama_lengkap || '')
      setEditNoWa(currentUser.no_wa || '')
    }
  }, [currentUser])

  // Handler Simpan Data Diri (Nama & No WA)
  const handleSaveDataDiri = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess('')
    setProfileError('')

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: editNama,
          no_wa: editNoWa
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setProfileSuccess(data.message || 'Data diri Anda berhasil diperbarui!')
        if (data.user && setCurrentUser) {
          setCurrentUser(data.user)
        }
        setIsEditProfile(false)
      } else {
        setProfileError(data.message || 'Gagal memperbarui data diri.')
      }
    } catch (err) {
      setProfileError('Gagal terhubung ke server backend.')
    } finally {
      setProfileLoading(false)
    }
  }

  // Handler Ganti Kata Sandi Akun
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess('')
    setProfileError('')

    if (passwordBaru && passwordBaru.length < 6) {
      setProfileError('Kata sandi baru minimal 6 karakter!')
      setProfileLoading(false)
      return
    }

    if (passwordBaru !== konfirmPasswordBaru) {
      setProfileError('Konfirmasi kata sandi baru tidak cocok!')
      setProfileLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_baru: passwordBaru
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setProfileSuccess('Kata sandi akun Anda berhasil diubah!')
        setPasswordBaru('')
        setKonfirmPasswordBaru('')
        setIsPasswordExpanded(false)
      } else {
        setProfileError(data.message || 'Gagal mengubah kata sandi.')
      }
    } catch (err) {
      setProfileError('Gagal terhubung ke server backend.')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Section 1: Info Identitas Akun Petugas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sky-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-cyan-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {currentUser?.nama_lengkap ? currentUser.nama_lengkap.charAt(0).toUpperCase() : (currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A')}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">
                {currentUser?.nama_lengkap || 'Administrator NOC'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditProfile(!isEditProfile)}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isEditProfile ? 'Batal' : 'Edit Data'}</span>
          </button>
        </div>

        {isEditProfile ? (
          /* Form Edit Data Diri */
          <form onSubmit={handleSaveDataDiri} className="space-y-3 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-700" />
                <span>Nama Lengkap Petugas</span>
              </label>
              <input
                type="text"
                required
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                placeholder="Contoh: Raihan Agil / Teknisi NOC"
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-50/50 text-xs text-slate-900 font-semibold focus:outline-none focus:border-cyan-600 min-h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-700" />
                <span>No. WhatsApp / Kontak Petugas</span>
              </label>
              <input
                type="text"
                value={editNoWa}
                onChange={(e) => setEditNoWa(e.target.value)}
                placeholder="Contoh: 08888015154142"
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-50/50 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditProfile(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="flex-1 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Data Diri</span>}
              </button>
            </div>
          </form>
        ) : (
          /* View List Data Diri Petugas ala TeknoCust */
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">ID Pengguna</span>
              <span className="font-mono font-bold text-slate-900">{currentUser?.id || '1'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Username Login</span>
              <span className="font-mono font-bold text-slate-900">{currentUser?.username || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Kantor Layanan</span>
              <span className="font-bold text-slate-900 capitalize">
                {(() => {
                  const val = currentUser?.allowed_kantor
                  if (Array.isArray(val)) {
                    return val.map(k => String(k)).join(', ')
                  }
                  if (typeof val === 'string') {
                    try {
                      const parsed = JSON.parse(val)
                      if (Array.isArray(parsed)) {
                        return parsed.map(k => String(k)).join(', ')
                      }
                    } catch (e) {
                      // fallback string cleaning
                    }
                    return val.replace(/[\[\]"']/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ') || 'Cabang'
                  }
                  return 'Cabang'
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">No. WhatsApp / Telp</span>
              <span className="font-mono font-bold text-slate-900">{currentUser?.no_wa || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Hak Akses / Peran</span>
              <span className="font-bold text-slate-900 capitalize">{currentUser?.role || 'super admin'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Expandable Form Ganti Kata Sandi Akun */}
      <div className="pt-3 border-t border-sky-100">
        <button
          type="button"
          onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
          className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-50/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-700">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Ganti Kata Sandi Akun</div>
              <div className="text-[11px] text-slate-600 font-medium">Klik untuk membuka / menutup form</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 font-semibold">
            <span>{isPasswordExpanded ? 'Tutup' : 'Ubah Sandi'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPasswordExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isPasswordExpanded && (
          <div className="pt-3 space-y-3 animate-in fade-in duration-200">
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-700 block">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPassBaru ? 'text' : 'password'}
                    required
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-cyan-50/50 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassBaru(!showPassBaru)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Lihat kata sandi baru"
                  >
                    {showPassBaru ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 block">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showKonfirmPass ? 'text' : 'password'}
                    required
                    value={konfirmPasswordBaru}
                    onChange={(e) => setKonfirmPasswordBaru(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-cyan-50/50 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-600 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKonfirmPass(!showKonfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Lihat konfirmasi kata sandi"
                  >
                    {showKonfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm active:scale-[0.99] transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Simpan Kata Sandi Baru</span>}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Card 3: Tombol Keluar dari Akun Portal NOC ala TeknoCust */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px] cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun TeknoGuard</span>
      </button>
    </div>
  )
}

