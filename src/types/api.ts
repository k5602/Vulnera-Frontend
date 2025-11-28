import { z } from 'zod';

/**
 * Validate API responses match expected schema
 */

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
});

/** Zod-inferred type for runtime validation. Use ApiResponse from types/index.ts for general typing. */
export type ZodApiResponse = z.infer<typeof ApiResponseSchema>;

// Re-export canonical ApiResponse for convenience
export type { ApiResponse } from './index';

/**
 * TokenResponseSchema matches the TokenResponse schema from OpenAPI
 * Required fields: access_token, refresh_token, token_type, expires_in
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().int().min(0),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/**
 * @deprecated Use TokenResponseSchema instead. This is kept for backward compatibility.
 * LoginResponseSchema matches TokenResponse but allows optional user field for frontend convenience.
 */
export const LoginResponseSchema = TokenResponseSchema.extend({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    role: z.string().optional(),
    expiresAt: z.number().optional(),
  }).optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Helper to safely parse API responses
 */
export function parseApiResponse<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error('Invalid API response format');
  }
}

// ========== Webhook Types ==========

/**
 * Webhook configuration for scan jobs
 * Sent with job request to enable callback notifications
 */
export interface WebhookConfig {
  /** Full URL where backend will POST results */
  callback_url: string;
  /** HMAC secret for signature verification (format: whsec_<uuid>) */
  webhook_secret: string;
}

/**
 * Webhook payload sent by backend to callback_url
 * Contains job results when scan completes
 */
export interface WebhookPayload {
  /** Unique job identifier */
  job_id: string;
  /** Job completion status */
  status: 'completed' | 'failed' | 'cancelled';
  /** Error message if status is failed */
  error?: string;
  /** Scan findings/vulnerabilities */
  findings?: Array<{
    id: string;
    severity: string;
    type: string;
    title: string;
    description?: string;
    package?: string;
    version?: string;
    cve?: string;
    cvss?: number;
    recommendation?: string;
    location?: {
      path: string;
      line?: number;
      end_line?: number;
      column?: number;
      end_column?: number;
    };
  }>;
  /** Summary statistics */
  summary?: {
    total_findings: number;
    by_severity?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    by_type?: {
      dependencies: number;
      sast: number;
      secrets: number;
      api: number;
    };
  };
  /** Results array (new format) */
  results?: Array<{
    filename: string;
    ecosystem: string;
    vulnerabilities?: unknown[];
    metadata?: Record<string, unknown>;
  }>;
  /** Metadata about the scan */
  metadata?: {
    duration_ms?: number;
    total_files?: number;
    total_packages?: number;
  };
  /** Timestamps */
  started_at?: string;
  completed_at?: string;
}

/**
 * Zod schema for validating incoming webhook payloads
 */
export const WebhookPayloadSchema = z.object({
  job_id: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  error: z.string().optional(),
  findings: z.array(z.object({
    id: z.string(),
    severity: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    package: z.string().optional(),
    version: z.string().optional(),
    cve: z.string().optional(),
    cvss: z.number().optional(),
    recommendation: z.string().optional(),
    location: z.object({
      path: z.string(),
      line: z.number().optional(),
      end_line: z.number().optional(),
      column: z.number().optional(),
      end_column: z.number().optional(),
    }).optional(),
  })).optional(),
  summary: z.object({
    total_findings: z.number(),
    by_severity: z.object({
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
      info: z.number(),
    }).optional(),
    by_type: z.object({
      dependencies: z.number(),
      sast: z.number(),
      secrets: z.number(),
      api: z.number(),
    }).optional(),
  }).optional(),
  results: z.array(z.object({
    filename: z.string(),
    ecosystem: z.string(),
    vulnerabilities: z.array(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  metadata: z.object({
    duration_ms: z.number().optional(),
    total_files: z.number().optional(),
    total_packages: z.number().optional(),
  }).optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
});

