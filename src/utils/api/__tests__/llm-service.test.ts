import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { llmService, LlmService } from '../llm-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

describe('LLM Service', () => {
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

    describe('explain', () => {
        it('should return 400 if vulnerability_id is missing', async () => {
            const result = await llmService.explain({
                vulnerability_id: '',
                description: 'Test description',
                affected_component: 'test-component',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Missing vulnerability_id');
        });

        it('should return 400 if description is missing', async () => {
            const result = await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: '',
                affected_component: 'test-component',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Missing description');
        });

        it('should return 400 if affected_component is missing', async () => {
            const result = await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: 'Test description',
                affected_component: '',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Missing affected_component');
        });

        it('should make POST request with correct payload', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    summary: 'Test summary',
                    explanation: 'Test explanation',
                })),
            });

            const result = await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: 'SQL injection vulnerability',
                affected_component: 'user-service',
                audience: 'developer',
            });

            expect(result.ok).toBe(true);
            expect(result.data).toEqual({
                summary: 'Test summary',
                explanation: 'Test explanation',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.vulnerability_id).toBe('CVE-2023-1234');
            expect(body.description).toBe('SQL injection vulnerability');
            expect(body.affected_component).toBe('user-service');
            expect(body.audience).toBe('developer');
        });

        it('should use default audience if not provided', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: 'Test',
                affected_component: 'test',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.audience).toBe('technical');
        });

        it('should include CSRF token in request headers', async () => {
            setCsrfToken('my-csrf-token');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: 'Test',
                affected_component: 'test',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('my-csrf-token');
        });

        it('should handle rate limiting response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limited',
                    details: { retry_after: 60 },
                })),
            });

            const result = await llmService.explain({
                vulnerability_id: 'CVE-2023-1234',
                description: 'Test',
                affected_component: 'test',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(429);
        });
    });

    describe('fix', () => {
        it('should return 400 if vulnerability_id is missing', async () => {
            const result = await llmService.fix({
                vulnerability_id: '',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Missing vulnerability_id');
        });

        it('should make POST request with correct payload', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    confidence: 0.85,
                    explanation: 'Fixed the SQL injection',
                    fixed_code: 'const query = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);',
                })),
            });

            const result = await llmService.fix({
                vulnerability_id: 'CVE-2023-1234',
                context: 'User authentication module',
                language: 'javascript',
                vulnerable_code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
            });

            expect(result.ok).toBe(true);
            expect(result.data?.confidence).toBe(0.85);
            expect(result.data?.fixed_code).toContain('prepare');

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.vulnerability_id).toBe('CVE-2023-1234');
            expect(body.language).toBe('javascript');
        });

        it('should use default values for optional fields', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await llmService.fix({
                vulnerability_id: 'CVE-2023-1234',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.context).toBe('N/A');
            expect(body.language).toBe('javascript');
            expect(body.vulnerable_code).toBe('Vulnerability reference');
        });

        it('should include credentials in request', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await llmService.fix({
                vulnerability_id: 'CVE-2023-1234',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].credentials).toBe('include');
        });
    });

    describe('query', () => {
        it('should return 400 if query is missing', async () => {
            const result = await llmService.query({
                query: '',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Missing query');
        });

        it('should make POST request with correct payload', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    response: 'To prevent SQL injection, use parameterized queries...',
                    confidence: 0.9,
                })),
            });

            const result = await llmService.query({
                query: 'How do I prevent SQL injection?',
                context: 'Node.js with PostgreSQL',
            });

            expect(result.ok).toBe(true);
            expect(result.data?.response).toContain('parameterized queries');

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.query).toBe('How do I prevent SQL injection?');
            expect(body.context).toBe('Node.js with PostgreSQL');
        });

        it('should use empty string as default context', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await llmService.query({
                query: 'Test query',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.context).toBe('');
        });

        it('should handle server errors', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Internal server error',
                })),
            });

            const result = await llmService.query({
                query: 'Test query',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });
    });

    describe('Instance creation', () => {
        it('should export a singleton instance', () => {
            expect(llmService).toBeDefined();
            expect(llmService).toBeInstanceOf(LlmService);
        });

        it('should allow creating new instances', () => {
            const newInstance = new LlmService();
            expect(newInstance).toBeInstanceOf(LlmService);
            expect(newInstance).not.toBe(llmService);
        });
    });
});
