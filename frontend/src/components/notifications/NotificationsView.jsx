import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  WifiOff, 
  AlertOctagon, 
  KeyRound, 
  Ticket, 
  Info, 
  ChevronRight, 
  Clock, 
  Building2
} from 'lucide-react';

// Pembersihan defensif untuk mencegah duplikasi nama kantor di judul atau pesan
const formatCleanTitle = (title, kantor) => {
  if (!title) return '';
  if (!kantor) return title;
  return title.replace(new RegExp(`^(Kantor\\s+)?${kantor}\\s*[•\\-|:]\\s*`, 'i'), '').trim();
};

const formatCleanMessage = (message, kantor) => {
  if (!message) return '';
  if (!kantor) return message;
  // Hapus pola duplikat "Kantor: <kantor> | " di awal pesan atau "pada kantor <kantor>"
  return message
    .replace(new RegExp(`^Kantor:\\s*${kantor}\\s*\\|\\s*`, 'i'), '')
    .replace(new RegExp(`\\s+pada kantor\\s+${kantor}\\.?`, 'i'), '.')
    .trim();
};

export function NotificationsView({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  activeOffice = 'cabang',
  currentUser,
  onItemClick,
  onMarkAllRead,
  onDismissItem,
  loading = false
}) {
  const panelRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellBtn = document.getElementById('btn-bell-notification');
        if (bellBtn && bellBtn.contains(event.target)) {
          return;
        }
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIconForType = (item) => {
    let IconComponent = Info;

    // 1. Sinyal Terputus / LOS (Kabel Lepas / Sinyal Hilang)
    if (item.level === 'los' || item.badge?.includes('LOS') || item.badge?.includes('TERPUTUS')) {
      IconComponent = WifiOff;
    }
    // 2. Redaman Kritis (<= -27.0 dBm)
    else if (item.level === 'critical' || item.is_critical || item.badge?.includes('KRITIS')) {
      IconComponent = AlertOctagon;
    }
    // 3. Kredensial Modem Invalid / Ditolak
    else if (item.level === 'invalid' || item.badge?.includes('INVALID')) {
      IconComponent = KeyRound;
    }
    // 4. Tiket Kendala / Keluhan Pelanggan
    else if (item.type?.includes('tiket') || item.badge?.toLowerCase().includes('tiket')) {
      IconComponent = Ticket;
    }
    // 5. Redaman Waspada / Warning (-26.0 s/d -27.0 dBm)
    else if (item.level === 'warning' || item.badge === 'WARNING' || item.badge?.includes('WASPADA')) {
      IconComponent = AlertTriangle;
    }

    // Monochromatic single-token box: Dilarang membungkus dengan pastel pelangi (DESIGN.md Section 5)
    return (
      <div className="w-8 h-8 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] text-[#026AA7] flex items-center justify-center shrink-0">
        <IconComponent className="w-4 h-4" />
      </div>
    );
  };

  const getStatusTextClass = (item) => {
    // Aksen merah tegas hanya untuk kondisi darurat (Kritis & LOS/Terputus)
    if (
      item.level === 'critical' ||
      item.level === 'los' ||
      item.is_critical ||
      item.badge?.includes('KRITIS') ||
      item.badge?.includes('LOS') ||
      item.badge?.includes('TERPUTUS')
    ) {
      return 'text-rose-600';
    }
    // Monokromatik tenang untuk status operasional lainnya (bebas dari warna pelangi)
    return 'text-[#3B5B78]';
  };

  return createPortal(
    <>
      {/* Backdrop overlay di mobile */}
      <div 
        className="fixed inset-0 bg-[#0B2545]/40 backdrop-blur-2xs z-[99998] sm:hidden"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="fixed top-14 sm:top-16 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[410px] max-h-[80vh] sm:max-h-[82vh] bg-white rounded-xl border border-[#CCDDF0] shadow-2xl z-[99999] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 font-sans"
      >
        {/* Header Panel */}
        <div className="p-3.5 sm:p-4 border-b border-[#CCDDF0] flex items-center justify-between bg-[#F1F6FC]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#026AA7] text-white shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#0B2545] leading-tight">Pusat Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="font-mono text-xs font-bold text-[#026AA7]">
                    ({unreadCount})
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[#3B5B78] mt-0.5">
                {currentUser?.role === 'super admin'
                  ? `Kantor Aktif: ${activeOffice?.toUpperCase() || 'SEMUA'}`
                  : `Kantor: ${activeOffice?.toUpperCase() || '-'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-2.5 py-1 rounded-lg text-[#026AA7] hover:bg-[#E2EDF8] transition cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-[#CCDDF0] bg-white"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Baca</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64839E] hover:text-[#0B2545] hover:bg-[#E2EDF8] transition cursor-pointer"
              aria-label="Tutup panel notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Konten Notifikasi (List) */}
        <div className="overflow-y-auto divide-y divide-[#CCDDF0]/60 flex-1 p-1 max-h-[calc(85vh-110px)] bg-white">
          {loading ? (
            <div className="p-2 space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-[#CCDDF0]/60 bg-white flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="w-24 h-3.5 bg-slate-200 rounded" />
                      <div className="w-14 h-3 bg-slate-100 rounded" />
                    </div>
                    <div className="w-48 h-3.5 bg-slate-200 rounded" />
                    <div className="w-32 h-2.5 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F1F6FC] border border-[#CCDDF0] text-[#64839E] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-bold text-[#0B2545] mb-1">Tidak Ada Notifikasi Baru</h4>
              <p className="text-[11px] text-[#64839E] max-w-[240px] mx-auto">
                Seluruh modem dan tiket keluhan dalam kondisi aman atau sudah Anda tangani.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="p-3 sm:p-3.5 hover:bg-[#F1F6FC] transition rounded-lg flex items-start gap-3 group relative cursor-pointer"
                onClick={() => onItemClick && onItemClick(item)}
              >
                {getIconForType(item)}

                <div className="flex-1 min-w-0">
                  {/* Clean Typography Header: Tanpa Box / Pill Berwarna */}
                  <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap truncate">
                      <span className={`font-bold uppercase tracking-wider ${getStatusTextClass(item)}`}>
                        {item.badge || 'INFO'}
                      </span>
                      {item.kantor && (
                        <>
                          <span className="text-[#CCDDF0] font-normal">•</span>
                          <span className="font-semibold text-[#3B5B78] uppercase">
                            {item.kantor}
                          </span>
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-medium text-[#64839E] shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#64839E]" />
                      {item.time || 'Baru'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#0B2545] group-hover:text-[#026AA7] transition truncate leading-snug">
                    {formatCleanTitle(item.title, item.kantor)}
                  </h4>
                  <p className="text-[11px] text-[#3B5B78] line-clamp-2 leading-relaxed mt-0.5">
                    {formatCleanMessage(item.message, item.kantor)}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-[#026AA7] flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                      <span>
                        {item.target_tab === 'tiket' 
                          ? 'Buka Tiket' 
                          : item.target_tab === 'pelanggan' 
                          ? 'Buka Data Pelanggan' 
                          : item.target_tab === 'logs' 
                          ? 'Cek Riwayat Redaman' 
                          : 'Lihat Detail'}
                      </span>
                      <ChevronRight className="w-3 h-3" />
                    </span>

                    {item.level === 'critical' || item.level === 'los' || item.is_critical || item.status_koneksi === 'LOS' || item.id?.startsWith('batch_los') || item.id?.startsWith('batch_critical') ? (
                      <span className="text-[10px] font-bold text-rose-600">
                        Perlu Tindakan
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-[#64839E]">
                        Info
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
