// Shared sanitization helpers
const SEVERITY_WHITELIST = ['critical', 'high', 'medium', 'low'];

export function escapeHtml(input) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return String(input).replace(/[&<>"'\/]/g, (m) => map[m]);
}

export function safeEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(e)) throw new Error('Invalid email');
  return e.slice(0, 254);
}

export function safePassword(password) {
  const p = String(password ?? '');
  if (p.length < 8) throw new Error('Invalid password');
  return p.slice(0, 1024);
}

export function safeSeverity(sev) {
  const s = String(sev ?? '').toLowerCase();
  return SEVERITY_WHITELIST.includes(s) ? s : 'unknown';
}

export function sanitizeMessage(msg) {
  return escapeHtml(msg);
}

export function safeString(value, max = 512) {
  const v = String(value ?? '').trim();
  return escapeHtml(v).slice(0, max);
}

export const MAX_FILE_BYTES = 1024 * 1024; // 1MB limit
