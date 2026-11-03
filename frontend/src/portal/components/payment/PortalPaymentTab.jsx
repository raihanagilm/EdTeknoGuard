import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Landmark, Copy, Check, AlertTriangle, Clock, CheckCircle2, ChevronDown,
  FileText, ShieldCheck, Info, RefreshCw, Banknote, ArrowLeftRight, Wifi,
  ReceiptText, UserCog, XCircle, Search
} from 'lucide-react';
import { PortalHeader } from '../layout/PortalHeader';
import { PortalPembayaranService } from '../../services/portalApi';

/* ══════════════════════════════════════════════════════════════════
   HELPER FORMAT
   Nominal datang dari API sebagai angka; format Rupiah dikerjakan di sini.
   amount_to_pay DILARANG dihitung ulang, hanya diformat.
   ══════════════════════════════════════════════════════════════════ */

const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '-' : `Rp ${Number(n).toLocaleString('id-ID')}`;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

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

/* ══════════════════════════════════════════════════════════════════
   KOMPONEN KECIL
   ══════════════════════════════════════════════════════════════════ */

function KartuPesan({ icon: Icon, nada = 'netral', judul, children }) {
  const nadaKelas = {
    netral: 'text-slate-500',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-emerald-600',
  }[nada] || 'text-slate-500';

  return (
    <div className="mx-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 bg-slate-100">
        <Icon className={`w-7 h-7 ${nadaKelas}`} />
      </div>
      <h3 className="text-sm font-extrabold text-slate-800">{judul}</h3>
      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">{children}</p>
    </div>
  );
}

