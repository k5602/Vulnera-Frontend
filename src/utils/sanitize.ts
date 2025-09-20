// Lightweight client-safe sanitizers. Avoids DOMPurify to keep bundle small; add later if needed.

const SEVERITY_WHITELIST = ['critical', 'high', 'medium', 'low'];

export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;',
  };
  return String(input).replace(/[&<>"'/]/g, (m) => map[m]);
}

export function safeEmail(email: string): string {
  const e = String(email ?? '').trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(e)) throw new Error('Invalid email');
  return e.slice(0, 254);
}

export function safePassword(password: string): string {
  const p = String(password ?? '');
  if (p.length < 8) throw new Error('Invalid password');
  return p.slice(0, 1024);
}

export function safeSeverity(sev: unknown): string {
  const s = String(sev ?? '').toLowerCase();
  return SEVERITY_WHITELIST.includes(s) ? s : 'unknown';
}

export function sanitizeMessage(msg: unknown): string {
  return escapeHtml(msg);
}

export function safeString(value: any, max = 512): string {
  const v = String(value ?? '').trim();
  return escapeHtml(v).slice(0, max);
}
