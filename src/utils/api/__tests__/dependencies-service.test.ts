/**
 * Dependencies Service Tests
 * Tests for batch dependency analysis
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dependenciesService, DependenciesService } from '../dependencies-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

// Helper to create mock fetch response
const createMockResponse = (ok: boolean, status: number, data: unknown = {}) => ({
    ok,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(data)),
});

describe('Dependencies Service', () => {
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
    // Analyze Dependencies
    // =========================================================================
    describe('analyze', () => {
        it('should analyze dependencies successfully', async () => {
            const analysisResult = {
                total_dependencies: 5,
                vulnerable_count: 2,
                outdated_count: 1,
                critical_count: 0,
                high_count: 1,
                medium_count: 1,
                low_count: 0,
                info_count: 0,
                results: [
                    {
                        name: 'lodash',
                        version: '4.17.15',
                        ecosystem: 'npm',
                        is_vulnerable: true,
                        vulnerabilities: [
                            {
                                id: 'vuln-1',
                                cve_id: 'CVE-2021-23337',
                                title: 'Prototype Pollution',
                                severity: 'high',
                            },
                        ],
                        latest_version: '4.17.21',
                        is_outdated: true,
                    },
                ],
                analysis_time_ms: 250,
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, analysisResult));

            const result = await dependenciesService.analyze({
                dependencies: [
                    { name: 'lodash', version: '4.17.15', ecosystem: 'npm' },
                ],
            });

            expect(result.success).toBe(true);
            expect(result.data?.vulnerable_count).toBe(2);
            expect(result.data?.results[0].name).toBe('lodash');
        });

        it('should handle rate limiting (429)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 429, {
                    error: 'Rate limited',
                    details: { retry_after: 60 },
                })
            );

            const result = await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'npm' }],
            });

            expect(result.success).toBe(false);
            expect(result.status).toBe(429);
            expect(result.error).toContain('60 seconds');
        });

        it('should handle validation errors (400)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 400, { message: 'Invalid ecosystem' })
            );

            const result = await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'invalid' as any }],
            });

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
        });

        it('should handle server errors', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Internal error' })
            );

            const result = await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'npm' }],
            });

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

            const result = await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'npm' }],
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('should include CSRF token in request', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'npm' }],
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('test-csrf-token');
        });

        it('should support transitive dependencies option', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await dependenciesService.analyze({
                dependencies: [{ name: 'test', version: '1.0.0', ecosystem: 'npm' }],
                include_transitive: true,
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.include_transitive).toBe(true);
        });
    });

    // =========================================================================
    // Analyze Single Dependency
    // =========================================================================
    describe('analyzeSingle', () => {
        it('should analyze a single dependency', async () => {
            const singleResult = {
                total_dependencies: 1,
                vulnerable_count: 0,
                results: [
                    {
                        name: 'express',
                        version: '4.18.2',
                        ecosystem: 'npm',
                        is_vulnerable: false,
                        vulnerabilities: [],
                        latest_version: '4.18.2',
                        is_outdated: false,
                    },
                ],
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, singleResult));

            const result = await dependenciesService.analyzeSingle('express', '4.18.2', 'npm');

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('express');
            expect(result.data?.is_vulnerable).toBe(false);
        });

        it('should handle errors from analyze method', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Error' })
            );

            const result = await dependenciesService.analyzeSingle('test', '1.0.0', 'npm');

            expect(result.success).toBe(false);
        });

        it('should handle missing result', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { results: [] })
            );

            const result = await dependenciesService.analyzeSingle('test', '1.0.0', 'npm');

            expect(result.success).toBe(false);
            expect(result.error).toContain('No analysis result');
        });
    });

    // =========================================================================
    // Analyze package.json
    // =========================================================================
    describe('analyzePackageJson', () => {
        it('should parse and analyze package.json dependencies', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, {
                    total_dependencies: 2,
                    vulnerable_count: 0,
                    results: [],
                })
            );

            const packageJson = {
                dependencies: {
                    'express': '^4.18.2',
                    'lodash': '~4.17.21',
                },
            };

            const result = await dependenciesService.analyzePackageJson(packageJson);

            expect(result.success).toBe(true);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(2);
            // Version prefixes should be stripped
            expect(body.dependencies[0].version).toBe('4.18.2');
            expect(body.dependencies[1].version).toBe('4.17.21');
        });

        it('should include dev dependencies when option is set', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            const packageJson = {
                dependencies: { 'express': '4.18.2' },
                devDependencies: { 'jest': '29.0.0' },
            };

            await dependenciesService.analyzePackageJson(packageJson, { includeDevDependencies: true });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(2);
        });

        it('should skip dev dependencies by default', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            const packageJson = {
                dependencies: { 'express': '4.18.2' },
                devDependencies: { 'jest': '29.0.0' },
            };

            await dependenciesService.analyzePackageJson(packageJson);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(1);
        });

        it('should return empty result for empty package.json', async () => {
            const packageJson = {};

            const result = await dependenciesService.analyzePackageJson(packageJson);

            expect(result.success).toBe(true);
            expect(result.data?.total_dependencies).toBe(0);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should set ecosystem to npm', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            await dependenciesService.analyzePackageJson({
                dependencies: { 'express': '4.18.2' },
            });

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies[0].ecosystem).toBe('npm');
        });
    });

    // =========================================================================
    // Analyze requirements.txt
    // =========================================================================
    describe('analyzeRequirementsTxt', () => {
        it('should parse and analyze requirements.txt', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, {
                    total_dependencies: 3,
                    vulnerable_count: 1,
                    results: [],
                })
            );

            const content = `
django==4.2.0
requests>=2.28.0
flask==2.3.2
            `;

            const result = await dependenciesService.analyzeRequirementsTxt(content);

            expect(result.success).toBe(true);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(3);
            expect(body.dependencies[0].ecosystem).toBe('pypi');
        });

        it('should skip comments and empty lines', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            const content = `
# This is a comment
django==4.2.0

# Another comment
requests>=2.28.0
            `;

            await dependenciesService.analyzeRequirementsTxt(content);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(2);
        });

        it('should skip flag lines (starting with -)', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            const content = `
-r base.txt
-e git+https://github.com/user/repo.git
django==4.2.0
            `;

            await dependenciesService.analyzeRequirementsTxt(content);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(1);
        });

        it('should return empty result for empty requirements.txt', async () => {
            const content = `
# Only comments
# No actual dependencies
            `;

            const result = await dependenciesService.analyzeRequirementsTxt(content);

            expect(result.success).toBe(true);
            expect(result.data?.total_dependencies).toBe(0);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should handle various version operators', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, { results: [] }));

            const content = `
django==4.2.0
requests>=2.28.0
flask<=2.3.2
numpy~=1.24.0
            `;

            await dependenciesService.analyzeRequirementsTxt(content);

            const fetchCall = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.dependencies).toHaveLength(4);
            // All versions should be extracted correctly
            expect(body.dependencies.map((d: any) => d.version)).toEqual(['4.2.0', '2.28.0', '2.3.2', '1.24.0']);
        });
    });

    // =========================================================================
    // Instance Check
    // =========================================================================
    describe('Instance creation', () => {
        it('should export a singleton instance', () => {
            expect(dependenciesService).toBeDefined();
            expect(dependenciesService).toBeInstanceOf(DependenciesService);
        });
    });
});
