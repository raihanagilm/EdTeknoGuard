import React, { useState, useEffect } from 'react';
import {
  PortalNavbar,
  PortalBottomNav
} from './components/layout/PortalNavigation';
import { PortalLoginView } from './components/auth/PortalAuthView';
import { PortalResetPasswordView } from './components/auth/PortalResetPasswordView';
import { PortalNotificationsPage } from './components/notifications/PortalNotificationsPage';
import { PortalDashboardTab } from './components/dashboard/PortalDashboardTab';
import { PortalTicketsTab } from './components/tickets/PortalTicketsTab';
import { PortalWifiTab } from './components/wifi/PortalWifiTab';
import { PortalQuotaTab } from './components/quota/PortalQuotaTab';
import { PortalProfileTab } from './components/profile/PortalProfileTab';
import { PortalPaymentTab } from './components/payment/PortalPaymentTab';
import {
  PortalAuthService,
  PortalDashboardService,
  PortalKendalaService,
  PortalPembayaranService
} from './services/portalApi';
import { PortalErrorView } from './components/common/PortalErrorView';
import { PortalSemanticSkeleton } from './components/common/PortalSemanticSkeleton';
import { checkHasUnreadNotifications } from './utils/notificationUtils';
import { RefreshCw } from 'lucide-react';

