/**
 * Auth Service
 * Handles authentication operations (login, logout, register, etc.)
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';
import { tokenManager } from './token-manager';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface RegisterData extends LoginCredentials {
  name: string;
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
      tokenManager.setToken(response.data.token, rememberMe);
      tokenManager.setUser(response.data.user, rememberMe);
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
      tokenManager.setToken(response.data.token);
      tokenManager.setUser(response.data.user);
    }

    return response;
  }

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
    
    // Clear tokens regardless of API response
    tokenManager.clear();
    
    return response;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );

    if (response.success && response.data) {
      tokenManager.setToken(response.data.token);
      tokenManager.setUser(response.data.user);
    }

    return response;
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
    return apiClient.post<{ valid: boolean }>(API_ENDPOINTS.AUTH.VERIFY);
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
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
