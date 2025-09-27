// Minimal auth API stub for tests and UI import resolution.
// Exports a mutable authAPI object so tests can override methods (e.g. login)
// and a simple tokenManager that stores tokens in localStorage for runtime usage.

const API_BASE = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production'
  ? ''
  : 'http://localhost:3000';

export const authAPI = {
  async login(credentials) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials || {})
      });

      if (res.ok) {
        return await res.json();
      }

      // Non-ok response: fallthrough to dev fallback
    } catch (e) {
      // Network error: fallthrough to dev fallback
    }

    // Development fallback: return a demo token/user so UI can continue
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      // In production, return a simple failure object
      return { success: false, error: 'auth_unavailable' };
    }

    const email = (credentials && credentials.email) || 'dev@example.com';
    return {
      success: true,
      token: `demo.${btoa(email)}.${Date.now()}`,
      user: { email, id: 'dev-user', name: 'Dev User' }
    };
  },

  async logout(token) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // swallow
    }
    // On failure, still return success for client-side cleanup convenience
    return { success: true };
  },

  async verifyToken(token) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
      return { success: false, error: `status_${res.status}` };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
};

export const tokenManager = {
  /**
   * Store token. If remember === true -> localStorage, else sessionStorage.
   */
  setToken(token, remember = false) {
    try {
      if (remember) {
        localStorage.setItem('auth_token', token);
        sessionStorage.removeItem('auth_token');
      } else {
        sessionStorage.setItem('auth_token', token);
        localStorage.removeItem('auth_token');
      }
    } catch (e) {
      // ignore
    }
  },

  getToken() {
    try {
      const t = localStorage.getItem('auth_token');
      if (t != null) return t;
      return sessionStorage.getItem('auth_token');
    } catch (e) {
      return null;
    }
  },

  removeToken() {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user_email');
      sessionStorage.removeItem('user_email');
    } catch (e) {}
  },

  hasToken() {
    try {
      return Boolean(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
    } catch (e) {
      return false;
    }
  }
};

export default { authAPI, tokenManager };
