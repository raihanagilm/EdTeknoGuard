import React, { useRef, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  ZapOff, 
  HelpCircle, 
  Info, 
  ChevronRight, 
  Clock, 
  Building2,
  Trash2
} from 'lucide-react';

export function ModulNotifikasi({
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

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Cek jika klik bukan pada tombol lonceng pemicu
        const bellBtn = document.getElementById('btn-bell-notification');
        if (bellBtn && bellBtn.contains(event.target)) {
          return;
        }
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIconForType = (item) => {
    if (item.level === 'critical' || item.type.includes('los')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
          <ZapOff className="w-4 h-4" />
        </div>
      );
    }
    if (item.type.includes('tiket')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <HelpCircle className="w-4 h-4" />
        </div>
      );
    }
    if (item.level === 'warning' || item.badge === 'WARNING') {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
        <Info className="w-4 h-4" />
      </div>
    );
  };

  const getBadgeClass = (item) => {
    if (item.level === 'critical') {
      return 'bg-rose-50 border-rose-200 text-rose-800';
    }
    if (item.level === 'warning') {
      return 'bg-amber-50 border-amber-200 text-amber-800';
    }
    return 'bg-cyan-50 border-cyan-200 text-cyan-800';
  };

  return (
    <>
      {/* Backdrop overlay di mobile */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-[9998] sm:hidden"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="fixed sm:absolute top-16 sm:top-12 inset-x-3 sm:inset-x-auto sm:right-0 sm:w-[420px] max-h-[80vh] sm:max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl border border-sky-200/90 shadow-2xl z-[9999] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ boxShadow: '0 20px 40px -15px rgba(12, 74, 110, 0.25)' }}
      >
      {/* Header Panel */}
      <div className="p-3.5 sm:p-4 border-b border-sky-100 flex items-center justify-between bg-gradient-to-r from-sky-50/80 via-white to-cyan-50/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-600 text-white shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 leading-tight">Pusat Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              {currentUser?.role === 'super admin' ? 'Semua Kantor' : `Kantor: ${activeOffice?.toUpperCase() || '-'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {notifications.length > 0 && onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Tandai semua sudah dibaca"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Tandai Baca</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup panel notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Konten Notifikasi (List) */}
      <div className="overflow-y-auto divide-y divide-sky-50 flex-1 p-1 max-h-[calc(85vh-110px)]">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Memuat notifikasi...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 mb-1">Tidak Ada Notifikasi Baru</h4>
            <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
              Seluruh modem dan tiket keluhan dalam kondisi aman atau sudah Anda tangani.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className="p-3 sm:p-3.5 hover:bg-sky-50/70 transition rounded-xl flex items-start gap-3 group relative cursor-pointer"
              onClick={() => onItemClick && onItemClick(item)}
            >
              {getIconForType(item)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono uppercase tracking-wide border ${getBadgeClass(item)}`}>
                      {item.badge || 'INFO'}
                    </span>
                    {item.kantor && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {item.kantor.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {item.time || 'Baru'}
                  </span>
                </div>

                <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-cyan-800 transition truncate leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed mt-0.5">
                  {item.message}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-cyan-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                    <span>
                      {item.target_tab === 'tiket' ? 'Buka Tiket' : item.target_tab === 'logs' ? 'Cek Riwayat Redaman' : 'Lihat Detail'}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </span>

                  {onDismissItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissItem(item);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-white rounded transition"
                      title="Tandai sudah dibaca"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-50/90 border-t border-sky-100 text-center text-[10px] text-slate-500 font-medium">
        Setiap akun memiliki status baca mandiri. Tiket belum selesai akan tetap dimunculkan.
      </div>
    </div>
    </>
  );
}
