/**
 * Repository Service
 * Handles repository analysis operations
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';
import {
  scanService,
  type AnalyzeJobRequest,
  type AnalyzeJobResponseData,
  type AnalysisDepth,
  type AnalysisJobStatusData,
  type PollAnalysisJobOptions,
} from './scan-service';

export interface RepositoryAnalysisRequest {
  /**
   * Either provide full repository URL (https://github.com/org/repo.git)
   * or owner + repo components.
   */
  url?: string;
  owner?: string;
  repo?: string;
  ref?: string;
  branch?: string; // legacy alias for ref
  path?: string;
  includeDevDependencies?: boolean;
  analysisDepth?: AnalysisDepth;
  modules?: string[];
}

export type RepositoryAnalysisJobOptions = PollAnalysisJobOptions;

export interface PackageAnalysis {
  manager: string; // npm, pip, maven, cargo, etc.
  files: string[];
  totalDependencies: number;
  vulnerablePackages: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface RepositoryAnalysisResult {
  repositoryUrl: string;
  analysisId: string;
  timestamp: string;
  branch: string;
  packages: PackageAnalysis[];
  summary: {
    totalFiles: number;
    totalDependencies: number;
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  };
  details?: any;
}

class RepositoryService {
  /**
   * Analyze an entire repository for dependency vulnerabilities
   * POST /api/v1/analyze/repository
   */
  async analyzeRepository(
    request: RepositoryAnalysisRequest
  ): Promise<ApiResponse<RepositoryAnalysisResult>> {
    return apiClient.post<RepositoryAnalysisResult>(
      API_ENDPOINTS.REPOSITORY.ANALYZE,
      request
    );
  }

  /**
   * Start a repository analysis via the orchestrator job endpoint.
   */
  async startRepositoryAnalysisJob(
    request: RepositoryAnalysisRequest
  ): Promise<ApiResponse<AnalyzeJobResponseData>> {
    const sourceUri = this.resolveRepositoryUrl(request);

    if (!sourceUri) {
      return {
        success: false,
        error: 'Repository URL is required to start analysis',
        status: 400,
      };
    }

    const payload: AnalyzeJobRequest = {
      sourceType: 'git',
      sourceUri,
      analysisDepth: request.analysisDepth,
      modules: request.modules,
      metadata: this.buildMetadata(request),
    };

    return scanService.submitAnalysisJob(payload);
  }

  /**
   * Convenience helper to poll repository analysis results until completion.
   */
  async pollRepositoryAnalysisJob(
    jobId: string,
    options: RepositoryAnalysisJobOptions = {}
  ): Promise<ApiResponse<AnalysisJobStatusData>> {
    const pollOptions: PollAnalysisJobOptions = {
      intervalMs: options.intervalMs,
      maxIntervalMs: options.maxIntervalMs,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      onUpdate: options.onUpdate,
    };

    return scanService.pollAnalysisJob(jobId, pollOptions);
  }

  private resolveRepositoryUrl(request: RepositoryAnalysisRequest): string | null {
    if (request.url) {
      return request.url;
    }

    if (request.owner && request.repo) {
      return `https://github.com/${request.owner}/${request.repo}`;
    }

    return null;
  }

  private buildMetadata(request: RepositoryAnalysisRequest): Record<string, unknown> | undefined {
    const metadataEntries = Object.entries({
      ref: request.ref || request.branch,
      path: request.path,
      includeDevDependencies: request.includeDevDependencies,
    }).filter(([, value]) => value !== undefined && value !== null);

    if (metadataEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(metadataEntries);
  }

  /**
   * Analyze repository with progress tracking
   */
  async analyzeRepositoryWithProgress(
    request: RepositoryAnalysisRequest,
    onProgress?: (progress: { stage: string; percentage: number }) => void
  ): Promise<ApiResponse<RepositoryAnalysisResult>> {
    // Simulate progress tracking (can be enhanced with WebSocket in future)
    onProgress?.({ stage: 'Initializing', percentage: 10 });

    const response = await this.analyzeRepository(request);

    if (response.success) {
      onProgress?.({ stage: 'Complete', percentage: 100 });
    }

    return response;
  }

  /**
   * Format analysis result for display
   */
  formatAnalysisResult(result: RepositoryAnalysisResult): {
    title: string;
    description: string;
    stats: Array<{ label: string; value: string; severity?: string }>;
  } {
    const { summary } = result;

    return {
      title: `Repository Analysis: ${new URL(result.repositoryUrl).hostname}`,
      description: `Analyzed on ${new Date(result.timestamp).toLocaleDateString()}`,
      stats: [
        { label: 'Files Scanned', value: String(summary.totalFiles) },
        { label: 'Total Dependencies', value: String(summary.totalDependencies) },
        {
          label: 'Total Vulnerabilities',
          value: String(summary.totalVulnerabilities),
          severity: summary.overallRisk,
        },
        { label: 'Critical', value: String(summary.criticalCount), severity: 'critical' },
        { label: 'High', value: String(summary.highCount), severity: 'high' },
        { label: 'Medium', value: String(summary.mediumCount), severity: 'medium' },
        { label: 'Low', value: String(summary.lowCount), severity: 'low' },
      ],
    };
  }

  /**
   * Export analysis result as JSON
   */
  exportAsJson(result: RepositoryAnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Export analysis result as CSV
   */
  exportAsCsv(result: RepositoryAnalysisResult): string {
    const lines: string[] = [];

    // Header
    lines.push('Package Manager,Files,Total Dependencies,Vulnerable,Critical,High,Medium,Low');

    // Data rows
    result.packages.forEach((pkg) => {
      lines.push(
        `${pkg.manager},"${pkg.files.join('; ')}",${pkg.totalDependencies},${pkg.vulnerablePackages},${pkg.criticalCount},${pkg.highCount},${pkg.mediumCount},${pkg.lowCount}`
      );
    });

    // Summary row
    const { summary } = result;
    lines.push(
      `TOTAL,,${summary.totalDependencies},${summary.totalVulnerabilities},${summary.criticalCount},${summary.highCount},${summary.mediumCount},${summary.lowCount}`
    );

    return lines.join('\n');
  }
}

export const repositoryService = new RepositoryService();
