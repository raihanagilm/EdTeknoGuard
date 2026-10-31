import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Phone,
  RefreshCw,
  Send,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { PortalAuthService } from '../services/portalApi';
import '../../styles/mascots/mascot-pusing.css';

/* ░░░ Komponen Maskot Animasi Si Router Pusing (pusing.html) ░░░ */
function RouterPusingMascot({ className = "w-28 h-20" }) {
  return (
    <div
      className={`${className} inline-flex items-center justify-center pointer-events-none drop-shadow-md leading-none`}
      style={{ lineHeight: 0 }}
    >
      <svg
        className="mascot-svg"
        viewBox="0 10 240 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="rig-torso">
          {/* Kaki Kiri & Kanan */}
          <g className="rig-leg-l">
            <path d="M85 118V154H101V118" fill="#20C5D2" />
            <path d="M85 118V154H101V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>
          <g className="rig-leg-r">
            <path d="M139 118V154H155V118" fill="#20C5D2" />
            <path d="M139 118V154H155V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>

          {/* Antena Kiri & Kanan */}
          <g className="rig-antenna-l">
            <path
              d="M78 53.9999L68 17.9999C67 13.9999 73 12.9999 76 15.9999L88 51.9999L78 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="rig-antenna-r">
            <path
              d="M162 53.9999L172 17.9999C173 13.9999 167 12.9999 164 15.9999L152 51.9999L162 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Bodi Router */}
          <g className="rig-body">
            <path
              d="M58 54C72 50 168 50 182 54C196 58 206 102 200 120C196 128 178 132 120 132C62 132 44 128 40 120C34 102 44 58 58 54Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="5.5"
              strokeLinejoin="round"
            />
            <path d="M44 114C70 118 170 118 196 114" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
            <path
              d="M120 125.5C121.933 125.5 123.5 123.933 123.5 122C123.5 120.067 121.933 118.5 120 118.5C118.067 118.5 116.5 120.067 116.5 122C116.5 123.933 118.067 125.5 120 125.5Z"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            <path d="M120 119V122" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Lampu Indikator LED Kuning Berdenyut */}
          <g className="rig-leds">
            <path
              className="led-1"
              d="M64 124.5C65.3807 124.5 66.5 123.381 66.5 122C66.5 120.619 65.3807 119.5 64 119.5C62.6193 119.5 61.5 120.619 61.5 122C61.5 123.381 62.6193 124.5 64 124.5Z"
              fill="#0F172A"
            />
            <path
              className="led-2"
              d="M72 124.5C73.3807 124.5 74.5 123.381 74.5 122C74.5 120.619 73.3807 119.5 72 119.5C70.6193 119.5 69.5 120.619 69.5 122C69.5 123.381 70.6193 124.5 72 124.5Z"
              fill="#0F172A"
            />
            <path
              className="led-3"
              d="M80 124.5C81.3807 124.5 82.5 123.381 82.5 122C82.5 120.619 81.3807 119.5 80 119.5C78.6193 119.5 77.5 120.619 77.5 122C77.5 123.381 78.6193 124.5 80 124.5Z"
              fill="#0F172A"
            />
          </g>

          {/* Mata Pusing Berputar Spiral */}
          <g className="rig-eyes">
            <path
              d="M86 84C86 85.5913 86.6321 87.1174 87.7574 88.2426C88.8826 89.3679 90.4087 90 92 90C93.5913 90 95.1174 89.3679 96.2426 88.2426C97.3679 87.1174 98 85.5913 98 84C98 82.4087 97.3679 80.8826 96.2426 79.7574C95.1174 78.6321 93.5913 78 92 78C90.4087 78 88.8826 78.6321 87.7574 79.7574C86.6321 80.8826 86 82.4087 86 84ZM89 84C89 84.7956 89.3161 85.5587 89.8787 86.1213C90.4413 86.6839 91.2044 87 92 87C92.7956 87 93.5587 86.6839 94.1213 86.1213C94.6839 85.5587 95 84.7956 95 84C95 83.2044 94.6839 82.4413 94.1213 81.8787C93.5587 81.3161 92.7956 81 92 81C91.2044 81 90.4413 81.3161 89.8787 81.8787C89.3161 82.4413 89 83.2044 89 84Z"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M142 84C142 85.5913 142.632 87.1174 143.757 88.2426C144.883 89.3679 146.409 90 148 90C149.591 90 151.117 89.3679 152.243 88.2426C153.368 87.1174 154 85.5913 154 84C154 82.4087 153.368 80.8826 152.243 79.7574C151.117 78.6321 149.591 78 148 78C146.409 78 144.883 78.6321 143.757 79.7574C142.632 80.8826 142 82.4087 142 84ZM145 84C145 84.7956 145.316 85.5587 145.879 86.1213C146.441 86.6839 147.204 87 148 87C148.796 87 149.559 86.6839 150.121 86.1213C150.684 85.5587 151 84.7956 151 84C151 83.2044 150.684 82.4413 150.121 81.8787C149.559 81.3161 148.796 81 148 81C147.204 81 146.441 81.3161 145.879 81.8787C145.316 82.4413 145 83.2044 145 84Z"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Mulut Berombak Bingung */}
          <g className="rig-mouth">
            <path
              d="M106 97C110 99.5 114 99.5 118 97C122 94.5 126 94.5 130 97C134 99.5 138 99.5 142 97"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* Bintang-Bintang Pusing Berputar Melayang di Atas Kepala */}
          <g className="rig-stars">
            <path
              d="M121.5 50.6086L124.444 56.7467L130.333 57.7698L125.426 61.8618L127.389 67.9999L121.5 63.9079L115.611 67.9999L117.574 61.8618L112.667 57.7698L118.556 56.7467L121.5 50.6086Z"
              fill="#F59E0B"
            />
            <path
              d="M139.167 41.9131L142.111 48.0512L148 49.0742L143.093 53.1663L145.056 59.3044L139.167 55.2123L133.278 59.3044L135.241 53.1663L130.333 49.0742L136.222 48.0512L139.167 41.9131Z"
              fill="#F59E0B"
            />
            <path
              d="M107.146 26.6954L109.722 32.0663L114.875 32.9614L110.581 36.542L112.299 41.9128L107.146 38.3323L101.993 41.9128L103.711 36.542L99.4167 32.9614L104.569 32.0663L107.146 26.6954Z"
              fill="#F59E0B"
            />
            <path
              d="M135.854 26.6954L138.431 32.0663L143.583 32.9614L139.289 36.542L141.007 41.9128L135.854 38.3323L130.701 41.9128L132.419 36.542L128.125 32.9614L133.278 32.0663L135.854 26.6954Z"
              fill="#F59E0B"
            />
            <path
              d="M121.5 18L123.708 23.3708L128.125 24.266L124.444 27.8465L125.917 33.2174L121.5 29.6368L117.083 33.2174L118.556 27.8465L114.875 24.266L119.292 23.3708L121.5 18Z"
              fill="#F59E0B"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function PortalResetPasswordView({ onBackToLogin }) {
  // Step: 'input_phone' | 'submitted_success'
  const [step, setStep] = useState('input_phone');
  const [noHp, setNoHp] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle kirim permintaan reset password ke Admin NOC
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await PortalAuthService.mintaResetPassword(noHp);
      if (res.ok && res.data?.ok) {
        setSubmittedData(res.data);
        setStep('submitted_success');
      } else {
        setErrorMsg(res.data?.message || 'Gagal memproses permintaan reset password.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan atau server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-200 flex items-center justify-center p-0 sm:p-4 text-slate-900 font-sans overflow-hidden">
      <div className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[92dvh] bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-200/80 flex flex-col overflow-hidden relative">

        {/* ░░░ PANEL ATAS: gradient biru diperbesar + Maskot Si Router Pusing ░░░ */}
        <div className="relative bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 h-[190px] sm:h-[210px] overflow-hidden shrink-0">
          <div className="absolute -top-14 -right-14 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-cyan-300/10 rounded-full pointer-events-none" />

          {/* Header Brand Atas */}
          <div className="relative z-10 pt-4 px-5">
            <div className="flex items-center gap-3">
              <img
                src="/frame-36.png"
                alt="TeknoIndonet Logo"
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="text-white text-xl sm:text-2xl font-black tracking-tight leading-none drop-shadow-xs">
                  Tekno<span className="text-cyan-200 font-extrabold">Cust</span>
                </div>
                <div className="text-blue-100/90 text-[11px] sm:text-xs mt-1 font-medium leading-tight">
                  Layanan Mandiri Khusus Pelanggan TeknoIndonet
                </div>
              </div>
            </div>
          </div>

          {/* MASKOT Si Router Pusing di tengah panel biru */}
          <div className="absolute inset-0 flex items-center justify-center pt-14 pb-2 pointer-events-none">
            <RouterPusingMascot className="w-24 h-20 sm:w-28 sm:h-22" />
          </div>
        </div>

        {/* ░░░ PANEL BAWAH: card putih overlap + alur dinamis lupa password ░░░ */}
        <div className="relative -mt-5 bg-white rounded-t-[1.75rem] shadow-2xl flex-1 flex flex-col justify-between overflow-y-auto z-10">
          <div className="px-5 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5 flex flex-col justify-between min-h-full">
            <div>
              {/* Header Title */}
              <div className="text-center mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Lupa Password
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {step === 'submitted_success'
                    ? 'Permintaan reset telah terkirim ke Tim Admin NOC'
                    : 'Pemulihan kata sandi akun pelanggan TeknoCust'}
                </p>
              </div>

              {/* Alert Feedback Error */}
              {errorMsg && (
                <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-semibold leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAHAP 1: FORM INPUT NOMOR WHATSAPP                         */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {step === 'input_phone' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 text-xs text-blue-900 space-y-1.5 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                      <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Pemulihan Sandi Melalui Admin</span>
                    </div>
                    <p className="text-blue-800/90 text-[11px] leading-relaxed">
                      Masukkan Nomor WhatsApp terdaftar Anda. Sistem akan membuatkan kata sandi baru secara aman dan meneruskannya ke tiket Admin NOC TeknoIndonet untuk dikirimkan langsung ke WhatsApp Anda.
                    </p>
                  </div>

                  <form onSubmit={handleRequestReset} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="reset-phone" className="text-[11px] font-semibold text-slate-700 block">
                        Nomor WhatsApp Terdaftar
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          id="reset-phone"
                          type="tel"
                          required
                          value={noHp}
                          onChange={(e) => setNoHp(e.target.value)}
                          placeholder="Contoh: 081234567890 atau 628..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition min-h-[42px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-2.5 sm:py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-600 hover:to-blue-800 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer min-h-[44px]"
                    >
                      <span>{loading ? 'Memproses Permintaan...' : 'Kirim Permintaan Reset'}</span>
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
                    </button>
                  </form>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAHAP 2: PERMINTAAN DITERIMA ADMIN NOC                     */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {step === 'submitted_success' && (
                <div className="space-y-4 animate-fadeIn text-center py-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 px-2">
                    <h3 className="text-base font-black text-slate-900">
                      Permintaan Reset Diterima!
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Permintaan reset kata sandi untuk pelanggan <strong className="text-slate-800 font-bold">{submittedData?.nama || 'Anda'}</strong> telah masuk ke antrean Tim Admin NOC.
                    </p>
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-left space-y-1 text-xs text-slate-700">
                      <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                        Langkah Selanjutnya:
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Admin NOC TeknoIndonet akan segera mengirimkan kata sandi baru ke nomor WhatsApp Anda:
                      </p>
                      <div className="text-xs font-mono font-bold text-blue-700 bg-white p-2 rounded-lg border border-blue-200 inline-block mt-1">
                        {submittedData?.no_hp || noHp}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              )}

              {/* Tombol Kembali ke Halaman Masuk (saat form input) */}
              {step === 'input_phone' && (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full mt-4 py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              )}
            </div>

            {/* Footer copyright */}
            <div className="pt-3 pb-1 text-center text-[10px] text-slate-400 font-mono shrink-0">
              &copy; 2026 TeknoCust &bull; Layanan Mandiri Pelanggan TeknoIndonet
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
