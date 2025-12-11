# Vulnera Frontend - AI Coding Agent Instructions

## Project Overview
**Vulnera** is a vulnerability analysis platform frontend built with **Astro** (SSR-capable) + **React** components + **TypeScript** + **TailwindCSS**. It provides security scanning, reporting, and LLM-powered analysis for software dependencies and code vulnerabilities.

### Tech Stack
- **Framework**: Astro 5 (SSR/Node adapter) + React 19 for interactive components
- **Styling**: TailwindCSS 4 + Vite (@tailwindcss/vite)
- **Language**: TypeScript (strict mode, ES2020 target)
- **API**: fetch API + custom `apiFetch` wrapper with CSRF/HttpOnly cookie auth handling
- **Testing**: Vitest + Testing Library
- **Build**: Vite with compression (Brotli/gzip) and bundle analysis

## Architecture Patterns

### API Integration Architecture - HttpOnly Cookies + CSRF Tokens
The frontend uses **HttpOnly session cookies** (managed by backend) + **frontend-managed CSRF tokens**. This is NOT the Axios-based flow mentioned below—key distinction:

**Authentication Lifecycle** (`src/utils/api/client.ts` + `auth-store.ts`):
1. **Bootstrap**: User logs in → backend sends HttpOnly `auth_token` cookie + `csrf_token` in response body
2. **Frontend Storage**: CSRF token stored in `localStorage` (keys: `__vulnera_csrf_token`, `__vulnera_current_user`)
3. **Request Flow**: Browser auto-sends HttpOnly cookie (via `credentials: 'include'`); frontend adds `X-CSRF-Token` header for mutating requests
4. **Token Refresh**: On 401 → call `/api/v1/auth/refresh` (POST, no CSRF required if session cookie is valid) → extract fresh CSRF token
5. **Bootstrap Edge Case**: First mutating request may have no CSRF token; `apiFetch` calls `refreshAuth()` first

**Critical Implementation Details**:
- **Why HttpOnly cookies**: Prevents XSS token theft; backend manages session lifecycle
- **Why CSRF tokens**: Extra defense layer for state-changing requests; extracted from response headers (`X-CSRF-Token`) or body (`csrf_token`)
- **No Axios**: Uses native `fetch` API directly for maximum control over auth flow
- CSRF token refresh auto-handled in `apiFetch` → don't manually call `refreshAuth()` in components

**Auth Store** (`src/utils/api/auth-store.ts`):
- `getCsrfToken()` / `setCsrfToken()`: In-memory + localStorage sync
- `getCurrentUser()` / `setCurrentUser()`: Flat object `{ id, email, name, roles }`
- `isAuthenticated()`: Check `getCurrentUser() !== null`
- `refreshAuth()`: Mutex-protected to prevent race conditions
- `clearAuth()`: Called on logout or 401/403 token refresh failures

### API Configuration & Environment
**API Config** (`src/config/api.ts`):
- **Default**: Empty string `""` (same-origin) → routes through Vite dev proxy or Node middleware in production
- **Production direct**: Set `PUBLIC_FORCE_API_BASE=true` to bypass proxy (not recommended; can cause CORS/mixed-content issues)
- Proxy auto-configured in `astro.config.mjs` for `/api`, `/health`, `/metrics`
- **Environment Detection**: `import.meta.env.PUBLIC_API_BASE` (injected at build time)

**Why Proxy-First**:
- Avoids CORS config on backend
- Avoids mixed-content errors (HTTPS frontend → HTTP backend dev server)
- Reduces attack surface (no direct backend URL exposed to client)

**API Endpoints** (`API_ENDPOINTS` object in `src/config/api.ts`):
- All endpoints centralized: `API_ENDPOINTS.AUTH.LOGIN`, `API_ENDPOINTS.ANALYSIS.ANALYZE`, etc.
- Path params use `:param` syntax → use `apiClient.replacePath(template, params)` to fill

### API Client & Request/Response Patterns
**Request Flow** (`src/utils/api/client.ts`):
1. Use `apiClient.get/post/put/delete(url, body?)` or `apiFetch(url, init)`
2. Returns `ApiResponse<T>` with shape: `{ ok, status, data?, error? }`
3. `ok` mirrors HTTP `fetch.Response.ok` (true if 200-299); check this first
4. Auto-includes CSRF header for mutating requests; auto-retries on 401 with fresh token
5. All errors logged via `logger.error/warn` from `src/utils/logger.ts`

