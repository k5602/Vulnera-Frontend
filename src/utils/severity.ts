// Severity utilities for vulnerability reporting

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'UNKNOWN';

export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
  UNKNOWN: 0,
};

export function getSeverityClasses(severity: SeverityLevel): string {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider';
  
  switch (severity) {
    case 'CRITICAL':
      return `${baseClasses} bg-red-500/20 text-red-400 border border-red-500/50`;
    case 'HIGH':
      return `${baseClasses} bg-orange-500/20 text-orange-400 border border-orange-500/50`;
    case 'MEDIUM':
      return `${baseClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/50`;
    case 'LOW':
      return `${baseClasses} bg-blue-500/20 text-blue-400 border border-blue-500/50`;
    case 'INFO':
      return `${baseClasses} bg-cyan-500/20 text-cyan-400 border border-cyan-500/50`;
    case 'UNKNOWN':
    default:
      return `${baseClasses} bg-gray-500/20 text-gray-400 border border-gray-500/50`;
  }
}

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'CRITICAL':
      return '#ef4444'; // red-500
    case 'HIGH':
      return '#f97316'; // orange-500
    case 'MEDIUM':
      return '#eab308'; // yellow-500
    case 'LOW':
      return '#3b82f6'; // blue-500
    case 'INFO':
      return '#06b6d4'; // cyan-500
    case 'UNKNOWN':
    default:
      return '#6b7280'; // gray-500
  }
}

export function normalizeSeverity(severity: string): SeverityLevel {
  const normalized = severity.toUpperCase();
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(normalized)) {
    return normalized as SeverityLevel;
  }
  return 'UNKNOWN';
}
