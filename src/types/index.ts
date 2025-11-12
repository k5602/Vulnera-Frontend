/**
 * Centralized Type Definitions
 * All shared types and interfaces used across the application
 */

// ========== API Response Types ==========
// These match the ApiResponse interface used throughout the codebase
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
