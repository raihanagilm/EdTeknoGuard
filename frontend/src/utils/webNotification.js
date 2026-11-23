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
