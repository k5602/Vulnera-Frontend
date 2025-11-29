import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService, AuthService } from '../auth-service';
import { setCsrfToken, setCurrentUser, clearAuth, __resetStorageInitFlag } from '../auth-store';

const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
};

describe('Auth Service', () => {
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

    describe('isAuthenticated', () => {
        it('should return false when no user is set', () => {
            expect(authService.isAuthenticated()).toBe(false);
        });

        it('should return true when user is set', () => {
            setCurrentUser(mockUser);
            expect(authService.isAuthenticated()).toBe(true);
        });
    });

    describe('getCurrentUser', () => {
        it('should return null when no user is set', () => {
            expect(authService.getCurrentUser()).toBeNull();
        });

        it('should return user when set', () => {
            setCurrentUser(mockUser);
            expect(authService.getCurrentUser()).toEqual(mockUser);
        });
    });

    describe('getToken', () => {
        it('should return null when no token is stored', () => {
            expect(authService.getToken()).toBeNull();
        });

        it('should return github_token if present', () => {
            localStorage.setItem('github_token', 'github-token-123');
            expect(authService.getToken()).toBe('github-token-123');
        });

        it('should return api_token if github_token is not present', () => {
            localStorage.setItem('api_token', 'api-token-456');
            expect(authService.getToken()).toBe('api-token-456');
        });

        it('should prefer github_token over api_token', () => {
            localStorage.setItem('github_token', 'github-token-123');
            localStorage.setItem('api_token', 'api-token-456');
            expect(authService.getToken()).toBe('github-token-123');
        });
    });

    describe('logout', () => {
        it('should call logout endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            setCurrentUser(mockUser);
            localStorage.setItem('github_token', 'token');

            await authService.logout();

            expect(global.fetch).toHaveBeenCalled();
            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('/auth/logout');
        });

        it('should clear auth state even if logout endpoint fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            setCurrentUser(mockUser);
            setCsrfToken('csrf-token');
            localStorage.setItem('github_token', 'token');

            await authService.logout();

            expect(authService.isAuthenticated()).toBe(false);
            expect(authService.getToken()).toBeNull();
        });

        it('should remove stored tokens', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            localStorage.setItem('github_token', 'github-token');
            localStorage.setItem('api_token', 'api-token');

            await authService.logout();

            expect(localStorage.getItem('github_token')).toBeNull();
            expect(localStorage.getItem('api_token')).toBeNull();
        });
    });

    describe('listApiKeys', () => {
        it('should fetch API keys successfully', async () => {
            const mockKeys = [
                { id: 'key-1', name: 'Test Key 1', created_at: '2024-01-01' },
                { id: 'key-2', name: 'Test Key 2', created_at: '2024-01-02' },
            ];

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(mockKeys)),
            });

            const result = await authService.listApiKeys();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockKeys);
        });

        it('should handle rate limiting (429)', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limit exceeded',
                    details: { retry_after: 30 },
                })),
            });

            const result = await authService.listApiKeys();

            expect(result.success).toBe(false);
            expect(result.status).toBe(429);
            expect(result.error).toContain('Rate limited');
            expect(result.error).toContain('30 seconds');
        });

        it('should handle rate limiting with default retry_after', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limit exceeded',
                })),
            });

            const result = await authService.listApiKeys();

            expect(result.success).toBe(false);
            expect(result.error).toContain('5 seconds');
        });

        it('should handle server errors', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    message: 'Internal server error',
                })),
            });

            const result = await authService.listApiKeys();

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await authService.listApiKeys();

            expect(result.success).toBe(false);
            // apiClient catches network errors and returns generic 'Network error'
            // listApiKeys then wraps this in extractApiErrorMessage
            expect(result.error).toBeDefined();
        });

        it('should add cache-bust parameter when forceRefresh is true', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('[]'),
            });

            await authService.listApiKeys(true);

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('_t=');
        });
    });

    describe('createApiKey', () => {
        it('should create API key successfully', async () => {
            const mockKey = {
                id: 'key-new',
                name: 'New Key',
                key: 'sk_live_abc123',
                created_at: '2024-01-01',
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(mockKey)),
            });

            const result = await authService.createApiKey({
                name: 'New Key',
                expires_at: '2025-01-01',
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockKey);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.name).toBe('New Key');
            expect(body.expires_at).toBe('2025-01-01');
        });

        it('should handle rate limiting when creating key', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limit exceeded',
                    details: { retry_after: 60 },
                })),
            });

            const result = await authService.createApiKey({ name: 'New Key' });

            expect(result.success).toBe(false);
            expect(result.status).toBe(429);
        });

        it('should include CSRF token', async () => {
            setCsrfToken('create-key-csrf');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await authService.createApiKey({ name: 'Test' });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('create-key-csrf');
        });
    });

    describe('revokeApiKey', () => {
        it('should revoke API key successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({ success: true })),
            });

            const result = await authService.revokeApiKey('key-to-revoke');

            expect(result.success).toBe(true);

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('/api-keys/key-to-revoke');
            expect(fetchCall[1].method).toBe('DELETE');
        });

        it('should handle rate limiting when revoking key', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limit exceeded',
                    details: { retry_after: 15 },
                })),
            });

            const result = await authService.revokeApiKey('key-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(429);
            expect(result.error).toContain('15 seconds');
        });

        it('should handle key not found', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    message: 'API key not found',
                })),
            });

            const result = await authService.revokeApiKey('nonexistent-key');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
        });
    });

    describe('checkApiKeyEndpoint', () => {
        it('should return true when endpoint is available', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('[]'),
            });

            const result = await authService.checkApiKeyEndpoint();

            expect(result).toBe(true);
        });

        it('should return false when endpoint returns 404', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            const result = await authService.checkApiKeyEndpoint();

            expect(result).toBe(false);
        });

        it('should return true for other error statuses (endpoint exists)', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            const result = await authService.checkApiKeyEndpoint();

            expect(result).toBe(true);
        });

        it('should return false on network error', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await authService.checkApiKeyEndpoint();

            expect(result).toBe(false);
        });
    });

    describe('Instance creation', () => {
        it('should export a singleton instance', () => {
            expect(authService).toBeDefined();
            expect(authService).toBeInstanceOf(AuthService);
        });
    });
});
