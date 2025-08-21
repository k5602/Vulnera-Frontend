// Accessible Notyf wrapper
let notyfInstance; // allow re-init without const reassignment errors

function createNotyf() {
  if (notyfInstance) return notyfInstance; // idempotent
  const existing = document.getElementById('notyf-container');
  const container = existing || document.createElement('div');
  if (!existing) {
    container.id = 'notyf-container';
    container.setAttribute('role','status');
    container.setAttribute('aria-live','polite');
    container.setAttribute('aria-relevant','additions');
    document.body.appendChild(container);
  }
  notyfInstance = new Notyf({
    duration: 5000,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'info', background: 'hsl(var(--in))', icon: { className: 'fas fa-info-circle', tagName: 'i', color: 'hsl(var(--inc))' } },
      { type: 'warning', background: 'hsl(var(--wa))', icon: { className: 'fas fa-exclamation-triangle', tagName: 'i', color: 'hsl(var(--wac))' } },
      { type: 'success', background: '#10B981', icon: { className: 'fas fa-check-circle', tagName: 'i', color: 'white' } },
      { type: 'github', background: '#1F2937', icon: { className: 'fab fa-github', tagName: 'i', color: 'white' } },
    ],
    container
  });
  return notyfInstance;
}

export function initNotyf() {
  return createNotyf();
}

function getNotyf() { return notyfInstance || createNotyf(); }

export function showError(message) { try { getNotyf().open({ type: 'warning', message }); } catch { alert(message); } }
export function showSuccess(message) { try { getNotyf().open({ type: 'success', message }); } catch { alert(message); } }
export function showInfo(message) { try { getNotyf().open({ type: 'info', message }); } catch { alert(message); } }
export function showGitHubComingSoon() {
  const n = getNotyf();
  n.open({ type: 'github', message: '🚀 GitHub Repository Scanning - Coming Soon! Scan entire repos for vulnerabilities across all dependency files.' });
  setTimeout(()=> n.open({ type: 'info', message: '✨ Features: OAuth integration, bulk scanning, automated CI/CD workflows, and comprehensive reporting.' }), 2500);
  setTimeout(()=> n.open({ type: 'success', message: '📅 Expected Release: Q1 2026 | Follow our GitHub for beta access and updates!' }), 5000);
}
