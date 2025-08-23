// Shared sanitization helpers
const SEVERITY_WHITELIST = ['critical','high','medium','low'];

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

export function safeSeverity(sev) {
  const s = String(sev || '').toLowerCase();
  return SEVERITY_WHITELIST.includes(s) ? s : 'unknown';
}

export function sanitizeMessage(msg) {
  return escapeHtml(msg);
}

export const MAX_FILE_BYTES = 1024 * 1024; // 1MB limit
