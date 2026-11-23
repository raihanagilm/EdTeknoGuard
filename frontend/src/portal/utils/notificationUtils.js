import { PortalKendalaService } from '../services/portalApi';

/**
 * Menghitung daftar ID notifikasi aktif
 */
export function getActiveNotificationList(customer, tickets = [], payments = []) {
  const pel = customer || {};
  const isBelumBayar = pel.status_pembayaran === 'BELUM_BAYAR' || pel.status_pembayaran === 'OVERDUE' || pel.status_pembayaran === 'ISOLIR';
  const items = [];

  // 0. Pengingat Tagihan dari Admin NOC
  if (pel.billing_reminder && pel.billing_reminder.id) {
    items.push({ id: pel.billing_reminder.id });
  }

  // 1. Tagihan Rutin
  if (isBelumBayar || (pel.total_tagihan && pel.total_tagihan > 0) || pel.is_overdue) {
    const now = new Date();
    const todayDateStr = now.toISOString().slice(0, 10);
    items.push({
      id: `billing-unpaid-${pel.id_pelanggan || 'cust'}-${todayDateStr}`
    });
  } else if (!pel.billing_reminder) {
    items.push({
      id: `billing-paid-${pel.periode_tagihan || 'current'}`
    });
  }

  // 2. Tiket Kendala
  tickets.forEach((t) => {
    items.push({
      id: `ticket-${t.id_tiket}-${t.status}`
    });
  });

  // 3. Riwayat Pembayaran Berhasil (Invoices Lunas)
  payments.forEach((p) => {
    if (p.id) {
      items.push({
        id: `payment-invoice-${p.id}`
      });
    }
  });

  return items;
}

/**
 * Mengecek apakah ada notifikasi baru yang belum dibaca (dan belum dihapus)
 */
export function checkHasUnreadNotifications(customer, tickets = [], payments = []) {
  try {
    const savedDeleted = localStorage.getItem('teknocust_deleted_notifications');
    const deletedIds = savedDeleted ? JSON.parse(savedDeleted) : [];

    const savedRead = localStorage.getItem('teknocust_read_notifications');
    const readIds = savedRead ? JSON.parse(savedRead) : [];

    const activeItems = getActiveNotificationList(customer, tickets, payments);
    const visibleItems = activeItems.filter((item) => !deletedIds.includes(item.id));

    // Jika ada notifikasi aktif yang belum ada di daftar readIds, kembalikan true
    return visibleItems.some((item) => !readIds.includes(item.id));
  } catch {
    return false;
  }
}
