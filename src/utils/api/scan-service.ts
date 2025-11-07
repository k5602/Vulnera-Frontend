/**
 * Scan Service
 * Handles vulnerability scanning operations
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';

export interface ScanRequest {
  packageName: string;
  packageVersion?: string;
  ecosystem?: string; // npm, pypi, maven, etc.
}

export interface Vulnerability {
  id: string;
  cveId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedVersions: string[];
  fixedVersion?: string;
  references: string[];
}

export interface ScanResult {
  id: string;
  packageName: string;
  packageVersion: string;
  ecosystem: string;
  vulnerabilities: Vulnerability[];
  scanDate: string;
  status: 'completed' | 'in_progress' | 'failed';
}

export interface ScanListResponse {
  scans: ScanResult[];
  total: number;
  page: number;
  pageSize: number;
}

class ScanService {
  /**
   * Analyze dependencies
   */
  async analyzeDependencies(request: ScanRequest): Promise<ApiResponse<ScanResult>> {
    return apiClient.post<ScanResult>(API_ENDPOINTS.ANALYSIS.ANALYZE, request);
  }

  /**
   * Get analysis report by ID
   */
  async getReport(reportId: string): Promise<ApiResponse<ScanResult>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.ANALYSIS.GET_REPORT, { id: reportId });
    return apiClient.get<ScanResult>(endpoint);
  }

  /**
   * Get popular packages with vulnerabilities
   */
  async getPopularPackages(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.ANALYSIS.POPULAR);
  }

  /**
   * Analyze a package.json file
   */
  async analyzePackageJson(packageJson: string): Promise<ApiResponse<ScanResult[]>> {
    return apiClient.post<ScanResult[]>(API_ENDPOINTS.ANALYSIS.ANALYZE, {
      packageJson,
    });
  }

  /**
   * Analyze multiple packages
   */
  async analyzePackages(packages: ScanRequest[]): Promise<ApiResponse<ScanResult[]>> {
    return apiClient.post<ScanResult[]>(API_ENDPOINTS.ANALYSIS.ANALYZE, {
      packages,
    });
  }

  /**
   * Refresh vulnerability cache
   */
  async refreshCache(): Promise<ApiResponse<void>> {
    return apiClient.post<void>(API_ENDPOINTS.VULNERABILITIES.REFRESH_CACHE);
  }
}

export const scanService = new ScanService();
