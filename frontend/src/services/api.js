/**
 * Unified API Client for EdTeknoGuard
 * Implements OOP Principles & Clean Separation of Concerns
 */

class ApiService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}, retries = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      // Jika request gagal karena gangguan jaringan sesaat (misal: ERR_NETWORK_CHANGED / offline singkat)
      // dan merupakan metode idempotent (GET), lakukan retry otomatis 1x setelah delay 800ms
      const isGet = !options.method || options.method.toUpperCase() === 'GET';
      if (retries > 0 && isGet) {
        await new Promise((r) => setTimeout(r, 800));
        return this.request(endpoint, options, retries - 1);
      }

      console.warn(`[ApiService Network Warning] ${endpoint}:`, error.message);
      return {
        ok: false,
        status: 500,
        error: error.message,
        data: null,
      };
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`${endpoint}${queryString}`, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Specialized Service Classes for All 8 Modules
export class MonitoringService {
  static async getStatus(params = {}) {
    return new ApiService().get('/api/monitoring/status', params);
  }

  static async getKpi(params = {}) {
    return new ApiService().get('/api/monitoring/kpi', params);
  }

  static async getChartData(params = {}) {
    return new ApiService().get('/api/monitoring/chart-data', params);
  }

  static async getAvailableDates(params = {}) {
    return new ApiService().get('/api/monitoring/available-dates', params);
  }

  static async getLogDates(params = {}) {
    return new ApiService().get('/api/monitoring/available-dates', params);
  }

  static async triggerScanAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/monitoring/scan-all${query ? `?${query}` : ''}`;
    return new ApiService().post(endpoint);
  }

  static async pauseScan(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/monitoring/scan-pause${query ? `?${query}` : ''}`;
    return new ApiService().post(endpoint);
  }

  static async resumeScan(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/monitoring/scan-resume${query ? `?${query}` : ''}`;
    return new ApiService().post(endpoint);
  }

  static async stopScan(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/monitoring/scan-stop${query ? `?${query}` : ''}`;
    return new ApiService().post(endpoint);
  }

  static async triggerSingleScan(idPelanggan) {
    return new ApiService().post(`/api/monitoring/scan/${idPelanggan}`);
  }

  static async toggleScheduler(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/monitoring/toggle-scheduler${query ? `?${query}` : ''}`;
    return new ApiService().post(endpoint);
  }

  static async pollNotifications() {
    return new ApiService().get('/api/notifications/poll');
  }
}

export class CustomerService {
  static async list(params = {}) {
    return new ApiService().get('/api/pelanggan', params);
  }

  static async create(payload) {
    return new ApiService().post('/api/customers', payload);
  }

  static async update(idPelanggan, payload) {
    return new ApiService().put(`/api/customers/${idPelanggan}`, payload);
  }

  static async delete(idPelanggan) {
    return new ApiService().delete(`/api/customers/${idPelanggan}`);
  }

  static async bulkDelete(ids) {
    return new ApiService().post('/api/customers/bulk-delete', { ids });
  }

  static async resetPortalPassword(idPelanggan) {
    return new ApiService().post(`/api/customers/${idPelanggan}/reset-portal-password`);
  }

  static async changeWifi(idPelanggan, payload) {
    return new ApiService().post(`/api/customers/${idPelanggan}/change-wifi`, payload);
  }
}

export class SettingsService {
  static async get() {
    return new ApiService().get('/api/pengaturan');
  }

  static async save(payload) {
    return new ApiService().post('/api/pengaturan', payload);
  }
}

export class LogsService {
  static async list(params = {}) {
    return new ApiService().get('/api/riwayat', params);
  }
}

export class TicketsService {
  static async list(status = 'SEMUA') {
    return new ApiService().get('/api/tiket', { status });
  }

  static async updateStatus(ticketId, newStatus, catatan = '') {
    return new ApiService().post(`/admin/api/tiket/${ticketId}/status`, {
      status: newStatus,
      new_status: newStatus,
      catatan,
    });
  }
}

export class QuotaService {
  static async getOverview(kantor) {
    return new ApiService().get('/api/kuota', kantor ? { kantor } : {});
  }
}

export class ActivityLogsService {
  static async list(params = {}) {
    return new ApiService().get('/api/log', params);
  }

  static async listCustomerLogs(params = {}) {
    return new ApiService().get('/api/activity-logs/customers', params);
  }

  static async getCustomerActivities(idPelanggan, params = {}) {
    return new ApiService().get(`/api/activity-logs/customers/${encodeURIComponent(idPelanggan)}`, params);
  }
}

export class UsersService {
  static async list() {
    return new ApiService().get('/api/pengguna/list');
  }

  static async create(payload) {
    return new ApiService().post('/users/api/add', payload);
  }

  static async update(userId, payload) {
    return new ApiService().post(`/users/api/edit/${userId}`, payload);
  }

  static async toggle(userId, isActive) {
    return new ApiService().post(`/users/api/toggle/${userId}`, { is_active: isActive });
  }

  static async delete(userId) {
    return new ApiService().post(`/users/api/delete/${userId}`);
  }

  static async getKantors() {
    return new ApiService().get('/api/kantor/list');
  }

  static async addKantor(payload) {
    return new ApiService().post('/users/api/kantor/add', payload);
  }

  static async updateKantor(kantorId, payload) {
    return new ApiService().post(`/users/api/kantor/edit/${kantorId}`, payload);
  }

  static async deleteKantor(kantorId) {
    return new ApiService().post(`/users/api/kantor/delete/${kantorId}`);
  }
}

export class AuthService {
  static async getCurrentUser() {
    return new ApiService().get('/api/auth/me');
  }

  static async logout() {
    return new ApiService().get('/logout');
  }

  static async pollNotifications() {
    return new ApiService().get('/api/notifications/poll');
  }
}

export class BillingService {
  static async getOverview({ kantor, q, status, billing_mode, sort_by, sort_dir, page = 1, limit = 15 } = {}) {
    const params = new URLSearchParams();
    if (kantor && kantor !== 'all') params.append('kantor', kantor);
    if (q) params.append('q', q);
    if (status && status !== 'ALL') params.append('status', status);
    if (billing_mode && billing_mode !== 'ALL') params.append('billing_mode', billing_mode);
    if (sort_by) params.append('sort_by', sort_by);
    if (sort_dir) params.append('sort_dir', sort_dir);
    params.append('page', page);
    params.append('limit', limit);
    const res = await new ApiService().get(`/api/pembayaran?${params.toString()}`);
    return res.data || {};
  }

  static async syncSingle(idPelanggan) {
    const res = await new ApiService().post(`/api/pembayaran/sync-single/${idPelanggan}`);
    return res.data || {};
  }

  static async syncAll(kantor) {
    const params = new URLSearchParams();
    if (kantor && kantor !== 'all') params.append('kantor', kantor);
    const res = await new ApiService().post(`/api/pembayaran/sync-all?${params.toString()}`);
    return res.data || {};
  }

  static async sendReminders(payload) {
    const res = await new ApiService().post('/api/pembayaran/kirim-pengingat', payload);
    return res.data || {};
  }
}

export const api = new ApiService();
