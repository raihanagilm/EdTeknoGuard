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
import { RefreshCw } from 'lucide-react';

export function PortalPelangganApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login' | 'reset' | 'app'
  const [activeTab, setActiveTab] = useState('beranda'); // 'beranda' | 'kendala' | 'wifi' | 'kuota' | 'profil'
  const [customer, setCustomer] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] text-slate-900 font-sans antialiased">
      {/* Top Header */}
      <PortalNavbar customer={customer} onLogout={handleLogout} />

      {/* Main Container Phone Shell (Max-w-md Mobile First) */}
      <main className="max-w-md mx-auto p-4 pt-3">
        {activeTab === 'beranda' && (
          <TabBerandaPelanggan
            data={dashboardData}
            onNavigate={(tab) => setActiveTab(tab)}
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
      <PortalBottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
    </div>
  );
}

export default PortalPelangganApp;
