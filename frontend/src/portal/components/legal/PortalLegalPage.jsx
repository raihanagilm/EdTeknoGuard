import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

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
          {/* Segmented Tab Switcher (Editorial Neutral Minimalist) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('privasi')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                activeTab === 'privasi'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Kebijakan Privasi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('syarat')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                activeTab === 'syarat'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Syarat &amp; Ketentuan
            </button>
          </div>

          {/* Lembar Dokumen Tunggal (Satu Card Bersih, Anti Box-in-Box) */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
            {activeTab === 'privasi' ? (
              <>
                {/* Preamble / Pengantar */}
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 mb-0.5">
                    Transparansi Sensor dan Data Pelanggan
                  </h3>
                  <p className="text-[11.5px] text-slate-500 leading-snug">
                    Aplikasi MyTekno hanya meminta izin perangkat yang esensial untuk mendukung operasional layanan sambungan internet rumah Anda.
                  </p>
                </div>

                {/* Daftar Klausul dalam 1 Alur Bersih */}
                <div className="divide-y divide-slate-100 space-y-3 pt-0.5">
                  {/* 1. Izin Lokasi Presisi (GPS) */}
                  <article className="space-y-1 pt-2.5 first:pt-0">
                    <h4 className="text-xs font-semibold text-slate-900">
                      1. Izin Lokasi Presisi (GPS)
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-700">Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah pelanggan.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Aplikasi tidak pernah melacak pergerakan lokasi Anda di latar belakang saat aplikasi ditutup. Koordinat hanya dipetakan agar teknisi lapangan cepat sampai saat ada kabel optik putus atau gangguan redaman.
                    </p>
                  </article>

                  {/* 2. Izin Akses Galeri & Kamera */}
                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      2. Izin Akses Galeri dan Kamera
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-700">Tujuan:</strong> Digunakan saat Anda mengambil atau mengganti foto profil akun MyTekno serta melampirkan foto struk bukti pembayaran tagihan.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Aplikasi tidak memindai atau membaca berkas foto pribadi lainnya di memori ponsel Anda.
                    </p>
                  </article>

                  {/* 3. Data Transaksi Pembayaran */}
                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      3. Data Transaksi Pembayaran
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Nomor Virtual Account dan riwayat tagihan diproses menggunakan protokol enkripsi resmi. MyTekno tidak pernah menyimpan nomor kartu kredit atau PIN perbankan pribadi Anda.
                    </p>
                  </article>

                  {/* 4. Kepatuhan UU Perlindungan Data Pribadi */}
                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      4. Kepatuhan UU Perlindungan Data Pribadi
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Nomor WhatsApp Anda hanya digunakan untuk verifikasi login resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em>. Data Anda tidak pernah diperjualbelikan kepada pihak ketiga.
                    </p>
                  </article>
                </div>
              </>
            ) : (
              <>
                {/* Preamble / Pengantar */}
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 mb-0.5">
                    Ketentuan Penggunaan Layanan MyTekno
                  </h3>
                  <p className="text-[11.5px] text-slate-500 leading-snug">
                    Ketentuan ini mengatur tata tertib berlangganan internet dan hak kewajiban pelanggan resmi.
                  </p>
                </div>

                {/* Pasal-Pasal */}
                <div className="divide-y divide-slate-100 space-y-3 pt-0.5">
                  <article className="space-y-1 pt-2.5 first:pt-0">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Pasal 1: Layanan Sambungan Internet
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Penyedia layanan menyediakan sambungan internet tanpa batas (unlimited) sesuai paket kecepatan bandwidth yang telah dipilih pada formulir pemasangan awal.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Pasal 2: Pemantauan Daya Optik dan Pemeliharaan
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Sistem EdTeknoGuard memantau daya terima optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (LOS). Tim teknisi berhak melakukan pengecekan kabel fisik lapangan demi menjaga kualitas koneksi Anda.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Pasal 3: Kewajiban Pembayaran Tagihan
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Pelanggan berkewajiban menyelesaikan pembayaran iuran bulanan selambat-lambatnya pada tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Pasal 4: Tanggung Jawab Perangkat Modem
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Perangkat modem ONT dan adaptor yang terpasang merupakan aset operasional penyedia layanan. Pelanggan berkewajiban merawat fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor cabang.
                    </p>
                  </article>

                  <article className="space-y-1 pt-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Pasal 5: Pelaporan Kendala Mandiri
                    </h4>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Pelanggan dapat membuat tiket pengaduan secara mandiri melalui aplikasi MyTekno. Tim teknisi piket akan merespons sesuai antrean dan prioritas gangguan di lapangan.
                    </p>
                  </article>
                </div>
              </>
            )}
          </section>

          {/* Footer Copyright */}
          <div className="pt-2 pb-2 text-center text-[11px] text-slate-400 font-normal">
            &copy; 2026 MyTekno &bull; PT Tekno Indo Network
          </div>
        </main>
      </div>
    </div>
  );
}
