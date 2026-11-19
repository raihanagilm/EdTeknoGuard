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
      {/* Mobile Shell Wrapper (Max 440px terpadu seragam seluruh MyTekno) */}
      <div className="w-full max-w-[440px] mx-auto h-[100dvh] sm:h-[92dvh] bg-[#F1F5F9] relative flex flex-col sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:border sm:border-slate-300/70 overflow-hidden overscroll-none">
        
        {/* Header Biru Terpadu MyTekno */}
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
                  MyTekno Customer Care
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Konten dengan Scroll-Area & Negative Margin (-mt-18) */}
        <main className="scroll-area -mt-18 flex-1 overflow-y-auto relative z-10 px-3.5 pb-6 space-y-3">
          {/* Segmented Tab Switcher (Single-Hue Blue Theme) */}
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

          {/* Lembar Dokumen Tunggal (Satu Card Bersih, Anti Box-in-Box) */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 space-y-3.5 text-xs text-slate-600 leading-relaxed">
            {activeTab === 'privasi' ? (
              <>
                {/* Banner Callout Transparansi */}
                <div className="p-3 rounded-lg bg-blue-50/70 border-l-2 border-blue-600 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Transparansi Sensor dan Data Pelanggan</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Aplikasi MyTekno hanya meminta izin perangkat yang esensial untuk mendukung operasional layanan sambungan internet rumah Anda.
                  </p>
                </div>

                {/* Daftar Klausul dalam 1 Alur Bersih (Divide-Y) */}
                <div className="divide-y divide-slate-100 space-y-3 pt-1">
                  {/* 1. Izin Lokasi Presisi (GPS) */}
                  <article className="space-y-1.5 pt-2 first:pt-0">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span>1. Izin Lokasi Presisi (GPS)</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8">
                      <strong>Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah pelanggan.
                    </p>
                    <p className="text-[11px] text-slate-500 pl-8 border-l-2 border-blue-200 ml-8 leading-snug">
                      Aplikasi <strong>tidak pernah melacak pergerakan lokasi Anda di latar belakang</strong> saat aplikasi ditutup. Koordinat hanya dipetakan agar teknisi lapangan cepat sampai saat ada kabel optik putus atau gangguan redaman.
                    </p>
                  </article>

                  {/* 2. Izin Akses Galeri & Kamera */}
                  <article className="space-y-1.5 pt-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span>2. Izin Akses Galeri dan Kamera</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8">
                      <strong>Tujuan:</strong> Digunakan saat Anda mengambil atau mengganti foto profil akun MyTekno serta melampirkan foto struk bukti pembayaran tagihan.
                    </p>
                    <p className="text-[11px] text-slate-500 pl-8 border-l-2 border-blue-200 ml-8 leading-snug">
                      Aplikasi <strong>tidak memindai atau membaca berkas foto pribadi lainnya</strong> di memori ponsel Anda.
                    </p>
                  </article>

                  {/* 3. Data Transaksi Pembayaran */}
                  <article className="space-y-1.5 pt-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>3. Data Transaksi Pembayaran</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8">
                      Nomor Virtual Account dan riwayat tagihan diproses menggunakan protokol enkripsi resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit atau PIN perbankan pribadi Anda</strong>.
                    </p>
                  </article>

                  {/* 4. Kepatuhan Perlindungan Data (UU PDP) */}
                  <article className="space-y-1.5 pt-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span>4. Kepatuhan UU Perlindungan Data Pribadi</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8">
                      Nomor WhatsApp Anda hanya digunakan untuk verifikasi login resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em>. Data Anda tidak pernah diperjualbelikan kepada pihak ketiga.
                    </p>
                  </article>
                </div>
              </>
            ) : (
              <>
                {/* Banner Callout Syarat Ketentuan */}
                <div className="p-3 rounded-lg bg-blue-50/70 border-l-2 border-blue-600 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Ketentuan Penggunaan Layanan MyTekno</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Ketentuan ini mengatur tata tertib berlangganan internet dan hak kewajiban pelanggan resmi.
                  </p>
                </div>

                {/* Pasal-Pasal dalam 1 Alur Bersih */}
                <div className="divide-y divide-slate-100 space-y-3 pt-1">
                  <article className="space-y-1 pt-2 first:pt-0">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Wifi className="w-3.5 h-3.5" />
                      </div>
                      <span>Pasal 1: Layanan Sambungan Internet</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                      Penyedia layanan menyediakan sambungan internet tanpa batas (unlimited) sesuai paket kecepatan bandwidth yang telah dipilih pada formulir pemasangan awal.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Radio className="w-3.5 h-3.5" />
                      </div>
                      <span>Pasal 2: Pemantauan Daya Optik dan Pemeliharaan</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                      Sistem EdTeknoGuard memantau daya terima optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (LOS). Tim teknisi berhak melakukan pengecekan kabel fisik lapangan demi menjaga kualitas koneksi Anda.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>Pasal 3: Kewajiban Pembayaran Tagihan</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                      Pelanggan berkewajiban menyelesaikan pembayaran iuran bulanan selambat-lambatnya pada tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                      <span>Pasal 4: Tanggung Jawab Perangkat Modem</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                      Perangkat modem ONT dan adaptor yang terpasang merupakan aset operasional penyedia layanan. Pelanggan berkewajiban merawat fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor cabang.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span>Pasal 5: Pelaporan Kendala Mandiri</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                      Pelanggan dapat membuat tiket pengaduan secara mandiri melalui aplikasi MyTekno. Tim teknisi piket akan merespons sesuai antrean dan prioritas gangguan di lapangan.
                    </p>
                  </article>
                </div>
              </>
            )}
          </section>

          {/* Footer Copyright Tanpa Dot */}
          <div className="pt-2 pb-2 text-center text-[10px] text-slate-400 font-mono">
            &copy; 2026 MyTekno - PT Tekno Indo Network
          </div>
        </main>
      </div>
    </div>
  );
}
