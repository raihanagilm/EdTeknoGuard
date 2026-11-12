import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
  RefreshCw,
  ReceiptText,
  XCircle
} from 'lucide-react';
import { PortalHeader } from '../layout/PortalHeader';
import { PortalPembayaranService } from '../../services/portalApi';
import { PaymentKanalBank } from './PaymentKanalBank';
import { PaymentRiwayatList } from './PaymentRiwayatList';
import {
  rupiah,
  periodeTeks,
  tanggalTeks,
  jenisTagihanTeks,
  getDefaultChannels
} from './paymentUtils';

/* ══════════════════════════════════════════════════════════════════
   CACHE IN-MEMORY LEVEL MODUL (SWR PATTERN - 0ms INSTANT MOUNT)
   ══════════════════════════════════════════════════════════════════ */
let _cachedTagihanData = null;
let _cachedRiwayatData = null;
let _cachedKanalTerbuka = null;

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
   TAB UTAMA TAGIHAN & PEMBAYARAN (SHELL MODULAR)
   ══════════════════════════════════════════════════════════════════ */
export function PortalPaymentTab({
  customer,
  dashboardData,
  onBack,
  onOpenNotifications,
  hasUnreadNotifications,
  initialSubTab = 'tagihan'
}) {
  const [subTab, setSubTab] = useState(initialSubTab); // 'tagihan' | 'riwayat'

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Instant SWR state: buka seketika dari cache jika sudah pernah dimuat
  const [tagihan, setTagihan] = useState(() => _cachedTagihanData);
  const [memuatTagihan, setMemuatTagihan] = useState(() => !_cachedTagihanData);
  const [galatTagihan, setGalatTagihan] = useState(null);

  const [riwayat, setRiwayat] = useState(() => _cachedRiwayatData);
  const [memuatRiwayat, setMemuatRiwayat] = useState(false);

  const [kanalTerbuka, setKanalTerbuka] = useState(() => _cachedKanalTerbuka);

  const muatTagihan = useCallback(async (diam = false) => {
    if (!diam) setMemuatTagihan(true);
    const res = await PortalPembayaranService.getTagihan();
    if (res.status === 401) {
      setMemuatTagihan(false);
      return;
    }

    if (res.status === 429) {
      if (!_cachedTagihanData) {
        setGalatTagihan(res.data?.message || 'Server tagihan sedang padat. Coba beberapa saat lagi.');
      }
    } else if (!res.ok && !res.data?.va_state) {
      if (!_cachedTagihanData) {
        setGalatTagihan(res.data?.message || 'Gagal membaca tagihan.');
      }
    } else {
      setGalatTagihan(null);
      setTagihan(res.data);
      _cachedTagihanData = res.data;
      if (res.data?.channels?.length) {
        setKanalTerbuka((prev) => {
          const next = prev ?? res.data.channels[0].channel;
          _cachedKanalTerbuka = next;
          return next;
        });
      }
    }
    setMemuatTagihan(false);
  }, []);

  const muatRiwayat = useCallback(async (diam = false) => {
    if (!diam && !_cachedRiwayatData) setMemuatRiwayat(true);
    const res = await PortalPembayaranService.getRiwayat(24);
    if (res.status !== 401 && res.data) {
      setRiwayat(res.data);
      _cachedRiwayatData = res.data;
    }
    setMemuatRiwayat(false);
  }, []);

  useEffect(() => {
    // SWR Pattern: bila sudah ada cache, lakukan pembaruan senyap (silent refresh) tanpa jeda loading
    const isSilent = Boolean(_cachedTagihanData);
    muatTagihan(isSilent);
  }, [muatTagihan]);

  // Auto-refresh senyap saat pengguna kembali membuka browser/tab setelah transfer di m-Banking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        muatTagihan(true);
        if (subTab === 'riwayat') muatRiwayat(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [muatTagihan, muatRiwayat, subTab]);

  useEffect(() => {
    if (subTab === 'riwayat') {
      const isSilent = Boolean(_cachedRiwayatData);
      muatRiwayat(isSilent);
    }
  }, [subTab, muatRiwayat]);

  // Resolusi nama paket
  const rawPaket = tagihan?.package_speed || dashboardData?.kuota?.kecepatan_paket || customer?.paket || '-';
  const paketNama = /paket/i.test(String(rawPaket)) ? rawPaket : `Paket ${rawPaket}`;

  const unpaidInvoices = tagihan?.unpaid || tagihan?.unpaid_invoices || [];

  // Urutkan tagihan belum lunas dari yang paling lama/jatuh tempo awal (FIFO)
  const sortedUnpaidInvoices = [...unpaidInvoices].sort((a, b) => {
    const periodA = String(a.due_date || a.billing_period || '');
    const periodB = String(b.due_date || b.billing_period || '');
    const cmp = periodA.localeCompare(periodB);
    return cmp !== 0 ? cmp : (Number(a.id || 0) - Number(b.id || 0));
  });

  // Resolusi tagihan aktif: prioritaskan next_bill, fallback ke invoice belum lunas paling lama (FIFO)
  const activeBill = tagihan?.next_bill || (sortedUnpaidInvoices.length > 0 ? sortedUnpaidInvoices[0] : null);

  // Tagihan periode berikutnya (yang menunggu antrean setelah tagihan aktif dilunasi)
  const otherUnpaidInvoices = activeBill
    ? sortedUnpaidInvoices.filter((inv) => String(inv.id || inv.invoice_id) !== String(activeBill.id || activeBill.invoice_id))
    : sortedUnpaidInvoices;

  const rawChannels = tagihan?.channels || [];
  const availableChannels = rawChannels.length > 0
    ? rawChannels
    : (activeBill ? getDefaultChannels(customer?.id_pelanggan || '1', activeBill.total || 125000) : []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 relative overflow-hidden select-none">
      {/* ═══ 1. HEADER PORTAL DENGAN GRADASI BIRU RESMI ═══ */}
      <PortalHeader
        onBack={onBack}
        onOpenNotifications={onOpenNotifications}
        hasUnreadNotifications={hasUnreadNotifications}
        title="Tagihan & Pembayaran"
        subtitle="Status & riwayat bayar"
        dashboardData={dashboardData}
        customer={customer}
      />

      {/* ═══ 2. KONTEN DENGAN SCROLL-AREA & NEGATIVE MARGIN (-mt-3) ═══ */}
      <main className="scroll-area -mt-3 flex-1 overflow-y-auto relative z-10">
        <div className="px-3.5 pb-24 space-y-3">

          {/* ═══ SKELETON / LOADING STATE (Hanya pertama kali sebelum cache terisi) ═══ */}
          {memuatTagihan && !tagihan && <SkeletonTagihan />}

          {/* ═══ ERROR STATE ═══ */}
          {galatTagihan && !tagihan && (
            <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-rose-200 p-4">
              <div className="flex gap-2.5">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Tagihan Belum Bisa Dibaca</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{galatTagihan}</p>
                  <button
                    type="button"
                    onClick={() => muatTagihan(false)}
                    className="mt-3 min-h-[40px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ═══ KARTU 1: KARTU UTAMA TAGIHAN AKTIF & METODE BAYAR ═══ */}
          {(!memuatTagihan || tagihan) && !galatTagihan && (
            <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200/90">
              {/* Card Header dengan Switcher Sub-Tab yang Jelas */}
              <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between gap-2.5 bg-slate-50/70">
                <span className="text-xs font-bold text-slate-700">
                  {subTab === 'tagihan' ? 'Rincian Tagihan' : 'Daftar Riwayat Bayar'}
                </span>

                {/* Sub-tab Pill Switcher Terpadu */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSubTab('tagihan')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      subTab === 'tagihan' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tagihan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('riwayat')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      subTab === 'riwayat' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Riwayat
                  </button>
                </div>
              </div>
                    type="button"
                    onClick={() => setSubTab('riwayat')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      subTab === 'riwayat' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      {/* Angka Nominal Besar (Pola Bersih Menu Kuota) */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-blue-600">
                          {rupiah(activeBill.total)}
                        </span>
                      </div>

                      {/* Rincian Tagihan Bersih Ber-divider Tanpa Box Bersarang */}
                      <div className="mt-3 divide-y divide-gray-100 text-xs">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-500 font-medium">Paket aktif</span>
                          <span className="font-bold text-blue-700">{paketNama}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-500 font-medium">Periode tagihan</span>
                          <span className="font-bold text-gray-900">
                            {periodeTeks(activeBill.billing_period) || activeBill.number || 'Bulan Berjalan'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-500 font-medium">Batas jatuh tempo</span>
                          {activeBill.overdue ? (
                            <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{tanggalTeks(activeBill.due_date)} (Terlambat)</span>
                            </span>
                          ) : (
                            <span className="font-bold text-gray-900">{tanggalTeks(activeBill.due_date)}</span>
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
                            <PaymentKanalBank
                              key={k.channel}
                              kanal={k}
                              tagihanTotal={activeBill.total}
                              terbuka={kanalTerbuka === k.channel}
                              onToggle={() => {
                                const nextVal = kanalTerbuka === k.channel ? null : k.channel;
                                setKanalTerbuka(nextVal);
                                _cachedKanalTerbuka = nextVal;
                              }}
                            />
                          ))}
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

              {/* Strip Bantuan Pembayaran (Pola Strip Menu Kuota) */}
              {subTab === 'tagihan' && activeBill && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2.5 bg-blue-50/60">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
                  <p className="text-xs text-gray-700 leading-relaxed font-normal">
                    Transfer via menu <strong className="text-gray-900 font-semibold">Virtual Account</strong> bank pilihan Anda. Pembayaran diverifikasi <strong className="text-gray-900 font-semibold">otomatis</strong> dalam 1–5 menit tanpa perlu kirim konfirmasi manual.
                  </p>
                </div>
              )}

              {/* Card Body: Tab Riwayat Pembayaran (Modular) */}
              {subTab === 'riwayat' && (
                <PaymentRiwayatList
                  riwayat={riwayat}
                  memuatRiwayat={memuatRiwayat}
                />
              )}
            </section>
          )}

          {/* ═══ KARTU 2: DAFTAR TAGIHAN BULANAN LAINNYA (Hanya di Tab Tagihan) ═══ */}
          {subTab === 'tagihan' && (!memuatTagihan || tagihan) && !galatTagihan && otherUnpaidInvoices.length > 0 && (
            <section className="bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200/90">
              {/* Header Kartu 2 */}
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2.5 bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      Tagihan Periode Berikutnya
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight font-medium">
                      {otherUnpaidInvoices.length} invoice menunggu pelunasan tagihan sebelumnya
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-blue-600">
                  {otherUnpaidInvoices.length} invoice
                </span>
              </div>

              {/* List Baris Tagihan */}
              <div className="divide-y divide-slate-100">
                {otherUnpaidInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {periodeTeks(inv.billing_period) || inv.number}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {jenisTagihanTeks(inv.type)} · Jatuh tempo {tanggalTeks(inv.due_date)}
                      </p>
                      {inv.overdue ? (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Terlambat</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Belum Dibayar</span>
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900 font-mono">
                        {rupiah(inv.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default PortalPaymentTab;
