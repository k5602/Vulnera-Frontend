import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCsrfToken,
  setCsrfToken,
  getCurrentUser,
  setCurrentUser,
  clearAuth,
  isAuthenticated,
  refreshAuth,
  __resetStorageInitFlag,
} from '../auth-store';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  roles: ['user'],
};

describe('auth-store', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageInitFlag();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    __resetStorageInitFlag();
  });

  describe('CSRF Token Management', () => {
    it('should set and get CSRF token in memory', () => {
      setCsrfToken('test-csrf-123');
      expect(getCsrfToken()).toBe('test-csrf-123');
    });

    it('should persist CSRF token to localStorage', () => {
      setCsrfToken('test-csrf-456');
      const stored = localStorage.getItem('__vulnera_csrf_token');
      expect(stored).toBe('test-csrf-456');
    });

    it('should retrieve CSRF token from localStorage on first access', () => {
      localStorage.setItem('__vulnera_csrf_token', 'stored-csrf-789');
      __resetStorageInitFlag();
      expect(getCsrfToken()).toBe('stored-csrf-789');
    });

    it('should return empty string if no CSRF token set', () => {
      __resetStorageInitFlag();
      expect(getCsrfToken()).toBe('');
    });

    it('should handle localStorage errors gracefully', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        setCsrfToken('test-token');
      }).not.toThrow();

      mockSetItem.mockRestore();
    });
  });

  describe('User Data Management', () => {
    it('should set and get user data in memory', () => {
      setCurrentUser(mockUser);
      expect(getCurrentUser()).toEqual(mockUser);
    });

    it('should persist user data to localStorage', () => {
      setCurrentUser(mockUser);
      const stored = localStorage.getItem('__vulnera_current_user');
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(mockUser);
    });

    it('should retrieve user data from localStorage on first access', () => {
      localStorage.setItem('__vulnera_current_user', JSON.stringify(mockUser));
      __resetStorageInitFlag();
      expect(getCurrentUser()).toEqual(mockUser);
    });

    it('should return null if no user set', () => {
      __resetStorageInitFlag();
      expect(getCurrentUser()).toBeNull();
    });

    it('should set user to null and remove from storage', () => {
      setCurrentUser(mockUser);
      setCurrentUser(null);
      expect(getCurrentUser()).toBeNull();
      expect(localStorage.getItem('__vulnera_current_user')).toBeNull();
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('__vulnera_current_user', 'invalid-json{');
      __resetStorageInitFlag();
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('Authentication State', () => {
    it('should return true when user is set', () => {
      setCurrentUser(mockUser);
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no user is set', () => {
      __resetStorageInitFlag();
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false after clearAuth', () => {
      setCurrentUser(mockUser);
      clearAuth();
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('Clear Auth', () => {
    it('should clear CSRF token from memory and storage', () => {
      setCsrfToken('test-csrf');
      clearAuth();
      __resetStorageInitFlag();
      expect(getCsrfToken()).toBe('');
      expect(localStorage.getItem('__vulnera_csrf_token')).toBeNull();
    });

    it('should clear user from memory and storage', () => {
      setCurrentUser(mockUser);
      clearAuth();
      __resetStorageInitFlag();
      expect(getCurrentUser()).toBeNull();
      expect(localStorage.getItem('__vulnera_current_user')).toBeNull();
    });

    it('should clear both CSRF and user simultaneously', () => {
      setCsrfToken('test-csrf');
      setCurrentUser(mockUser);
      clearAuth();
      __resetStorageInitFlag();
      expect(getCsrfToken()).toBe('');
      expect(getCurrentUser()).toBeNull();
    });

    it('should handle localStorage errors during clear', () => {
      const mockRemoveItem = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Storage error');
        });

      expect(() => {
        clearAuth();
      }).not.toThrow();

      mockRemoveItem.mockRestore();
    });
  });

  describe('Refresh Auth', () => {
    it('should fetch and update CSRF token from refresh endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            csrf: 'new-csrf-token',
            user: mockUser,
          }),
      } as any);

      const result = await refreshAuth();
      expect(result).toBe(true);
      expect(getCsrfToken()).toBe('new-csrf-token');
      expect(getCurrentUser()).toEqual(mockUser);
    });

    it('should handle refresh failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as any);

      const result = await refreshAuth();
      expect(result).toBe(false);
      expect(isAuthenticated()).toBe(false);
    });

    it('should handle network errors during refresh', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await refreshAuth();
      expect(result).toBe(false);
    });

    it('should prevent multiple simultaneous refresh calls', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ csrf: 'token', user: mockUser }),
                  } as any),
                50
              )
            )
        );

      const promise1 = refreshAuth();
      const promise2 = refreshAuth();

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage Persistence Across Sessions', () => {
    it('should persist CSRF token across simulated page reloads', () => {
      setCsrfToken('persistent-csrf');
      __resetStorageInitFlag();
      expect(getCsrfToken()).toBe('persistent-csrf');
    });

    it('should persist user data across simulated page reloads', () => {
      setCurrentUser(mockUser);
      __resetStorageInitFlag();
      expect(getCurrentUser()).toEqual(mockUser);
    });

    it('should maintain auth state across multiple operations', () => {
      setCsrfToken('csrf-1');
      setCurrentUser(mockUser);

      __resetStorageInitFlag();

      expect(getCsrfToken()).toBe('csrf-1');
      expect(getCurrentUser()).toEqual(mockUser);

      setCsrfToken('csrf-2');
      expect(getCsrfToken()).toBe('csrf-2');
      expect(getCurrentUser()).toEqual(mockUser);
    });
  });
});
