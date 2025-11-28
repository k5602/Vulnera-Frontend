/**
 * Severity Utilities
 * Centralized severity level handling, validation, and styling
 * 
 * Single source of truth for severity definitions across the application.
 * Used by: ScanReport.tsx, scanModule.ts, dashboard.ts
 */

/** Canonical uppercase severity levels */
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Lowercase severity levels (for backward compatibility with some APIs) */
export type SeverityLevelLower = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** All valid severity strings (case-insensitive matching) */
export type AnySeverity = SeverityLevel | SeverityLevelLower;

/**
 * Severity ordering for sorting (lower number = higher priority)
 * CRITICAL is most severe (0), INFO is least severe (4)
 */
export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
} as const;

/**
 * CSS classes for severity badges (TailwindCSS)
 * Includes background, text color, and border
 */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  CRITICAL: 'bg-red-600/20 text-red-400 border-red-500/40',
  HIGH: 'bg-red-500/15 text-red-300 border-red-400/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  LOW: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  INFO: 'bg-matrix-500/10 text-matrix-300 border-matrix-400/20',
} as const;

/**
 * Text color classes for severity (TailwindCSS)
 * Supports both uppercase and lowercase keys for flexibility
 */
export const SEVERITY_TEXT_COLORS: Record<string, string> = {
  // Uppercase
  CRITICAL: 'text-red-400',
  HIGH: 'text-red-300',
  MEDIUM: 'text-yellow-300',
  LOW: 'text-matrix-300',
  INFO: 'text-gray-400',
  // Lowercase (backward compat)
  critical: 'text-red-400',
  high: 'text-red-300',
  medium: 'text-yellow-300',
  low: 'text-matrix-300',
  info: 'text-gray-400',
} as const;

/**
 * Normalize any severity string to canonical uppercase SeverityLevel
 * 
 * @param severity - Input severity (any case, undefined, or null)
 * @returns Normalized SeverityLevel (defaults to 'INFO' if invalid)
 * 
 * @example
 * normalizeSeverity('critical') // => 'CRITICAL'
 * normalizeSeverity('HIGH')     // => 'HIGH'
 * normalizeSeverity(undefined)  // => 'INFO'
 * normalizeSeverity('unknown')  // => 'INFO'
 */
export function normalizeSeverity(severity: string | undefined | null): SeverityLevel {
  if (!severity) return 'INFO';
  
  const upper = severity.toUpperCase() as SeverityLevel;
  
  if (upper in SEVERITY_ORDER) {
    return upper;
  }
  
  // Unknown severity, default to INFO
  return 'INFO';
}

/**
 * Get CSS classes for a severity badge
 * 
 * @param severity - SeverityLevel to get classes for
 * @returns TailwindCSS class string for the severity badge
 * 
 * @example
 * getSeverityClasses('CRITICAL') // => 'bg-red-600/20 text-red-400 border-red-500/40'
 */
export function getSeverityClasses(severity: SeverityLevel): string {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO;
}

/**
 * Get text color class for a severity
 * Accepts both uppercase and lowercase severity strings
 * 
 * @param severity - Severity string (any case)
 * @returns TailwindCSS text color class
 * 
 * @example
 * getSeverityTextColor('critical') // => 'text-red-400'
 * getSeverityTextColor('HIGH')     // => 'text-red-300'
 */
export function getSeverityTextColor(severity: string): string {
  return SEVERITY_TEXT_COLORS[severity] || SEVERITY_TEXT_COLORS[severity.toLowerCase()] || 'text-gray-400';
}

/**
 * Compare two severities for sorting
 * Lower return value = higher priority (more severe)
 * 
 * @param a - First severity
 * @param b - Second severity
 * @returns Negative if a is more severe, positive if b is more severe, 0 if equal
 * 
 * @example
 * vulnerabilities.sort((a, b) => compareSeverity(a.severity, b.severity))
 */
export function compareSeverity(a: SeverityLevel, b: SeverityLevel): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/**
 * Check if a string is a valid severity level
 * 
 * @param value - String to check
 * @returns True if valid severity (case-insensitive)
 */
export function isValidSeverity(value: string): value is SeverityLevel {
  return value.toUpperCase() in SEVERITY_ORDER;
}

/**
 * Get all severity levels in order (most to least severe)
 */
export const SEVERITY_LEVELS: readonly SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
