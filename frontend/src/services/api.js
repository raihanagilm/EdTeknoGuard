/**
 * Unified API Client for EdTeknoGuard
 * Implements OOP Principles & Clean Separation of Concerns
 */

class ApiService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json',
    };

    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
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
      console.error(`[ApiService Error] ${endpoint}:`, error);
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
      new_status: newStatus,
      catatan,
    });
  }
}

export class QuotaService {
  static async getOverview() {
    return new ApiService().get('/api/kuota');
  }
}

export class ActivityLogsService {
  static async list(params = {}) {
    return new ApiService().get('/api/log', params);
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

export const api = new ApiService();
