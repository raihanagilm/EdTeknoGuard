import React from 'react';
import {
  Home,
  AlertCircle,
  CreditCard,
  PieChart,
  User,
  LogOut,
  Radio,
  ExternalLink
} from 'lucide-react';

export function PortalNavbar({ customer }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-[440px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight leading-none">
              Tekno<span className="text-blue-600">Cust</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Portal Layanan Mandiri Pelanggan
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PortalBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="sticky bottom-0 w-full bg-white/98 backdrop-blur-md border-t border-slate-200 z-30 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] select-none">
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {/* 1. Kendala */}
        <button
          type="button"
          onClick={() => onTabChange('kendala')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition cursor-pointer ${
            activeTab === 'kendala' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition ${activeTab === 'kendala' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <AlertCircle className={`w-5 h-5 ${activeTab === 'kendala' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-medium leading-none">Kendala</span>
        </button>

        {/* 2. Bayar (Pembayaran & Tagihan) */}
        <button
          type="button"
          onClick={() => onTabChange('pembayaran')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition cursor-pointer ${
            activeTab === 'pembayaran' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition ${activeTab === 'pembayaran' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <CreditCard className={`w-5 h-5 ${activeTab === 'pembayaran' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-medium leading-none">Bayar</span>
        </button>

        {/* 3. Beranda (Tengah / Elevated Action Button) */}
        <button
          type="button"
          onClick={() => onTabChange('beranda')}
          className="flex flex-col items-center justify-center -mt-2 min-h-[48px] group cursor-pointer"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'beranda'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-white scale-105'
                : 'bg-slate-800 text-white shadow-xs'
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className={`text-[11px] tracking-tight mt-1 leading-none ${activeTab === 'beranda' ? 'text-blue-600 font-bold' : 'text-slate-600 font-medium'}`}>
            Beranda
          </span>
        </button>

        {/* 4. Kuota */}
        <button
          type="button"
          onClick={() => onTabChange('kuota')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition cursor-pointer ${
            activeTab === 'kuota' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition ${activeTab === 'kuota' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <PieChart className={`w-5 h-5 ${activeTab === 'kuota' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-medium leading-none">Kuota</span>
        </button>

        {/* 5. Profil */}
        <button
          type="button"
          onClick={() => onTabChange('profil')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition cursor-pointer ${
            activeTab === 'profil' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition ${activeTab === 'profil' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <User className={`w-5 h-5 ${activeTab === 'profil' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5 font-medium leading-none">Profil</span>
        </button>
      </div>
    </nav>
  );
}
