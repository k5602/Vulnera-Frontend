/**
 * Repository Service
 * Handles repository analysis operations
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';

export interface RepositoryAnalysisRequest {
  url: string;
  branch?: string;
  path?: string; // Optional path within repository
  includeDevDependencies?: boolean;
}

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
