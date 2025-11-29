import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { serverFetch, replacePathParams, createJsonResponse } from '../server-client';

// Mock environment variable
const originalEnv = process.env;

describe('Server Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, PUBLIC_API_BASE: 'http://localhost:8000' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('serverFetch', () => {
        it('should return 503 when PUBLIC_API_BASE is not set', async () => {
            process.env.PUBLIC_API_BASE = '';

            const mockRequest = new Request('http://localhost:3000/api/v1/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(503);
            expect(result.error).toBe('Backend not configured (set PUBLIC_API_BASE)');
        });

        it('should forward cookies from incoming request', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'session_id=abc123; auth_token=xyz789',
                },
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{"success": true}'),
            });

            await serverFetch(mockRequest, '/api/v1/test', { method: 'POST', body: { data: 'test' } });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Cookie': 'session_id=abc123; auth_token=xyz789',
                    }),
                })
            );
        });

        it('should forward CSRF token from incoming request header', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': 'csrf-token-123',
                },
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{"success": true}'),
            });

            await serverFetch(mockRequest, '/api/v1/test', { method: 'POST' });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'csrf-token-123',
                    }),
                })
            );
        });

        it('should make GET requests without body', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{"data": "test"}'),
            });

            await serverFetch(mockRequest, '/api/v1/test', { method: 'GET' });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].body).toBeUndefined();
        });

        it('should make POST requests with JSON body', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test', {
                method: 'POST',
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{"success": true}'),
            });

            await serverFetch(mockRequest, '/api/v1/test', {
                method: 'POST',
                body: { key: 'value', nested: { data: true } },
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(JSON.parse(fetchCall[1].body)).toEqual({ key: 'value', nested: { data: true } });
        });

        it('should include credentials in all requests', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await serverFetch(mockRequest, '/api/v1/test');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].credentials).toBe('include');
        });

        it('should parse JSON response correctly', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');
            const responseData = { key: 'value', nested: { data: 'test' } };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(responseData)),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(true);
            expect(result.status).toBe(200);
            expect(result.data).toEqual(responseData);
        });

        it('should handle empty response (204)', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
                headers: new Headers(),
                text: () => Promise.resolve(''),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(true);
            expect(result.status).toBe(204);
            expect(result.data).toBeUndefined();
        });

        it('should handle invalid JSON gracefully', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('not valid json'),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(true);
            expect(result.data).toBeUndefined();
        });

        it('should return error data for non-ok responses', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');
            const errorData = { error: 'Bad request', code: 'INVALID_INPUT' };

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(errorData)),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toEqual(errorData);
        });

        it('should handle network errors', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(0);
            expect(result.error).toBe('Network error');
        });

        it('should include response headers', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');
            const responseHeaders = new Headers({
                'X-CSRF-Token': 'new-csrf-token',
                'Content-Type': 'application/json',
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: responseHeaders,
                text: () => Promise.resolve('{}'),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.headers).toBeDefined();
            expect(result.headers?.get('X-CSRF-Token')).toBe('new-csrf-token');
        });

        it('should handle rate limiting (429) responses', async () => {
            const mockRequest = new Request('http://localhost:3000/api/v1/test');
            const errorData = { error: 'Rate limited', details: { retry_after: 60 } };

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(errorData)),
            });

            const result = await serverFetch(mockRequest, '/api/v1/test');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(429);
            expect(result.error).toEqual(errorData);
        });

        it('should normalize trailing slash in PUBLIC_API_BASE', async () => {
            process.env.PUBLIC_API_BASE = 'http://localhost:8000/';

            const mockRequest = new Request('http://localhost:3000/api/v1/test');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await serverFetch(mockRequest, '/api/v1/test');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/test',
                expect.any(Object)
            );
        });
    });

    describe('replacePathParams', () => {
        it('should replace single parameter', () => {
            const result = replacePathParams('/api/v1/jobs/:job_id', { job_id: '123' });
            expect(result).toBe('/api/v1/jobs/123');
        });

        it('should replace multiple parameters', () => {
            const result = replacePathParams('/api/v1/:resource/:id/action', {
                resource: 'jobs',
                id: '456',
            });
            expect(result).toBe('/api/v1/jobs/456/action');
        });

        it('should encode special characters', () => {
            const result = replacePathParams('/api/v1/jobs/:job_id', { job_id: 'test/value' });
            expect(result).toBe('/api/v1/jobs/test%2Fvalue');
        });

        it('should leave unmatched parameters', () => {
            const result = replacePathParams('/api/v1/jobs/:job_id/:other', { job_id: '123' });
            expect(result).toBe('/api/v1/jobs/123/:other');
        });
    });

    describe('createJsonResponse', () => {
        it('should create successful response with data', () => {
            const serverResponse = {
                ok: true,
                status: 200,
                data: { key: 'value' },
            };

            const response = createJsonResponse(serverResponse);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/json');
        });

        it('should create error response with error data', () => {
            const serverResponse = {
                ok: false,
                status: 400,
                error: { message: 'Bad request' },
            };

            const response = createJsonResponse(serverResponse);

            expect(response.status).toBe(400);
        });

        it('should forward CSRF token from backend response', () => {
            const headers = new Headers();
            headers.set('X-CSRF-Token', 'csrf-from-backend');

            const serverResponse = {
                ok: true,
                status: 200,
                data: {},
                headers,
            };

            const response = createJsonResponse(serverResponse);

            expect(response.headers.get('X-CSRF-Token')).toBe('csrf-from-backend');
        });

        it('should include additional headers', () => {
            const serverResponse = {
                ok: true,
                status: 200,
                data: {},
            };

            const response = createJsonResponse(serverResponse, {
                'X-Custom-Header': 'custom-value',
            });

            expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
        });
    });
});
