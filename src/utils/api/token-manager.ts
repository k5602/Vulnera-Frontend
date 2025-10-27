/**
 * Token Manager
 * Manages authentication tokens in localStorage/sessionStorage
 */

export interface StoredToken {
  token: string;
  expiresAt?: number;
}

class TokenManager {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  /**
   * Store token
   */
  setToken(token: string, rememberMe: boolean = false): void {
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;

      storage.setItem(this.TOKEN_KEY, token);
      otherStorage.removeItem(this.TOKEN_KEY);
    } catch (_e) {
      if (import.meta.env.DEV) {
        console.error('Failed to store token');
      }
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (token) return token;
      return sessionStorage.getItem(this.TOKEN_KEY);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Store user data
   */
  setUser(user: any, rememberMe: boolean = false): void {
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;

      storage.setItem(this.USER_KEY, JSON.stringify(user));
      otherStorage.removeItem(this.USER_KEY);
    } catch (_e) {
      if (import.meta.env.DEV) {
        console.error('Failed to store user data');
      }
    }
  }

  /**
   * Get stored user data
   */
  getUser(): any {
    try {
      const user = localStorage.getItem(this.USER_KEY);
      if (user) return JSON.parse(user);
      
      const sessionUser = sessionStorage.getItem(this.USER_KEY);
      if (sessionUser) return JSON.parse(sessionUser);
      
      return null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    try {
      return Boolean(this.getToken());
    } catch (_e) {
      return false;
    }
  }

  /**
   * Remove all tokens and user data
   */
  clear(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    } catch (_e) {
      if (import.meta.env.DEV) {
        console.error('Failed to clear tokens');
      }
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    try {
      const user = this.getUser();
      if (!user || !user.expiresAt) return false;
      return Date.now() > user.expiresAt;
    } catch (_e) {
      return false;
    }
  }
}

export const tokenManager = new TokenManager();
