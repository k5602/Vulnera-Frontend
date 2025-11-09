/**
 * Auth Service
 * Handles authentication operations (login, logout, register, etc.)
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';
import { tokenManager } from './token-manager';
import { getCookie } from '../cookies';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  // Handle both "token" and "access_token" field names
  token?: string;
  access_token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface RegisterData extends LoginCredentials {
  roles?: string[];
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: LoginResponse;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

export interface CreateApiKeyPayload {
  name: string;
  expires_at?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
  created_at: string;
  expires_at?: string;
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
    rememberMe: boolean = false
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    if (response.success && response.data) {
      // Support both 'token' and 'access_token' field names
      const token = response.data.token || response.data.access_token;
      
      if (token) {
        tokenManager.setToken(token, rememberMe);
        if (response.data.user) {
          tokenManager.setUser(response.data.user, rememberMe);
        }
      }
    }

    return response;
  }

  /**
   * Register new account
   */
  async register(data: RegisterData): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    if (response.success && response.data) {
      // Support both 'token' and 'access_token' field names
      const token = response.data.token || response.data.access_token;
      
      console.log('✅ Registration completed');
      if (token) {
        tokenManager.setToken(token);
        if (response.data.user) {
          tokenManager.setUser(response.data.user);
        }
      }
    }

    return response;
  }

  /**
   * Logout (client-side only)
   */
  async logout(): Promise<ApiResponse<void>> {
    tokenManager.clear();
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );

    if (response.success && response.data) {
      // Support both 'token' and 'access_token' field names
      const token = response.data.token || response.data.access_token;
      if (token) {
        tokenManager.setToken(token);
        if (response.data.user) {
          tokenManager.setUser(response.data.user);
        }
      }
    }

    return response;
  }

  /**
   * Set user data in storage
   */
  setUser(user: any, rememberMe: boolean = false): void {
    tokenManager.setUser(user, rememberMe);
  }

  /**
   * Update user profile data
   */
  async updateProfile(data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.patch<any>(
      API_ENDPOINTS.AUTH.UPDATE_ME,
      data
    );

    if (response.success && response.data) {
      const rememberMe = !!getCookie('auth_token');
      this.setUser(response.data, rememberMe);
    }

    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return tokenManager.hasToken();
  }

  /**
   * Get stored user data
   */
  getUser(): any {
    return tokenManager.getUser();
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return tokenManager.getToken();
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    tokenManager.clear();
  }

  /**
   * Store API key and optionally persist it for set duration (default 30 days)
   */
  setApiKey(apiKey: string | undefined, options: { days?: number } = {}): void {
    tokenManager.setApiKey(apiKey, options);
  }

  getApiKey(): string | null {
    return tokenManager.getApiKey();
  }

  clearApiKey(): void {
    tokenManager.clearApiKey();
  }

  async createApiKey(
    payload: CreateApiKeyPayload
  ): Promise<ApiResponse<CreateApiKeyResponse>> {
    const response = await apiClient.post<CreateApiKeyResponse>(
      API_ENDPOINTS.AUTH.CREATE_API_KEY,
      payload
    );

    if (response.success && response.data?.key) {
      this.setApiKey(response.data.key);
    }

    return response;
  }

  async listApiKeys(): Promise<ApiResponse<ApiKeySummary[]>> {
    return apiClient.get<ApiKeySummary[]>(API_ENDPOINTS.AUTH.LIST_API_KEYS);
  }

  async revokeApiKey(keyId: string): Promise<ApiResponse<void>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.AUTH.REVOKE_API_KEY, {
      key_id: keyId,
    });

    return apiClient.delete<void>(endpoint);
  }
}

export const authService = new AuthService();
