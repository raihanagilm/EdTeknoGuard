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
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-sky-100 z-50 h-16 max-w-md mx-auto shadow-lg">
      <div className="grid grid-cols-5 h-full items-center px-1">
        {/* 1. Kendala */}
        <button
          onClick={() => onTabChange('kendala')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'kendala' ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'kendala' ? 'bg-cyan-50' : ''}`}>
            <AlertCircle className={`w-5 h-5 ${activeTab === 'kendala' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Kendala</span>
        </button>

        {/* 2. WiFi */}
        <button
          onClick={() => onTabChange('wifi')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'wifi' ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'wifi' ? 'bg-cyan-50' : ''}`}>
            <Wifi className={`w-5 h-5 ${activeTab === 'wifi' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">WiFi</span>
        </button>

        {/* 3. Beranda (Tengah / Center Elevated Button) */}
        <button
          onClick={() => onTabChange('beranda')}
          className="flex flex-col items-center justify-center -mt-3 min-h-[48px] group"
        >
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              activeTab === 'beranda'
                ? 'bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 text-white shadow-cyan-600/30 ring-2 ring-white scale-105'
                : 'bg-gradient-to-tr from-cyan-600/90 to-blue-600/90 text-white shadow-cyan-600/20 border border-white'
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 font-bold ${activeTab === 'beranda' ? 'text-cyan-700' : 'text-slate-500'}`}>
            Beranda
          </span>
        </button>

        {/* 4. Kuota */}
        <button
          onClick={() => onTabChange('kuota')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'kuota' ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'kuota' ? 'bg-cyan-50' : ''}`}>
            <PieChart className={`w-5 h-5 ${activeTab === 'kuota' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Kuota</span>
        </button>

        {/* 5. Profil */}
        <button
          onClick={() => onTabChange('profil')}
          className={`flex flex-col items-center justify-center min-h-[48px] transition ${
            activeTab === 'profil' ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'profil' ? 'bg-cyan-50' : ''}`}>
            <User className={`w-5 h-5 ${activeTab === 'profil' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Profil</span>
        </button>
      </div>
    </nav>
  );
}
