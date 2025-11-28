/**
 * Centralized Type Definitions
 * All shared types and interfaces used across the application
 */

// ========== API Response Types ==========
// Canonical ApiResponse interface - single source of truth
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

// ========== UI State Types ==========
export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: unknown;
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
