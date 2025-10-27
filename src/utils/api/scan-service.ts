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
   * Create a new vulnerability scan
   */
  async createScan(request: ScanRequest): Promise<ApiResponse<ScanResult>> {
    return apiClient.post<ScanResult>(API_ENDPOINTS.SCAN.CREATE, request);
  }

  /**
   * Get scan results by ID
   */
  async getScan(scanId: string): Promise<ApiResponse<ScanResult>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.SCAN.GET, { id: scanId });
    return apiClient.get<ScanResult>(endpoint);
  }

  /**
   * List all scans
   */
  async listScans(page: number = 1, pageSize: number = 10): Promise<ApiResponse<ScanListResponse>> {
    const endpoint = `${API_ENDPOINTS.SCAN.LIST}?page=${page}&pageSize=${pageSize}`;
    return apiClient.get<ScanListResponse>(endpoint);
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ApiResponse<{ status: string; progress?: number }>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.SCAN.STATUS, { id: scanId });
    return apiClient.get(endpoint);
  }

  /**
   * Delete a scan
   */
  async deleteScan(scanId: string): Promise<ApiResponse<void>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.SCAN.DELETE, { id: scanId });
    return apiClient.delete<void>(endpoint);
  }

  /**
   * Analyze a package.json file
   */
  async analyzePackageJson(packageJson: string): Promise<ApiResponse<ScanResult[]>> {
    return apiClient.post<ScanResult[]>(API_ENDPOINTS.PACKAGES.ANALYZE, {
      packageJson,
    });
  }

  /**
   * Analyze multiple packages
   */
  async analyzePackages(packages: ScanRequest[]): Promise<ApiResponse<ScanResult[]>> {
    return apiClient.post<ScanResult[]>(API_ENDPOINTS.PACKAGES.ANALYZE, {
      packages,
    });
  }
}

export const scanService = new ScanService();
