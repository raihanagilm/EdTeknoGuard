import React, { useState } from 'react';
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
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

export function PortalLegalModal({ isOpen, onClose, initialTab = 'privasi' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 pb-20 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="w-full max-w-sm bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col relative select-none animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-6rem)] sm:max-h-[85vh]"
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
                  <h3 className="text-xs font-bold text-slate-900 leading-tight truncate">
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

            {/* Segmented Tab Switcher */}
            <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('privasi')}
                  className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                    activeTab === 'privasi'
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
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
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Syarat &amp; Ketentuan</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Content */}
            <div className="p-3.5 space-y-3 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              {activeTab === 'privasi' ? (
                <>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Transparansi Sensor &amp; Data</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Kami hanya meminta izin perangkat yang benar-benar esensial untuk kebutuhan operasional layanan internet Anda.
                    </p>
                  </div>

                  {/* 1. Izin Lokasi (GPS) */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">1. Izin Lokasi Presisi (GPS)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      <strong>Tujuan:</strong> Memetakan titik fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah.
                    </p>
                    <div className="text-[10.5px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Komitmen Perlindungan:</span>
                      </div>
                      <p>
                        Aplikasi <strong>TIDAK melacak pergerakan lokasi Anda secara berkala di latar belakang</strong>. Koordinat hanya dipetakan agar teknisi piket cepat sampai saat terjadi perbaikan kabel optik atau redaman drop.
                      </p>
                    </div>
                  </div>

                  {/* 2. Izin Kamera & Galeri Foto */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">2. Izin Akses Galeri &amp; Kamera</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      <strong>Tujuan:</strong> Digunakan saat Anda mengambil atau mengganti foto profil akun MyTekno serta melampirkan bukti transfer pembayaran tagihan.
                    </p>
                    <div className="text-[10.5px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Aplikasi <strong>tidak pernah membaca, memindai, atau mengunggah berkas foto pribadi lainnya</strong> di memori ponsel Anda.
                    </div>
                  </div>

                  {/* 3. Keamanan Data Tagihan */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">3. Data Transaksi Pembayaran</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Nomor Virtual Account dan riwayat tagihan diproses dengan protokol HTTPS resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit/debit atau PIN perbankan pribadi</strong> Anda.
                    </p>
                  </div>

                  {/* 4. Perlindungan Data Akun (UU PDP) */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">4. Kepatuhan UU PDP</span>
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
                      <FileText className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <span>Ketentuan Penggunaan Layanan</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Ketentuan ini mengatur tata tertib berlangganan internet dan hak kewajiban pelanggan.
                    </p>
                  </div>

                  {/* Pasal 1 */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pasal 1 &bull; Layanan Internet</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Penyedia layanan menyediakan sambungan internet tanpa batas (*unlimited*) sesuai paket bandwidth yang dipilih pada formulir pemasangan awal.
                    </p>
                  </div>

                  {/* Pasal 2 */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pasal 2 &bull; Pemantauan Daya Optik</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Sistem EdTeknoGuard memantau daya redaman optik modem ONT secara berkala untuk mencegah terjadinya sinyal putus (*LOS*). Tim teknisi berhak melakukan pengecekan kabel fisik demi menjaga kualitas koneksi.
                    </p>
                  </div>

                  {/* Pasal 3 */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pasal 3 &bull; Tagihan &amp; Pembayaran</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Pelanggan berkewajiban membayar tagihan bulanan sebelum tanggal jatuh tempo. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                    </p>
                  </div>

                  {/* Pasal 4 */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pasal 4 &bull; Tanggung Jawab Perangkat ONT</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Modem ONT dan adaptor listrik merupakan aset operasional penyedia layanan. Pelanggan wajib menjaga fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor.
                    </p>
                  </div>

                  {/* Pasal 5 */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-white space-y-1 shadow-2xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pasal 5 &bull; Tiket Pengaduan Mandiri</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Pelanggan dapat membuat tiket pengaduan secara mandiri melalui aplikasi MyTekno. Tim teknisi piket akan merespons sesuai antrean dan prioritas gangguan di lapangan.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0 font-sans">
              <span className="text-[10px] text-slate-400 font-mono">
                Pembaruan: Nov 2026
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
