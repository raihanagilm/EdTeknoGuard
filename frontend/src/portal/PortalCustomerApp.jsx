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
  PortalPembayaranService,
  PortalProfilService
} from './services/portalApi';
import { PortalErrorView } from './components/common/PortalErrorView';
import { PortalSemanticSkeleton } from './components/common/PortalSemanticSkeleton';
import { PortalLegalPage } from './components/legal/PortalLegalPage';
import { checkHasUnreadNotifications } from './utils/notificationUtils';
import { showDesktopNotification, autoRequestDesktopNotificationPermission } from '../utils/webNotification';
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
      if (['kebijakan-privasi', 'privasi', 'privacy-policy', 'syarat-ketentuan', 'terms'].includes(sub)) {
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

  // Minta izin notifikasi desktop langsung ke peramban secara otomatis
  useEffect(() => {
    if (isAuthenticated) {
      autoRequestDesktopNotificationPermission();
    }
  }, [isAuthenticated]);

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

        // Kunci Titik Lokasi Rumah (GPS) otomatis jika belum terkunci dan terhubung ke WiFi rumah
        syncGpsLocation(res.data.customer);
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
        const syncKey = targetCustomer?.id_pelanggan
          ? `mytekno_synced_fcm_token_${targetCustomer.id_pelanggan}`
          : 'mytekno_synced_fcm_token';
        const lastSyncedToken = sessionStorage.getItem(syncKey);
        if (lastSyncedToken !== token) {
          const res = await PortalAuthService.registerFcm(
            token,
            targetCustomer?.id_pelanggan,
            targetCustomer?.kantor
          );
          if (res.ok && res.data?.ok) {
            sessionStorage.setItem(syncKey, token);
          }
        }
      }
    } catch (_) {}
  };

  const syncGpsLocation = (targetCustomer) => {
    if (!targetCustomer) return;
    // Syarat Mutlak: Wajib terhubung ke sinyal WiFi rumah pelanggan
    if (!targetCustomer.is_connected_to_home_wifi) return;
    // Cukup sekali: Jika koordinat sudah tersimpan permanen di database, jangan minta lagi
    if (targetCustomer.lokasi_gps && targetCustomer.lokasi_gps.trim() !== '') return;

    const attemptedKey = `mytekno_gps_sync_${targetCustomer.id_pelanggan}`;
    if (sessionStorage.getItem(attemptedKey)) return;

    const performSave = async (lat, lng, acc) => {
      try {
        const res = await PortalProfilService.lockGpsLocation(lat, lng, acc);
        if (res.ok && res.data?.ok) {
          sessionStorage.setItem(attemptedKey, 'true');
          const newLoc = res.data.lokasi_gps;
          setCustomer((prev) => ({ ...(prev || {}), lokasi_gps: newLoc }));
        }
      } catch (err) {
        console.warn('Gagal mengunci lokasi GPS rumah:', err);
      }
    };

    // 1. Coba baca via AndroidBridge Native jika tersedia
    if (window.AndroidBridge && typeof window.AndroidBridge.getCurrentLocation === 'function') {
      try {
        const locStr = window.AndroidBridge.getCurrentLocation();
        if (locStr && typeof locStr === 'string' && locStr.includes(',')) {
          const parts = locStr.split(',');
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            performSave(lat, lng, 10);
            return;
          }
        }
      } catch (_) {}
    }

    // 2. Fallback standar HTML5 Geolocation API (berjalan senyap di latar belakang)
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          performSave(lat, lng, acc);
        },
        (err) => {
          console.warn('Geolocation permission or error:', err.message);
          // Cegah percobaan berulang dalam sesi aktif jika ditolak pengguna
          sessionStorage.setItem(attemptedKey, 'denied');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await PortalDashboardService.getDashboard();
      if (res.ok && res.data?.ok) {
        setDashboardData(res.data);
        if (res.data.customer) {
          setCustomer((prev) => ({ ...(prev || {}), ...res.data.customer }));
          syncGpsLocation(res.data.customer);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshUnreadStatus = () => {
    const pel = { ...(customer || {}), ...(dashboardData?.customer || {}) };
    if (!pel || !pel.id_pelanggan) return;
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

        // Pengiriman Notifikasi Adaptif: Android Bridge (in-app/push) & Web Notifications API (Chrome/Windows)
        const notifyCustomer = (title, message, isEmergency = false, tag = undefined, onClick = undefined) => {
          if (window.AndroidBridge && typeof window.AndroidBridge.showNativeNotification === 'function') {
            try {
              window.AndroidBridge.showNativeNotification(title, message, isEmergency);
            } catch (_) {}
          } else {
            showDesktopNotification(title, {
              body: message,
              tag: tag || title,
              icon: '/tekno-indo-logo.png',
              onClick
            });
          }
        };

        // 1. Notifikasi Status Sinyal / Gangguan Jaringan (LOS & Pemulihan Kembali Normal)
        const lastLogConn = dashboardData?.last_log?.status_koneksi?.toUpperCase?.();
        const alertedLosKey = 'mytekno_alerted_los_status';
        const lastAlertedStatus = sessionStorage.getItem(alertedLosKey);

        if (lastLogConn === 'LOS') {
          if (lastAlertedStatus !== 'LOS') {
            sessionStorage.setItem(alertedLosKey, 'LOS');
            notifyCustomer(
              'Pemberitahuan Gangguan Jaringan',
              'Mohon maaf atas ketidaknyamanannya, koneksi internet Anda saat ini terdeteksi mengalami gangguan (LOS). Tim teknisi kami sedang segera menangani kendala ini.',
              true,
              'mytekno-los-alert',
              () => switchTab('beranda')
            );
          }
        } else if (lastLogConn && lastLogConn !== 'LOS') {
          // Jika sebelumnya pernah mengalami LOS dan sekarang sudah kembali pulih/normal
          if (lastAlertedStatus === 'LOS') {
            sessionStorage.setItem(alertedLosKey, 'NORMAL');
            notifyCustomer(
              'Koneksi Internet Telah Pulih',
              'Koneksi internet Anda telah kembali normal dan aktif. Terima kasih atas kesabaran Anda telah menggunakan layanan kami!',
              false,
              'mytekno-recovered-alert',
              () => switchTab('beranda')
            );
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

            notifyCustomer(
              `Tiket #${t.id_tiket}`,
              labelStatus,
              false,
              `ticket-${t.id_tiket}-${t.status}`,
              () => switchTab('kendala')
            );
          }
        });

        try {
          localStorage.setItem(alertedTicketStorageKey, JSON.stringify(lastTicketStatusMap));
        } catch (_) {}

        // 3. Notifikasi Native Pengingat Tagihan dari Admin NOC
        const billingAlert = pel.billing_reminder;
        if (billingAlert && billingAlert.id) {
          const alertedBillingKey = `mytekno_alerted_billing_${billingAlert.id}`;
          if (!sessionStorage.getItem(alertedBillingKey)) {
            sessionStorage.setItem(alertedBillingKey, '1');
            notifyCustomer(
              'Pengingat Tagihan Internet',
              billingAlert.pesan || 'Tagihan internet bulanan Anda telah terbit. Silakan lakukan pembayaran agar layanan tetap aktif.',
              false,
              alertedBillingKey,
              () => switchTab('pembayaran')
            );
          }
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
  }, [isAuthenticated, customer?.id_pelanggan, customer?.status_pembayaran, customer?.billing_reminder?.id, activeTab, dashboardData]);

  // Listener sinkronisasi perubahan status notifikasi (read / delete)
  useEffect(() => {
    const handleNotifUpdate = () => {
      refreshUnreadStatus();
    };
    window.addEventListener('teknocust_notifications_updated', handleNotifUpdate);
    return () => {
      window.removeEventListener('teknocust_notifications_updated', handleNotifUpdate);
    };
  }, [customer, dashboardData]);

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
    let fcmToken = null;
    const platform = typeof window !== 'undefined' && window.AndroidBridge ? 'APP' : 'WEB';
    if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.getFcmToken === 'function') {
      try {
        fcmToken = window.AndroidBridge.getFcmToken() || null;
      } catch (_) {}
    }
    try {
      await PortalAuthService.logout(fcmToken, platform);
    } catch (e) {
      console.error(e);
    } finally {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('mytekno_synced_fcm_token')) {
            sessionStorage.removeItem(k);
          }
        });
      } catch (_) {}
      setIsAuthenticated(false);
      setCustomer(null);
      setViewState('login');
      window.history.pushState({}, '', '/portal');
      setActiveTab('beranda');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <PortalSemanticSkeleton tab="app" />
      </div>
    );
  }

  if (['kebijakan-privasi', 'privasi', 'privacy-policy', 'syarat-ketentuan', 'terms'].includes(activeTab)) {
    return (
      <PortalLegalPage
        initialTab={activeTab}
        onBack={() => {
          if (isAuthenticated) {
            switchTab('profil');
          } else {
            setViewState('login');
            window.history.pushState({}, '', '/portal');
            setActiveTab('beranda');
          }
        }}
      />
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
          &copy; 2026 MyTekno - Layanan Mandiri Pelanggan Internet
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-slate-200/90 p-0 sm:p-4 pb-0 sm:pb-4 flex justify-center items-center text-slate-900 font-sans antialiased overflow-hidden overscroll-none select-none">
      {/* Mobile Shell Wrapper (Max 440px dengan latar slate-100 halus agar kartu putih timbul tegas) */}
      <div className="w-full max-w-[440px] mx-auto h-[100dvh] sm:h-[92dvh] bg-[#F1F5F9] relative flex flex-col sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:border sm:border-slate-300/70 overflow-hidden overscroll-none">
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
