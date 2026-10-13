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

export function PortalNavbar({ customer }) {
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
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
              Portal Layanan Mandiri Pelanggan TeknoIndonet
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PortalBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] overflow-visible overflow-x-clip select-none">
      <div className="grid grid-cols-5 h-14 items-center px-1 overflow-visible">
        {/* 1. Kendala */}
        <button
          onClick={() => onTabChange('kendala')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'kendala' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'kendala' ? 'bg-blue-50' : ''}`}>
            <AlertCircle className={`w-5 h-5 ${activeTab === 'kendala' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-semibold">Kendala</span>
        </button>

        {/* 2. WiFi */}
        <button
          onClick={() => onTabChange('wifi')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'wifi' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'wifi' ? 'bg-blue-50' : ''}`}>
            <Wifi className={`w-5 h-5 ${activeTab === 'wifi' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-semibold">WiFi</span>
        </button>

        {/* 3. Beranda (Tengah / Center Elevated Button) */}
        <button
          onClick={() => onTabChange('beranda')}
          className="flex flex-col items-center justify-center -mt-3.5 min-h-[48px] group"
        >
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              activeTab === 'beranda'
                ? 'bg-blue-600 text-white shadow-blue-600/35 ring-2 ring-white scale-105'
                : 'bg-blue-600/90 text-white shadow-blue-600/20 border border-white'
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className={`text-[11px] tracking-tight mt-0.5 font-bold ${activeTab === 'beranda' ? 'text-blue-700' : 'text-slate-600'}`}>
            Beranda
          </span>
        </button>

        {/* 4. Kuota */}
        <button
          onClick={() => onTabChange('kuota')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'kuota' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'kuota' ? 'bg-blue-50' : ''}`}>
            <PieChart className={`w-5 h-5 ${activeTab === 'kuota' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-semibold">Kuota</span>
        </button>

        {/* 5. Profil */}
        <button
          onClick={() => onTabChange('profil')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'profil' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'profil' ? 'bg-blue-50' : ''}`}>
            <User className={`w-5 h-5 ${activeTab === 'profil' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-semibold">Profil</span>
        </button>
      </div>
    </nav>
  );
}
