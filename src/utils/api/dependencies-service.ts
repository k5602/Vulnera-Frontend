/**
 * Dependencies Service
 * Service for batch dependency analysis (extensions, package managers)
 */
import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';

/** Extract error message from unknown API error response */
function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return fallback;
}

// ============================================================================
// Type Definitions (from OpenAPI spec)
// ============================================================================

/** Dependency to analyze */
export interface DependencyInput {
    name: string;
    version: string;
    ecosystem: 'npm' | 'pypi' | 'maven' | 'nuget' | 'go' | 'cargo' | 'gem' | 'composer';
}

/** Vulnerability found in a dependency */
export interface DependencyVulnerability {
    id: string;
    cve_id?: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    cvss_score?: number;
    cvss_vector?: string;
    published_at?: string;
    patched_versions?: string[];
    references?: string[];
}

/** Analysis result for a single dependency */
export interface DependencyAnalysisResult {
    name: string;
    version: string;
    ecosystem: string;
    is_vulnerable: boolean;
    vulnerabilities: DependencyVulnerability[];
    latest_version?: string;
    is_outdated: boolean;
    license?: string;
    repository_url?: string;
}

/** Batch analysis request */
export interface AnalyzeDependenciesRequest {
    dependencies: DependencyInput[];
    include_transitive?: boolean;
    include_dev_dependencies?: boolean;
}

/** Batch analysis response */
export interface AnalyzeDependenciesResponse {
    total_dependencies: number;
    vulnerable_count: number;
    outdated_count: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    results: DependencyAnalysisResult[];
    analysis_time_ms: number;
}

/** Standard API response */
export interface DependenciesServiceResponse<T = unknown> {
    success: boolean;
    status?: number;
    error?: string;
    data?: T;
}

// ============================================================================
// Dependencies Service Implementation
// ============================================================================

export class DependenciesService {
    /**
     * Analyze a batch of dependencies for vulnerabilities
     * for the single file analyzes
     * 
     * @param payload - Dependencies to analyze with options
     * @returns Analysis results with vulnerability information
     */
    async analyze(payload: AnalyzeDependenciesRequest): Promise<DependenciesServiceResponse<AnalyzeDependenciesResponse>> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.DEPENDENCIES.ANALYZE, payload);

            if (!response.ok) {
                // Handle rate limiting
                if (response.status === 429) {
                    const errorData = response.error as { details?: { retry_after?: number } } | undefined;
                    const retryAfter = errorData?.details?.retry_after || 5;
                    return {
                        success: false,
                        status: response.status,
                        error: `Rate limited. Please retry after ${retryAfter} seconds.`,
                    };
                }

                // Handle validation errors (400)
                if (response.status === 400) {
                    return {
                        success: false,
                        status: response.status,
                        error: extractApiErrorMessage(response.error, 'Invalid dependencies format'),
                    };
                }

                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to analyze dependencies'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as AnalyzeDependenciesResponse,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while analyzing dependencies',
            };
        }
    }

    /**
     * Convenience method to analyze a single dependency
     */
    async analyzeSingle(
        name: string,
        version: string,
        ecosystem: DependencyInput['ecosystem']
    ): Promise<DependenciesServiceResponse<DependencyAnalysisResult>> {
        const response = await this.analyze({
            dependencies: [{ name, version, ecosystem }],
        });

        if (!response.success) {
            return {
                success: false,
                status: response.status,
                error: response.error,
            };
        }

        const result = response.data?.results?.[0];
        if (!result) {
            return {
                success: false,
                error: 'No analysis result returned',
            };
        }

        return {
            success: true,
            status: response.status,
            data: result,
        };
    }

    /**
     * Parse package.json and analyze all dependencies
     * Client-side helper for npm projects
     */
    async analyzePackageJson(
        packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
        options: { includeDevDependencies?: boolean } = {}
    ): Promise<DependenciesServiceResponse<AnalyzeDependenciesResponse>> {
        const dependencies: DependencyInput[] = [];

        // Parse production dependencies
        if (packageJson.dependencies) {
            for (const [name, version] of Object.entries(packageJson.dependencies)) {
                dependencies.push({
                    name,
                    version: version.replace(/^[\^~>=<]/, ''), // Strip version prefixes
                    ecosystem: 'npm',
                });
            }
        }

        // Parse dev dependencies if requested
        if (options.includeDevDependencies && packageJson.devDependencies) {
            for (const [name, version] of Object.entries(packageJson.devDependencies)) {
                dependencies.push({
                    name,
                    version: version.replace(/^[\^~>=<]/, ''),
                    ecosystem: 'npm',
                });
            }
        }

        if (dependencies.length === 0) {
            return {
                success: true,
                data: {
                    total_dependencies: 0,
                    vulnerable_count: 0,
                    outdated_count: 0,
                    critical_count: 0,
                    high_count: 0,
                    medium_count: 0,
                    low_count: 0,
                    info_count: 0,
                    results: [],
                    analysis_time_ms: 0,
                },
            };
        }

        return this.analyze({
            dependencies,
            include_dev_dependencies: options.includeDevDependencies,
        });
    }

    /**
     * Parse requirements.txt and analyze all dependencies
     * Client-side helper for Python projects
     */
    async analyzeRequirementsTxt(
        content: string
    ): Promise<DependenciesServiceResponse<AnalyzeDependenciesResponse>> {
        const dependencies: DependencyInput[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
                continue;
            }

            // Parse "package==version" or "package>=version" format
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*([=<>!~]+)\s*([\d.]+)/);
            if (match) {
                dependencies.push({
                    name: match[1],
                    version: match[3],
                    ecosystem: 'pypi',
                });
            }
        }

        if (dependencies.length === 0) {
            return {
                success: true,
                data: {
                    total_dependencies: 0,
                    vulnerable_count: 0,
                    outdated_count: 0,
                    critical_count: 0,
                    high_count: 0,
                    medium_count: 0,
                    low_count: 0,
                    info_count: 0,
                    results: [],
                    analysis_time_ms: 0,
                },
            };
        }

        return this.analyze({ dependencies });
    }
}

// Export singleton instance
export const dependenciesService = new DependenciesService();
