# Vulnera Frontend

Vulnera Frontend is a browser-based Single Page Application (SPA) for analyzing dependency files and reporting vulnerabilities. It is built using Vite, Tailwind CSS, and DaisyUI, with no framework.

## Features

- Drag-and-drop or file input for uploading dependency files (e.g., `package.json`, `requirements.txt`, `pom.xml`, etc.)
- Automatic detection of supported ecosystems (Node.js, Python, Java, Rust, Go, PHP, etc.)
- Sends files to a backend API for vulnerability analysis
- Displays vulnerabilities grouped by package, with severity badges
- Supports paginated results for large reports
- Generates downloadable HTML reports and ZIP bundles (including fixed files and a fix log)
- Automatic file fixing for supported formats (Node.js, Python, Java)
- User notifications for errors, successes, and info
- Strict sanitization and file size limits (max 1MB)

## Getting Started

1. Initialize environment variables (creates .env from the example):

   ```
   npm run env:init
   ```

2. Review and update the newly created `.env` file to match your environment (see Configuration below).
3. Install dependencies:

   ```
   npm install
   ```

4. Run the development server:

   ```
   npm run dev
   ```

5. Open your browser to `http://localhost:5173` (default Vite port).

## Build & Preview

- Build for production:

  ```
  npm run build
  ```

- Preview the production build:

  ```
  npm run preview
  ```

## Configuration

Configuration is resolved with the following precedence:

1. Vite env vars (VITE\_\* from `.env` at build time)
2. Runtime vars via `window.*` (set by `public/runtime-config.js`, loaded before `/src/main.js`)
3. `process.env` (for non-browser tooling/tests)
4. Safe defaults

Primary keys the app reads:

- `API_BASE_URL` (VITE_API_BASE_URL)
- `API_VERSION` (VITE_API_VERSION)
- `APP_NAME` (VITE_APP_NAME)
- `APP_VERSION` (VITE_APP_VERSION)
- `ENABLE_DEBUG` (VITE_ENABLE_DEBUG) – string "true" or "false"
- `API_TIMEOUT` (VITE_API_TIMEOUT) – milliseconds
- `ENVIRONMENT` (VITE_ENVIRONMENT) – e.g., development, staging, production
- `ALLOWED_ORIGINS` (VITE_ALLOWED_ORIGINS) – optional allowlist for API base URL validation

Example `.env` (build-time):

```
VITE_API_BASE_URL=https://api.example.com
VITE_API_VERSION=v1
VITE_APP_NAME=Vulnera
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=60000
VITE_ENVIRONMENT=production

Optional runtime configuration (post-build, no rebuild needed):

- Include before `/src/main.js` in `index.html`:

```

<script src="/runtime-config.js"></script>

```

- Set at runtime:

```

<script>
  window.VulneraRuntimeConfig.setConfig({
    apiBaseUrl: 'https://api.example.com',
    apiVersion: 'v1',
    appName: 'Vulnera',
    appVersion: '1.0.0',
    enableDebug: false,
    apiTimeout: 60000,
    environment: 'production'
  });
</script>

```

- Or use built-in examples:

```

<script>
  // e.g., "staging" | "production" | "development"
  window.VulneraRuntimeConfig.useExample('staging');
</script>

```

Production optimizations and cleanup:

- Production builds strip `console` and `debugger`, disable sourcemaps, and emit Brotli/Gzip assets for optimal delivery.
- Keep `public/runtime-config.js` only if you need runtime overrides; otherwise rely on `.env`.
- Do not deploy development artifacts (e.g., `coverage/`). Only publish the `dist/` directory.
- The API base URL is validated against `VITE_ALLOWED_ORIGINS` (or built-in safe defaults). Update the allowlist if introducing new hosts.

## File Structure

- `src/features/`: Analysis, drag-and-drop, GitHub scan, sample file logic
- `src/ui/`: Theme, modals, notifications, focus management
- `src/utils/`: Ecosystem detection, file fixing, sanitization
- `src/config.js`: Environment config
- `src/html-report-generator.js`: HTML report generation

## Backend

This frontend communicates with the Vulnera backend API.
Find the backend project here: [Vulnera Backend](https://github.com/k5602/Vulnera.git)

## License

This project is private and not licensed for public use.
```
