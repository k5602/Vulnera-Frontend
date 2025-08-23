export function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;

  // Apply saved theme ASAP using preference fallback
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  htmlElement.setAttribute('data-theme', initial);
  if (themeToggle) {
    themeToggle.checked = initial === 'dark';
  }

  themeToggle.addEventListener('change', function() {
    const next = this.checked ? 'dark' : 'light';
    // Add scoped transition class for a brief period
    htmlElement.classList.add('theme-transition');
    htmlElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTimeout(()=> htmlElement.classList.remove('theme-transition'), 250);
  });
}
