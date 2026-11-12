import React, { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { BranchOfficesView } from './BranchOfficesView';
import { UsersView } from '../users/UsersView';

export function OfficeManagementView({ initialSubTab = 'kantor', onSubTabChange }) {
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
        <div className="inline-flex p-1 bg-[#F1F6FC] rounded-xl border border-[#CCDDF0] shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabClick('kantor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeSubTab === 'kantor'
                ? 'bg-[#026AA7] text-white shadow-xs'
                : 'text-[#3B5B78] hover:text-[#0B2545] hover:bg-[#E2EDF8]'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeSubTab === 'kantor' ? 'text-white' : 'text-[#026AA7]'}`} />
            <span>Kantor Cabang</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('noc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeSubTab === 'noc'
                ? 'bg-[#026AA7] text-white shadow-xs'
                : 'text-[#3B5B78] hover:text-[#0B2545] hover:bg-[#E2EDF8]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'noc' ? 'text-white' : 'text-[#026AA7]'}`} />
            <span>Akun NOC</span>
          </button>
        </div>
      </div>

      {/* Konten Sub-Tab */}
      <div>
        {activeSubTab === 'kantor' && <BranchOfficesView />}
        {activeSubTab === 'noc' && <UsersView />}
      </div>
    </div>
  );
}
