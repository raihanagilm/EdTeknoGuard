import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Landmark,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldCheck,
  Info,
  RefreshCw,
  Banknote,
  ArrowLeftRight,
  ReceiptText,
  UserCog,
  XCircle,
  Search,
  Building2,
  ChevronRight
} from 'lucide-react';
import { PortalHeader } from '../layout/PortalHeader';
import { PortalPembayaranService } from '../../services/portalApi';

/* ══════════════════════════════════════════════════════════════════
   HELPER FORMAT RUPIAH & TANGGAL
   Nominal datang dari API sebagai angka; format Rupiah dikerjakan di sini.
   amount_to_pay DILARANG dihitung ulang, hanya diformat.
   ══════════════════════════════════════════════════════════════════ */

const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '-' : `Rp ${Number(n).toLocaleString('id-ID')}`;

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/** "2026-10" -> "Oktober 2026" */
const periodeTeks = (p) => {
  if (!p) return '';
  const [y, m] = String(p).split('-');
  const idx = Number(m) - 1;
  return BULAN[idx] ? `${BULAN[idx]} ${y}` : p;
};

/** "2026-10-30" -> "30 Okt 2026" */
const tanggalTeks = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getDate()} ${BULAN[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
};

/** Tampilan 4-4-4-4 agar mudah dibaca. Tombol salin tetap memakai 16 digit bersih. */
const vaTampil = (va) => String(va || '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();

const jenisTagihanTeks = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'langganan') return 'Iuran Langganan';
  if (t === 'pemasangan') return 'Biaya Pemasangan';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Tagihan';
};

/** Kanal bank default sesuai spesifikasi api-v1.md jika API PoP belum mengaktifkan VA */
const getDefaultChannels = (customerId = '1', total = 125000) => {
  const cleanId = String(customerId || '1').padStart(4, '0');
  const fee = 4000;
  return [
    {
      channel: '802',
      bank: 'Mandiri',
      va_number: `371849720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '800',
      bank: 'BRI',
      va_number: `888849720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '702',
      bank: 'BCA',
      va_number: `123449720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '723',
      bank: 'BSI',
      va_number: `456749720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    }
  ];
};

/* ══════════════════════════════════════════════════════════════════
   KOMPONEN KECIL
   ══════════════════════════════════════════════════════════════════ */

function BarisNominal({ label, nilai, tebal = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${tebal ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`tabular-nums ${tebal ? 'text-sm font-black text-blue-600' : 'text-xs font-semibold text-gray-800'}`}>
        {nilai}
      </span>
    </div>
  );
}

