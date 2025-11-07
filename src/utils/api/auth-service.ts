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
}

export const authService = new AuthService();
