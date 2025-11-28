# Vulnera Frontend - AI Coding Agent Instructions

## Project Overview
**Vulnera** is a vulnerability analysis platform frontend built with **Astro** (SSR-capable) + **React** components + **TypeScript** + **TailwindCSS**. It provides security scanning, reporting, and LLM-powered analysis for software dependencies and code vulnerabilities.

### Tech Stack
- **Framework**: Astro 5 (SSR/Node adapter) + React 19 for interactive components
- **Styling**: TailwindCSS 4 + Vite (@tailwindcss/vite)
- **Language**: TypeScript (strict mode, ES2020 target)
- **API**: Axios + custom apiFetch wrapper with CSRF/auth handling
- **Testing**: Vitest + Testing Library
- **Build**: Vite with compression (Brotli/gzip) and bundle analysis

## Architecture Patterns

### API Integration Architecture
The frontend uses a **proxy-first development approach** with production direct-URL fallback:

1. **API Configuration** (`src/config/api.ts`):
   - Detects localhost/development environment → uses empty string (proxied via Vite)
   - Production mode → uses `PUBLIC_API_BASE` environment variable
   - Auto-config proxy in `astro.config.mjs` for `/api`, `/health`, `/metrics` routes

2. **Auth Flow** (`src/utils/api/auth-store.ts` + `client.ts`):
   - CSRF tokens stored in `localStorage` (keys: `__vulnera_csrf_token`, `__vulnera_current_user`)
   - Auto-extract auth data from response headers (`X-CSRF-Token`) and body
   - HttpOnly cookies handled by backend; frontend manages CSRF only
   - Check auth status: `isAuthenticated()` from `auth-store.ts`

3. **API Client** (`src/utils/api/client.ts`):
   - Use `apiClient.get/post/put/delete()` or generic `apiFetch()` wrapper
   - Returns `ApiResponse<T>` with `{ success, status, data, error }` shape
   - Auto-includes CSRF token in X-CSRF-Token header; extracts from responses
   - All endpoints in `src/config/api.ts` as `API_ENDPOINTS` object

### Module Organization
**Modules** (`src/modules/`) are class-based handlers for complex business logic:
- `scanModule.ts`: File upload, repo import, polling for scan jobs (ScanHandler class)
- `userdata.ts`: User profile data management
- `dashboard.ts`: Dashboard state/data
- Example pattern: `new ScanHandler()` with lifecycle methods (start/stop polling, cleanup)

### Component Patterns

**Astro Pages** (`src/pages/`) - SSR-rendered:
- Static `.astro` components render on server
- Load data server-side; pass to React islands
- Auth check in middleware (`src/middleware/index.ts`)

**React Islands** (`src/components/*.tsx`):
- Client-side interactive components
- Use `client:load` in Astro to hydrate on load
- Examples: `VulneraBot.tsx` (LLM chat), `ScanReport.tsx` (vulnerability report)
- Import services: `apiClient`, `authService`, `scanService`

