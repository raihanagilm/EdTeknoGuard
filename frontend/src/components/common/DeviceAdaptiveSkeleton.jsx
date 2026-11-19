import React from 'react';
import { Skeleton } from 'skullet/react';

/**
 * DeviceAdaptiveSkeleton.jsx
 *
 * Standar Loading Skeleton Dual-Device (Desktop Table & Mobile Card Stack) untuk TeknoGuard.
 * Mengikuti Skullet Standard (https://skullet.lochie.me/docs) dan Anti-Slop CLS = 0.
 *
 * 1. DesktopTableSkeleton: Khusus tabel desktop (<tr> dan <td> valid semantik).
 * 2. MobileCardStackSkeleton: Khusus card stack mobile (block md:hidden).
 * 3. SkulletCardWrapper: Wrapper deklaratif Skullet untuk komponen UI individual.
 */

/**
 * 1. DesktopTableSkeleton
 * Digunakan di dalam <tbody> untuk layar desktop (hidden md:table-row-group / table).
 */
export function DesktopTableSkeleton({
  rows = 5,
  colCount = 10,
  type = 'customer'
}) {
  return (
    <>
      {[...Array(rows)].map((_, rIdx) => {
        if (type === 'customer') {
          return (
            <tr
              key={`desk-skel-cust-${rIdx}`}
              className="animate-pulse border-b border-[#DAE7F5] bg-white/70"
            >
              {/* Checkbox */}
              <td className="py-3 px-3 text-center">
                <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
              </td>
              {/* No */}
              <td className="py-3 px-2 text-center">
                <div className="w-5 h-3.5 bg-slate-200 rounded mx-auto" />
              </td>
              {/* ID Pelanggan */}
              <td className="py-3 px-3">
                <div className="w-24 h-4 bg-slate-200 rounded font-mono" />
              </td>
              {/* Nama Pelanggan */}
              <td className="py-3 px-3">
                <div className="space-y-1.5">
                  <div className="w-36 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded" />
                </div>
              </td>
              {/* IP & Router */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-24 h-3.5 bg-slate-200 rounded" />
                  <div className="w-16 h-2.5 bg-slate-100 rounded" />
                </div>
              </td>
              {/* WiFi & Admin ONT */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-28 h-3.5 bg-slate-200 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded" />
                </div>
              </td>
              {/* Sinyal Optik dBm */}
              <td className="py-3 px-3">
                <div className="w-16 h-4 bg-slate-200 rounded" />
              </td>
              {/* Status Koneksi */}
              <td className="py-3 px-3">
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </td>
              {/* Status Pantau */}
              <td className="py-3 px-3">
                <div className="w-16 h-5 bg-slate-200 rounded-full" />
              </td>
              {/* Aksi */}
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                </div>
              </td>
            </tr>
          );
        }

        if (type === 'billing') {
          return (
            <tr
              key={`desk-skel-bill-${rIdx}`}
              className="animate-pulse border-b border-[#CCDDF0]/60 bg-white/70"
            >
              {/* Checkbox */}
              <td className="py-3 px-3 text-center">
                <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
              </td>
              {/* Pelanggan */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-32 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-3 bg-slate-100 rounded" />
                </div>
              </td>
              {/* Kontak WA */}
              <td className="py-3 px-3">
                <div className="w-24 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Tagihan & Periode */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-28 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded" />
                </div>
              </td>
              {/* Status */}
              <td className="py-3 px-3">
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </td>
              {/* Jatuh Tempo */}
              <td className="py-3 px-3">
                <div className="w-24 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Nomor VA */}
              <td className="py-3 px-3">
                <div className="w-28 h-3.5 bg-slate-200 rounded font-mono" />
              </td>
              {/* Aksi */}
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                </div>
              </td>
            </tr>
          );
        }

        if (type === 'ticket') {
          return (
            <tr
              key={`desk-skel-tkt-${rIdx}`}
              className="animate-pulse border-b border-sky-100 bg-white/70"
            >
              {/* No */}
              <td className="py-3 px-2 text-center">
                <div className="w-5 h-3.5 bg-slate-200 rounded mx-auto" />
              </td>
              {/* ID Tiket */}
              <td className="py-3 px-3">
                <div className="w-24 h-4 bg-slate-200 rounded font-mono" />
              </td>
              {/* Tanggal */}
              <td className="py-3 px-3">
                <div className="w-20 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Pelanggan */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-32 h-4 bg-slate-200 rounded" />
                  <div className="w-16 h-2.5 bg-slate-100 rounded" />
                </div>
              </td>
              {/* Kategori */}
              <td className="py-3 px-3">
                <div className="w-24 h-5 bg-slate-200 rounded-full" />
              </td>
              {/* Kendala */}
              <td className="py-3 px-3">
                <div className="w-48 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Status */}
              <td className="py-3 px-3">
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </td>
              {/* Aksi */}
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                </div>
              </td>
            </tr>
          );
        }

        if (type === 'quota') {
          return (
            <tr
              key={`desk-skel-quota-${rIdx}`}
              className="animate-pulse border-b border-sky-100 bg-white/70"
            >
              {/* No */}
              <td className="py-3 px-2 text-center">
                <div className="w-5 h-3.5 bg-slate-200 rounded mx-auto" />
              </td>
              {/* Pelanggan */}
              <td className="py-3 px-3">
                <div className="space-y-1">
                  <div className="w-32 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-3 bg-slate-100 rounded" />
                </div>
              </td>
              {/* IP Address */}
              <td className="py-3 px-3">
                <div className="w-24 h-3.5 bg-slate-200 rounded font-mono" />
              </td>
              {/* Pemakaian Download */}
              <td className="py-3 px-3">
                <div className="w-20 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Pemakaian Upload */}
              <td className="py-3 px-3">
                <div className="w-20 h-3.5 bg-slate-200 rounded" />
              </td>
              {/* Total Kuota */}
              <td className="py-3 px-3">
                <div className="w-24 h-4 bg-slate-200 rounded font-semibold" />
              </td>
              {/* Terakhir Update */}
              <td className="py-3 px-3 text-right">
                <div className="w-24 h-3.5 bg-slate-200 rounded ml-auto" />
              </td>
            </tr>
          );
        }

        // Generic Table Row Fallback
        return (
          <tr
            key={`desk-skel-gen-${rIdx}`}
            className="animate-pulse border-b border-[#DAE7F5] bg-white/70"
          >
            {[...Array(colCount)].map((_, cIdx) => (
              <td key={cIdx} className="py-3.5 px-3">
                <div
                  className={`h-4 bg-slate-200 rounded ${
                    cIdx === 0
                      ? 'w-6 mx-auto'
                      : cIdx === colCount - 1
                      ? 'w-16 ml-auto'
                      : 'w-24'
                  }`}
                />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

/**
 * 2. MobileCardStackSkeleton
 * Digunakan untuk tampilan layar HP / Mobile (block md:hidden).
 */
export function MobileCardStackSkeleton({ count = 3, type = 'customer' }) {
  return (
    <div className="space-y-2.5">
      {[...Array(count)].map((_, idx) => {
        if (type === 'customer') {
          return (
            <div
              key={`mob-skel-cust-${idx}`}
              className="p-3 rounded-xl border border-sky-100 bg-white shadow-2xs space-y-2.5 animate-pulse"
            >
              {/* Header Kartu: No, Nama & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <div className="w-5 h-3 bg-slate-200 rounded" />
                  <div className="space-y-1">
                    <div className="w-28 h-4 bg-slate-200 rounded" />
                    <div className="w-16 h-3 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-16 h-5 bg-slate-200 rounded-full shrink-0" />
              </div>

              {/* Body Kartu: Grid 2 Kolom IP & Sinyal */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                  <div className="w-16 h-2.5 bg-slate-100 rounded" />
                </div>
                <div className="space-y-1 text-right flex flex-col items-end">
                  <div className="w-14 h-3.5 bg-slate-200 rounded" />
                  <div className="w-12 h-2.5 bg-slate-100 rounded" />
                </div>
              </div>

              {/* Action Bar Bawah */}
              <div className="pt-2 border-t border-sky-100 flex items-center justify-between gap-2">
                <div className="flex-1 h-8 bg-slate-200 rounded-lg" />
                <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
                <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
              </div>
            </div>
          );
        }

        if (type === 'billing') {
          return (
            <div
              key={`mob-skel-bill-${idx}`}
              className="p-3 rounded-xl border border-sky-100 bg-white shadow-2xs space-y-2 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="w-32 h-4 bg-slate-200 rounded" />
                  <div className="w-20 h-3 bg-slate-100 rounded" />
                </div>
                <div className="w-16 h-5 bg-slate-200 rounded-full" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <div className="w-24 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-3 bg-slate-100 rounded" />
              </div>
              <div className="pt-2 border-t border-sky-100 flex gap-2">
                <div className="flex-1 h-8 bg-slate-200 rounded-lg" />
                <div className="w-8 h-8 bg-slate-200 rounded-lg" />
              </div>
            </div>
          );
        }

        // Generic Mobile Card (Tickets, Quota, Logs)
        return (
          <div
            key={`mob-skel-gen-${idx}`}
            className="p-3 rounded-xl border border-sky-100 bg-white shadow-2xs space-y-2 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-28 h-4 bg-slate-200 rounded" />
              <div className="w-16 h-5 bg-slate-200 rounded-full" />
            </div>
            <div className="space-y-1 pt-1">
              <div className="w-full h-3.5 bg-slate-100 rounded" />
              <div className="w-2/3 h-3 bg-slate-100 rounded" />
            </div>
            <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
              <div className="w-20 h-3 bg-slate-200 rounded" />
              <div className="w-14 h-6 bg-slate-200 rounded-lg" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 3. SkulletCardWrapper
 * Wrapper resmi Skullet (https://skullet.lochie.me/docs) untuk kartu atau metrik tunggal.
 */
export function SkulletCardWrapper({ data, sample, children, className = '' }) {
  return (
    <Skeleton data={data} sample={sample} className={className}>
      {children}
    </Skeleton>
  );
}

export default {
  DesktopTableSkeleton,
  MobileCardStackSkeleton,
  SkulletCardWrapper
};
