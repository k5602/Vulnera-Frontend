import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scanService, type AnalyzeJobRequest, type AnalysisJobStatusData } from '../scan-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

describe('Scan Service', () => {
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

    describe('submitAnalysisJob', () => {
        it('should make POST request with normalized payload', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'queued',
                    submitted_at: '2024-01-01T00:00:00Z',
                })),
            });

            const payload: AnalyzeJobRequest = {
                source_type: 'git',
                source_uri: 'https://github.com/example/repo.git',
                analysis_depth: 'standard',
            };

            const result = await scanService.submitAnalysisJob(payload);

            expect(result.ok).toBe(true);
            expect(result.data?.job_id).toBe('job-123');

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.source_type).toBe('git');
            expect(body.source_uri).toBe('https://github.com/example/repo.git');
            expect(body.analysis_depth).toBe('standard');
        });

        it('should include callback_url when provided', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'queued',
                })),
            });

            const payload: AnalyzeJobRequest = {
                source_type: 'git',
                source_uri: 'https://github.com/example/repo.git',
                analysis_depth: 'full',
                callback_url: 'https://example.com/webhook',
            };

            await scanService.submitAnalysisJob(payload);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.callback_url).toBe('https://example.com/webhook');
        });

        it('should include CSRF token', async () => {
            setCsrfToken('scan-csrf-token');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            await scanService.submitAnalysisJob({
                source_type: 'file_upload',
                source_uri: '/tmp/package.json',
                analysis_depth: 'minimal',
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('scan-csrf-token');
        });

        it('should handle different source types', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve('{}'),
            });

            const sourceTypes = ['git', 'directory', 'file_upload', 's3_bucket'] as const;

            for (const sourceType of sourceTypes) {
                await scanService.submitAnalysisJob({
                    source_type: sourceType,
                    source_uri: '/test/path',
                    analysis_depth: 'standard',
                });
            }

            expect(global.fetch).toHaveBeenCalledTimes(4);
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

            const result = await scanService.submitAnalysisJob({
                source_type: 'git',
                source_uri: 'https://github.com/example/repo.git',
                analysis_depth: 'standard',
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });
    });

    describe('getAnalysisJob', () => {
        it('should make GET request with correct job_id', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-456',
                    status: 'completed',
                    summary: {
                        total_findings: 10,
                        critical: 2,
                        high: 3,
                        medium: 3,
                        low: 1,
                        info: 1,
                        modules_completed: 4,
                        modules_failed: 0,
                    },
                    findings: [],
                })),
            });

            const result = await scanService.getAnalysisJob('job-456');

            expect(result.ok).toBe(true);
            expect(result.data?.job_id).toBe('job-456');
            expect(result.data?.status).toBe('completed');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('/api/v1/jobs/job-456');
        });

        it('should handle job not found', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Job not found',
                })),
            });

            const result = await scanService.getAnalysisJob('nonexistent-job');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(404);
        });

        it('should return full job status data', async () => {
            const mockJobData: AnalysisJobStatusData = {
                job_id: 'job-789',
                status: 'running',
                summary: {
                    total_findings: 5,
                    critical: 1,
                    high: 2,
                    medium: 1,
                    low: 1,
                    info: 0,
                    modules_completed: 2,
                    modules_failed: 0,
                },
                findings: [
                    {
                        id: 'finding-1',
                        type: 'Vulnerability',
                        location: { path: '/src/index.js', line: 10 },
                        severity: 'Critical',
                        confidence: 'High',
                        description: 'SQL injection vulnerability',
                    },
                ],
                started_at: '2024-01-01T00:00:00Z',
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify(mockJobData)),
            });

            const result = await scanService.getAnalysisJob('job-789');

            expect(result.ok).toBe(true);
            expect(result.data?.findings).toHaveLength(1);
            expect(result.data?.findings[0].severity).toBe('Critical');
        });
    });

    describe('pollAnalysisJob', () => {
        it('should return immediately for terminal status (completed)', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'completed',
                    summary: {
                        total_findings: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                        modules_completed: 4,
                        modules_failed: 0,
                    },
                    findings: [],
                })),
            });

            const result = await scanService.pollAnalysisJob('job-123', {
                intervalMs: 100,
                timeoutMs: 1000,
            });

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('completed');
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should return immediately for terminal status (failed)', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'failed',
                    summary: {
                        total_findings: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                        modules_completed: 0,
                        modules_failed: 4,
                    },
                    findings: [],
                    errors: [{ message: 'Analysis failed' }],
                })),
            });

            const result = await scanService.pollAnalysisJob('job-123');

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('failed');
        });

        it('should poll multiple times for non-terminal status', async () => {
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                const status = callCount < 3 ? 'running' : 'completed';
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers(),
                    text: () => Promise.resolve(JSON.stringify({
                        job_id: 'job-123',
                        status,
                        summary: {
                            total_findings: 0,
                            critical: 0,
                            high: 0,
                            medium: 0,
                            low: 0,
                            info: 0,
                            modules_completed: callCount,
                            modules_failed: 0,
                        },
                        findings: [],
                    })),
                });
            });

            const result = await scanService.pollAnalysisJob('job-123', {
                intervalMs: 10,
                timeoutMs: 5000,
            });

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('completed');
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should call onUpdate callback', async () => {
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                const status = callCount < 2 ? 'running' : 'completed';
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers(),
                    text: () => Promise.resolve(JSON.stringify({
                        job_id: 'job-123',
                        status,
                        summary: {
                            total_findings: 0,
                            critical: 0,
                            high: 0,
                            medium: 0,
                            low: 0,
                            info: 0,
                            modules_completed: callCount,
                            modules_failed: 0,
                        },
                        findings: [],
                    })),
                });
            });

            const onUpdate = vi.fn();
            await scanService.pollAnalysisJob('job-123', {
                intervalMs: 10,
                onUpdate,
            });

            expect(onUpdate).toHaveBeenCalledTimes(2);
        });

        it('should timeout after specified duration', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'running',
                    summary: {
                        total_findings: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                        modules_completed: 0,
                        modules_failed: 0,
                    },
                    findings: [],
                })),
            });

            const result = await scanService.pollAnalysisJob('job-123', {
                intervalMs: 50,
                timeoutMs: 100,
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(408);
            expect(result.error).toBe('Analysis job polling timed out');
        });

        it('should abort when signal is triggered', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    job_id: 'job-123',
                    status: 'running',
                    summary: {
                        total_findings: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                        modules_completed: 0,
                        modules_failed: 0,
                    },
                    findings: [],
                })),
            });

            const abortController = new AbortController();

            // Abort immediately after first poll
            setTimeout(() => abortController.abort(), 50);

            const result = await scanService.pollAnalysisJob('job-123', {
                intervalMs: 100,
                timeoutMs: 5000,
                signal: abortController.signal,
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(499);
            expect(result.error).toBe('Polling aborted');
        });

        it('should handle API errors during polling', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({
                    error: 'Internal server error',
                })),
            });

            const result = await scanService.pollAnalysisJob('job-123');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });
    });
});