**Error Handling Pattern**:
```typescript
const res = await apiClient.post<ScanResponse>(API_ENDPOINTS.ANALYSIS.ANALYZE, payload);
if (!res.ok) {
  const errorMsg = (res.error as any)?.message || 'Analysis failed';
  throw new Error(errorMsg);
}
const { data } = res; // Safe to access; type is ScanResponse
```

**Response Types** (`src/types/api.ts`):
- `ApiResponse<T>`: Generic response wrapper with `ok, status, data, error`
- `TokenResponse`: Login/refresh responses with `access_token, refresh_token, expires_in`
- Use Zod for runtime validation in services (e.g., `parseApiResponse(data, schema)`)

### Module Organization
**Modules** (`src/modules/`) are class-based singleton handlers for complex state/polling:
- `scanModule.ts` / `ScanHandler`: File upload, repo import, polling for scan job results (manages UI event listeners, state)
- `Userdata.ts`: User profile/account data
- `userDashboard.ts`: Dashboard aggregation & caching
- Pattern: `new ScanHandler()` with lifecycle methods (`startImportTimer()`, `stopPolling()`, `cleanupImport()`)
- **No React hooks in modules**; use in `.astro` pages or pass to React islands

### Component Patterns

**Astro Pages** (`src/pages/*.astro`) - Server-side rendered:
- Static `.astro` components; load data server-side using services
- Pass data to React islands as props; islands handle interactivity
- Auth check in middleware (`src/middleware/index.ts`); currently disabled but shows pattern

**React Islands** (`src/components/*.tsx`) - Client-side interactive:
- Decorated with `client:load` in Astro to hydrate immediately
- Examples: `VulneraBot.tsx` (LLM chat), `ScanReport.tsx` (vulnerability report)
- Import API services directly: `import { apiClient } from '../../utils/api/client'`
- Use `React.useEffect` for async data loading; handle loading/error states explicitly

**Report Component Pattern** (`src/components/report/ScanReport.tsx`):
- Accepts `ScanReportData` prop with vulnerabilities array and metadata
- Uses `usePagination(vulnerabilities, itemsPerPage)` hook for large datasets
- Calls `enrichService.enrich()` for AI-powered vulnerability explanations (returns `EnrichedFinding`)
- Calls `llmService.fix()` for remediation suggestions (returns `FixResponse`)
- Display severity badges using `getSeverityClasses(level)` util (not hardcoded color classes)
- Manages local state for `enrichedData`, `fixData`, `explainingFindingId` separately per finding
- **Key pattern**: Map vulnerability IDs to results; track "in-flight" actions to prevent duplicate requests

### Request/Response Patterns
- **Scan Job Request**: `AnalyzeJobRequest` with `{ source_type, source_uri, analysis_depth, callback_url }`
- **Report Summary**: `ReportSummary` with `{ total_findings, critical, high, medium, low, info, modules_completed, modules_failed }`
- **Vulnerability Shape**: `{ id, severity, package, version, title, cve, cvss, affectedFiles, recommendation }`
- Backward compatibility maintained for camelCase fields (e.g., `sourceUri` → `source_uri`)

## Development Workflow

### Start Development
```bash
# 1. Install dependencies
npm install

# 2. Set .env with backend URL
echo "PUBLIC_API_BASE=http://localhost:8000" > .env.local

# 3. Run dev server (auto-proxy to backend)
npm run dev
```
- Vite dev server listens on `localhost:3000`
- Requests to `/api/*` auto-proxy to `PUBLIC_API_BASE` via Astro's vite.server.proxy config
- Hot reload on file changes (`.tsx`, `.astro`, `.css`); restart if `astro.config.mjs` changes
- **Critical**: If backend URL changes, restart dev server (environment is loaded once at startup)

### Build & Production
```bash
# Type check and build
npm run build

# Preview built output (uses Node adapter)
npm run preview

# For production deployment, set PUBLIC_API_BASE in deployment environment
# Example: export PUBLIC_API_BASE=https://api.example.com
```
- Vite bundles with tree-shaking, compression (Brotli/gzip via `vite-plugin-compression`)
- Console logs stripped in production via esbuild config
- Output is Node.js standalone server (uses `@astrojs/node` adapter)
- Use `dist/stats.html` after build for bundle analysis (generated by `rollup-plugin-visualizer`)

