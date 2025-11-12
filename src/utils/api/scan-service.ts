/**
 * Scan Service
 * Provides helpers around the backend vulnerability analysis endpoints
 * including the orchestrator job workflow and legacy direct analysis APIs.
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';

export type AnalysisSourceType = 'git' | 'directory' | 'file_upload' | 'manifest';
export type AnalysisDepth = 'minimal' | 'standard' | 'full';
export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AnalyzeJobRequest {
  sourceType: AnalysisSourceType;
  sourceUri?: string;
  analysisDepth?: AnalysisDepth;
  filename?: string;
  fileContent?: string;
  ecosystem?: string;
  packages?: Array<{ name: string; version?: string; ecosystem?: string }>;
  modules?: string[];
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AnalysisJobSummary {
  totalFindings?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  infoCount?: number;
  [key: string]: unknown;
}

export interface AnalysisFindingIdentifier {
  type: string;
  value: string;
}

export interface AnalysisFinding {
  id?: string;
  module: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description?: string;
  remediation?: string;
  packageName?: string;
  packageVersion?: string;
  ecosystem?: string;
  identifiers?: AnalysisFindingIdentifier[];
  metadata?: Record<string, unknown>;
}

export interface AnalysisJobError {
  module?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AnalyzeJobResponseData {
  job_id: string;
  status: AnalysisJobStatus;
  submitted_at?: string;
  queued_at?: string;
}

export interface AnalysisJobStatusData extends AnalyzeJobResponseData {
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  summary?: AnalysisJobSummary;
  findings?: AnalysisFinding[];
  errors?: AnalysisJobError[];
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
   */
  async submitAnalysisJob(
    payload: AnalyzeJobRequest
  ): Promise<ApiResponse<AnalyzeJobResponseData>> {
    return apiClient.post<AnalyzeJobResponseData>(API_ENDPOINTS.ANALYSIS.ANALYZE, payload);
  }

  /**
   * Retrieve the current status (and results) for a given job id.
   */
  async getAnalysisJob(jobId: string): Promise<ApiResponse<AnalysisJobStatusData>> {
    const endpoint = apiClient.replacePath(API_ENDPOINTS.ANALYSIS.GET_JOB, {
      job_id: jobId,
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
          success: false,
          error: 'Polling aborted',
          status: 499,
        };
      }

      const response = await this.getAnalysisJob(jobId);

      if (!response.success || !response.data) {
        return response;
      }

      options.onUpdate?.(response.data);

      if (this.isTerminalStatus(response.data.status)) {
        return response;
      }

      if (Date.now() - start >= timeout) {
        return {
          success: false,
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
            success: false,
            error: 'Polling aborted',
            status: 499,
          };
        }
        throw error;
      }
    }
  }


  private isTerminalStatus(status: AnalysisJobStatus): boolean {
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
