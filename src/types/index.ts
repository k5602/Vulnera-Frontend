/**
 * Centralized Type Definitions
 * All shared types and interfaces used across the application
 */

// ========== API Response Types ==========
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// ========== Authentication Types ==========
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: LoginResponse;
}

export interface StoredToken {
  token: string;
  expiresAt?: number;
}

// ========== Scan Types ==========
export interface ScanRequest {
  projectName: string;
  manifestFile: string;
  ecosystem?: string;
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  package: string;
  affectedVersions: string[];
  description: string;
  cvss?: number;
}

export interface ScanResult {
  id: string;
  projectName: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ScanListResponse {
  scans: ScanResult[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== Vulnerability Types ==========
export interface VulnerabilityDetail {
  id: string;
  cveId: string;
  package: string;
  severity: string;
  affectedVersions: string[];
  patchedVersions?: string[];
  description: string;
  cvss: number;
  references: string[];
  discoveredAt: string;
  publishedAt: string;
}

export interface VulnerabilityListResponse {
  vulnerabilities: VulnerabilityDetail[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchRequest {
  query: string;
  ecosystem?: string;
  severity?: string;
  limit?: number;
}

// ========== UI State Types ==========
export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: any;
}

export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ========== Form Types ==========
export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  errors: FormValidationError[];
  success: boolean;
}