### Testing
```bash
# Run all tests (vitest in jsdom environment)
npm run test

# Watch mode with UI dashboard
npm run test:ui

# Coverage report (c8)
npm run test:coverage
```
- **Test Setup** (`src/test-setup.ts`): Mocks `localStorage`, `fetch`, browser globals
- **Test Patterns** in `src/utils/api/__tests__/`:
  - Use `vi.mocked(fetch)` to assert API calls
  - Mock auth state with `vi.spyOn(authStore, 'getCurrentUser')`
  - Reset localStorage between tests: `localStorage.clear()`
- Tests run in jsdom (DOM environment)

## Coding Conventions

### TypeScript Conventions
- **Strict mode enforced**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` required (tsconfig.json)
- **Type exports**: Export interfaces/types from `src/types/` or service files
- **Naming**: PascalCase for types/classes, camelCase for functions/variables
- **Union types**: Use `'literal' | 'values'` for severity levels (not enums, e.g., `SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'`)
- **Return types**: Explicitly annotate function returns; ESLint enforces via `@typescript-eslint/explicit-function-return-types`

### Error Handling Patterns
- **API errors**: Extract message from `response.error` as `{ message?, error?, ...}` and provide fallback
- **Service-level**: Return typed responses like `{ success: boolean, error?: string, data?: T }` or throw with context
- **Logging**: Always log via `logger.error/warn/debug` (from `src/utils/logger.ts`), never use `console.log` in production
- **Bootstrap errors**: Handle cases where auth hasn't been initialized (e.g., first page load) gracefully

### File Organization
- **Services**: `src/utils/api/*-service.ts` for domain logic (scan, auth, enrich, fix); use class-based pattern with static methods
- **Components**: Astro files in `src/components/` for SSR; React `.tsx` for islands only
- **Pages**: Astro files in `src/pages/`; backend API routes in `src/pages/api/v1/*`
- **Config**: Centralized in `src/config/` (api, theme, validation); use getters for runtime values
- **Utils**: Helper functions; auth/API utilities in `src/utils/api/`; general utilities in `src/utils/`
- **Modules**: Complex stateful logic in `src/modules/` as class-based handlers (no React)

### Styling
- **TailwindCSS v4** only; no custom CSS unless absolutely unavoidable (justify in comment)
- **Color patterns**: Use semantic classes from theme (e.g., `text-cyber-300`, `bg-cyber-400/10`) not hardcoded colors
- **Theme config**: In `src/config/theme.ts`; global styles minimal in `src/styles/global.css`
- **Animations**: Use Framer Motion (`framer-motion` v12+) for complex UI; Tailwind for simple transitions

### Authentication & Security
- **Public routes**: `/`, `/login`, `/signup`, `/orgsignup`, `/docs/*` (whitelist in middleware)
- **Protected routes**: Check `isAuthenticated()` before rendering; redirect to `/login?next=...` on middleware
- **CSRF**: Automatically handled by `apiFetch` for mutating requests; don't manually manage
- **Cookies**: All cookies are HttpOnly (backend-managed); frontend only stores CSRF token in localStorage (by design)

## Common Tasks

### Adding a New API Endpoint Integration
1. Add endpoint to `API_ENDPOINTS` object in `src/config/api.ts` (use snake_case: `/api/v1/my_resource/:id`)
2. Create service class in `src/utils/api/{domain}-service.ts` with type definitions using TypeScript interfaces
3. Use `apiClient.get<T>(url, opts?)` or `apiClient.post<T>(url, body?, opts?)` with full type safety
4. Always check `response.ok` before accessing `response.data` (early return pattern)
5. Import & use in React components via `React.useEffect()` with cleanup; pass to Astro pages to invoke at build-time

### Creating a New Scan Report Component
1. Accept `ScanReportData` prop with vulnerabilities array; validate shape at component entrance
2. Use `usePagination(vulnerabilities, itemsPerPage)` hook for large lists (>50 items)
3. Manage enrichment state as `Map<vulnerabilityId, EnrichedFinding>` to prevent duplicate requests on re-renders
4. Call `enrichService.enrich()` for AI explanations; show loading state while pending
5. Call `llmService.fix()` for remediation; map responses back to findings by ID
6. Display severity via `getSeverityClasses(level)` (utility in `src/utils/severity.ts`) → never hardcode color classes

