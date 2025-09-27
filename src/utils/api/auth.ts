// API utilities for traditional authentication
import { apiConfig } from '../../config/auth.js';

// Types for API responses
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

// Helper function to make API calls
// NOTE: Backend network calls have been removed for frontend-only mode.
// This function returns mock responses for known auth endpoints and
// a generic empty object for others so the UI continues to work.
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const path = String(endpoint || '');
  console.debug('[apiCall mock] endpoint:', path);

  // Basic mock implementations for auth endpoints
  if (path.startsWith('/auth/login')) {
    try {
      const body = options.body ? JSON.parse(String(options.body)) : {};
      const email = body.email || 'demo@example.com';
      const mock: any = {
        success: true,
        token: `demo.${btoa(email)}.${Date.now()}`,
        user: { id: btoa(email), email, name: (email.split('@')[0] || '') },
      };
      return mock as T;
    } catch (e) {
      return ({ success: false, error: 'Invalid request' } as unknown) as T;
    }
  }

  if (path.startsWith('/auth/logout')) {
    return ({ success: true } as unknown) as T;
  }

  if (path.startsWith('/auth/verify')) {
    // Return a mock verification success when a token is provided
    const headers = (options && (options as any).headers) || {};
    const auth = headers.Authorization || headers.authorization || '';
    if (auth) {
      const token = String(auth).replace(/^Bearer\s*/i, '');
      const email = atob((token.split('.')[1] || '').replace(/[^A-Za-z0-9+/=]/g, '')) || 'demo@example.com';
      return ({ success: true, token, user: { id: btoa(email), email, name: email.split('@')[0] } } as unknown) as T;
    }
    return ({ success: false, error: 'Invalid token' } as unknown) as T;
  }

  if (path.startsWith('/auth/refresh')) {
    return ({ success: true, token: `demo.refreshed.${Date.now()}` } as unknown) as T;
  }

  // Unhandled endpoints return an empty object so callers don't break
  console.warn('[apiCall mock] Unhandled endpoint, returning empty object:', path);
  return ({} as unknown) as T;
};

// Authentication API functions
export const authAPI = {
  // Login with email/password
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      return await apiCall<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      console.error('Login API error:', error);
      
      // For development/demo purposes, return a mock successful response
      if (import.meta.env.VITE_ENVIRONMENT === 'development') {
        console.warn('Using mock login response for development');
        return {
          success: true,
          token: `demo.${btoa(credentials.email)}.${Date.now()}`,
          user: {
            id: btoa(credentials.email),
            email: credentials.email,
            name: credentials.email.split('@')[0],
          },
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  },

  // Logout
  logout: async (token: string): Promise<{ success: boolean }> => {
    try {
      return await apiCall<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout API error:', error);
      return { success: true }; // Always succeed for logout
    }
  },

  // Verify token
  verifyToken: async (token: string): Promise<LoginResponse> => {
    try {
      return await apiCall<LoginResponse>('/auth/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
      };
    }
  },

  // Refresh token
  refreshToken: async (token: string): Promise<LoginResponse> => {
    try {
      return await apiCall<LoginResponse>('/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  },
};

// Token management utilities
export const tokenManager = {
  // Get token from storage
  getToken: (): string | null => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  },

  // Set token in storage
  setToken: (token: string, remember: boolean = false): void => {
    if (remember) {
      localStorage.setItem('auth_token', token);
      sessionStorage.removeItem('auth_token');
    } else {
      sessionStorage.setItem('auth_token', token);
      localStorage.removeItem('auth_token');
    }
  },

  // Remove token from storage
  removeToken: (): void => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    sessionStorage.removeItem('user_email');
  },

  // Check if token exists
  hasToken: (): boolean => {
    return !!tokenManager.getToken();
  },
};

export default authAPI;