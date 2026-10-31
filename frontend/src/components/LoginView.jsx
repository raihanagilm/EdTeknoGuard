import React, { useState } from 'react'
import {
  Radio,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  Check
} from 'lucide-react'
import { ToastNotification } from './ToastNotification'

export function LoginView({
  onLoginSuccess
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          remember_me: Boolean(rememberMe)
        })
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.ok) {
        // Catat timestamp login terakhir untuk verifikasi batas inaktivitas 30 hari lokal
        localStorage.setItem('edtekno_auth_status', 'logged_in')
        localStorage.setItem('edtekno_last_active_time', String(Date.now()))
        localStorage.setItem('edtekno_remember_me', rememberMe ? 'true' : 'false')

        if (onLoginSuccess) {
          onLoginSuccess(data.user)
        }
      } else {
        setErrorMsg(data.message || 'Kombinasi Pengguna atau Kata Sandi NOC tidak valid.')
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server backend FastAPI.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 text-slate-900 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">

          {/* Header Login */}
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-700 flex items-center justify-center text-white shadow-sm">
                <Radio className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Tekno<span className="text-cyan-700">Guard</span> NOC
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium pt-1">
              Sistem Deteksi Dini &amp; Pemantauan Redaman Optik Terpadu
            </p>
          </div>

          {/* Toast Notification */}
          <ToastNotification
            show={Boolean(errorMsg)}
            type="error"
            title="Gagal Masuk"
            message={errorMsg}
            onClose={() => setErrorMsg('')}
          />

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {/* Input Username */}
            <div className="space-y-1.5">
              <label className="text-slate-700 block">Nama Pengguna (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-700" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 transition min-h-[40px] font-mono"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <label className="text-slate-700 block">Kata Sandi (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-700" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 transition min-h-[40px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Checkbox Ingat Saya (30 Hari Inaktivitas) */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-300 bg-slate-50 peer-checked:bg-cyan-700 peer-checked:border-cyan-700 peer-focus:ring-2 peer-focus:ring-cyan-100 transition flex items-center justify-center">
                    {rememberMe && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-cyan-900 transition">
                    Ingat Saya
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Sesi aktif otomatis selama 30 hari sejak akses terakhir
                  </span>
                </div>
              </label>
            </div>

            {/* Tombol Submit Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:bg-cyan-600 text-white font-bold text-xs shadow-sm active:scale-[0.99] transition min-h-[42px]"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Buka Panel Kendali</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Hak Cipta */}
      <div className="py-4 text-center text-xs text-slate-600 font-medium">
        &copy; 2026 TeknoGuard NOC &bull; Sistem Monitoring Redaman Jaringan Fiber Optik
      </div>
    </div>
  )
}
