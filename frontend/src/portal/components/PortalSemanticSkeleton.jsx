import React from 'react';

/**
 * PortalSemanticSkeleton
 *
 * Komponen Skeleton Loading Semantik Terpadu untuk TeknoCust (Portal Pelanggan).
 * Meniru struktur visual setiap tab secara presisi (Header, Card, Stat Grid, Action Box)
 * menggunakan efek `animate-pulse` halus agar tidak terjadi Cumulative Layout Shift (CLS).
 *
 * Props:
 * - tab: 'beranda' | 'kendala' | 'wifi' | 'kuota' | 'profil' | 'pembayaran' | 'app' (default: 'beranda')
 */
export function PortalSemanticSkeleton({ tab = 'beranda' }) {
  // Skeleton Khusus Inisialisasi Aplikasi (App Shell)
  if (tab === 'app') {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#f3f4f6] flex flex-col justify-between shadow-2xl relative animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-6 pb-12 rounded-b-[2rem]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/30" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-white/40 rounded-full" />
                <div className="w-32 h-4 bg-white/50 rounded-full" />
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/30" />
          </div>
        </div>

        {/* Content Cards Skeleton */}
        <div className="flex-1 px-4 -mt-6 space-y-4">
          {/* Card 1: Main Status */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-28 h-4 bg-gray-200 rounded-full" />
              <div className="w-16 h-5 bg-emerald-100 rounded-full" />
            </div>
            <div className="h-16 bg-gray-100 rounded-xl" />
          </div>

          {/* Card 2: Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
              <div className="w-14 h-3 bg-gray-200 rounded-full" />
              <div className="w-20 h-6 bg-gray-200 rounded-lg" />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
              <div className="w-14 h-3 bg-gray-200 rounded-full" />
              <div className="w-20 h-6 bg-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Card 3: Quick Action List */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="w-36 h-4 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-12 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Bottom Nav Skeleton */}
        <div className="bg-white border-t border-gray-200/80 px-6 py-3 flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-lg bg-gray-200" />
              <div className="w-10 h-2 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Skeleton Tab Kendala (Pusat Kendala & Keluhan)
  if (tab === 'kendala') {
    return (
      <div className="px-3 pt-1 pb-24 space-y-3 animate-pulse">
        {/* Card Lapor Gangguan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100" />
              <div className="space-y-1.5">
                <div className="w-28 h-4 bg-gray-200 rounded-md" />
                <div className="w-40 h-3 bg-gray-100 rounded-md" />
              </div>
            </div>
            <div className="w-24 h-8 bg-blue-100 rounded-xl" />
          </div>
        </div>

        {/* Card Daftar Riwayat Tiket */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="w-32 h-4 bg-gray-200 rounded-md" />
            <div className="w-16 h-3 bg-gray-100 rounded-md" />
          </div>

          {/* Search box skeleton */}
          <div className="h-10 bg-gray-100 rounded-xl" />

          {/* Ticket items skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
              <div className="flex justify-between items-center">
                <div className="w-24 h-3 bg-gray-200 rounded" />
                <div className="w-20 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="w-3/4 h-3.5 bg-gray-200 rounded" />
              <div className="w-1/2 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Skeleton Tab Kuota (Pemantauan Kuota)
  if (tab === 'kuota') {
    return (
      <div className="px-3 pt-1 pb-24 space-y-3 animate-pulse">
        {/* Card Pemakaian Utama */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100" />
              <div className="space-y-1.5">
                <div className="w-36 h-4 bg-gray-200 rounded-md" />
                <div className="w-28 h-3 bg-gray-100 rounded-md" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100" />
          </div>

          <div className="p-4 space-y-3">
            <div className="w-28 h-10 bg-blue-100 rounded-lg" />
            <div className="h-2.5 bg-gray-100 rounded-full" />
            <div className="flex justify-between items-center pt-1">
              <div className="w-20 h-3 bg-gray-200 rounded" />
              <div className="w-24 h-5 bg-blue-50 rounded-md" />
            </div>
          </div>

          <div className="px-4 py-3 bg-blue-50/50 border-t border-gray-100 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-200 shrink-0" />
            <div className="w-full h-3 bg-blue-100 rounded" />
          </div>
        </div>

        {/* Card Histori 7 Hari */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div className="w-36 h-4 bg-gray-200 rounded-md" />
            <div className="w-14 h-3 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2.5 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <div className="w-20 h-3 bg-gray-200 rounded" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Skeleton Tab Kelola WiFi
  if (tab === 'wifi') {
    return (
      <div className="px-3 pt-1 pb-24 space-y-3 animate-pulse">
        {/* Banner Edukasi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-4 bg-gray-200 rounded" />
              <div className="w-48 h-3 bg-gray-100 rounded" />
            </div>
          </div>
        </div>

        {/* Status WiFi Saat Ini */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="w-36 h-4 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-11 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-100 rounded-xl" />
          </div>
        </div>

        {/* Form Ganti WiFi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="w-40 h-4 bg-gray-200 rounded" />
          <div className="space-y-2.5">
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-blue-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Skeleton Tab Profil
  if (tab === 'profil') {
    return (
      <div className="px-3 pt-1 pb-24 space-y-3 animate-pulse">
        {/* Card Identitas & Foto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-blue-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-3 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
          </div>
        </div>

        {/* Card Keamanan Kata Sandi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="w-36 h-4 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-blue-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Default: Skeleton Tab Beranda
  return (
    <div className="px-3 pt-1 pb-24 space-y-3 animate-pulse">
      {/* Card Status Koneksi ONT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100" />
            <div className="w-28 h-4 bg-gray-200 rounded" />
          </div>
          <div className="w-20 h-5 bg-emerald-100 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-3 rounded-xl bg-gray-50 space-y-1">
            <div className="w-16 h-3 bg-gray-200 rounded" />
            <div className="w-24 h-5 bg-gray-300 rounded" />
          </div>
          <div className="p-3 rounded-xl bg-gray-50 space-y-1">
            <div className="w-16 h-3 bg-gray-200 rounded" />
            <div className="w-24 h-5 bg-gray-300 rounded" />
          </div>
        </div>
      </div>

      {/* Card Kuota Ringkas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="w-24 h-4 bg-gray-200 rounded" />
          <div className="w-16 h-4 bg-blue-100 rounded" />
        </div>
        <div className="w-32 h-8 bg-blue-200 rounded-lg" />
        <div className="h-2 bg-gray-100 rounded-full" />
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col items-center gap-1.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100" />
            <div className="w-12 h-2.5 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PortalSemanticSkeleton;

