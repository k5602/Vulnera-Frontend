/**
 * Validation Utilities
 * Provides input validation functions for forms and API calls
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isStrong: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  let isStrong = true;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
    isStrong = false;
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
    isStrong = false;
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
    isStrong = false;
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number');
    isStrong = false;
  }

  return { isStrong, feedback };
}

/**
 * Validate login credentials
 */
export function validateLoginCredentials(
  email: string,
  password: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!password || !password.trim()) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const MIME_WHITELIST: Record<string, string[]> = {
  json: ['application/json'],
  xml: ['application/xml', 'text/xml'],
  txt: ['text/plain'],
  csv: ['text/csv'],
  lock: ['text/plain'],
  yaml: ['application/x-yaml', 'text/x-yaml'],
  yml: ['application/x-yaml', 'text/x-yaml'],
  md: ['text/markdown', 'text/plain'],
};

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedExtensions: string[],
  maxSizeMB: number = 50
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({ field: 'file', message: 'File is required' });
    return { isValid: false, errors };
  }

  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Validate extension
  if (!allowedExtensions.includes(ext)) {
    errors.push({
      field: 'file',
      message: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
    });
  }

  // 2. Validate MIME type against whitelist
  const allowedMimes = MIME_WHITELIST[ext] || [];
  if (allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `Invalid file type: ${file.type}. Expected: ${allowedMimes.join(', ')}`,
    });
  }

  // 3. Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push({
      field: 'file',
      message: `File size exceeds ${maxSizeMB}MB limit (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate required field
 */
export function validateRequired(
  field: string,
  value: any
): ValidationError | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { field, message: `${field} is required` };
  }
  return null;
}
