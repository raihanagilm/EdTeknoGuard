import React, { useState } from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { AdminLogsTab } from './AdminLogsTab';
import { CustomerLogsTab } from './CustomerLogsTab';

export function ActivityLogsView({ activeOffice }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'customer'

  return (
    <div className="space-y-3">
      {/* 2 Tab Switcher: Admin vs Pelanggan MyTekno (Clean Pill Tab, Tanpa Judul/Subjudul Redundan) */}
      <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-sky-200/80 font-sans text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 py-1.5 px-3 sm:px-4 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-white text-cyan-950 shadow-2xs border border-sky-200'
              : 'text-slate-600 hover:text-cyan-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-cyan-700" />
          <span>Log Admin &amp; Sistem</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 py-1.5 px-3 sm:px-4 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'customer'
              ? 'bg-white text-cyan-950 shadow-2xs border border-sky-200'
              : 'text-slate-600 hover:text-cyan-900'
          }`}
        >
          <Smartphone className="w-4 h-4 text-purple-700" />
          <span>Log Pelanggan (MyTekno)</span>
        </button>
      </div>

      {/* Konten Tab Terpilih */}
      {activeTab === 'admin' ? (
        <AdminLogsTab activeOffice={activeOffice} />
      ) : (
        <CustomerLogsTab activeOffice={activeOffice} />
      )}
    </div>
  );
}
