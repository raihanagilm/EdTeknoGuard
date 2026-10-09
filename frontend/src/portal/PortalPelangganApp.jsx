import React, { useState, useEffect } from 'react';
import {
  PortalNavbar,
  PortalBottomNav
} from './components/PortalNavigation';
import {
  PortalLoginView,
  PortalResetPasswordView
} from './components/PortalAuthView';
import { TabBerandaPelanggan } from './components/TabBerandaPelanggan';
import { TabKendalaPelanggan } from './components/TabKendalaPelanggan';
import { TabWifiPelanggan } from './components/TabWifiPelanggan';
import { TabKuotaPelanggan } from './components/TabKuotaPelanggan';
import { TabProfilPelanggan } from './components/TabProfilPelanggan';
import {
  PortalAuthService,
  PortalDashboardService
} from './services/portalApi';
import { PortalErrorView } from './components/PortalErrorView';
import { RefreshCw } from 'lucide-react';

export function PortalPelangganApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login' | 'reset' | 'app' | 'error'
  const getPortalTabFromPath = (path) => {
    const clean = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    const parts = clean.split('/');
    if (parts.length === 1 && (parts[0] === 'teknocust' || parts[0] === 'portal')) return 'beranda';
    if (parts.length >= 2 && (parts[0] === 'teknocust' || parts[0] === 'portal')) {
      const sub = parts[1];
      if (['beranda', 'kendala', 'wifi', 'kuota', 'profil'].includes(sub)) {
        return sub;
      }
      if (['login', 'masuk', 'auth', 'daftar'].includes(sub)) {
        return 'beranda';
      }
      return '404_not_found';
    }
    return '404_not_found';
  };

  const [activeTab, setActiveTab] = useState(() => getPortalTabFromPath(window.location.pathname)); // 'beranda' | 'kendala' | 'wifi' | 'kuota' | 'profil' | '404_not_found'
  const [customer, setCustomer] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const switchTab = (tab, updateUrl = true) => {
    setActiveTab(tab);
    if (updateUrl && tab !== '404_not_found') {
      const prefix = window.location.pathname.startsWith('/portal') ? '/portal' : '/teknocust';
      const newUrl = tab === 'beranda' ? prefix : `${prefix}/${tab}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const tab = getPortalTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await PortalAuthService.me();
      if (res.ok && res.data?.authenticated && res.data.customer) {
        setIsAuthenticated(true);
        setCustomer(res.data.customer);
        setViewState('app');
        fetchDashboard();
      } else {
        setIsAuthenticated(false);
        setViewState('login');
      }
    } catch (e) {
      setIsAuthenticated(false);
      setViewState('login');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await PortalDashboardService.getDashboard();
      if (res.ok && res.data?.ok) {
        setDashboardData(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleLoginSuccess = (custData) => {
    setIsAuthenticated(true);
    setCustomer(custData);
    setViewState('app');
    fetchDashboard();
  };

  const handleLogout = async () => {
    try {
      await PortalAuthService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticated(false);
      setCustomer(null);
      setViewState('login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-600 font-mono">Memuat Portal TeknoCust...</div>
        </div>
      </div>
    );
  }

  if (viewState === 'reset') {
    return <PortalResetPasswordView onBackToLogin={() => setViewState('login')} />;
  }

  if (!isAuthenticated || viewState === 'login') {
    return (
      <PortalLoginView
        onLoginSuccess={handleLoginSuccess}
        onGoToReset={() => setViewState('reset')}
      />
    );
  }

  const validPortalTabs = ['beranda', 'kendala', 'wifi', 'kuota', 'profil'];
  if (!validPortalTabs.includes(activeTab)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 text-slate-900 font-sans antialiased">
        <div className="flex-1 flex items-center justify-center">
          <PortalErrorView
            errorCode={404}
            title="Halaman TeknoCust Tidak Ditemukan"
            description={`Menu atau rute "${window.location.pathname}" tidak tersedia pada portal mandiri pelanggan.`}
            primaryActionLabel="Beranda"
            onBackToHome={() => switchTab('beranda')}
          />
        </div>
        <div className="py-4 text-center text-[11px] text-slate-500 font-mono">
          &copy; 2026 TeknoCust &bull; Layanan Mandiri Pelanggan Internet
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] text-slate-900 font-sans antialiased">
      {/* Top Header Navbar */}
      <PortalNavbar customer={customer} onLogout={handleLogout} />

      {/* Main Container Phone Shell (Max-w-md Mobile First) */}
      <main className="max-w-md mx-auto p-4 pt-3">
        {activeTab === 'beranda' && (
          <TabBerandaPelanggan
            data={dashboardData}
            onNavigate={(tab) => switchTab(tab)}
          />
        )}
        {activeTab === 'kendala' && <TabKendalaPelanggan customer={customer} />}
        {activeTab === 'wifi' && <TabWifiPelanggan customer={customer} />}
        {activeTab === 'kuota' && <TabKuotaPelanggan customer={customer} />}
        {activeTab === 'profil' && (
          <TabProfilPelanggan customer={customer} onLogout={handleLogout} />
        )}
      </main>

      {/* Sticky Bottom 5-Tab Navigation Bar */}
      <PortalBottomNav activeTab={activeTab} onTabChange={(tab) => switchTab(tab)} />
    </div>
  );
}

export default PortalPelangganApp;
