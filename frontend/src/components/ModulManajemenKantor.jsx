import React, { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { ModulKantorCabang } from './ModulKantorCabang';
import { ModulPenggunaNOC } from './ModulPenggunaNOC';

export function ModulManajemenKantor({ initialSubTab = 'kantor', onSubTabChange }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const handleTabClick = (tab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  return (
    <div className="space-y-4">
      {/* Segmented Pill Tabs Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-sky-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabClick('kantor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              activeSubTab === 'kantor'
                ? 'bg-white text-cyan-900 border border-sky-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeSubTab === 'kantor' ? 'text-cyan-700' : 'text-slate-500'}`} />
            <span>Kantor Cabang</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('noc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              activeSubTab === 'noc'
                ? 'bg-white text-cyan-900 border border-sky-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'noc' ? 'text-cyan-700' : 'text-slate-500'}`} />
            <span>Akun NOC</span>
          </button>
        </div>
      </div>

      {/* Konten Sub-Tab */}
      <div>
        {activeSubTab === 'kantor' && <ModulKantorCabang />}
        {activeSubTab === 'noc' && <ModulPenggunaNOC />}
      </div>
    </div>
  );
}
