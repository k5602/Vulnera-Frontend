import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enrichService } from '../enrich-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

describe('Enrich Service', () => {
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

    describe('enrichJob', () => {
        it('should return 400 for empty jobId', async () => {
            const result = await enrichService.enrichJob('', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Invalid job ID');
        });

        it('should return 400 for null jobId', async () => {
            const result = await enrichService.enrichJob('null', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Invalid job ID');
        });

        it('should return 400 for undefined jobId', async () => {
            const result = await enrichService.enrichJob('undefined', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(400);
            expect(result.error).toBe('Invalid job ID');
        });

        it('should make POST request with correct endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    enriched_count: 2,
                    failed_count: 0,
                    findings: [
                        {
                            id: 'finding-1',
                            explanation: 'This is a SQL injection vulnerability',
                            remediation_suggestion: 'Use parameterized queries',
                            risk_summary: 'High risk - data breach possible',
                            enrichment_successful: true,
                        },
                        {
                            id: 'finding-2',
                            explanation: 'XSS vulnerability detected',
                            remediation_suggestion: 'Sanitize user input',
                            risk_summary: 'Medium risk',
                            enrichment_successful: true,
                        },
                    ],
                })),
            });

            const result = await enrichService.enrichJob('job-123', {
                finding_ids: ['finding-1', 'finding-2'],
                code_contexts: {
                    'finding-1': 'const query = "SELECT * FROM users WHERE id = " + userId;',
                    'finding-2': 'document.innerHTML = userInput;',
                },
            });

            expect(result.ok).toBe(true);
            expect(result.data?.job_id).toBe('job-123');
            expect(result.data?.enriched_count).toBe(2);
            expect(result.data?.findings).toHaveLength(2);

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('/api/v1/jobs/job-123/enrich');
        });

        it('should include CSRF token in request', async () => {
            setCsrfToken('enrich-csrf-token');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    enriched_count: 0,
                    failed_count: 0,
                    findings: [],
                })),
            });

            await enrichService.enrichJob('job-123', {
                finding_ids: [],
                code_contexts: {},
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('enrich-csrf-token');
        });

        it('should include credentials in request', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await enrichService.enrichJob('job-123', {
                finding_ids: [],
                code_contexts: {},
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].credentials).toBe('include');
        });

        it('should handle enrichment errors', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    enriched_count: 1,
                    failed_count: 1,
                    findings: [
                        {
                            id: 'finding-1',
                            explanation: '',
                            remediation_suggestion: '',
                            risk_summary: '',
                            enrichment_successful: false,
                            enrichment_error: 'Failed to process finding',
                        },
                    ],
                })),
            });

            const result = await enrichService.enrichJob('job-123', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(true);
            expect(result.data?.failed_count).toBe(1);
            expect(result.data?.findings[0].enrichment_successful).toBe(false);
            expect(result.data?.findings[0].enrichment_error).toBe('Failed to process finding');
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

            const result = await enrichService.enrichJob('job-123', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle rate limiting', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Rate limit exceeded',
                    details: { retry_after: 30 },
                })),
            });

            const result = await enrichService.enrichJob('job-123', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(429);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await enrichService.enrichJob('job-123', {
                finding_ids: ['finding-1'],
                code_contexts: {},
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(0);
        });
    });
});