export function PortalCustomerApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login' | 'reset' | 'app' | 'error'
  const getPortalTabFromPath = (path) => {
    const clean = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    const parts = clean.split('/');
    if (parts.length === 1 && (parts[0] === 'mytekno' || parts[0] === 'teknocust' || parts[0] === 'portal')) {
      const saved = localStorage.getItem('mytekno_active_tab');
      if (saved && ['beranda', 'kendala', 'wifi', 'kuota', 'profil', 'pembayaran', 'notifikasi'].includes(saved)) {
        return saved;
      }
      return 'beranda';
    }
    if (parts.length >= 2 && (parts[0] === 'mytekno' || parts[0] === 'teknocust' || parts[0] === 'portal')) {
      const sub = parts[1];
      if (['beranda', 'kendala', 'wifi', 'kuota', 'profil', 'pembayaran', 'notifikasi'].includes(sub)) {
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
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [paymentSubTab, setPaymentSubTab] = useState('tagihan');

  const switchTab = (tab, updateUrl = true) => {
    setActiveTab(tab);
    if (tab && tab !== '404_not_found') {
      try {
        localStorage.setItem('mytekno_active_tab', tab);
      } catch (_) {}
    }
    if (updateUrl && tab !== '404_not_found') {
      const prefix = window.location.pathname.startsWith('/mytekno')
        ? '/mytekno'
        : (window.location.pathname.startsWith('/portal') ? '/portal' : '/teknocust');
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

    // Daftarkan window.navigateToTab untuk navigasi deep-linking notifikasi Android
    window.navigateToTab = (tab = 'beranda') => {
      const normalizedTab = String(tab).toLowerCase();
      if (normalizedTab === 'tiket' || normalizedTab === 'kendala') {
        switchTab('kendala');
      } else if (normalizedTab === 'pembayaran' || normalizedTab === 'tagihan' || normalizedTab === 'payment') {
        switchTab('pembayaran');
      } else if (['wifi', 'kuota', 'profil', 'notifikasi', 'beranda'].includes(normalizedTab)) {
        switchTab(normalizedTab);
      } else {
        switchTab('beranda');
      }
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete window.navigateToTab;
    };
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

        // Sinkronisasi Token FCM dari Android Bridge ke Database Pelanggan
        syncFcmToken(res.data.customer);
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

  const syncFcmToken = async (targetCustomer) => {
    if (!window.AndroidBridge || typeof window.AndroidBridge.getFcmToken !== 'function') return;
    try {
      const token = window.AndroidBridge.getFcmToken();
      if (token && token.length > 20) {
        const lastSyncedToken = sessionStorage.getItem('mytekno_synced_fcm_token');
        if (lastSyncedToken !== token) {
          const res = await PortalAuthService.registerFcm(
            token,
            targetCustomer?.id_pelanggan,
            targetCustomer?.kantor
          );
          if (res.ok && res.data?.ok) {
            sessionStorage.setItem('mytekno_synced_fcm_token', token);
          }
        }
      }
    } catch (_) {}
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

  const refreshUnreadStatus = () => {
    const pel = customer || dashboardData?.customer;
    if (!pel) return;
    Promise.allSettled([
      PortalKendalaService.list(),
      PortalPembayaranService.getRiwayat(5)
    ])
      .then(([ticketRes, paymentRes]) => {
        const tickets = ticketRes.status === 'fulfilled' && ticketRes.value?.ok && ticketRes.value.data?.tickets
          ? ticketRes.value.data.tickets : [];
        const payments = paymentRes.status === 'fulfilled' && paymentRes.value?.ok && paymentRes.value.data?.invoices
          ? paymentRes.value.data.invoices : [];
        const unread = checkHasUnreadNotifications(pel, tickets, payments);
        setHasUnreadNotifications(unread);

        // Picu Notifikasi Native (Android Bridge)
        if (window.AndroidBridge && typeof window.AndroidBridge.showNativeNotification === 'function') {
          // 1. Notifikasi Status Sinyal / Gangguan Jaringan (LOS & Pemulihan Kembali Normal)
          const lastLogConn = dashboardData?.last_log?.status_koneksi?.toUpperCase?.();
          const alertedLosKey = 'mytekno_alerted_los_status';
          const lastAlertedStatus = sessionStorage.getItem(alertedLosKey);

          if (lastLogConn === 'LOS') {
            if (lastAlertedStatus !== 'LOS') {
              sessionStorage.setItem(alertedLosKey, 'LOS');
              try {
                window.AndroidBridge.showNativeNotification(
                  'Pemberitahuan Gangguan Jaringan',
                  'Mohon maaf atas ketidaknyamanannya, koneksi internet Anda saat ini terdeteksi mengalami gangguan (LOS). Tim teknisi kami sedang segera menangani kendala ini.',
                  false
                );
              } catch (_) {}
            }
          } else if (lastLogConn && lastLogConn !== 'LOS') {
            // Jika sebelumnya pernah mengalami LOS dan sekarang sudah kembali pulih/normal
            if (lastAlertedStatus === 'LOS') {
              sessionStorage.setItem(alertedLosKey, 'NORMAL');
              try {
                window.AndroidBridge.showNativeNotification(
                  'Koneksi Internet Telah Pulih',
                  'Koneksi internet Anda telah kembali normal dan aktif. Terima kasih atas kesabaran Anda telah menggunakan layanan kami!',
                  false
                );
              } catch (_) {}
            } else if (!lastAlertedStatus) {
              sessionStorage.setItem(alertedLosKey, lastLogConn);
            }
          }

          // 2. Notifikasi jika status tiket pelanggan berubah
          const alertedTicketStorageKey = 'mytekno_alerted_ticket_status';
          let lastTicketStatusMap = {};
          try {
            const rawMap = localStorage.getItem(alertedTicketStorageKey);
            if (rawMap) lastTicketStatusMap = JSON.parse(rawMap);
          } catch (_) {}

          tickets.forEach((t) => {
            const ticketKey = `${t.id_tiket || t.id}:${t.status}`;
            if (t.id_tiket && lastTicketStatusMap[t.id_tiket] !== t.status) {
              lastTicketStatusMap[t.id_tiket] = t.status;
              const labelStatus = t.status === 'SELESAI'
                ? 'Laporan kendala WiFi Anda telah selesai ditangani'
                : t.status === 'DIPROSES'
                ? 'Teknisi kami sedang menuju lokasi untuk perbaikan'
                : `Status laporan Anda: ${t.status}`;

              try {
                window.AndroidBridge.showNativeNotification(
                  `Tiket ${t.id_tiket}`,
                  labelStatus,
                  false
                );
              } catch (_) {}
            }
          });

          try {
            localStorage.setItem(alertedTicketStorageKey, JSON.stringify(lastTicketStatusMap));
          } catch (_) {}
        }
      })
      .catch(() => {
        const unread = checkHasUnreadNotifications(pel, [], []);
        setHasUnreadNotifications(unread);
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshUnreadStatus();
    }
  }, [isAuthenticated, customer?.id_pelanggan, customer?.status_pembayaran, activeTab]);

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
    syncFcmToken(custData);
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

  const validPortalTabs = ['beranda', 'kendala', 'wifi', 'kuota', 'profil', 'pembayaran', 'notifikasi'];
  if (!validPortalTabs.includes(activeTab)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ecfeff] via-[#f0f9ff] to-[#e0f2fe] flex flex-col justify-between p-4 text-slate-900 font-sans antialiased">
        <div className="flex-1 flex items-center justify-center">
          <PortalErrorView
            errorCode={404}
            title="Halaman MyTekno Tidak Ditemukan"
            description={`Menu atau rute "${window.location.pathname}" tidak tersedia pada portal mandiri pelanggan.`}
            primaryActionLabel="Beranda"
            onBackToHome={() => switchTab('beranda')}
          />
        </div>
        <div className="py-4 text-center text-[11px] text-slate-500 font-mono">
          &copy; 2026 MyTekno &bull; Layanan Mandiri Pelanggan Internet
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-slate-200/90 p-0 sm:p-4 pb-0 sm:pb-4 flex justify-center items-center text-slate-900 font-sans antialiased overflow-hidden overscroll-none select-none">
      {/* Mobile Shell Wrapper (Max 440px dengan full dynamic viewport height) */}
      <div className="w-full max-w-[440px] mx-auto h-[100dvh] sm:h-[92dvh] bg-slate-50 relative flex flex-col sm:rounded-2xl sm:shadow-2xl sm:shadow-slate-900/15 sm:border sm:border-slate-200 overflow-hidden overscroll-none">
        {/* Area Konten Utama Mandiri Seluruh Tab */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {activeTab === 'beranda' && (
            <PortalDashboardTab
              data={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              onNavigate={(tab) => switchTab(tab)}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'kendala' && (
            <PortalTicketsTab
              customer={customer}
              dashboardData={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'wifi' && (
            <PortalWifiTab
              customer={customer}
              dashboardData={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'kuota' && (
            <PortalQuotaTab
              customer={customer}
              dashboardData={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'profil' && (
            <PortalProfileTab
              customer={customer}
              dashboardData={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              onNavigate={(tab) => switchTab(tab)}
              onCustomerUpdate={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
              onLogout={handleLogout}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'pembayaran' && (
            <PortalPaymentTab
              customer={customer}
              dashboardData={dashboardData}
              hasUnreadNotifications={hasUnreadNotifications}
              initialSubTab={paymentSubTab}
              onBack={() => switchTab('beranda')}
              onOpenNotifications={() => switchTab('notifikasi')}
            />
          )}
          {activeTab === 'notifikasi' && (
            <PortalNotificationsPage
              customer={customer}
              dashboardData={dashboardData}
              onBack={() => switchTab('beranda')}
              onNavigate={(tab, subTab) => {
                if (subTab) setPaymentSubTab(subTab);
                switchTab(tab);
              }}
            />
          )}
        </div>

        

        {/* Bottom Navigation Bar di Dalam Shell */}
        <PortalBottomNav activeTab={activeTab} onTabChange={(tab) => switchTab(tab)} />
      </div>
    </div>
  );
}

export default PortalCustomerApp;