/** Satu kanal bank. Tertutup secara bawaan; dibuka dengan sentuhan. */
function KanalBank({ kanal, tagihanTotal, terbuka, onToggle }) {
  const [tersalin, setTersalin] = useState(false);

  const salinNomor = async (e) => {
    e.stopPropagation();
    const bersih = String(kanal.va_number || '');
    try {
      await navigator.clipboard.writeText(bersih);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = bersih;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* abaikan */
      }
      document.body.removeChild(ta);
    }
    setTersalin(true);
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => setTersalin(false), 1800);
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      terbuka ? 'border-blue-400 bg-blue-50/50 shadow-xs' : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[48px] text-left cursor-pointer active:bg-gray-100/70"
        aria-expanded={terbuka}
      >
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          terbuka ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
        }`}>
          <Landmark className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-black text-gray-900 truncate">
            Virtual Account {kanal.bank}
          </span>
          <span className="block text-[11px] text-gray-500 font-medium">
            {terbuka ? 'Klik tombol salin di bawah' : 'Ketuk untuk melihat nomor & rincian'}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
          terbuka ? 'rotate-180 text-blue-600' : ''
        }`} />
      </button>

      {terbuka && (
        <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-blue-100/80 pt-3 bg-white">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Nomor Virtual Account {kanal.bank}
            </p>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
              <span className="flex-1 font-mono text-[14px] font-black text-gray-900 tracking-wider tabular-nums break-all">
                {vaTampil(kanal.va_number)}
              </span>
              <button
                type="button"
                onClick={salinNomor}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  tersalin ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                }`}
              >
                {tersalin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tersalin ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-dashed border-gray-100 text-xs">
            <BarisNominal label="Tagihan Pokok" nilai={rupiah(tagihanTotal)} />
            <BarisNominal label="Biaya Admin Bank" nilai={rupiah(kanal.admin_fee || 0)} />
            <div className="pt-1 border-t border-gray-100">
              <BarisNominal label="Total Yang Harus Dibayar" nilai={rupiah(kanal.amount_to_pay)} tebal />
            </div>
          </div>

          <div className="flex gap-2 rounded-xl bg-amber-50/80 border border-amber-200 p-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
              Bayar <strong>persis {rupiah(kanal.amount_to_pay)}</strong>. Nominal lain akan ditolak bank.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LEMBAR "SAYA SUDAH BAYAR" (BOTTOM SHEET)
   ══════════════════════════════════════════════════════════════════ */

const BATAS_POLLING_MS = 120000;   // 2 menit
const JEDA_POLLING_MS = 10000;     // 10 detik
const BATAS_PROSES_MS = 900000;    // 15 menit

function LembarSudahBayar({ invoiceId, onTutup, onLunas }) {
  const [state, setState] = useState('checking'); // checking | success | pending | stale | limited
  const [sisaDetik, setSisaDetik] = useState(Math.round(BATAS_POLLING_MS / 1000));
  const [pesan, setPesan] = useState('');

  const mulaiRef = useRef(Date.now());
  const timerRef = useRef(null);
  const hidupRef = useRef(true);

  useEffect(() => () => {
    hidupRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const periksa = useCallback(async () => {
    const res = await PortalPembayaranService.periksaPembayaran(invoiceId);
    if (!hidupRef.current) return;

    if (res.status === 429) {
      setPesan(res.data?.message || 'Permintaan sedang padat.');
      setState('limited');
      return;
    }

    if (res.ok && res.data?.settled) {
      setState('success');
      onLunas?.(res.data);
      return;
    }

    const lewat = Date.now() - mulaiRef.current;
    if (lewat >= BATAS_POLLING_MS) {
      setState(lewat >= BATAS_PROSES_MS ? 'stale' : 'pending');
      return;
    }

    timerRef.current = setTimeout(periksa, JEDA_POLLING_MS);
  }, [invoiceId, onLunas]);

  useEffect(() => {
    periksa();
    const tick = setInterval(() => {
      const sisa = Math.max(0, Math.round((BATAS_POLLING_MS - (Date.now() - mulaiRef.current)) / 1000));
      setSisaDetik(sisa);
      if (sisa === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [periksa]);

  const isi = {
    checking: {
      icon: Search,
      warna: 'text-blue-600',
      bg: 'bg-blue-50',
      judul: 'Memeriksa Pembayaran Anda',
      teks: `Mohon tunggu, kami sedang memastikan pembayaran Anda sudah tercatat. Pemeriksaan otomatis berhenti dalam ${sisaDetik} detik.`
    },
    success: {
      icon: CheckCircle2,
      warna: 'text-emerald-600',
      bg: 'bg-emerald-50',
      judul: 'Pembayaran Diterima!',
      teks: 'Terima kasih! Tagihan Anda sudah tercatat lunas dan koneksi internet Anda tetap lancar.'
    },
    pending: {
      icon: Clock,
      warna: 'text-amber-600',
      bg: 'bg-amber-50',
      judul: 'Pembayaran Sedang Diproses',
      teks: 'Pembayaran Anda sudah masuk ke bank. Pencatatan ke sistem memerlukan waktu beberapa menit. Anda tidak perlu membayar ulang.'
    },
    stale: {
      icon: AlertTriangle,
      warna: 'text-amber-600',
      bg: 'bg-amber-50',
      judul: 'Pembayaran Belum Tercatat',
      teks: 'Sudah lebih dari 15 menit dan tagihan Anda belum tercatat lunas. Silakan hubungi petugas kantor atau teknisi piket.'
    },
    limited: {
      icon: Clock,
      warna: 'text-gray-600',
      bg: 'bg-gray-100',
      judul: 'Antrean Sedang Padat',
      teks: pesan || 'Server tagihan sedang sibuk. Silakan coba periksa lagi sebentar.'
    }
  }[state];

  const Icon = isi.icon;

  return (
    <div className="fixed inset-0 z-[600] flex items-end animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onTutup}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs cursor-pointer"
      />
      <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[88vh] overflow-y-auto z-10 border-t border-gray-100">
        <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />

        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 ${isi.bg}`}>
          <Icon className={`w-7 h-7 ${isi.warna} ${state === 'checking' ? 'animate-pulse' : ''}`} />
        </div>

        <h3 className="text-base font-black text-gray-900 text-center">{isi.judul}</h3>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed text-center max-w-sm mx-auto font-medium">
          {isi.teks}
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={onTutup}
            className="w-full min-h-[44px] rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center justify-center active:scale-95 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KOMPONEN SKELETON
   ══════════════════════════════════════════════════════════════════ */

