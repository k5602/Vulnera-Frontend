/**
 * Me Service Tests (Personal Analytics)
 * Tests for personal user dashboard and usage analytics
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { meService, MeService } from '../me-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

// Helper to create mock fetch response
const createMockResponse = (ok: boolean, status: number, data: unknown = {}) => ({
    ok,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(data)),
});

describe('Me Service (Personal Analytics)', () => {
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

    // =========================================================================
    // Get Personal Dashboard
    // =========================================================================
    describe('getDashboard', () => {
        it('should return personal dashboard on success', async () => {
            const dashboard = {
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    name: 'Test User',
                },
                stats: {
                    total_scans: 50,
                    scans_this_month: 10,
                    total_vulnerabilities_found: 120,
                    critical_vulnerabilities: 5,
                    high_vulnerabilities: 20,
                },
                quota: {
                    plan: 'pro',
                    scans_limit: 1000,
                    scans_used: 50,
                    scans_remaining: 950,
                },
                recent_scans: [
                    { id: 'scan-1', source_uri: 'repo.git', status: 'completed' },
                ],
                top_vulnerabilities: [],
                organizations: [
                    { id: 'org-1', name: 'My Org', role: 'owner' },
                ],
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, dashboard));

            const result = await meService.getDashboard();

            expect(result.success).toBe(true);
            expect(result.data?.user.email).toBe('test@example.com');
            expect(result.data?.stats.total_scans).toBe(50);
            expect(result.data?.quota.plan).toBe('pro');
        });

        it('should handle unauthorized (401)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 401, { message: 'Unauthorized' })
            );

            const result = await meService.getDashboard();

            expect(result.success).toBe(false);
            expect(result.status).toBe(401);
        });

        it('should handle server errors', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Internal server error' })
            );

            const result = await meService.getDashboard();

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await meService.getDashboard();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('should call correct endpoint', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await meService.getDashboard();

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('/me/analytics/dashboard');
        });
    });

    // =========================================================================
    // Get Personal Usage
    // =========================================================================
    describe('getUsage', () => {
        it('should return usage analytics with default period (30d)', async () => {
            const usage = {
                period_start: '2024-01-01',
                period_end: '2024-01-31',
                total_scans: 100,
                total_api_calls: 500,
                total_llm_queries: 50,
                total_vulnerabilities: 200,
                daily_usage: [
                    { date: '2024-01-01', scans: 5, api_calls: 20, llm_queries: 2, vulnerabilities_found: 10 },
                ],
                breakdown_by_source_type: {
                    file: 40,
                    git: 30,
                    github: 20,
                    url: 10,
                },
                breakdown_by_severity: {
                    critical: 10,
                    high: 40,
                    medium: 80,
                    low: 50,
                    info: 20,
                },
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, usage));

            const result = await meService.getUsage();

            expect(result.success).toBe(true);
            expect(result.data?.total_scans).toBe(100);
            expect(result.data?.breakdown_by_severity.critical).toBe(10);
        });

        it('should use default period of 30d', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await meService.getUsage();

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=30d');
        });

        it('should pass 7d period parameter', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await meService.getUsage('7d');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=7d');
        });

        it('should pass 90d period parameter', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await meService.getUsage('90d');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=90d');
        });

        it('should pass 365d period parameter', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await meService.getUsage('365d');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=365d');
        });

        it('should handle unauthorized (401)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 401, { message: 'Unauthorized' })
            );

            const result = await meService.getUsage('30d');

            expect(result.success).toBe(false);
            expect(result.status).toBe(401);
        });

        it('should handle server errors', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Internal error' })
            );

            const result = await meService.getUsage('30d');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

            const result = await meService.getUsage('30d');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });
    });

    // =========================================================================
    // Instance Check
    // =========================================================================
    describe('Instance creation', () => {
        it('should export a singleton instance', () => {
            expect(meService).toBeDefined();
            expect(meService).toBeInstanceOf(MeService);
        });
    });
});
