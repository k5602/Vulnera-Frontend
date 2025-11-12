/**
 * Type declarations for JavaScript modules
 * Provides TypeScript types for CommonJS and untyped modules
 */

// ========== Features ==========
export interface DragDropOptions {
  onDrop?: (files: File[]) => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
}

export function initDragAndDrop(): void;

// ========== UI ==========
export interface ThemeOptions {
  isDark: boolean;
}

export function initThemeToggle(): void;
export function initNotyf(): void;
export function onModalToggle(): void;

// ========== Notifications ==========
export interface NotifyOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export function notify(options: NotifyOptions): void;

// ========== Ecosystems ==========
export interface EcosystemInfo {
  name: string;
  label: string;
  manifestFiles: string[];
  color: string;
  icon?: string;
}

export const SUPPORTED_ECOSYSTEMS: EcosystemInfo[];
export const ECOSYSTEM_MANIFEST_FILES: Record<string, string[]>;

// ========== Sanitization ==========
export function sanitizeHtml(html: string): string;
export function sanitizeInput(input: string): string;
