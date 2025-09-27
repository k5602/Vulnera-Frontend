// Minimal runtime DualAuthComponent used by the login page dynamic import.
// Keeps behavior lightweight: exposes a default function that returns a DOM node or can be rendered by React.

export default function DualAuthComponent() {
  // Return a simple DOM-friendly component when used without React.
  const container = document.createElement('div');
  container.className = 'dual-auth-plain text-matrix-200 text-sm';
  container.innerHTML = `
    <div class="mb-3 text-center text-matrix-300">Authenticate with OIDC or use fallback</div>
    <div class="flex gap-2">
      <a href="#" class="px-3 py-1 rounded bg-cyber-600 text-black">OIDC Sign-in</a>
      <button id="auth-fallback-btn" class="px-3 py-1 rounded border border-cyber-400/40 text-cyber-300">Use Email</button>
    </div>
  `;

  // If the login page mounts this via React, React will ignore this DOM node and render differently.
  // For non-React runtime path, we'll provide click handling to show the fallback login.
  setTimeout(() => {
    const btn = container.querySelector('#auth-fallback-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fallback = document.getElementById('fallback-login');
        const authContainer = document.getElementById('auth-container');
        if (fallback && authContainer) {
          authContainer.innerHTML = '';
          fallback.classList.remove('hidden');
        }
      });
    }
  }, 0);

  return container;
}