### Handling Authentication
```typescript
import { isAuthenticated, getCurrentUser } from '../utils/api/auth-store';
import { authService } from '../utils/api/auth-service';

// Check auth in component (client-side)
if (!isAuthenticated()) { return <LoginRedirect />; }

// Get current user info
const user = getCurrentUser(); // { id, email, name, roles }

// Logout (also calls clearAuth internally)
await authService.logout();
```

### Testing API Interactions
- Mock `fetch` globally in `test-setup.ts` (auto-setup; don't re-mock in tests)
- Use `vi.mocked(fetch)` to assert API calls and mock responses
- Test auth state with `vi.spyOn(authStore, 'getCurrentUser')` → mock return value
- Reset localStorage between tests: `localStorage.clear()`; auth module will reinitialize on next call
- Example: See `src/utils/api/__tests__/client.test.ts` for complete patterns

### Working with Modules (ScanHandler, etc.)
- Instantiate in `.astro` pages: `const handler = new ScanHandler(); handler.init();`
- Module lifecycle: `startImportTimer()` → `startPolling()` → `stopPolling()` → `cleanupImport()`
- Use `addEventListener` for DOM bindings; always `removeEventListener` in cleanup
- Store instance in global (e.g., `window.scanHandler`) if cross-component access needed (avoid; prefer Astro props instead)
- Modules emit custom events → components listen via `.addEventListener()` (not React events)

## Performance & Optimization

### Bundle Strategy
- **Vendor chunks**: React, Framer Motion split into separate chunks for better caching
- **Asset optimization**: CSS minification, image compression via Vite plugins
- **Manual chunking** in `vite.config.ts` for predictable bundle sizes
- Monitor with `npm run build` → check `dist/stats.html`

### Development Tips
- **Dev server proxy**: Ensure `PUBLIC_API_BASE` matches running backend to avoid 404s
- **CORS debugging**: Check browser console for proxy issues; restart `npm run dev` if env changes
- **Hot reload**: Works for `.tsx`, `.astro`, `.css`; restart if `astro.config.mjs` changes
- **localStorage issues**: Clear browser storage if auth state stale (`localStorage.clear()`)

## Critical Gotchas & Debugging

### CSRF Token Bootstrap Issue
When a component first tries a mutating request (POST/PUT/DELETE) without CSRF token in localStorage:
1. `apiFetch` detects missing token and calls `refreshAuth()`
2. `refreshAuth()` uses native `fetch()` directly (not `apiFetch`) to avoid recursion
3. Backend **must** allow `/api/v1/auth/refresh` without CSRF header if session cookie is valid
4. If bootstrap fails, the original request will fail with 403 Forbidden (expected behavior)

**Fix**: Ensure user is authenticated (has valid session cookie) before making first mutating request, or call `initAuth()` on page load.

### Environment Variables Not Updating in Dev
Environment variables are embedded at build-time. If you change `.env.local`:
1. Kill dev server (`Ctrl+C`)
2. Restart with `npm run dev`
3. Check browser console: `import.meta.env.PUBLIC_API_BASE` should be new value

### Astro Hydration Mismatches
If React island isn't hydrating (no interactivity):
1. Check component has `client:load` directive in `.astro` file
2. Verify component is wrapped in parent with `client:load` (parent directive applies to children)
3. Check for stale build output: `rm -rf .astro/ dist/` then `npm run dev`

### CORS/Mixed-Content Errors
**Always use relative API base (`""` in `api.ts`)** to go through proxy:
- ✅ Frontend: `https://app.example.com` → Request: `/api/...` → Proxy → Backend: `http://localhost:8000`
- ❌ Frontend: `https://app.example.com` → Request: `http://localhost:8000/api/...` → CORS/Mixed-content error

Only use `PUBLIC_FORCE_API_BASE=true` in development localhost scenarios.

## Linting & Code Quality
- **ESLint**: `eslint.config.js` enforces strict TypeScript, consistent formatting
- **Key rules**: `@typescript-eslint/no-explicit-any: warn`, single quotes, 2-space indent, no trailing commas in objects
- **Run linting**: Not exposed in package.json; use `npx eslint src/` manually if needed
- **Pre-commit**: Consider adding ESLint hook to prevent linting errors in PRs

---

**Last Updated**: November 2025 | Vulnera Frontend v0.0.1
