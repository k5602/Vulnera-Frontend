import './style.css';
import { CONFIG } from './config.js';
import { initThemeToggle } from './ui/theme.js';
import { initDragAndDrop } from './features/dragDrop.js';
// Defer rarely used features to reduce initial JS payload
let initSampleFile;
let initGitHubScanning;
import { initNotyf, showVsCodeExtensionPreview } from './ui/notifications.js';
import { onModalToggle } from './ui/focus.js';

// Enhanced logging for debugging (development only)
if ((CONFIG.ENABLE_DEBUG === 'true' || import.meta.env?.DEV) && typeof window !== 'undefined') {
  if (window.__ENABLE_DEBUG_LOGS === true) {
    console.group('🔧 Vulnera Configuration');
    console.debug('Environment:', CONFIG.ENVIRONMENT);
    console.debug('API Base URL:', CONFIG.API_BASE_URL);
    console.debug('API Endpoint:', CONFIG.API_ENDPOINT);
    console.debug('App Name:', CONFIG.APP_NAME);
    console.debug('App Version:', CONFIG.APP_VERSION);
    console.debug('API Timeout:', CONFIG.API_TIMEOUT + 'ms');
    console.debug('Debug Mode:', CONFIG.ENABLE_DEBUG);

    // Show environment variable sources
    console.group('Environment Variable Sources:');
    console.debug('Vite Env:', import.meta.env || 'Not available');
    console.debug(
      'Window Vars:',
      typeof window !== 'undefined'
        ? {
          VULNERA_API_BASE_URL: window.VULNERA_API_BASE_URL,
          VULNERA_API_VERSION: window.VULNERA_API_VERSION,
          VULNERA_APP_NAME: window.VULNERA_APP_NAME,
        }
        : 'Not available'
    );
    console.groupEnd();
    console.groupEnd();
  }

  // Test API connectivity in development
  if (CONFIG.ENVIRONMENT === 'development') {
    // Backend health check removed in frontend-only mode. If you need to
    // verify a backend during local development, re-enable the check.
    console.debug('Backend health check skipped (frontend-only mode)');
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#app').innerHTML = `
    <!-- Navigation -->
    <div class="navbar bg-base-100 shadow-lg px-2 sm:px-4">
      <div class="flex-1">
        <a class="btn btn-ghost text-2xl sm:text-3xl">
          <img src="/images/logo.png" alt="Vulnera Logo" class="h-10 sm:h-20 w-auto mr-2" width="160" height="160" fetchpriority="high" decoding="async">
        </a>
      </div>
      <div class="flex-none">
        <label class="swap swap-rotate">
          <input type="checkbox" id="theme-toggle" />
          <i class="swap-off fas fa-sun text-yellow-500 text-lg sm:text-xl"></i>
          <i class="swap-on fas fa-moon text-blue-500 text-lg sm:text-xl"></i>
        </label>
      </div>
    </div>

    <!-- Main Content -->
    <div class="min-h-screen bg-base-200 p-2 sm:p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Hero Section -->
        <div class="text-center mb-6 sm:mb-8">
          <div class="flex justify-center mb-2">
            <img src="/images/logo.png" alt="Vulnera Logo" class="h-24 sm:h-38 md:h-47 lg:h-58 xl:h-70 w-auto" width="280" height="280" fetchpriority="high" decoding="async">
          </div>

          <h1>Vulnera</h1>
          <p class="text-base sm:text-lg md:text-xl opacity-70 mb-3 sm:mb-4 px-4">
            Comprehensive vulnerability analysis for your dependencies
          </p>
          <div class="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 px-4">
            <div class="badge badge-primary badge-sm sm:badge-md lg:badge-lg">Multi-Language Support</div>
            <div class="badge badge-secondary badge-sm sm:badge-md lg:badge-lg">Real-time Analysis</div>
            <div class="badge badge-accent badge-sm sm:badge-md lg:badge-lg">Open Source APIs</div>
          </div>
          <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            <a href="/docs" class="btn btn-outline btn-primary btn-sm sm:btn-md">
              <i class="fas fa-book"></i>
              <span class="hidden xs:inline">Documentation</span>
              <span class="xs:hidden">Docs</span>
            </a>
            <a href="/docs/api-examples" class="btn btn-outline btn-secondary btn-sm sm:btn-md">
              <i class="fas fa-code"></i>
              <span class="hidden xs:inline">API Examples</span>
              <span class="xs:hidden">API</span>
            </a>
            <button id="sample-btn" class="btn btn-outline btn-accent btn-sm sm:btn-md">
              <i class="fas fa-download"></i>
              <span class="hidden xs:inline">Try Sample File</span>
              <span class="xs:hidden">Sample</span>
            </button>
            <button id="github-scan-cta" class="btn btn-outline btn-warning btn-sm sm:btn-md">
              <i class="fab fa-github"></i>
              <span class="hidden xs:inline">Scan GitHub Repo</span>
              <span class="xs:hidden">GitHub</span>
            </button>
          </div>
        </div>

        <!-- Drag & Drop Zone -->
        <div class="card bg-base-100 shadow-xl mb-6 sm:mb-8">
          <div class="card-body p-4 sm:p-6 lg:p-8">
            <h2 class="card-title text-xl sm:text-2xl mb-4 sm:mb-6 justify-center sm:justify-start">
              <i class="fas fa-upload text-primary"></i>
              <span class="hidden xs:inline">Upload Dependency File</span>
              <span class="xs:hidden">Upload File</span>
            </h2>

            <div
              id="drop-zone"
              class="relative border-2 border-dashed border-base-300 rounded-xl p-8 sm:p-12 transition-all duration-300 ease-in-out cursor-pointer hover:border-primary hover:bg-base-200/50"
            >
              <input
                type="file"
                id="file-input"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Dependency file upload"
              />
              <div class="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                <i class="fas fa-cloud-upload-alt text-4xl text-primary" aria-hidden="true"></i>
                <p class="text-lg font-semibold text-base-content">
                  <span class="link link-primary font-bold">Click to upload</span>
                  or drag & drop a file
                </p>
                <p class="text-sm text-base-content/60">Supported: package.json, requirements.txt, pom.xml…</p>
              </div>
            </div>
            <div id="file-info" class="mt-4"></div>
            <div class="mt-4 flex justify-center">
              <button id="analyze-btn" class="btn btn-primary btn-wide btn-disabled" disabled aria-disabled="true">
                <i class="fas fa-shield-alt mr-2"></i>
                Analyze Dependencies
              </button>
            </div>

            <div class="divider my-6 sm:my-8">OR</div>

            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-lg mx-auto">
              <div class="relative flex-grow">
                <i
                  class="fas fa-link absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40"
                  aria-hidden="true"
                ></i>
                <input
                  type="text"
                  id="github-url-input"
                  placeholder="Enter a public GitHub repository URL"
                  class="input input-bordered w-full pl-10"
                  aria-label="GitHub repository URL input"
                />
              </div>
              <button
                id="github-scan-btn"
                class="btn btn-primary"
                aria-label="Scan GitHub repository"
              >
                <i class="fab fa-github" aria-hidden="true"></i>
                <span class="hidden sm:inline">Scan Repository</span>
                <span class="sm:hidden">Scan</span>
              </button>
            </div>

            <!-- Advanced options for repository scanning -->
            <div class="mt-4 w-full max-w-3xl mx-auto">
              <div class="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div class="collapse-title font-medium">Advanced options</div>
                <div class="collapse-content">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="label cursor-pointer justify-start gap-3">
                      <input type="checkbox" id="gh-include-lockfiles" class="checkbox checkbox-sm" checked />
                      <span class="label-text">Include lockfiles (package-lock.json, yarn.lock, Cargo.lock, etc.)</span>
                    </label>

                    <label class="form-control">
                      <div class="label"><span class="label-text">Max files to scan (1-500)</span></div>
                      <input type="number" id="gh-max-files" class="input input-bordered" min="1" max="500" value="200" />
                    </label>

                    <label class="form-control md:col-span-1">
                      <div class="label"><span class="label-text">Include paths (comma separated)</span></div>
                      <input type="text" id="gh-include-paths" class="input input-bordered" placeholder="crates/,src/" />
                    </label>

                    <label class="form-control md:col-span-1">
                      <div class="label"><span class="label-text">Exclude paths (comma separated)</span></div>
                      <input type="text" id="gh-exclude-paths" class="input input-bordered" placeholder="tests/,docs/" />
                    </label>

                    <label class="form-control md:col-span-2">
                      <div class="label"><span class="label-text">Ref (branch, tag, or commit SHA)</span></div>
                      <input type="text" id="gh-ref" class="input input-bordered" placeholder="main" />
                    </label>

                    <div class="md:col-span-2">
                      <div class="divider my-1">Authentication</div>
                    </div>

                    <label class="form-control md:col-span-2">
                      <div class="label"><span class="label-text">GitHub Token (PAT or OAuth bearer)</span></div>
                      <input type="password" id="gh-token" class="input input-bordered" placeholder="ghp_… or OAuth token" autocomplete="off" />
                      <div class="label"><span class="label-text-alt">Used for private repos and GHSA enrichment. Not stored.</span></div>
                    </label>

                    <label class="label cursor-pointer justify-start gap-3 md:col-span-2">
                      <input type="checkbox" id="gh-remember-token" class="checkbox checkbox-sm" />
                      <span class="label-text">Remember token for this session</span>
                    </label>

                    <label class="form-control md:col-span-2">
                      <div class="label"><span class="label-text">Custom headers (key: value per line)</span></div>
                      <textarea id="gh-custom-headers" class="textarea textarea-bordered" rows="3" placeholder="X-Org: example\nX-Feature-Flag: on"></textarea>
                      <div class="label"><span class="label-text-alt">Sent to backend with the request. Avoid overriding Content-Type, Accept, or User-Agent.</span></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 text-center">
              <button
                id="sample-file-btn"
                class="btn btn-ghost"
                aria-label="Try with a sample file"
              >
                <i class="fas fa-file-alt mr-2" aria-hidden="true"></i>
                Try with a sample file
              </button>
            </div>
          </div>
        </div>

        <!-- Coming Soon Features -->
        <div class="card bg-gradient-to-r shadow-xl mb-6 sm:mb-8">
          <div class="card-body p-4 sm:p-6 lg:p-8">
            <h2 class="card-title text-xl sm:text-2xl mb-4 sm:mb-6 justify-center text-amber-700 dark:text-warning">
              <i class="fas fa-rocket text-amber-600 dark:text-warning"></i>
              <span class="hidden xs:inline">Coming Soon Features</span>
              <span class="xs:hidden">Coming Soon</span>
            </h2>

              <div class="text-center">
              <div class="mb-4">
                <i class="fas fa-plug text-4xl sm:text-5xl text-amber-600 dark:text-warning opacity-80 mb-3"></i>
                <h3 class="text-lg sm:text-xl font-semibold mb-2 text-amber-800 dark:text-amber-200">VS Code Extension</h3>
                <p class="text-sm sm:text-base opacity-80 mb-4 text-amber-700 dark:text-amber-300">
                  <span class="hidden sm:inline">Next up: analyze dependencies directly in your editor with a VS Code extension. Seamless scans, inline diagnostics, and quick fixes.</span>
                  <span class="sm:hidden">Upcoming: VS Code extension.</span>
                </p>
                <button id="vscode-ext-preview" class="btn btn-warning btn-sm sm:btn-md">
                  <i class="fas fa-code"></i>
                  <span class="hidden xs:inline">Preview Extension</span>
                  <span class="xs:hidden">Preview</span>
                </button>
              </div>

              <div class="divider opacity-30">
                <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">ROADMAP</span>
              </div>

              <div class="text-xs sm:text-sm opacity-70 text-amber-700 dark:text-amber-300">
                <p class="mb-2 font-semibold">Planned Features:</p>
                <div class="flex flex-wrap justify-center gap-2 text-xs">
                  <span class="badge bg-amber-200 text-amber-800 border-amber-300 badge-xs sm:badge-sm dark:badge-warning">OAuth Integration</span>
                  <span class="badge bg-amber-200 text-amber-800 border-amber-300 badge-xs sm:badge-sm dark:badge-warning">Bulk Scanning</span>
                  <span class="badge bg-amber-200 text-amber-800 border-amber-300 badge-xs sm:badge-sm dark:badge-warning">CI/CD Integration</span>
                  <span class="badge bg-amber-200 text-amber-800 border-amber-300 badge-xs sm:badge-sm dark:badge-warning">Report Export</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Supported Languages -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 sm:p-6 lg:p-8">
            <h2 class="card-title text-xl sm:text-2xl mb-4 sm:mb-6 justify-center sm:justify-start">
              <i class="fas fa-code text-primary"></i>
              <span class="hidden xs:inline">Supported Languages & Ecosystems</span>
              <span class="xs:hidden">Supported Languages</span>
            </h2>

            <div class="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <!-- Python -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-python text-3xl sm:text-4xl text-blue-500 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Python</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">PyPI, requirements.txt, Pipfile, pyproject.toml</span>
                  <span class="sm:hidden">PyPI, requirements.txt</span>
                </p>
              </div>

              <!-- Node.js -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-node-js text-3xl sm:text-4xl text-green-500 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Node.js</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">npm, package.json, yarn.lock</span>
                  <span class="sm:hidden">npm, package.json</span>
                </p>
              </div>

              <!-- Java -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-java text-3xl sm:text-4xl text-red-500 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Java</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">Maven, pom.xml, build.gradle</span>
                  <span class="sm:hidden">Maven, pom.xml</span>
                </p>
              </div>

              <!-- Rust -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-rust text-3xl sm:text-4xl text-orange-600 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Rust</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">Cargo, Cargo.toml, Cargo.lock</span>
                  <span class="sm:hidden">Cargo, Cargo.toml</span>
                </p>
              </div>

              <!-- Go -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-golang text-3xl sm:text-4xl text-cyan-500 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Go</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">go.mod, go.sum</p>
              </div>

              <!-- PHP -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105">
                <i class="fab fa-php text-3xl sm:text-4xl text-purple-600 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">PHP</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">Composer, composer.json, composer.lock</span>
                  <span class="sm:hidden">Composer, composer.json</span>
                </p>
              </div>

              <!-- Ruby -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105 relative">
                <i class="fas fa-gem text-3xl sm:text-4xl text-red-600 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">Ruby</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">RubyGems, Gemfile, Gemfile.lock</span>
                  <span class="sm:hidden">RubyGems, Gemfile</span>
                </p>
                <span class="badge badge-warning absolute top-2 right-2">Preview</span>
              </div>

              <!-- .NET -->
              <div class="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-all duration-300 hover:scale-105 relative">
                <i class="fab fa-microsoft text-3xl sm:text-4xl text-blue-600 mb-2 sm:mb-3"></i>
                <h3 class="font-semibold text-base sm:text-lg">.NET</h3>
                <p class="text-xs sm:text-sm opacity-70 text-center leading-tight">
                  <span class="hidden sm:inline">NuGet, *.csproj, packages.config</span>
                  <span class="sm:hidden">NuGet, *.csproj</span>
                </p>
                <span class="badge badge-warning absolute top-2 right-2">Preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer footer-center p-4 bg-base-300 text-base-content">
      <div class="grid grid-flow-col gap-2 sm:gap-4 text-sm sm:text-base">
        <a class="link link-hover" href="/docs">
          <span class="hidden xs:inline">Documentation</span>
          <span class="xs:hidden">Docs</span>
        </a>
        <a class="link link-hover" href="/docs/api-examples">
          <span class="hidden xs:inline">API Examples</span>
          <span class="xs:hidden">API</span>
        </a>
        <a class="link link-hover" href="/health">
          <span class="hidden xs:inline">Health Check</span>
          <span class="xs:hidden">Health</span>
        </a>
      </div>
      <div>
        <div class="grid grid-flow-col gap-3 sm:gap-4">
          <a href="https://github.com/k5602/Vulnera" class="text-xl sm:text-2xl hover:text-primary transition-colors">
            <i class="fab fa-github"></i>
          </a>
          <a href="https://www.linkedin.com/in/k5602/" class="text-xl sm:text-2xl hover:text-primary transition-colors">
            <i class="fab fa-linkedin"></i>
          </a>
        </div>
      </div>
      <div class="text-center">
        <p class="text-sm sm:text-base">© 2025 Vulnera - Built with ID-Brains</p>
        <p class="text-xs sm:text-sm opacity-70 px-4">
          <span class="hidden sm:inline">Compatible with Python, Node.js, Java, Rust, Go, PHP, Ruby & .NET ecosystems</span>
          <span class="sm:hidden">vulnerability toolkit</span>
        </p>
      </div>
    </footer>

    <!-- Modals -->
    <input type="checkbox" id="loading-modal" class="modal-toggle" />
    <div
      class="modal modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
    >
      <div class="modal-box text-center">
        <h3 id="loading-title" class="font-bold text-lg">Analyzing...</h3>
        <p class="py-4">
          Please wait while we scan your dependencies for vulnerabilities.
        </p>
        <span class="loading loading-lg loading-spinner text-primary"></span>
      </div>
    </div>

    <input type="checkbox" id="result-modal" class="modal-toggle" />
    <div
      class="modal modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div class="modal-box w-11/12 max-w-7xl h-5/6 max-h-[90vh] flex flex-col">
        <div class="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 id="result-title" class="font-bold text-lg">Analysis Result</h3>
          <div class="flex items-center gap-2">
            <label for="fix-strategy-select" class="sr-only">Fix strategy</label>
            <select id="fix-strategy-select" class="select select-bordered select-xs sm:select-sm" aria-label="Fix version selection">
              <option value="nearest" selected>Nearest safe</option>
              <option value="latest">Latest safe</option>
            </select>
            <button
              id="download-report-btn"
              class="btn btn-sm btn-outline btn-primary"
              disabled
              aria-label="Download analysis report and fixed versions"
            >
              <i class="fas fa-download mr-2" aria-hidden="true"></i>
              Download Zip
            </button>
            <button class="btn btn-sm btn-circle btn-ghost" onclick="closeResultModal()" aria-label="Close analysis results">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div id="result-content" class="flex-1 overflow-y-auto p-1">
          <!-- Results will be rendered here -->
        </div>
      </div>
      <div class="modal-backdrop" onclick="closeResultModal()"></div>
    </div>


  `;

  initThemeToggle();
  initDragAndDrop();

  // Lazy-load non-critical modules on idle or first interaction
  const loadSample = async() => {
    if (!initSampleFile) {
      ({ initSampleFile } = await import(
        /* webpackChunkName: "sample-file" */ './features/sample-file.js'
      ));
      initSampleFile();
    }
  };
  const loadGithubScan = async() => {
    if (!initGitHubScanning && typeof Notyf !== 'undefined') {
      ({ initGitHubScanning } = await import(
        /* webpackChunkName: "github-scan" */ './features/github-scan.js'
      ));
      initGitHubScanning();
    }
  };
    // Warm up lazily after first paint without blocking
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        loadSample();
        loadGithubScan();
      },
      { timeout: 3000 }
    );
  } else {
    setTimeout(() => {
      loadSample();
      loadGithubScan();
    }, 800);
  }

  // Ensure first-click works before modules load
  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    const stub = async(e) => {
      e.preventDefault();
      sampleBtn.removeEventListener('click', stub);
      await loadSample();
      // Re-dispatch to hit the real handler
      sampleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    sampleBtn.addEventListener('click', stub, { once: true });
  }
  const ghScanBtn = document.getElementById('github-scan-btn');
  if (ghScanBtn) {
    const stub2 = async(e) => {
      e.preventDefault();
      ghScanBtn.removeEventListener('click', stub2);
      await loadGithubScan();
      ghScanBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    ghScanBtn.addEventListener('click', stub2, { once: true });
  }

  // Preview button for upcoming VS Code Extension
  const vsPrev = document.getElementById('vscode-ext-preview');
  if (vsPrev) {
    vsPrev.addEventListener('click', () => showVsCodeExtensionPreview());
  }

  // Hero CTA scrolls to GitHub input
  const ghCta = document.getElementById('github-scan-cta');
  if (ghCta) {
    ghCta.addEventListener('click', () => {
      const input = document.getElementById('github-url-input');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 400);
      }
      // Ensure GitHub scanning code is ready after CTA
      loadGithubScan();
    });
  }

  // Prefill GitHub token from session storage if available
  const tokenInput = document.getElementById('gh-token');
  const rememberCb = document.getElementById('gh-remember-token');
  if (tokenInput && rememberCb && typeof sessionStorage !== 'undefined') {
    const storedToken = sessionStorage.getItem('vulnera.gh.token');
    if (storedToken) {
      tokenInput.value = storedToken;
      rememberCb.checked = true;
    }
  }

  // Modal focus management
  onModalToggle('loading-modal', {
    onOpen: (modal) => {
      const h = modal.querySelector('#loading-title');
      h && h.focus();
    },
    onClose: () => {}
  });
  // Modal handlers and global functions
  window.closeResultModal = function() {
    const resultModal = document.getElementById('result-modal');
    if (resultModal) {
      resultModal.checked = false;
    }
  };

  // Add keyboard support for closing modals
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      // Close package modal if open (higher priority)
      const packageModal = document.getElementById('package-vuln-modal-container');
      if (packageModal) {
        window.closePackageModal && window.closePackageModal();
        event.preventDefault();
        return;
      }

      // Close result modal if open
      const resultModal = document.getElementById('result-modal');
      if (resultModal && resultModal.checked) {
        closeResultModal();
        event.preventDefault();
        return;
      }
    }
  });

  onModalToggle('result-modal', {
    onOpen: (modal) => {
      const h = modal.querySelector('#result-title');
      h && h.focus();
    },
    onClose: () => {}
  });

  // Fix strategy preference control
  (function initFixStrategyPreference() {
    const fixSelect = document.getElementById('fix-strategy-select');
    const downloadBtn = document.getElementById('download-report-btn');
    const savedStrategy =
            (typeof sessionStorage !== 'undefined' &&
                sessionStorage.getItem('vulnera.fix.strategy')) ||
            'nearest';
    if (fixSelect) {
      fixSelect.value = savedStrategy;
      window.VULNERA_FIX_STRATEGY = fixSelect.value;
      if (downloadBtn) {
        downloadBtn.dataset.fixStrategy = fixSelect.value;
      }
      fixSelect.addEventListener('change', () => {
        const val = fixSelect.value === 'latest' ? 'latest' : 'nearest';
        window.VULNERA_FIX_STRATEGY = val;
        try {
          sessionStorage.setItem('vulnera.fix.strategy', val);
        } catch {}
        if (downloadBtn) {
          downloadBtn.dataset.fixStrategy = val;
        }
      });
    }
  })();
});

// Initialize Notyf for notifications
initNotyf();
