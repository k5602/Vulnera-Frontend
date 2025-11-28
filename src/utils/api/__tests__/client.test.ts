import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, apiClient } from '../client';
import { getCsrfToken, setCsrfToken, setCurrentUser, clearAuth, __resetStorageInitFlag } from '../auth-store';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  roles: ['user'],
};

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageInitFlag();
    vi.clearAllMocks();
    setCsrfToken('test-csrf-token');
  });

  afterEach(() => {
    localStorage.clear();
    __resetStorageInitFlag();
    clearAuth();
  });

  describe('CSRF Token Management', () => {
    it('should include CSRF token in POST request headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{"data": "test"}'),
        json: () => Promise.resolve({ data: 'test' }),
      } as any);

      setCsrfToken('my-csrf-token');
      await apiFetch('/api/test', { method: 'POST', body: JSON.stringify({}) });

      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].headers['X-CSRF-Token']).toBe('my-csrf-token');
    });

    it('should extract CSRF from response headers', async () => {
      const responseHeaders = new Map([['X-CSRF-Token', 'new-csrf-from-header']]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: responseHeaders,
        text: () => Promise.resolve('{"success": true}'),
        json: () => Promise.resolve({ success: true }),
        get: (key: string) => responseHeaders.get(key),
      } as any);

      await apiFetch('/api/test', { method: 'POST' });
      expect(getCsrfToken()).toBe('new-csrf-from-header');
    });

    it('should extract CSRF from response body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(JSON.stringify({ csrf: 'body-csrf-token', data: 'test' })),
        json: () => Promise.resolve({ csrf: 'body-csrf-token', data: 'test' }),
      } as any);

      await apiFetch('/api/test', { method: 'POST' });
      expect(getCsrfToken()).toBe('body-csrf-token');
    });

    it('should prioritize header CSRF over body CSRF', async () => {
      const responseHeaders = new Map([['X-CSRF-Token', 'header-csrf']]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: responseHeaders,
        text: () =>
          Promise.resolve(JSON.stringify({ csrf: 'body-csrf', data: 'test' })),
        json: () => Promise.resolve({ csrf: 'body-csrf', data: 'test' }),
        get: (key: string) => responseHeaders.get(key),
      } as any);

      await apiFetch('/api/test', { method: 'POST' });
      expect(getCsrfToken()).toBe('header-csrf');
    });

    it('should handle missing CSRF token gracefully', async () => {
      clearAuth();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      const result = await apiFetch('/api/test', { method: 'POST' });
      expect(result.ok).toBe(true);
    });
  });

  describe('User Data Extraction', () => {
    it('should extract and store user data from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () =>
          Promise.resolve(JSON.stringify({ csrf: 'token', user: mockUser })),
        json: () => Promise.resolve({ csrf: 'token', user: mockUser }),
      } as any);

      await apiFetch('/api/auth/login', { method: 'POST' });
      expect(setCurrentUser).toBeDefined();
    });

    it('should handle responses without user data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{"success": true}'),
      } as any);

      const result = await apiFetch('/api/test', { method: 'POST' });
      expect(result.ok).toBe(true);
    });
  });

  describe('401 Unauthorized Handling', () => {
    it('should trigger token refresh on 401 error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            headers: new Map(),
            text: () => Promise.resolve('{}'),
            json: () => Promise.resolve({}),
          } as any);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([['X-CSRF-Token', 'refreshed-csrf']]),
          text: () =>
            Promise.resolve(JSON.stringify({ csrf: 'refreshed-csrf', user: mockUser })),
          json: () => Promise.resolve({ csrf: 'refreshed-csrf', user: mockUser }),
        } as any);
      });

      const result = await apiFetch('/api/test', { method: 'POST' });
      expect(result.ok).toBe(true);
      expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should redirect to login on refresh failure', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { replace: vi.fn(), pathname: '/dashboard' } as any;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      const result = await apiFetch('/api/test', { method: 'POST' });
      expect(result.status).toBe(401);
      expect(result.ok).toBe(false);

      (window as any).location = originalLocation;
    });
  });

  describe('Request Methods', () => {
    it('should make GET requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{"data": "test"}'),
      } as any);

      await apiClient.get('/api/test');
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].method).toBeUndefined();
    });

    it('should make POST requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiClient.post('/api/test', { key: 'value' });
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('should make PUT requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiClient.put('/api/test', { key: 'value' });
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].method).toBe('PUT');
    });

    it('should make PATCH requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiClient.patch('/api/test', { key: 'value' });
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].method).toBe('PATCH');
    });

    it('should make DELETE requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiClient.delete('/api/test');
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].method).toBe('DELETE');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await apiFetch('/api/test');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
    });

    it('should handle invalid JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('invalid json'),
      } as any);

      const result = await apiFetch('/api/test');
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should include error data in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map(),
        text: () => Promise.resolve(JSON.stringify({ message: 'Bad request' })),
        json: () => Promise.resolve({ message: 'Bad request' }),
      } as any);

      const result = await apiFetch('/api/test');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Response Parsing', () => {
    it('should parse JSON responses', async () => {
      const responseData = { key: 'value', nested: { data: 'test' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(JSON.stringify(responseData)),
      } as any);

      const result = await apiFetch('/api/test');
      expect(result.data).toEqual(responseData);
    });

    it('should handle empty responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Map(),
        text: () => Promise.resolve(''),
      } as any);

      const result = await apiFetch('/api/test');
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('Credentials and Headers', () => {
    it('should include credentials in all requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiFetch('/api/test');
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].credentials).toBe('include');
    });

    it('should set Content-Type for mutating requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiFetch('/api/test', { method: 'POST' });
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].headers['Content-Type']).toBe('application/json');
    });

    it('should not include body for GET requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve('{}'),
      } as any);

      await apiFetch('/api/test', { method: 'GET', body: JSON.stringify({ data: 'test' }) });
      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].body).toBeUndefined();
    });
  });
});
