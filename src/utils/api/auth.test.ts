import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authAPI, tokenManager } from './auth';

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  describe('authAPI.login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        token: 'test-token',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await authAPI.login({
        email: 'test@example.com',
        password: 'password123',
        remember: false
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            remember: false
          })
        })
      );
    });

    it('should return mock response in development mode when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await authAPI.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.token).toContain('demo.');
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await authAPI.login({
        email: 'wrong@example.com',
        password: 'wrongpass'
      });

      expect(result.success).toBe(true); // Should fallback to mock in development
    });
  });

  describe('authAPI.logout', () => {
    it('should call logout endpoint with token', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await authAPI.logout('test-token');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should always succeed even if API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await authAPI.logout('test-token');

      expect(result.success).toBe(true);
    });
  });

  describe('authAPI.verifyToken', () => {
    it('should verify valid token', async () => {
      const mockResponse = {
        success: true,
        user: { id: '123', email: 'test@example.com' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await authAPI.verifyToken('valid-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/auth/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token'
          })
        })
      );
    });

    it('should handle invalid token', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Invalid token'));

      const result = await authAPI.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Token Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setToken', () => {
    it('should store token in localStorage when remember is true', () => {
      tokenManager.setToken('test-token', true);

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should store token in sessionStorage when remember is false', () => {
      tokenManager.setToken('test-token', false);

      expect(sessionStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage first', () => {
      (localStorage.getItem as any).mockReturnValue('local-token');
      (sessionStorage.getItem as any).mockReturnValue('session-token');

      const token = tokenManager.getToken();

      expect(token).toBe('local-token');
      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return token from sessionStorage if localStorage is empty', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      (sessionStorage.getItem as any).mockReturnValue('session-token');

      const token = tokenManager.getToken();

      expect(token).toBe('session-token');
      expect(sessionStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null if no token found', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      (sessionStorage.getItem as any).mockReturnValue(null);

      const token = tokenManager.getToken();

      expect(token).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove tokens from both storages', () => {
      tokenManager.removeToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user_email');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('user_email');
    });
  });

  describe('hasToken', () => {
    it('should return true when token exists', () => {
      (localStorage.getItem as any).mockReturnValue('test-token');

      const hasToken = tokenManager.hasToken();

      expect(hasToken).toBe(true);
    });

    it('should return false when no token exists', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      (sessionStorage.getItem as any).mockReturnValue(null);

      const hasToken = tokenManager.hasToken();

      expect(hasToken).toBe(false);
    });
  });
});