/**
 * Unified API Client for Portal Pelanggan TeknoCust
 * Implements OOP Principles & Full Backend API Connectivity
 */

class PortalApiService {
  constructor(baseUrl = '/portal/api') {
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
      console.error(`[PortalApiService Error] ${endpoint}:`, error);
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
      body: JSON.stringify(body),
    });
  }
}

export class PortalAuthService {
  static async me() {
    return new PortalApiService().get('/auth/me');
  }

  static async login(identifier, password, rememberMe = true) {
    return new PortalApiService().post('/auth/login', { identifier, password, remember_me: rememberMe });
  }

  static async logout() {
    return new PortalApiService().post('/auth/logout');
  }

  static async resetPassword(payload) {
    return new PortalApiService().post('/auth/lupa-password', payload);
  }
}

export class PortalDashboardService {
  static async getDashboard() {
    return new PortalApiService().get('/dashboard');
  }

  static async liveProbeSignal() {
    return new PortalApiService().post('/dashboard/live-probe', {});
  }
}

export class PortalKuotaService {
  static async getKuota() {
    return new PortalApiService().get('/kuota');
  }
}

export class PortalKendalaService {
  static async list() {
    return new PortalApiService().get('/kendala');
  }

  static async create(payload) {
    return new PortalApiService().post('/kendala/buat', payload);
  }

  static async delete(ticketId) {
    return new PortalApiService().request(`/kendala/${encodeURIComponent(ticketId)}`, { method: 'DELETE' });
  }
}

export class PortalWifiService {
  static async getWifi() {
    return new PortalApiService().get('/wifi');
  }

  static async changeWifi(payload) {
    return new PortalApiService().post('/wifi/ganti', payload);
  }

  static async getConnectedDevices() {
    return new PortalApiService().get('/wifi/perangkat-terhubung');
  }

  static async scanConnectedDevices() {
    return new PortalApiService().post('/wifi/perangkat-terhubung/scan');
  }
}

export class PortalProfilService {
  static async changePassword(payload) {
    return new PortalApiService().post('/profil/ganti-password', payload);
  }

  static async updateProfile(payload) {
    return new PortalApiService().post('/profil/update', payload);
  }

  static async uploadFoto(imageBase64) {
    return new PortalApiService().post('/profil/foto', { image_base64: imageBase64 });
  }

  static async deleteFoto() {
    return new PortalApiService().request('/profil/foto', { method: 'DELETE' });
  }
}

export const portalApi = new PortalApiService();
