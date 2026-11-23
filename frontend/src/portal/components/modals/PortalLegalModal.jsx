import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  FileText,
  MapPin,
  Camera,
  CreditCard,
  Lock,
  Wifi,
  Radio,
  X,
  AlertCircle
} from 'lucide-react';

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
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {activeTab === 'privasi' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 id="portal-legal-modal-title" className="text-xs font-bold text-slate-900 leading-tight truncate">
                    {activeTab === 'privasi'
                      ? 'Kebijakan Privasi & Izin'
                      : 'Syarat & Ketentuan Layanan'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">MyTekno Customer Care</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer shrink-0"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Switcher (Single-Hue Blue Theme) */}
            <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('privasi')}
                  className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                    activeTab === 'privasi'
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Kebijakan Privasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('syarat')}
                  className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                    activeTab === 'syarat'
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Syarat &amp; Ketentuan</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Unified Reading Flow (Anti Box-in-Box, Single-Hue Palette) */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              {activeTab === 'privasi' ? (
                <>
                  {/* Callout Transparansi Tanpa Card Tumpuk */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border-l-2 border-blue-600 text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Transparansi Sensor dan Data</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Kami hanya meminta izin perangkat yang benar-benar esensial untuk kebutuhan operasional layanan internet rumah Anda.
                    </p>
                  </div>

                  {/* Daftar Izin dalam 1 Alur Dokumen Bersih (Divide-Y) */}
                  <div className="divide-y divide-slate-100 space-y-3.5 pt-1">
                    {/* 1. Izin Lokasi Presisi (GPS) */}
                    <article className="space-y-1.5 pt-2 first:pt-0">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span>1. Izin Lokasi Presisi (GPS)</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 pl-8">
                        <strong>Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah.
                      </p>
                      <p className="text-[11px] text-slate-500 pl-8 border-l-2 border-blue-200 ml-8 leading-snug">
                        Aplikasi <strong>tidak melacak pergerakan lokasi Anda di latar belakang</strong>. Koordinat hanya dipetakan agar teknisi piket cepat sampai saat terjadi perbaikan kabel optik atau redaman drop.
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
                        <strong>Tujuan:</strong> Digunakan saat Anda mengambil atau mengganti foto profil akun MyTekno serta melampirkan bukti transfer pembayaran tagihan.
                      </p>
                      <p className="text-[11px] text-slate-500 pl-8 border-l-2 border-blue-200 ml-8 leading-snug">
                        Aplikasi <strong>tidak pernah membaca atau memindai berkas foto pribadi lainnya</strong> di memori ponsel Anda.
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
                        Nomor Virtual Account dan riwayat tagihan diproses dengan protokol HTTPS resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit atau PIN perbankan pribadi</strong> Anda.
                      </p>
                    </article>

                    {/* 4. Kepatuhan Perlindungan Data (UU PDP) */}
                    <article className="space-y-1.5 pt-3.5">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <span>4. Perlindungan Data Akun (UU PDP)</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 pl-8">
                        Nomor WhatsApp hanya digunakan untuk verifikasi login resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em>. Data Anda tidak pernah diperjualbelikan kepada pihak ketiga.
                      </p>
                    </article>
                  </div>
                </>
              ) : (
                <>
                  {/* Callout Syarat Ketentuan */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border-l-2 border-blue-600 text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Ketentuan Penggunaan Layanan</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Ketentuan ini mengatur tata tertib berlangganan internet dan hak kewajiban pelanggan resmi.
                    </p>
                  </div>

                  {/* Pasal-Pasal dalam 1 Alur Dokumen Bersih */}
                  <div className="divide-y divide-slate-100 space-y-3.5 pt-1">
                    <article className="space-y-1 pt-2 first:pt-0">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Wifi className="w-3.5 h-3.5" />
                        </div>
                        <span>Pasal 1: Layanan Sambungan Internet</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                        Penyedia layanan menyediakan sambungan internet tanpa batas (unlimited) sesuai paket bandwidth yang dipilih pada formulir pemasangan awal.
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
                        Sistem EdTeknoGuard memantau daya redaman optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (LOS). Tim teknisi berhak melakukan pengecekan kabel fisik demi menjaga kualitas koneksi.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <span>Pasal 3: Tagihan dan Pembayaran</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                        Pelanggan berkewajiban membayar tagihan bulanan sebelum tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                      </p>
                    </article>

                    <article className="space-y-1 pt-3.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span>Pasal 4: Tanggung Jawab Perangkat ONT</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 pl-8 leading-relaxed">
                        Modem ONT dan adaptor listrik merupakan aset operasional penyedia layanan. Pelanggan wajib menjaga fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor.
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
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0 font-sans">
              <span className="text-[10px] text-slate-400 font-mono">
                Pembaruan: November 2026
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-98 cursor-pointer min-h-[38px] flex items-center justify-center"
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
