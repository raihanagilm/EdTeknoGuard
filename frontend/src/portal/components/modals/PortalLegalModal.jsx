import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function PortalLegalModal({ isOpen, onClose, initialTab = 'privasi' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-legal-modal-title"
            className="w-full max-w-sm bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative select-none animate-in zoom-in-95 duration-150 max-h-[62vh] sm:max-h-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0">
                <h3 id="portal-legal-modal-title" className="text-xs font-bold text-slate-900 leading-tight">
                  {activeTab === 'privasi' ? 'Kebijakan Privasi & Izin' : 'Syarat & Ketentuan'}
                </h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">MyTekno Customer Care</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Switcher (Editorial Neutral Minimalist) */}
            <div className="px-4 pt-2.5 pb-2 bg-slate-50/50 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-2 p-0.5 bg-slate-200/60 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('privasi')}
                  className={`py-1.5 px-3 rounded-md transition cursor-pointer text-xs font-medium text-center ${
                    activeTab === 'privasi'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kebijakan Privasi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('syarat')}
                  className={`py-1.5 px-3 rounded-md transition cursor-pointer text-xs font-medium text-center ${
                    activeTab === 'syarat'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Syarat &amp; Ketentuan
                </button>
              </div>
            </div>

            {/* Modal Body: Editorial Reading Flow */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              {activeTab === 'privasi' ? (
                <>
                  {/* Preamble / Pengantar */}
                  <div className="pb-2.5 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 text-xs mb-0.5">
                      Transparansi Data &amp; Sensor
                    </p>
                    <p className="text-[11.5px] text-slate-500 leading-snug">
                      Kami hanya meminta izin perangkat yang esensial untuk kebutuhan operasional layanan internet rumah Anda.
                    </p>
                  </div>

                  {/* Klausul Legal */}
                  <div className="divide-y divide-slate-100 space-y-3 pt-0.5">
                    {/* 1. Izin Lokasi Presisi */}
                    <article className="space-y-1 pt-2.5 first:pt-0">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        1. Izin Lokasi Presisi (GPS)
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-700">Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat terhubung ke WiFi rumah.
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Aplikasi tidak melacak lokasi di latar belakang saat aplikasi ditutup. Koordinat hanya digunakan agar teknisi cepat sampai saat terjadi gangguan kabel fisik atau redaman drop.
                      </p>
                    </article>

                    {/* 2. Izin Galeri & Kamera */}
                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        2. Izin Akses Galeri dan Kamera
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-700">Tujuan:</strong> Mengambil atau mengganti foto profil akun MyTekno serta melampirkan foto bukti pembayaran tagihan.
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Aplikasi tidak membaca atau memindai berkas foto pribadi lainnya di penyimpanan perangkat Anda.
                      </p>
                    </article>

                    {/* 3. Data Transaksi Pembayaran */}
                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        3. Data Transaksi Pembayaran
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Nomor Virtual Account dan riwayat tagihan diproses dengan protokol HTTPS resmi. MyTekno tidak menyimpan nomor kartu kredit atau PIN perbankan pribadi Anda.
                      </p>
                    </article>

                    {/* 4. Perlindungan Data (UU PDP) */}
                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        4. Perlindungan Data Akun (UU PDP)
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Nomor WhatsApp hanya digunakan untuk verifikasi login resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em>. Data Anda tidak diperjualbelikan kepada pihak ketiga.
                      </p>
                    </article>
                  </div>
                </>
              ) : (
                <>
                  {/* Preamble / Pengantar */}
                  <div className="pb-2.5 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 text-xs mb-0.5">
                      Ketentuan Penggunaan Layanan
                    </p>
                    <p className="text-[11.5px] text-slate-500 leading-snug">
                      Ketentuan ini mengatur tata tertib berlangganan internet serta hak dan kewajiban pelanggan resmi.
                    </p>
                  </div>

                  {/* Pasal-Pasal */}
                  <div className="divide-y divide-slate-100 space-y-3 pt-0.5">
                    <article className="space-y-1 pt-2.5 first:pt-0">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Pasal 1: Layanan Sambungan Internet
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Penyedia layanan menyediakan sambungan internet tanpa batas (unlimited) sesuai paket bandwidth yang dipilih pada formulir pemasangan.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Pasal 2: Pemantauan Daya Optik dan Pemeliharaan
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Sistem EdTeknoGuard memantau daya redaman optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (LOS). Tim teknisi berhak melakukan pengecekan kabel fisik demi menjaga kualitas koneksi.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Pasal 3: Tagihan dan Pembayaran
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Pelanggan berkewajiban membayar tagihan bulanan sebelum tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Pasal 4: Tanggung Jawab Perangkat ONT
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Modem ONT dan adaptor listrik merupakan aset operasional penyedia layanan. Pelanggan wajib menjaga fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3">
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Pasal 5: Pelaporan Kendala Mandiri
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        Pelanggan dapat membuat tiket pengaduan secara mandiri melalui aplikasi MyTekno. Tim teknisi akan merespons sesuai antrean dan prioritas gangguan di lapangan.
                      </p>
                    </article>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 font-sans">
              <span className="text-[11px] text-slate-400 font-normal">
                Pembaruan: November 2026
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition active:scale-98 cursor-pointer min-h-[36px] flex items-center justify-center"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}