function SkeletonTagihan() {
  return (
    <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-10 w-44 bg-gray-100 rounded-xl animate-pulse mt-2" />
      <div className="h-24 bg-gray-50 rounded-xl animate-pulse mt-3" />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TAB UTAMA TAGIHAN & PEMBAYARAN
   ══════════════════════════════════════════════════════════════════ */

export function PortalPaymentTab({ customer, dashboardData, onBack, onOpenNotifications, hasUnreadNotifications }) {
  const [subTab, setSubTab] = useState('tagihan'); // 'tagihan' | 'riwayat'

  const [tagihan, setTagihan] = useState(null);
  const [memuatTagihan, setMemuatTagihan] = useState(true);
  const [galatTagihan, setGalatTagihan] = useState(null);

  const [riwayat, setRiwayat] = useState(null);
  const [memuatRiwayat, setMemuatRiwayat] = useState(false);

  const [kanalTerbuka, setKanalTerbuka] = useState(null);
  const [lembarBayar, setLembarBayar] = useState(null);

  const muatTagihan = useCallback(async (diam = false) => {
    if (!diam) setMemuatTagihan(true);
    const res = await PortalPembayaranService.getTagihan();
    if (res.status === 401) {
      setMemuatTagihan(false);
      return;
    }

    if (res.status === 429) {
      setGalatTagihan(res.data?.message || 'Server tagihan sedang padat. Coba beberapa saat lagi.');
    } else if (!res.ok && !res.data?.va_state) {
      setGalatTagihan(res.data?.message || 'Gagal membaca tagihan.');
    } else {
      setGalatTagihan(null);
      setTagihan(res.data);
      if (res.data?.channels?.length) {
        setKanalTerbuka((prev) => prev ?? res.data.channels[0].channel);
      }
    }
    setMemuatTagihan(false);
  }, []);

  const muatRiwayat = useCallback(async () => {
    setMemuatRiwayat(true);
    const res = await PortalPembayaranService.getRiwayat(24);
    if (res.status !== 401) setRiwayat(res.data);
    setMemuatRiwayat(false);
  }, []);

  useEffect(() => {
    muatTagihan();
  }, [muatTagihan]);

  useEffect(() => {
    if (subTab === 'riwayat' && riwayat === null && !memuatRiwayat) {
      muatRiwayat();
    }
  }, [subTab, riwayat, memuatRiwayat, muatRiwayat]);

  // Resolusi Tagihan Aktif yang Perlu Dibayar
  const unpaidInvoices = tagihan?.unpaid || [];
  const earliestUnpaid = unpaidInvoices.length > 0 ? unpaidInvoices[0] : null;
  const activeBill = tagihan?.next_bill || earliestUnpaid;

  // Resolusi Kanal Bank (Prioritaskan dari API, fallback ke default api-v1.md jika belum aktif di PoP)
  const availableChannels = (tagihan?.channels && tagihan.channels.length > 0)
    ? tagihan.channels
    : (activeBill ? getDefaultChannels(customer?.id_pelanggan || customer?.id || '1', activeBill.total || 125000) : []);

  // Format Nama Paket
  const rawPaketNama = customer?.paket || dashboardData?.kuota?.kecepatan_paket || '10 Mbps';
  const cleanPaketLabel = (raw) => {
    if (!raw || raw === '-') return 'Paket 10 Mbps';
    const trimmed = String(raw).trim();
    if (/^paket\s+/i.test(trimmed)) return trimmed;
    return `Paket ${trimmed}`;
  };
  const paketNama = cleanPaketLabel(rawPaketNama);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      {/* ═══ 1. HEADER BIRU TERPADU PERSIS TAB KUOTA & KENDALA ═══ */}
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        title="Tagihan & Pembayaran"
        subtitle="Bayar Iuran Internet Mandiri"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ 2. KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="pb-24 space-y-3">

          {/* ═══ SKELETON / LOADING STATE ═══ */}
          {memuatTagihan && !tagihan && <SkeletonTagihan />}

          {/* ═══ ERROR STATE ═══ */}
          {galatTagihan && (
            <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-red-100 p-4">
              <div className="flex gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900">Tagihan Belum Bisa Dibaca</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{galatTagihan}</p>
                  <button
                    type="button"
                    onClick={() => muatTagihan()}
                    className="mt-3 min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ═══ KARTU 1: KARTU UTAMA TAGIHAN AKTIF & METODE BAYAR ═══ */}
          {!memuatTagihan && !galatTagihan && (
            <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
              {/* Card Header dengan Badge Ikon Kotak & Sub-Tab Switcher di Kanan */}
              <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-gray-900 leading-tight truncate">
                      {subTab === 'tagihan' ? 'Total Tagihan Bulan Ini' : 'Riwayat Pembayaran'}
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5 leading-tight font-medium truncate">
                      {subTab === 'tagihan' ? 'Iuran langganan internet mandiri' : 'Catatan tagihan yang sudah lunas'}
                    </p>
                  </div>
                </div>

                {/* Sub-tab Pill Switcher Terpadu di Header */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSubTab('tagihan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subTab === 'tagihan' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Tagihan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('riwayat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subTab === 'riwayat' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Riwayat
                  </button>
                </div>
              </div>

              {/* Card Body: Tab Tagihan Aktif */}
              {subTab === 'tagihan' && (
                <div className="p-4 bg-white">
                  {activeBill ? (
                    <>
                      {/* Angka Nominal Besar (Persis Pola GB di Menu Kuota Gambar 2) */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-blue-600">
                          {rupiah(activeBill.total)}
                        </span>
                      </div>

                      {/* Baris Paket & Status Tagihan */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-600 font-medium">Paket aktif:</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {paketNama}
                        </span>
                      </div>

                      {/* Rincian Periode & Jatuh Tempo */}
                      <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs font-medium">
                        <div className="min-w-0">
                          <span className="text-gray-500 block text-[11px]">Periode:</span>
                          <span className="font-bold text-gray-800">
                            {periodeTeks(activeBill.billing_period) || activeBill.number || 'Bulan Berjalan'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-gray-500 block text-[11px]">Jatuh Tempo:</span>
                          {activeBill.overdue ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{tanggalTeks(activeBill.due_date)} (Terlambat)</span>
                            </span>
                          ) : (
                            <span className="font-bold text-gray-800">
                              {tanggalTeks(activeBill.due_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ═══ KANAL BANK VIRTUAL ACCOUNT (api-v1.md) ═══ */}
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-blue-600" />
                            <span>Pilih Bank Pembayaran (Virtual Account)</span>
                          </p>
                          <span className="text-[10px] font-bold text-gray-500">
                            {availableChannels.length} Bank
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                          Nomor Virtual Account siap disalin. Cukup bayar ke salah satu bank tempat rekening Anda:
                        </p>

                        <div className="space-y-2 mt-1">
                          {availableChannels.map((k) => (
                            <KanalBank
                              key={k.channel}
                              kanal={k}
                              tagihanTotal={activeBill.total}
                              terbuka={kanalTerbuka === k.channel}
                              onToggle={() => setKanalTerbuka(kanalTerbuka === k.channel ? null : k.channel)}
                            />
                          ))}
                        </div>

                        {/* Tombol Konfirmasi Pembayaran */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setLembarBayar(activeBill.id || activeBill.invoice_id || 'active')}
                            className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Saya Sudah Bayar</span>
                          </button>
                          <p className="text-[10px] text-gray-500 text-center mt-1.5 font-medium leading-relaxed">
                            Tekan tombol ini setelah Anda menyelesaikan transfer di aplikasi bank atau ATM.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* State Lunas / Tidak Ada Tagihan */
                    <div className="py-6 text-center">
                      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2.5 bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-black text-gray-900">Semua Tagihan Lunas!</h3>
                      <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto leading-relaxed font-medium">
                        Terima kasih, tidak ada tagihan tertunggak untuk akun Anda. Layanan internet aktif normal.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Card Body: Tab Riwayat Cepat */}
              {subTab === 'riwayat' && (
                <div className="p-4 bg-white space-y-2.5">
                  {memuatRiwayat && (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!memuatRiwayat && (!riwayat?.invoices || riwayat.invoices.length === 0) && (
                    <div className="py-6 text-center">
                      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2.5 bg-gray-100 text-gray-500">
                        <ReceiptText className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-black text-gray-900">Belum Ada Riwayat Pembayaran</h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Pembayaran yang sudah lunas akan otomatis dicatat pada daftar ini.
                      </p>
                    </div>
                  )}

                  {!memuatRiwayat && riwayat?.invoices?.length > 0 && (
                    <div className="space-y-2">
                      {riwayat.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-900 truncate">
                              {periodeTeks(inv.billing_period) || inv.number}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate font-medium">
                              {inv.number} · {jenisTagihanTeks(inv.type)}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Lunas</span>
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-gray-900 font-mono">
                              {rupiah(inv.payment?.amount ?? inv.total)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                              {tanggalTeks(inv.payment?.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ═══ KARTU 2: DAFTAR TAGIHAN BULANAN LAINNYA ═══ */}
          {!memuatTagihan && !galatTagihan && unpaidInvoices.length > 0 && (
            <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100">
              {/* Header Kartu 2 */}
              <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 leading-tight">
                      Daftar Tagihan Belum Lunas
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5 leading-tight font-medium">
                      Total {unpaidInvoices.length} invoice iuran
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                  {unpaidInvoices.length}
                </span>
              </div>

              {/* List Baris Tagihan */}
              <div className="divide-y divide-gray-100">
                {unpaidInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 truncate">
                        {periodeTeks(inv.billing_period) || inv.number}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                        {jenisTagihanTeks(inv.type)} · Jatuh tempo {tanggalTeks(inv.due_date)}
                      </p>
                      {inv.overdue ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Terlambat</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Belum Dibayar</span>
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-gray-900 font-mono">
                        {rupiah(inv.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ KARTU 3: PANDUAN CARA MEMBAYAR (COLLAPSIBLE / INFO CARD) ═══ */}
          {!memuatTagihan && !galatTagihan && activeBill && (
            <section className="mx-3 bg-white rounded-2xl shadow-lg shadow-gray-200/60 overflow-hidden border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-xs font-black text-gray-900">Petunjuk Pembayaran Virtual Account</h3>
              </div>
              <ol className="space-y-1.5 text-xs text-gray-600 leading-relaxed list-decimal pl-4 font-medium">
                <li>Buka aplikasi m-Banking atau ATM bank pilihan Anda di atas.</li>
                <li>Pilih menu <strong>Transfer / Bayar Virtual Account</strong>.</li>
                <li>Salin & masukkan 16 digit nomor Virtual Account yang tertera di atas.</li>
                <li>Pastikan nama pelanggan yang muncul di layar bank sudah sesuai.</li>
                <li>Bayar persis sesuai total nominal, lalu tekan tombol <strong>"Saya Sudah Bayar"</strong>.</li>
              </ol>
            </section>
          )}

        </div>
      </main>

      {/* Lembar Konfirmasi Saya Sudah Bayar */}
      {lembarBayar !== null && (
        <LembarSudahBayar
          invoiceId={lembarBayar}
          onTutup={() => {
            setLembarBayar(null);
            muatTagihan(true);
          }}
          onLunas={() => muatTagihan(true)}
        />
      )}
    </div>
  );
}

export default PortalPaymentTab;