**Report Component** (`src/components/report/ScanReport.tsx`):
- Handles vulnerability display with severity badges (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Uses `usePagination` hook for large datasets
- Integrates enrich & fix services for enhanced analysis

### Request/Response Patterns
- **Scan Job Request**: `AnalyzeJobRequest` with `{ source_type, source_uri, analysis_depth, callback_url }`
- **Report Summary**: `ReportSummary` with `{ total_findings, critical, high, medium, low, info, modules_completed, modules_failed }`
- **Vulnerability Shape**: `{ id, severity, package, version, title, cve, cvss, affectedFiles, recommendation }`
- Backward compatibility maintained for camelCase fields (e.g., `sourceUri` → `source_uri`)

## Development Workflow

### Start Development
```bash
# Set .env with backend URL
PUBLIC_API_BASE=http://localhost:8000

# Run dev server (auto-proxy to backend)
npm run dev
```
- Vite dev server listens on `localhost:3000`
- Requests to `/api/*` auto-proxy to `PUBLIC_API_BASE`
- Hot reload on file changes

### Build & Production
```bash
# Type check and build
npm run build

# Preview built output
npm run preview

# For production, set PUBLIC_API_BASE in deployment environment
```
- Vite bundles with tree-shaking, compression (Brotli/gzip)
- Bundle analysis: check `dist/stats.html` after build
- Console logs stripped in production via esbuild config

### Testing
```bash
# Run all tests
npm run test

# Watch mode with UI
npm run test:ui

# Coverage report
npm run coverage
```
- Vitest + jsdom for DOM testing
- Test setup in `src/test-setup.ts` (localStorage mock, fetch mock)
- Test patterns in `src/utils/api/__tests__/`

## Coding Conventions

### TypeScript Conventions
- **Strict mode enforced**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` required
- **Type exports**: Export interfaces/types from `src/types/` or service files
- **Naming**: PascalCase for types/classes, camelCase for functions/variables
- **Union types**: Use `'literal' | 'values'` for severity levels (not enums)

### Validation & Error Handling
- Use **Zod** (`src/config/validation.ts`) for environment & runtime validation
- Example: `z.object({ PUBLIC_API_BASE: z.string().url() })`
- Fail loudly in production, fallback gracefully in development
- Log errors via `logger.error/warn/info` from `src/utils/logger.ts`

### File Organization
- **Services**: `src/utils/api/*-service.ts` for domain logic (scan, auth, enrich, fix)
- **Components**: Astro files in `src/components/` for SSR; React `.tsx` for islands
- **Pages**: Astro files in `src/pages/`; API routes in `src/pages/api/v1/*`
- **Config**: Centralized in `src/config/` (api, theme, validation)
- **Utils**: Helper functions; auth/API utilities in `src/utils/api/`

### Styling
- **TailwindCSS v4** classes only; no custom CSS unless unavoidable
- Theme config in `src/config/theme.ts`
- Global styles in `src/styles/global.css` (minimal; prefer utilities)
- Animations: use Framer Motion (`framer-motion` v12+) for complex UI

### Authentication & Security
- **Public pages**: `/`, `/login`, `/signup`, `/orgsignup`, `/docs/*` (middleware whitelist)
- **Protected routes**: Check `isAuthenticated()` before rendering sensitive components
- **CSRF**: Auto-handled by `apiClient` (include header, extract from response)
- **Cookies**: HttpOnly backend-managed; frontend only reads/writes CSRF tokens

## Common Tasks

### Adding a New API Endpoint Integration
1. Add endpoint to `API_ENDPOINTS` object in `src/config/api.ts`
2. Create service class in `src/utils/api/{domain}-service.ts` with type definitions
3. Use `apiClient.get/post()` or `apiFetch()` with `ApiResponse<T>` return type
4. Import & use in components via `React.useEffect()` or module class

### Creating a New Scan Report Component
1. Accept `ScanReportData` prop with vulnerabilities array
2. Use `usePagination(vulnerabilities, itemsPerPage)` for large lists
3. Call `enrichService.enrich()` for AI-powered explanations (returns `EnrichedFinding`)
4. Call `fixService.fix()` for remediation suggestions
5. Display severity badges using `SeverityBadge` pattern from `ScanReport.tsx`

### Handling Authentication
```typescript
import { isAuthenticated, getCurrentUser } from '../utils/api/auth-store';
import { authService } from '../utils/api/auth-service';

// Check auth in component
if (!isAuthenticated()) { /* show login */ }

// Get current user
const user = getCurrentUser(); // { id, email, name, roles }

// Logout
await authService.logout();
```

### Testing API Interactions
- Mock `fetch` globally in `test-setup.ts`
- Use `vi.mocked(fetch)` to assert calls
- Test auth store with localStorage mock (auto-setup in test-setup.ts)
- Example in `src/utils/api/__tests__/client.test.ts`

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

## Linting & Code Quality
- **ESLint**: `eslint.config.js` enforces strict TypeScript, consistent formatting
- **Key rules**: `@typescript-eslint/no-explicit-any: warn`, single quotes, 2-space indent, no trailing commas in objects
- Run: `npm run lint` (if script added to `package.json`)

---

**Last Updated**: November 2025 | Vulnera Frontend v0.0.1
