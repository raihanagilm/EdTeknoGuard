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
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {activeTab === 'privasi' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
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
                className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'privasi'
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kebijakan Privasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('syarat')}
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'syarat'
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Syarat &amp; Ketentuan</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              {activeTab === 'privasi' ? (
                <>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Transparansi Penggunaan Data &amp; Sensor</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Aplikasi MyTekno dirancang untuk mempermudah layanan pelanggan internet mandiri. Kami hanya meminta izin perangkat yang benar-benar esensial untuk kebutuhan operasional Anda.
                    </p>
                  </div>

                  {/* 1. Izin Lokasi (GPS) */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span>1. Izin Lokasi Presisi (GPS)</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      <strong>Tujuan:</strong> Memetakan koordinat fisik rumah pelanggan ke peta operasional NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah.
                    </p>
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Komitmen Perlindungan:</span>
                      </div>
                      <p>
                        Aplikasi <strong>TIDAK melacak pergerakan lokasi Anda secara berkala di latar belakang</strong>. Koordinat hanya dikunci sekali untuk memastikan teknisi piket dapat menuju ke rumah Anda secara cepat saat terjadi gangguan fisik kabel fiber optik atau redaman drop.
                      </p>
                    </div>
                  </div>

                  {/* 2. Izin Kamera & Galeri Foto */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span>2. Izin Akses Galeri &amp; Kamera</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      <strong>Tujuan:</strong> Digunakan secara khusus saat Anda memilih untuk mengambil atau mengganti foto profil akun MyTekno serta mengunggah bukti transfer pembayaran tagihan.
                    </p>
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      Aplikasi <strong>tidak pernah membaca, memindai, atau mengunggah berkas foto pribadi lainnya</strong> di memori penyimpanan ponsel Anda. Foto profil otomatis dikompresi menjadi format WebP berukuran kecil demi keamanan bandwidth.
                    </div>
                  </div>

                  {/* 3. Keamanan Data Finansial & Tagihan */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>3. Data Transaksi Pembayaran</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      Informasi penagihan bulanan, nomor Virtual Account, dan riwayat transaksi internet Anda dilindungi dengan enkripsi koneksi HTTPS resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit/debit, PIN, atau data rahasia perbankan</strong> Anda.
                    </p>
                  </div>

                  {/* 4. Perlindungan Data Pribadi (UU PDP) */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span>4. Keamanan Akun &amp; Kepatuhan Hukum</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      Nomor WhatsApp Anda hanya digunakan untuk verifikasi autentikasi masuk, pengiriman kata sandi resmi, dan informasi darurat koneksi internet. Seluruh kata sandi dienkripsi dengan standar <em>one-way cryptographic hash</em>. Kami menjamin kerahasiaan data Anda dan tidak pernah membagikannya kepada pihak ketiga tanpa persetujuan Anda sesuai ketentuan UU Perlindungan Data Pribadi.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>Ketentuan Penggunaan Layanan MyTekno</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Syarat dan ketentuan ini mengatur hak, kewajiban, serta tata tertib penggunaan layanan internet dan aplikasi mandiri antara pelanggan dengan penyedia layanan.
                    </p>
                  </div>

                  {/* Pasal 1: Layanan Internet */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pasal 1 &bull; Layanan Sambungan Internet</span>
                    </h4>
                    <p className="text-[11.5px] text-slate-600 pl-5">
                      Penyedia layanan menyediakan akses sambungan internet tanpa batas kuota (*unlimited*) dengan kapasitas kecepatan bandwidth sesuai paket langganan yang dipilih oleh pelanggan pada formulir pemasangan awal.
                    </p>
                  </div>

                  {/* Pasal 2: Pemantauan Kualitas Daya Optik */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pasal 2 &bull; Pemantauan Otomatis &amp; Pemeliharaan</span>
                    </h4>
                    <p className="text-[11.5px] text-slate-600 pl-5">
                      Sistem EdTeknoGuard memantau daya redaman optik (*Optical Rx Power*) modem ONT secara berkala untuk mendeteksi penurunan kualitas sinyal sebelum terjadi pemutusan koneksi (*Loss of Signal / LOS*). Tim teknisi berhak melakukan pengecekan kabel fisik atau perbaikan sambungan lapangan demi menjaga stabilitas koneksi pelanggan.
                    </p>
                  </div>

                  {/* Pasal 3: Kewajiban Pembayaran & Jatuh Tempo */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pasal 3 &bull; Tagihan &amp; Pembayaran</span>
                    </h4>
                    <p className="text-[11.5px] text-slate-600 pl-5">
                      Pelanggan berkewajiban melakukan pembayaran tagihan langganan bulanan selambat-lambatnya pada tanggal jatuh tempo yang tercantum di aplikasi. Keterlambatan pembayaran setelah masa tenggang dapat mengakibatkan penonaktifan sementara (*isolir*) sambungan internet hingga tagihan diselesaikan.
                    </p>
                  </div>

                  {/* Pasal 4: Tanggung Jawab Perangkat */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pasal 4 &bull; Perangkat Modem ONT &amp; Aksesoris</span>
                    </h4>
                    <p className="text-[11.5px] text-slate-600 pl-5">
                      Perangkat modem ONT dan adaptor listrik yang dipasang di tempat pelanggan merupakan aset operasional penyedia layanan. Pelanggan wajib menjaga fisik perangkat tersebut dari kerusakan akibat kelalaian, kebakaran, atau pemindahtanganan tanpa persetujuan resmi kantor layanan.
                    </p>
                  </div>

                  {/* Pasal 5: Layanan Pengaduan */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pasal 5 &bull; Pelaporan Kendala Mandiri</span>
                    </h4>
                    <p className="text-[11.5px] text-slate-600 pl-5">
                      Pelanggan dapat menyampaikan kendala internet secara mandiri melalui tab Kendala di aplikasi MyTekno. Tim teknisi piket akan merespons pengaduan sesuai urutan antrean dan prioritas gangguan operasional di lapangan.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0 font-sans">
              <span className="text-[10px] text-slate-400 font-mono">
                Pembaruan: November 2026
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-98 cursor-pointer"
              >
                Saya Mengerti &amp; Setuju
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}
