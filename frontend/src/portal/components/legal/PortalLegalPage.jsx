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
  ArrowLeft
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
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-800 font-sans p-3 sm:p-6 antialiased flex flex-col justify-between">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-scaleUp">
        {/* Page Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {activeTab === 'privasi' ? 'Kebijakan Privasi & Izin Aplikasi' : 'Syarat & Ketentuan Layanan'}
              </h1>
              <p className="text-xs text-slate-500 font-mono">MyTekno &bull; Layanan Mandiri Pelanggan</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('privasi')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'privasi'
                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Kebijakan Privasi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('syarat')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'syarat'
                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Syarat &amp; Ketentuan</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto">
          {activeTab === 'privasi' ? (
            <>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Komitmen Privasi &amp; Izin Sensor MyTekno</span>
                </div>
                <p className="text-xs text-blue-800 leading-normal">
                  Dokumen ini menjelaskan kebijakan privasi, tata kelola data, dan perizinan perangkat yang digunakan pada aplikasi mandiri pelanggan MyTekno.
                </p>
              </div>

              {/* 1. Lokasi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>1. Izin Lokasi Perangkat (GPS)</span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Tujuan:</strong> Memetakan titik koordinat fisik rumah pelanggan pada sistem NOC TeknoGuard saat Anda terhubung ke sinyal WiFi rumah pelanggan.
                </p>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Jaminan Keamanan:</span>
                  </div>
                  <p>
                    Aplikasi <strong>TIDAK pernah melacak pergerakan lokasi Anda secara berkala di latar belakang</strong> saat aplikasi ditutup. Koordinat hanya dipetakan untuk keperluan penanganan gangguan kabel optik atau kendala redaman oleh teknisi lapangan.
                  </p>
                </div>
              </div>

              {/* 2. Galeri */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span>2. Izin Akses Galeri &amp; Kamera</span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Tujuan:</strong> Digunakan hanya saat Anda memilih untuk mengambil atau mengganti foto profil akun MyTekno serta melampirkan foto struk bukti pembayaran tagihan.
                </p>
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  Aplikasi <strong>tidak memindai atau membaca berkas foto pribadi lainnya</strong> di memori ponsel Anda. Foto profil otomatis dioptimasi dan dikompresi ke format WebP aman.
                </p>
              </div>

              {/* 3. Pembayaran */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span>3. Keamanan Data Tagihan &amp; Pembayaran</span>
                </div>
                <p className="text-xs text-slate-600">
                  Informasi tagihan bulanan dan nomor Virtual Account diproses menggunakan protokol enkripsi resmi. MyTekno <strong>tidak pernah menyimpan nomor kartu kredit/debit, kode CVV, atau PIN perbankan pribadi Anda</strong>.
                </p>
              </div>

              {/* 4. UU PDP */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span>4. Perlindungan Data Akun &amp; Kepatuhan UU PDP</span>
                </div>
                <p className="text-xs text-slate-600">
                  Nomor WhatsApp Anda hanya digunakan untuk verifikasi autentikasi resmi dan notifikasi operasional internet. Kata sandi dienkripsi dengan standar <em>cryptographic hash</em> satu arah. Data Anda tidak pernah diperjualbelikan kepada pihak mana pun sesuai amanat UU Perlindungan Data Pribadi di Indonesia.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-slate-100 text-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Syarat &amp; Ketentuan Layanan Internet MyTekno</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Ketentuan ini mengatur tata cara berlangganan dan hak kewajiban pelanggan internet resmi.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  <span>Pasal 1 &bull; Layanan Sambungan Internet</span>
                </h3>
                <p className="text-xs text-slate-600 pl-6">
                  Penyedia layanan menyediakan akses internet tanpa batas kuota (*unlimited*) sesuai paket kecepatan bandwidth yang telah dipilih pada formulir pemasangan awal.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span>Pasal 2 &bull; Pemantauan Daya Optik &amp; Pemeliharaan</span>
                </h3>
                <p className="text-xs text-slate-600 pl-6">
                  Sistem EdTeknoGuard memantau daya terima optik (*Optical Rx Power*) modem ONT secara berkala untuk mencegah terjadinya pemutusan sinyal (*Loss of Signal / LOS*). Tim teknisi berhak melakukan pengecekan kabel fisik lapangan demi menjaga kualitas koneksi Anda.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Pasal 3 &bull; Kewajiban Pembayaran Tagihan</span>
                </h3>
                <p className="text-xs text-slate-600 pl-6">
                  Pelanggan berkewajiban menyelesaikan pembayaran iuran bulanan selambat-lambatnya pada tanggal jatuh tempo. Keterlambatan pembayaran setelah batas masa tenggang dapat mengakibatkan isolir sementara hingga tagihan dilunasi.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <span>Pasal 4 &bull; Tanggung Jawab Perangkat Modem</span>
                </h3>
                <p className="text-xs text-slate-600 pl-6">
                  Perangkat modem ONT dan adaptor yang terpasang merupakan aset operasional penyedia layanan. Pelanggan berkewajiban merawat fisik perangkat dan tidak memindahtangankannya tanpa persetujuan resmi kantor cabang.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">MyTekno Legal Care &bull; Nov 2026</span>
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Kembali ke Portal
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 font-mono py-2">
        &copy; 2026 MyTekno &bull; PT Tekno Indo Network. Seluruh hak cipta dilindungi undang-undang.
      </div>
    </div>
  );
}