function BarisNominal({ label, nilai, tebal = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${tebal ? 'font-extrabold text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`tabular-nums ${tebal ? 'text-sm font-extrabold text-blue-700' : 'text-xs font-semibold text-slate-800'}`}>
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
    // Yang disalin WAJIB 16 digit bersih tanpa spasi, bukan versi tampilan.
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
      try { document.execCommand('copy'); } catch { /* abaikan */ }
      document.body.removeChild(ta);
    }
    setTersalin(true);
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => setTersalin(false), 1800);
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition ${terbuka ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[52px] text-left cursor-pointer active:bg-slate-50"
        aria-expanded={terbuka}
      >
        <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-slate-600" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-extrabold text-slate-800 truncate">{kanal.bank}</span>
          <span className="block text-[11px] text-slate-500">
            {terbuka ? 'Nomor Virtual Account di bawah' : 'Ketuk untuk melihat nomor'}
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${terbuka ? 'rotate-180' : ''}`} />
      </button>

      {terbuka && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-blue-100 pt-3">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Nomor Virtual Account
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-[15px] font-extrabold text-slate-900 tracking-wide tabular-nums break-all">
                {vaTampil(kanal.va_number)}
              </span>
              <button
                type="button"
                onClick={salinNomor}
                className="shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-blue-600 text-white flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition cursor-pointer"
                title="Salin nomor Virtual Account"
              >
                {tersalin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{tersalin ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5">
            {/* Nilai tagihan diambil dari next_bill.total, bukan hasil pengurangan
                amount_to_pay: nominal dari API ditampilkan apa adanya. */}
            <BarisNominal label="Tagihan" nilai={rupiah(tagihanTotal)} />
            <BarisNominal label="Biaya admin bank" nilai={rupiah(kanal.admin_fee || 0)} />
            <div className="pt-1.5 border-t border-slate-200">
              <BarisNominal label="Total yang dibayar" nilai={rupiah(kanal.amount_to_pay)} tebal />
            </div>
          </div>

          <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Bayar <strong>persis {rupiah(kanal.amount_to_pay)}</strong>. Nominal lain akan ditolak bank.
              Periksa juga nama Anda di layar bank sebelum melanjutkan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LEMBAR "SAYA SUDAH BAYAR"
   Membaca ulang tiap 10 detik, paling lama 2 menit, lalu BERHENTI.
   Belum lunas sesudah 2 menit = sedang diproses, bukan gagal.
   Ajakan menghubungi petugas baru muncul sesudah 15 menit.
   ══════════════════════════════════════════════════════════════════ */

const BATAS_POLLING_MS = 120000;   // 2 menit
const JEDA_POLLING_MS = 10000;     // 10 detik
const BATAS_PROSES_MS = 900000;    // 15 menit

function LembarSudahBayar({ invoiceId, onTutup, onLunas }) {
  const [state, setState] = useState('checking'); // checking | success | pending | stale | limited
  const [sisaDetik, setSisaDetik] = useState(Math.round(BATAS_POLLING_MS / 1000));
  const [hasil, setHasil] = useState(null);
  const [pesan, setPesan] = useState('');

  const mulaiRef = useRef(Date.now());
  const timerRef = useRef(null);
  const hidupRef = useRef(true);

  useEffect(() => () => { hidupRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const periksa = useCallback(async () => {
    const res = await PortalPembayaranService.periksaPembayaran(invoiceId);
    if (!hidupRef.current) return;

    // 429: berhenti total, tunggu Retry-After.
    if (res.status === 429) {
      setPesan(res.data?.message || 'Permintaan sedang padat.');
      setState('limited');
      return;
    }

    if (res.ok && res.data?.settled) {
      setHasil(res.data);
      setState('success');
      onLunas?.(res.data);
      return;
    }

    const lewat = Date.now() - mulaiRef.current;
    if (lewat >= BATAS_POLLING_MS) {
      // Pembacaan otomatis berhenti di sini dan tidak berlanjut di latar belakang.
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

  const periksaLagi = () => {
    const lewat = Date.now() - mulaiRef.current;
    if (lewat >= BATAS_PROSES_MS) {
      setState('checking');
      // Sesudah 15 menit, satu kali pemeriksaan saja tanpa polling baru.
      PortalPembayaranService.periksaPembayaran(invoiceId).then((res) => {
        if (!hidupRef.current) return;
        if (res.status === 429) { setPesan(res.data?.message || ''); setState('limited'); return; }
        if (res.ok && res.data?.settled) { setHasil(res.data); setState('success'); onLunas?.(res.data); return; }
        setState('stale');
      });
      return;
    }
    setState('checking');
    periksa();
  };

  const isi = {
    checking: {
      icon: Search, warna: 'text-blue-600', bg: 'bg-blue-50',
      judul: 'Memeriksa pembayaran Anda',
      teks: `Mohon tunggu, kami sedang memastikan pembayaran Anda sudah tercatat. Pemeriksaan berhenti otomatis dalam ${sisaDetik} detik.`,
    },
    success: {
      icon: CheckCircle2, warna: 'text-emerald-600', bg: 'bg-emerald-50',
      judul: 'Pembayaran diterima',
      teks: 'Terima kasih. Tagihan Anda sudah tercatat lunas.',
    },
    pending: {
      icon: Clock, warna: 'text-amber-600', bg: 'bg-amber-50',
      judul: 'Pembayaran sedang diproses',
      teks: 'Pembayaran Anda sudah masuk ke bank, pencatatannya bisa memerlukan waktu sampai 15 menit. Anda tidak perlu membayar lagi.',
    },
    stale: {
      icon: AlertTriangle, warna: 'text-amber-600', bg: 'bg-amber-50',
      judul: 'Pembayaran belum tercatat',
      teks: 'Sudah lebih dari 15 menit dan tagihan Anda belum tercatat lunas. Silakan hubungi petugas kantor dengan menyertakan bukti pembayaran Anda.',
    },
    limited: {
      icon: Clock, warna: 'text-slate-600', bg: 'bg-slate-100',
      judul: 'Antrean sedang padat',
      teks: pesan || 'Server tagihan sedang sibuk. Silakan coba periksa lagi sebentar.',
    },
  }[state];

  const Icon = isi.icon;

  return (
    <div className="fixed inset-0 z-[600] flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onTutup}
        className="absolute inset-0 bg-slate-900/50 cursor-pointer"
      />
      <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-5" />

        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3.5 ${isi.bg}`}>
          <Icon className={`w-8 h-8 ${isi.warna} ${state === 'checking' ? 'animate-pulse' : ''}`} />
        </div>

        <h3 className="text-base font-extrabold text-slate-900 text-center">{isi.judul}</h3>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed text-center max-w-sm mx-auto">{isi.teks}</p>

        {state === 'checking' && (
          <div className="mt-4 space-y-2">
            <div className="h-10 rounded-xl bg-slate-200/70 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-200/70 animate-pulse" />
          </div>
        )}

        {state === 'success' && hasil?.settled_invoice && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-extrabold text-emerald-900">
                {hasil.settled_invoice.number}
              </span>
            </div>
            <BarisNominal label="Periode" nilai={periodeTeks(hasil.settled_invoice.billing_period) || '-'} />
            <BarisNominal label="Jumlah" nilai={rupiah(hasil.settled_invoice.total)} tebal />
          </div>
        )}

        {/* Lunas belum berarti internet langsung menyala: entri isolir di router
            dibuka petugas, bukan oleh pelunasan ini. */}
        {state === 'success' && hasil?.router_isolated === true && (
          <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <Wifi className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Koneksi internet Anda <strong>sedang menunggu dibuka petugas</strong>. Pembayaran sudah
              diterima, pengaktifan jaringan menyusul. Hubungi kantor bila belum menyala dalam waktu lama.
            </p>
          </div>
        )}

        {state === 'stale' && (
          <div className="mt-4 flex gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <UserCog className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Siapkan bukti transfer atau struk dari aplikasi bank Anda, lalu tunjukkan kepada petugas.
              Pembayaran Anda tidak hilang.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {state !== 'checking' && state !== 'success' && (
            <button
              type="button"
              onClick={periksaLagi}
              className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Periksa Lagi</span>
            </button>
          )}
          <button
            type="button"
            onClick={onTutup}
            className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-extrabold active:scale-[0.98] transition cursor-pointer"
          >
            {state === 'success' ? 'Selesai' : 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON SEMANTIK
   Bentuknya mencerminkan kartu bayar dan daftar kanal agar tidak ada
   lonjakan tata letak. Dilarang memakai spinner layar penuh.
   ══════════════════════════════════════════════════════════════════ */

function SkeletonTagihan() {
  return (
    <div className="mx-3 space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="h-3 w-32 rounded bg-slate-200/70 animate-pulse" />
        <div className="h-7 w-40 rounded bg-slate-200/70 animate-pulse" />
        <div className="h-3 w-28 rounded bg-slate-200/70 animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <div className="h-3 w-24 rounded bg-slate-200/70 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[52px] rounded-xl bg-slate-200/70 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TAB UTAMA
   ══════════════════════════════════════════════════════════════════ */

export function PortalPaymentTab({ customer, dashboardData, onBack, onOpenNotifications, hasUnreadNotifications }) {
  const [subTab, setSubTab] = useState('tagihan'); // tagihan | riwayat

  const [tagihan, setTagihan] = useState(null);
  const [memuatTagihan, setMemuatTagihan] = useState(true);
  const [galatTagihan, setGalatTagihan] = useState(null);

  const [riwayat, setRiwayat] = useState(null);
  const [memuatRiwayat, setMemuatRiwayat] = useState(false);

  const [kanalTerbuka, setKanalTerbuka] = useState(null);
  const [lembarBayar, setLembarBayar] = useState(null);

  /* Tagihan dibaca LIVE tiap halaman dibuka. Dilarang ditampilkan dari salinan
     lama: pelanggan yang baru membayar di kasir akan tetap melihat belum bayar.
     Data yang sudah ada tetap ditampilkan selama pembacaan ulang berjalan
     (silent refresh), jadi skeleton hanya muncul pada pemuatan pertama. */
  const muatTagihan = useCallback(async (diam = false) => {
    if (!diam) setMemuatTagihan(true);
    const res = await PortalPembayaranService.getTagihan();
    if (res.status === 401) { setMemuatTagihan(false); return; }

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

  useEffect(() => { muatTagihan(); }, [muatTagihan]);

  useEffect(() => {
    if (subTab === 'riwayat' && riwayat === null && !memuatRiwayat) muatRiwayat();
  }, [subTab, riwayat, memuatRiwayat, muatRiwayat]);

  const nextBill = tagihan?.next_bill;
  const vaState = tagihan?.va_state;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f3f4f6] text-[#111827]">
      <PortalHeader
        showNotificationDot={hasUnreadNotifications}
        onNotificationClick={onOpenNotifications}
        title="Tagihan & Pembayaran"
        subtitle="Bayar Iuran Internet Mandiri"
        dashboardData={dashboardData}
        customer={customer}
      />

      <main className="scroll-area -mt-3 flex-1 overflow-y-auto">
        <div className="pb-24 space-y-3">

          {/* ═══ PEMILIH SUB-TAB ═══ */}
          <div className="mx-3 bg-white rounded-xl border border-slate-200 p-1 flex gap-1 shadow-sm">
            {[
              { key: 'tagihan', label: 'Tagihan', icon: ReceiptText },
              { key: 'riwayat', label: 'Riwayat', icon: Clock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key)}
                className={`flex-1 min-h-[44px] rounded-lg text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  subTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 active:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ══════════════ SUB-TAB TAGIHAN ══════════════ */}
          {subTab === 'tagihan' && (
            <>
              {memuatTagihan && !tagihan && <SkeletonTagihan />}

              {galatTagihan && (
                <div className="mx-3 rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex gap-2.5">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-slate-800">Tagihan belum bisa dibaca</p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{galatTagihan}</p>
                      <button
                        type="button"
                        onClick={() => muatTagihan()}
                        className="mt-3 min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 active:scale-[0.98] transition cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!memuatTagihan && !galatTagihan && tagihan && (
                <>
                  {/* ─── KARTU BAYAR (next_bill) ─── */}
                  {vaState === 'payable' && nextBill && (
                    <>
                      <div className="mx-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3.5 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-500 truncate">
                                  {nextBill.number}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {jenisTagihanTeks(nextBill.type)}
                                {nextBill.billing_period ? ` · ${periodeTeks(nextBill.billing_period)}` : ''}
                              </p>
                            </div>
                            {nextBill.overdue ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Terlambat</span>
                              </span>
                            ) : (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                                <Clock className="w-3 h-3" />
                                <span>Belum Dibayar</span>
                              </span>
                            )}
                          </div>

                          <p className="mt-2.5 text-2xl font-black text-slate-900 tabular-nums">
                            {rupiah(nextBill.total)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Jatuh tempo {tanggalTeks(nextBill.due_date)}
                          </p>
                        </div>

                        {/* ─── KANAL BANK ─── */}
                        <div className="px-3.5 py-3.5 space-y-2">
                          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                            Pilih Bank Pembayaran
                          </p>
                          <p className="text-[11px] text-slate-600 leading-relaxed -mt-1">
                            Cukup bayar ke salah satu bank, sebaiknya bank tempat rekening Anda.
                          </p>
                          {tagihan.channels.map((k) => (
                            <KanalBank
                              key={k.channel}
                              kanal={k}
                              tagihanTotal={nextBill.total}
                              terbuka={kanalTerbuka === k.channel}
                              onToggle={() => setKanalTerbuka(kanalTerbuka === k.channel ? null : k.channel)}
                            />
                          ))}
                        </div>

                        <div className="px-3.5 pb-4">
                          <button
                            type="button"
                            onClick={() => setLembarBayar(nextBill.invoice_id)}
                            className="w-full min-h-[48px] rounded-xl bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Saya Sudah Bayar</span>
                          </button>
                          <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed">
                            Tekan sesudah Anda menyelesaikan pembayaran di aplikasi bank atau ATM.
                          </p>
                        </div>
                      </div>

                      {/* ─── CARA BAYAR ─── */}
                      <div className="mx-3 bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <h3 className="text-sm font-extrabold text-slate-800">Cara Membayar</h3>
                        </div>
                        <ol className="space-y-2 text-xs text-slate-700 leading-relaxed list-decimal pl-4">
                          <li>Salin nomor Virtual Account bank pilihan Anda di atas.</li>
                          <li>Buka aplikasi bank atau ATM, pilih menu pembayaran Virtual Account.</li>
                          <li>Masukkan nomor tersebut, lalu periksa layar konfirmasi bank.</li>
                          <li>
                            <strong>Pastikan nama yang muncul adalah nama Anda.</strong> Bila bukan,
                            jangan dilanjutkan dan hubungi petugas kantor.
                          </li>
                          <li>Bayar sesuai nominal yang ditampilkan bank, lalu tekan "Saya Sudah Bayar".</li>
                        </ol>
                      </div>
                    </>
                  )}

                  {/* ─── KEADAAN TANPA KARTU BAYAR ─── */}
                  {vaState === 'not_linked' && (
                    <KartuPesan icon={UserCog} judul="Data langganan belum tertaut">
                      {tagihan.message}
                    </KartuPesan>
                  )}

                  {vaState === 'inactive' && (
                    <KartuPesan icon={Banknote} judul="Pembayaran lewat petugas">
                      {tagihan.message}
                    </KartuPesan>
                  )}

                  {vaState === 'not_issued' && (
                    <KartuPesan icon={Landmark} nada="warning" judul="Nomor Virtual Account belum terbit">
                      {tagihan.message}
                    </KartuPesan>
                  )}

                  {vaState === 'no_bill' && (
                    <KartuPesan icon={CheckCircle2} nada="success" judul="Tidak ada tagihan">
                      {tagihan.message}
                    </KartuPesan>
                  )}

                  {/* ─── TAGIHAN BELUM LUNAS LAINNYA ─── */}
                  {tagihan.other_unpaid?.length > 0 && (
                    <div className="mx-3 bg-white rounded-2xl border border-slate-200 p-4">
                      <h3 className="text-sm font-extrabold text-slate-800">
                        Tagihan Belum Lunas Lainnya
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Pembayaran selalu dimulai dari tagihan paling lama. Tagihan di bawah bisa
                        dibayar sesudah tagihan di atas lunas.
                      </p>
                      <div className="mt-3 space-y-2">
                        {tagihan.other_unpaid.map((inv) => (
                          <div
                            key={inv.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-700 truncate">
                                {periodeTeks(inv.billing_period) || inv.number}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                {inv.overdue ? (
                                  <><AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />Terlambat</>
                                ) : (
                                  <><Clock className="w-3 h-3 text-slate-400 shrink-0" />Menunggu</>
                                )}
                                <span className="text-slate-400">·</span>
                                {jenisTagihanTeks(inv.type)}
                              </p>
                            </div>
                            <span className="text-xs font-extrabold text-slate-600 tabular-nums shrink-0">
                              {rupiah(inv.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── TAGIHAN TANPA KARTU BAYAR (VA mati / belum terbit) ─── */}
                  {(vaState === 'inactive' || vaState === 'not_issued') && tagihan.unpaid?.length > 0 && (
                    <div className="mx-3 bg-white rounded-2xl border border-slate-200 p-4">
                      <h3 className="text-sm font-extrabold text-slate-800">Tagihan Anda</h3>
                      <div className="mt-3 space-y-2">
                        {tagihan.unpaid.map((inv) => (
                          <div key={inv.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-800 truncate">
                                  {periodeTeks(inv.billing_period) || inv.number}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {jenisTagihanTeks(inv.type)} · Jatuh tempo {tanggalTeks(inv.due_date)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                                  {rupiah(inv.total)}
                                </p>
                                {inv.overdue && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold text-amber-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Terlambat</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══════════════ SUB-TAB RIWAYAT ══════════════ */}
          {subTab === 'riwayat' && (
            <>
              {memuatRiwayat && !riwayat && (
                <div className="mx-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-200/70 animate-pulse" />
                  ))}
                </div>
              )}

              {!memuatRiwayat && riwayat && !riwayat.linked && (
                <KartuPesan icon={UserCog} judul="Riwayat belum tersedia">
                  Data langganan Anda belum tertaut ke sistem tagihan. Hubungi petugas kantor.
                </KartuPesan>
              )}

              {!memuatRiwayat && riwayat?.linked && riwayat.invoices?.length === 0 && (
                <KartuPesan icon={ReceiptText} judul="Belum ada riwayat">
                  Pembayaran yang sudah lunas akan tercatat di sini.
                </KartuPesan>
              )}

              {!memuatRiwayat && riwayat?.invoices?.length > 0 && (
                <>
                  <div className="mx-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                    <h3 className="text-sm font-extrabold text-slate-800">Riwayat Pembayaran</h3>
                    {riwayat.invoices.map((inv) => {
                      const metode = inv.payment?.method;
                      const MetodeIcon = metode === 'tunai' ? Banknote
                        : metode === 'transfer' ? ArrowLeftRight
                        : metode === 'gateway' ? Landmark
                        : ReceiptText;
                      return (
                        <div key={inv.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-800 truncate">
                                {periodeTeks(inv.billing_period) || inv.number}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {inv.number} · {jenisTagihanTeks(inv.type)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Lunas</span>
                                </span>
                                {inv.payment && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                                    <MetodeIcon className="w-3 h-3" />
                                    <span>{inv.payment.method_label}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                                {rupiah(inv.payment?.amount ?? inv.total)}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {tanggalTeks(inv.payment?.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mx-4 text-[11px] text-slate-500 leading-relaxed">
                    Jumlah pada riwayat adalah nilai tagihan, belum termasuk biaya admin bank
                    untuk pembayaran lewat Virtual Account.
                  </p>
                </>
              )}
            </>
          )}

        </div>
      </main>

      {lembarBayar !== null && (
        <LembarSudahBayar
          invoiceId={lembarBayar}
          onTutup={() => { setLembarBayar(null); muatTagihan(true); }}
          onLunas={() => muatTagihan(true)}
        />
      )}
    </div>
  );
}

export default PortalPaymentTab;
