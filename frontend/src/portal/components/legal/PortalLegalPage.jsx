import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  MapPin,
  Camera,
  CreditCard,
  Lock,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

export function PortalLegalPage({ initialTab = 'privasi', onBack }) {
  const [activeTab, setActiveTab] = useState(
    initialTab === 'syarat-ketentuan' || initialTab === 'syarat' ? 'syarat' : 'privasi'
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/portal';
    }
  };

  return (
    <div className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-slate-200/90 p-0 sm:p-4 pb-0 sm:pb-4 flex justify-center items-center text-slate-900 font-sans antialiased overflow-hidden overscroll-none select-none">
      {/* Mobile Shell Wrapper (Max 440px seragam persis seluruh halaman MyTekno) */}
      <div className="w-full max-w-[440px] mx-auto h-[100dvh] sm:h-[92dvh] bg-[#F1F5F9] relative flex flex-col sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:border sm:border-slate-300/70 overflow-hidden overscroll-none">
        
        {/* ═══ HEADER BIRU TERPADU DENGAN GELOMBANG SINYAL (PERSIS SUB-PAGE LAIN) ═══ */}
        <div className="shrink-0 relative z-0 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 border-b border-blue-700/60 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
            <svg
              className="absolute -bottom-2 -left-4 w-96 h-28 text-white/10"
              viewBox="0 0 400 120"
              fill="none"
            >
              <path
                d="M-20 60 C 80 15, 180 85, 280 35 C 340 10, 390 60, 440 40"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute -top-10 right-4 w-36 h-36 bg-blue-300/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-10 left-10 w-28 h-28 bg-indigo-400/15 rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="relative px-4 sm:px-5 pt-4 pb-20 sm:pb-22 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Kembali"
                className="w-10 h-10 rounded-xl bg-blue-700/70 hover:bg-blue-700 border border-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                  {activeTab === 'privasi' ? 'Kebijakan Privasi' : 'Syarat & Ketentuan'}
                </h1>
                <p className="text-xs font-medium text-white/95 mt-0.5 leading-snug break-words">
                  MyTekno &bull; Layanan Mandiri Pelanggan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-18) ═══ */}
        <main className="scroll-area -mt-18 flex-1 overflow-y-auto relative z-10 px-3.5 pb-6 space-y-3">
          {/* Segmented Tab Switcher */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('privasi')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'privasi'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Kebijakan Privasi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('syarat')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'syarat'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Syarat &amp; Ketentuan</span>
            </button>
          </div>

          {/* Isi Konten */}
          <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            {activeTab === 'privasi' ? (
              <>
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Transparansi Sensor &amp; Data Pelanggan</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Aplikasi MyTekno hanya meminta izin perangkat yang benar-benar esensial untuk mendukung kestabilan layanan internet rumah Anda.
                  </p>
                </div>

                {/* 1. Lokasi */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-xs">1. Izin Lokasi Presisi (GPS)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong>Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah pelanggan.
                  </p>
                  <div className="text-[10.5px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Jaminan Keamanan:</span>
                    </div>
                    <p>
                      Aplikasi <strong>TIDAK pernah melacak pergerakan lokasi Anda secara berkala di latar belakang</strong>. Koordinat hanya dikunci sekali agar teknisi lapangan cepat sampai saat ada kabel optik putus atau gangguan redaman.
                    </p>
                  </div>
                </div>

                {/* 2. Galeri */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs">2. Izin Akses Galeri &amp; Kamera</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong>Tujuan:</strong> Digunakan saat Anda mengambil atau mengganti foto profil akun MyTekno serta melampirkan foto struk bukti pembayaran tagihan.
                  </p>
                  <p className="text-[10.5px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    Aplikasi <strong>tidak memindai atau membaca berkas foto pribadi lainnya</strong> di memori ponsel Anda.
                  </p>
                </div>

                {/* 3. Pembayaran */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs">3. Data Transaksi Pembayaran</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Nomor Virtual Account dan riwayat tagihan diproses dengan protokol enkripsi resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit/debit atau PIN perbankan pribadi Anda</strong>.
                  </p>
                </div>

                {/* 4. UU PDP */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-xs">4. Kepatuhan UU Perlindungan Data Pribadi</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Nomor WhatsApp Anda hanya digunakan untuk verifikasi login resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em>. Data Anda tidak pernah diperjualbelikan kepada pihak ketiga.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-slate-100 text-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                    <span>Syarat &amp; Ketentuan Layanan Internet</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Ketentuan ini mengatur tata tertib berlangganan internet dan hak kewajiban pelanggan resmi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pasal 1 &bull; Layanan Sambungan Internet</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Penyedia layanan menyediakan sambungan internet tanpa batas (*unlimited*) sesuai paket kecepatan bandwidth yang dipilih pada formulir pemasangan awal.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pasal 2 &bull; Pemantauan Daya Optik &amp; Pemeliharaan</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Sistem EdTeknoGuard memantau daya redaman optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (*LOS*). Tim teknisi berhak melakukan pengecekan kabel fisik demi menjaga kualitas koneksi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pasal 3 &bull; Tagihan &amp; Pembayaran</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Pelanggan berkewajiban membayar tagihan bulanan sebelum tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pasal 4 &bull; Tanggung Jawab Perangkat ONT</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Modem ONT dan adaptor listrik merupakan aset operasional penyedia layanan. Pelanggan wajib menjaga fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pasal 5 &bull; Pelaporan Kendala Mandiri</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Pelanggan dapat membuat tiket kendala secara mandiri via aplikasi MyTekno. Tim teknisi piket akan merespons pengaduan sesuai antrean dan prioritas gangguan di lapangan.
                  </p>
                </div>
              </>
            )}

            {/* Footer Copyright */}
            <div className="pt-2 pb-2 text-center text-[10px] text-slate-400 font-mono">
              &copy; 2026 MyTekno &bull; PT Tekno Indo Network
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
