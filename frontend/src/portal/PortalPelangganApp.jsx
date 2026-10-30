import React, { useState, useEffect } from 'react';
import {
  PortalNavbar,
  PortalBottomNav
} from './components/PortalNavigation';
import { PortalLoginView } from './components/PortalAuthView';
import { PortalResetPasswordView } from './components/PortalResetPasswordView';
import { TabBerandaPelanggan } from './components/TabBerandaPelanggan';
import { TabKendalaPelanggan } from './components/TabKendalaPelanggan';
import { TabWifiPelanggan } from './components/TabWifiPelanggan';
import { TabKuotaPelanggan } from './components/TabKuotaPelanggan';
import { TabProfilPelanggan } from './components/TabProfilPelanggan';
import { TabPembayaranPelanggan } from './components/TabPembayaranPelanggan';
import {
  PortalAuthService,
  PortalDashboardService
} from './services/portalApi';
import { PortalErrorView } from './components/PortalErrorView';
import { PortalSemanticSkeleton } from './components/PortalSemanticSkeleton';
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
      if (['beranda', 'kendala', 'wifi', 'kuota', 'profil', 'pembayaran'].includes(sub)) {
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
    // Selalu ambil data terbaru database saat membuka tab beranda atau kuota
    if (tab === 'beranda' || tab === 'kuota') {
      fetchDashboard();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const tab = getPortalTabFromPath(window.location.pathname);
      setActiveTab(tab);
      if (tab === 'beranda' || tab === 'kuota') {
        fetchDashboard();
      }
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

  // Polling data terbaru dari database setiap 15 detik saat aktif login
  useEffect(() => {
    if (!isAuthenticated || viewState !== 'app') return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, viewState]);

  const handleLoginSuccess = (custData) => {
    setIsAuthenticated(true);
    setCustomer(custData);
    setViewState('app');
    switchTab('beranda');
    fetchSession();
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
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <PortalSemanticSkeleton tab="app" />
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

  const validPortalTabs = ['beranda', 'kendala', 'wifi', 'kuota', 'profil', 'pembayaran'];
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
    <div className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-[#e5e7eb] p-0 sm:p-4 pb-0 sm:pb-4 flex justify-center items-center text-[#111827] font-sans antialiased overflow-hidden overscroll-none select-none">
      {/* Mobile Shell Wrapper (Max 440px dengan full dynamic viewport height) */}
      <div className="w-full max-w-[440px] mx-auto h-[100dvh] sm:h-[92dvh] bg-[#f3f4f6] relative flex flex-col sm:rounded-2xl sm:shadow-2xl sm:shadow-slate-900/15 sm:border sm:border-slate-200 overflow-hidden overscroll-none">
        {/* Area Konten Utama Mandiri Seluruh Tab */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {activeTab === 'beranda' && (
            <TabBerandaPelanggan
              data={dashboardData}
              onNavigate={(tab) => switchTab(tab)}
            />
          )}
          {activeTab === 'kendala' && (
            <TabKendalaPelanggan
              customer={customer}
              dashboardData={dashboardData}
            />
          )}
          {activeTab === 'wifi' && (
            <TabWifiPelanggan
              customer={customer}
              dashboardData={dashboardData}
            />
          )}
          {activeTab === 'kuota' && (
            <TabKuotaPelanggan
              customer={customer}
              dashboardData={dashboardData}
            />
          )}
          {activeTab === 'profil' && (
            <TabProfilPelanggan
              customer={customer}
              dashboardData={dashboardData}
              onNavigate={(tab) => switchTab(tab)}
              onCustomerUpdate={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'pembayaran' && (
            <TabPembayaranPelanggan
              customer={customer}
              dashboardData={dashboardData}
              onBack={() => switchTab('beranda')}
            />
          )}
        </div>

        {/* Bottom Navigation Bar di Dalam Shell */}
        <PortalBottomNav activeTab={activeTab} onTabChange={(tab) => switchTab(tab)} />
      </div>
    </div>
  );
}

export default PortalPelangganApp;
