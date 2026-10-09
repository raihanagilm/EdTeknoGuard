import React from 'react';
import {
  Home,
  AlertCircle,
  Wifi,
  PieChart,
  User,
  LogOut,
  Radio,
  ExternalLink
} from 'lucide-react';

export function PortalNavbar({ customer, onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-2xs">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 tracking-tight leading-none">
              Tekno<span className="text-cyan-600">Cust</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">
              {customer?.id_pelanggan ? `ID: ${customer.id_pelanggan}` : 'Portal Mandiri Warga'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>AKTIF</span>
          </span>
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            title="Keluar Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function PortalBottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'kendala', label: 'Kendala', icon: AlertCircle },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'kuota', label: 'Kuota', icon: PieChart },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-sky-100 z-50 h-16 max-w-md mx-auto shadow-lg">
      <div className="grid grid-cols-5 h-full items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] transition ${
                isActive ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-cyan-50' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
