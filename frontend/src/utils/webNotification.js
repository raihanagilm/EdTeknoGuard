/**
 * webNotification.js - W3C Web Notifications API Helper
 * Mengintegrasikan notifikasi peramban standar (Chrome/Edge) ke Windows Action Center / Desktop Notification.
 * Mendukung deteksi lingkungan (Web vs Android WebView Bridge).
 */

export const isAndroidApp = () => {
  return typeof window !== 'undefined' && Boolean(window.AndroidBridge);
};

export const isWebNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isWebNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

export const requestDesktopNotificationPermission = async () => {
  if (!isWebNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.warn('[WebNotification] Gagal meminta izin notifikasi:', e);
    return false;
  }
};

/**
 * Menampilkan notifikasi desktop Windows / OS menggunakan Web Notifications API
 * @param {string} title - Judul notifikasi
 * @param {object} options - Opsi notifikasi (body, icon, tag, onClick, dsb)
 */
export const showDesktopNotification = (title, options = {}) => {
  // Jika sedang berjalan di dalam aplikasi Android WebView, biarkan ditangani oleh AndroidBridge
  if (isAndroidApp()) return null;

  if (!isWebNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notifOptions = {
      body: options.body || '',
      icon: options.icon || '/tekno-indo-logo.png',
      badge: options.badge || '/favicon.png',
      tag: options.tag || undefined, // Mencegah duplikasi pop-up untuk id/kejadian yang sama
      renotify: options.renotify || false,
      silent: false, // Memastikan nada lonceng bawaan OS Windows berbunyi
      ...options,
    };

    const notification = new Notification(title, notifOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch (_) {}

      if (typeof options.onClick === 'function') {
        options.onClick(notification);
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('[WebNotification] Gagal menampilkan notifikasi desktop:', err);
    return null;
  }
};

/**
 * Meminta izin notifikasi browser secara otomatis langsung ke dialog asli peramban
 * (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge) tanpa banner UI tambahan.
 */
export const autoRequestDesktopNotificationPermission = () => {
  if (isAndroidApp() || !isWebNotificationSupported()) return;
  if (Notification.permission !== 'default') return;

  const triggerPrompt = async () => {
    if (Notification.permission !== 'default') return;
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showDesktopNotification('TeknoGuard Desktop Alert', {
          body: 'Notifikasi desktop aktif! Anda akan menerima peringatan redaman kritis & tiket kendala langsung di Windows.',
          tag: 'tekno-welcome-notif'
        });
      }
    } catch (err) {
      console.warn('[WebNotification] Request permission error:', err);
    }
  };

  // 1. Panggil langsung (berhasil langsung di Firefox, Chrome desktop)
  try {
    triggerPrompt();
  } catch (_) {}

  // 2. Fallback untuk browser yang mewajibkan interaksi pengguna (Safari & strict Chrome)
  const handleInteraction = () => {
    triggerPrompt();
  };
  window.addEventListener('pointerdown', handleInteraction, { once: true });
  window.addEventListener('keydown', handleInteraction, { once: true });
};
