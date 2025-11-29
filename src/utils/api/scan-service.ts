/**
 * Scan Service
 * Provides helpers around the backend vulnerability analysis endpoints
 * including the orchestrator job workflow.
 * 
 * Types are aligned with OpenAPI schema definitions where possible.
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';

export type AnalysisSourceType = 'git' | 'directory' | 'file_upload' | 's3_bucket';
export type AnalysisDepth = 'minimal' | 'standard' | 'full' | 'dependencies_only' | 'fast_scan';
export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'processing' | 'succeeded';

/** File content for file_upload source type */
export interface FileUploadContent {
  filename: string;
  ecosystem?: string;
  content: string;
}

/**
 * AnalyzeJobRequest matches AnalysisRequest from OpenAPI
 * Required: source_type, source_uri, analysis_depth
 * Optional: callback_url, files (for file_upload), github_token, is_private
 */
export interface AnalyzeJobRequest {
  source_type: AnalysisSourceType;
  source_uri: string;
  analysis_depth: AnalysisDepth;
  callback_url?: string | null;
  /** Files for file_upload source type */
  files?: FileUploadContent[];
  /** GitHub token for private repositories */
  github_token?: string;
  /** AWS credentials for S3 buckets */
  aws_credentials?: string;
  /** Whether the repository is private */
  is_private?: boolean;
  filename?: string;
  fileContent?: string;
  ecosystem?: string;
  packages?: Array<{ name: string; version?: string; ecosystem?: string }>;
  modules?: string[];
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Options for submitting analysis job */
export interface SubmitAnalysisOptions {
  /** Custom headers (e.g., for GitHub token) */
  headers?: Record<string, string>;
}

/**
 * ReportSummary matches ReportSummary from OpenAPI
 * Required: total_findings, critical, high, medium, low, info, modules_completed, modules_failed
 */
export interface ReportSummary {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  modules_completed: number;
  modules_failed: number;
}

/**
 * Finding matches Finding from OpenAPI
 * Required: id, type, location, severity, confidence, description
 * Optional: recommendation, rule_id
 */
export interface Finding {
  id: string;
  type: 'Vulnerability' | 'Secret' | 'LicenseViolation' | 'Misconfiguration';
  location: {
    path: string;
    line?: number | null;
    column?: number | null;
    end_line?: number | null;
    end_column?: number | null;
  };
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
  recommendation?: string | null;
  rule_id?: string | null;
}

export interface AnalysisJobError {
  module?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * FinalReportResponse matches FinalReportResponse from OpenAPI
 * Required: job_id, status, summary, findings
 */
export interface FinalReportResponse {
  job_id: string;
  status: string;
  summary: ReportSummary;
  findings: Finding[];
}

/**
 * AnalyzeJobResponseData - partial response when job is submitted
 */
export interface AnalyzeJobResponseData {
  job_id: string;
  status: AnalysisJobStatus;
  submitted_at?: string;
  queued_at?: string;
}

/**
 * AnalysisJobStatusData - extended response with full report data
 * Contains FinalReportResponse fields plus additional timing fields
 */
export interface AnalysisJobStatusData {
  job_id: string;
  status: AnalysisJobStatus | string;
  summary: ReportSummary;
  findings: Finding[];
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  submitted_at?: string;
  queued_at?: string;
  errors?: AnalysisJobError[];
  /** Raw results array for report transformation */
  results?: unknown[];
  /** Legacy findings format */
  findings_by_type?: unknown;
  /** Job metadata */
  metadata?: Record<string, unknown>;
}

export interface PollAnalysisJobOptions {
  intervalMs?: number;
  maxIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onUpdate?: (snapshot: AnalysisJobStatusData) => void;
}

class ScanService {
  /**
   * Submit a new orchestrated analysis job.
   * 
   * Request body should match AnalysisRequest from OpenAPI:
   * - source_type (required): 'git' | 'directory' | 'file_upload' | 's3_bucket'
   * - source_uri (required): string
   * - analysis_depth (required): 'minimal' | 'standard' | 'full'
   * - callback_url (optional): string | null
   * - files (optional): array of file contents for file_upload
   * - github_token (optional): for private repos
   * 
   * Returns FinalReportResponse per OpenAPI spec (may be synchronous or async depending on backend)
   */
  async submitAnalysisJob(
    payload: AnalyzeJobRequest,
    options: SubmitAnalysisOptions = {}
  ): Promise<ApiResponse<FinalReportResponse | AnalyzeJobResponseData>> {
    // Build normalized payload matching OpenAPI schema
    const normalizedPayload: Record<string, unknown> = {
      source_type: payload.source_type,
      source_uri: payload.source_uri,
      analysis_depth: payload.analysis_depth,
    };

    // Optional fields
    if (payload.callback_url !== undefined) {
      normalizedPayload.callback_url = payload.callback_url;
    }
    if (payload.files !== undefined) {
      normalizedPayload.files = payload.files;
    }
    if (payload.github_token !== undefined) {
      normalizedPayload.github_token = payload.github_token;
    }
    if (payload.aws_credentials !== undefined) {
      normalizedPayload.aws_credentials = payload.aws_credentials;
    }
    if (payload.is_private !== undefined) {
      normalizedPayload.is_private = payload.is_private;
    }

    return apiClient.post<FinalReportResponse | AnalyzeJobResponseData>(
      API_ENDPOINTS.ANALYSIS.ANALYZE,
      normalizedPayload,
      options.headers ? { headers: options.headers } : undefined
    );
  }

  /**
   * Retrieve the current status (and results) for a given job id.
   */
  async getAnalysisJob(jobId: string): Promise<ApiResponse<AnalysisJobStatusData>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.ANALYSIS.GET_JOB, {
      id: jobId,
    });

    return apiClient.get<AnalysisJobStatusData>(endpoint);
  }

  /**
   * Poll a job until it reaches a terminal state or times out.
   * Uses exponential backoff capped by maxIntervalMs.
   */
  async pollAnalysisJob(
    jobId: string,
    options: PollAnalysisJobOptions = {}
  ): Promise<ApiResponse<AnalysisJobStatusData>> {
    const start = Date.now();
    const baseInterval = options.intervalMs ?? 2000;
    const maxInterval = options.maxIntervalMs ?? 8000;
    const timeout = options.timeoutMs ?? 5 * 60 * 1000; // default 5 minutes

    let attempt = 0;

    while (true) {
      if (options.signal?.aborted) {
        return {
          ok: false,
          error: 'Polling aborted',
          status: 499,
        };
      }

      const response = await this.getAnalysisJob(jobId);

      if (!response.ok || !response.data) {
        return response;
      }

      options.onUpdate?.(response.data);

      if (this.isTerminalStatus(response.data.status)) {
        return response;
      }

      if (Date.now() - start >= timeout) {
        return {
          ok: false,
          error: 'Analysis job polling timed out',
          status: 408,
        };
      }

      attempt += 1;
      const delay = Math.min(maxInterval, baseInterval * Math.pow(1.5, attempt));

      try {
        await this.delay(delay, options.signal);
      } catch (error) {
        if (this.isAbortError(error)) {
          return {
            ok: false,
            error: 'Polling aborted',
            status: 499,
          };
        }
        throw error;
      }
    }
  }


  private isTerminalStatus(status: AnalysisJobStatus | string): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0) {
      return;
    }

    if (!signal) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return;
    }

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }
}

export const scanService = new ScanService();
