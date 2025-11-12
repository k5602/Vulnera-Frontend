# Vulnera Frontend - Quick Fixes Implementation Guide

**Purpose**: Copy-paste ready code snippets for immediate security fixes

---

## Fix #1: Enable Authentication Middleware (5 minutes)

**File**: `src/middleware/index.ts`

**Replace entire file with**:

```typescript
import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/about',
];

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;

  // Check if route is public
  const isPublicPage = PUBLIC_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );

  if (!isPublicPage) {
    // Protected route - verify authentication
    const token = context.cookies.get('auth_token');

    if (!token?.value) {
      // No token found - redirect to login
      return context.redirect(
        `/login?next=${encodeURIComponent(pathname)}`
      );
    }

    // TODO: Add server-side token validation against backend
    // Example:
    // const isValid = await validateTokenWithBackend(token.value);
    // if (!isValid) {
    //   context.cookies.delete('auth_token');
    //   return context.redirect('/login');
    // }
  }

  return next();
});
```

---

## Fix #2: Add Environment Validation (30 minutes)

**File**: `src/config/validation.ts` (NEW FILE)

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  PUBLIC_API_BASE: z
    .string()
    .url('PUBLIC_API_BASE must be a valid URL')
    .default('http://localhost:8000'),
  VITE_OIDC_AUTHORITY: z
    .string()
    .url('VITE_OIDC_AUTHORITY must be a valid URL')
    .optional(),
  VITE_OIDC_CLIENT_ID: z.string().min(1).optional(),
  VITE_OIDC_REDIRECT_URI: z.string().url().optional(),
  VITE_ENABLE_OIDC: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform(v => v === 'true'),
  VITE_ENABLE_TRADITIONAL_AUTH: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform(v => v === 'true'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnvironment(): EnvConfig {
  const env = {
    PUBLIC_API_BASE: import.meta.env.PUBLIC_API_BASE,
    VITE_OIDC_AUTHORITY: import.meta.env.VITE_OIDC_AUTHORITY,
    VITE_OIDC_CLIENT_ID: import.meta.env.VITE_OIDC_CLIENT_ID,
    VITE_OIDC_REDIRECT_URI: import.meta.env.VITE_OIDC_REDIRECT_URI,
    VITE_ENABLE_OIDC: import.meta.env.VITE_ENABLE_OIDC,
    VITE_ENABLE_TRADITIONAL_AUTH: import.meta.env.VITE_ENABLE_TRADITIONAL_AUTH,
  };

  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessage = Object.entries(errors)
      .map(([key, msgs]) => `${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('❌ Invalid environment configuration:\n', errorMessage);

    if (import.meta.env.PROD) {
      throw new Error('Invalid environment configuration');
    }
  }

  if (import.meta.env.DEV) {
    console.log('✅ Environment validated successfully');
  }

  return result.data || {};
}

export const config = validateEnvironment();
```

**Update** `src/config/api.ts` to use validated config:
```typescript
import { config } from './validation';

export const API_CONFIG = {
  BASE_URL: config.PUBLIC_API_BASE,
  TIMEOUT: 30000,
  VERSION: 'v1',
} as const;
```

**Install Zod**:
```bash
npm install zod
```

---

## Fix #3: Create Centralized Auth Guard (20 minutes)

**File**: `src/utils/auth-guard.ts` (NEW FILE)

```typescript
/**
 * Centralized authentication guard logic
 * Use this in all pages instead of inline scripts
 */

export interface AuthGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Get authentication token from cookies
 */
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = 'auth_token=';
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(nameEQ)) {
      return decodeURIComponent(trimmed.substring(nameEQ.length));
    }
  }

  return null;
}

/**
 * Get redirect destination from URL params
 */
function getRedirectPath(defaultPath: string): string {
  if (typeof window === 'undefined') return defaultPath;

  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  // Validate it's a safe relative path
  if (next && next.startsWith('/') && !next.includes('//')) {
    return next;
  }

  return defaultPath;
}

/**
 * Setup authentication guard for a page
 * Call this in a module script on pages that need auth
 */
export function setupAuthGuard(options: AuthGuardOptions = {}): void {
  if (typeof window === 'undefined') return;

  const hasAuth = !!getAuthToken();
  const { requireAuth = false, redirectTo = '/dashboard' } = options;

  if (requireAuth && !hasAuth) {
    // Protected page - user not authenticated
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`;
    window.location.href = loginUrl;
  } else if (!requireAuth && hasAuth) {
    // Guest page - user already authenticated
    window.location.href = redirectTo;
  }
}

/**
 * String to embed directly in Astro pages as inline script
 * Usage: <script is:inline define:vars={{requireAuth: true}}>
 *        {INLINE_GUARD_SCRIPT}
 *        </script>
 */
export const INLINE_GUARD_SCRIPT = `
  (function() {
    function getToken() {
      const nameEQ = 'auth_token=';
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(nameEQ)) {
          return decodeURIComponent(trimmed.substring(nameEQ.length));
        }
      }
      return null;
    }

    const hasAuth = !!getToken();

    if (requireAuth && !hasAuth) {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = '/login?next=' + encodeURIComponent(currentPath);
    } else if (!requireAuth && hasAuth) {
      window.location.href = '/dashboard';
    }
  })();
`;
```

**Update** `src/pages/dashboard.astro` - Replace inline script:

```astro
---
import Layout from "../layouts/Layout.astro";
import Navigation from "../components/Navigation.astro";
import Footer from "../components/Footer.astro";
---

<Layout title="Dashboard — Vulnera" description="Overview of reports, projects, and recent activity.">
  <script>
    import { setupAuthGuard } from '../utils/auth-guard';
    setupAuthGuard({ requireAuth: true });
  </script>

  <!-- REST OF PAGE -->
</Layout>
```

**Update** `src/pages/login.astro` - Replace inline script:

```astro
---
import Layout from "../layouts/Layout.astro";
import Navigation from "../components/Navigation.astro";
import Footer from "../components/Footer.astro";
---

<Layout title="Login — Vulnera" description="Access your Vulnera account">
  <script>
    import { setupAuthGuard } from '../utils/auth-guard';
    setupAuthGuard({ requireAuth: false, redirectTo: '/dashboard' });
  </script>

  <!-- REST OF PAGE -->
</Layout>
```

**Update** `src/pages/scan.astro` - Replace inline script:

```astro
---
import Layout from "../layouts/Layout.astro";
import Navigation from "../components/Navigation.astro";
import Footer from "../components/Footer.astro";
---

<Layout title="Scan — Vulnera" description="Upload manifests or import repositories for scanning.">
  <script>
    import { setupAuthGuard } from '../utils/auth-guard';
    setupAuthGuard({ requireAuth: true });
  </script>

  <!-- REST OF PAGE -->
</Layout>
```

---

## Fix #4: Add File MIME Type Validation (15 minutes)

**File**: Update `src/utils/validation.ts`

Replace the `validateFileUpload` function:

```typescript
const MIME_WHITELIST: Record<string, string[]> = {
  json: ['application/json'],
  xml: ['application/xml', 'text/xml'],
  txt: ['text/plain'],
  csv: ['text/csv'],
  lock: ['text/plain'],
  yaml: ['application/x-yaml', 'text/x-yaml'],
  yml: ['application/x-yaml', 'text/x-yaml'],
  md: ['text/markdown', 'text/plain'],
};

export function validateFileUpload(
  file: File,
  allowedExtensions: string[],
  maxSizeMB: number = 50
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({ field: 'file', message: 'File is required' });
    return { isValid: false, errors };
  }

  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Validate extension
  if (!allowedExtensions.includes(ext)) {
    errors.push({
      field: 'file',
      message: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
    });
  }

  // 2. Validate MIME type against whitelist
  const allowedMimes = MIME_WHITELIST[ext] || [];
  if (allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `Invalid file type: ${file.type}. Expected: ${allowedMimes.join(', ')}`,
    });
  }

  // 3. Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push({
      field: 'file',
      message: `File size exceeds ${maxSizeMB}MB limit (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

---

## Fix #5: Add Login Rate Limiting (20 minutes)

**File**: `src/utils/api/rate-limiter.ts` (NEW FILE)

```typescript
/**
 * Simple client-side rate limiter
 * Prevents brute force login attempts
 */

interface Attempt {
  timestamp: number;
}

export class RateLimiter {
  private attempts: Map<string, Attempt[]> = new Map();
  private lockout: Map<string, number> = new Map();

  /**
   * Check if an action is allowed
   * @param key - Unique identifier (e.g., email address)
   * @param maxAttempts - Max attempts before lockout
   * @param windowMs - Time window for attempts in milliseconds
   * @returns true if action is allowed
   */
  isAllowed(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60 * 1000
  ): boolean {
    const now = Date.now();

    // Check if in lockout period
    const lockoutEnd = this.lockout.get(key);
    if (lockoutEnd && now < lockoutEnd) {
      return false;
    }

    // Get attempts within window
    const allAttempts = this.attempts.get(key) || [];
    const recentAttempts = allAttempts.filter(
      (a) => now - a.timestamp < windowMs
    );

    // Check if exceeds max attempts
    if (recentAttempts.length >= maxAttempts) {
      // Lock for 15 minutes
      this.lockout.set(key, now + 15 * 60 * 1000);
      return false;
    }

    // Record this attempt
    recentAttempts.push({ timestamp: now });
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Get remaining lockout time in milliseconds
   * @param key - Unique identifier
   * @returns Milliseconds until lockout ends (0 if not locked)
   */
  getRemainingTime(key: string): number {
    const lockoutEnd = this.lockout.get(key);
    if (!lockoutEnd) return 0;

    const remaining = lockoutEnd - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Clear all attempts for a key (e.g., after successful login)
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.lockout.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.attempts.clear();
    this.lockout.clear();
  }
}

export const loginLimiter = new RateLimiter();
```

**Update** `src/pages/login.astro` - Add rate limiting to form submission:

```astro
<script>
  import { authService } from '../utils/api/index';
  import { loginLimiter } from '../utils/api/rate-limiter';

  const form = document.getElementById('login-form') as HTMLFormElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const errorDiv = document.getElementById('error-message') as HTMLDivElement;
  const successDiv = document.getElementById('success-message') as HTMLDivElement;

  const showError = (message: string) => {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    successDiv.classList.add('hidden');
  };

  const showSuccess = (message: string) => {
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailEl = document.getElementById('email') as HTMLInputElement;
    const passwordEl = document.getElementById('password') as HTMLInputElement;
    const rememberEl = document.getElementById('remember') as HTMLInputElement;

    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const remember = rememberEl.checked;

    // Validate inputs
    if (!email || !password) {
      showError('Email and password are required');
      return;
    }

    // ✨ NEW: Check rate limiting
    if (!loginLimiter.isAllowed(email, 5, 60 * 1000)) {
      const remaining = loginLimiter.getRemainingTime(email);
      const minutes = Math.ceil(remaining / 60000);
      showError(
        `Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="mr-2">&gt;</span> AUTHENTICATING...';

    try {
      const response = await authService.login({ email, password }, remember);

      if (response.success) {
        // ✨ Clear rate limit on success
        loginLimiter.reset(email);
        showSuccess('Login successful! Redirecting...');

        setTimeout(() => {
          const params = new URLSearchParams(window.location.search);
          const next = params.get('next') || '/dashboard';
          window.location.href = next;
        }, 500);
      } else {
        showError(
          response.error || 'Login failed. Please check your credentials.'
        );
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="mr-2">&gt;</span> LOGIN';
      }
    } catch (err: any) {
      showError(
        'Network error: ' + (err?.message || 'Unable to connect to server')
      );
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="mr-2">&gt;</span> LOGIN';
    }
  });
</script>
```

---

## Fix #6: Add Secure Logging Utility (15 minutes)

**File**: `src/utils/logger.ts` (NEW FILE)

```typescript
/**
 * Safe logging utility that redacts sensitive information
 * Use this instead of console.* to prevent accidental exposure
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = import.meta.env.DEV;

  /**
   * Redact sensitive fields from objects
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'token',
      'password',
      'secret',
      'key',
      'auth',
      'apiKey',
      'api_key',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
    ];

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    return Object.entries(data).reduce((acc, [key, value]) => {
      const isSensitive = sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        acc[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        acc[key] = this.sanitize(value);
      } else {
        acc[key] = value;
      }

      return acc;
    }, {} as any);
  }

  /**
   * Log a message with optional data
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Only log in development
    if (!this.isDev) return;

    const sanitizedData = this.sanitize(data);
    const fn = console[level] || console.log;
    const timestamp = new Date().toISOString();

    if (sanitizedData !== undefined) {
      fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedData);
    } else {
      fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
```

**Replace console calls** throughout the codebase:

```typescript
// Before
console.error('API Error:', error);
console.log('User data:', user);

// After
import { logger } from '../utils/logger';
logger.error('API Error:', error);
logger.info('User data:', user);
```

---

## Fix #7: Update API Client for Credentials (10 minutes)

**File**: Update `src/utils/api/client.ts`

Find this line in the `request` method:
```typescript
const response = await fetch(url, {
  ...options,
  headers,
  signal: controller.signal,
});
```

Replace with:
```typescript
const response = await fetch(url, {
  ...options,
  credentials: 'include',  // ← ADD THIS LINE
  headers,
  signal: controller.signal,
});
```

This ensures httpOnly cookies are included in API requests.

---

## Fix #8: Create API Response Schema (25 minutes)

**File**: `src/types/api.ts` (NEW FILE)

```typescript
import { z } from 'zod';

/**
 * Validate API responses match expected schema
 */

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

export const LoginResponseSchema = z.object({
  token: z.string().optional(),
  access_token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    role: z.string().optional(),
    expiresAt: z.number().optional(),
  }).optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Helper to safely parse API responses
 */
export function parseApiResponse<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to parse API response:', error);
    }
    throw new Error('Invalid API response format');
  }
}
```

**Update** `src/utils/api/client.ts` - Add validation:

```typescript
import { parseApiResponse, ApiResponseSchema } from '../../types/api';

// In the parseResponse method:
private async parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    const data = await response.json();

    // Validate against schema
    return parseApiResponse(data, ApiResponseSchema);
  }

  return response.text();
}
```

---

## Fix #9: Add CORS Credentials to Auth Service (5 minutes)

**File**: Update `src/utils/api/auth-service.ts`

The API client now includes credentials automatically (Fix #7), but verify the login response handler:

```typescript
async login(
  credentials: LoginCredentials,
  rememberMe: boolean = false
): Promise<ApiResponse<LoginResponse>> {
  const response = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    credentials
  );

  if (response.success && response.data) {
    // Handle both field names
    const token = response.data.token || response.data.access_token;

    if (token) {
      // Backend should have set httpOnly cookie
      // Don't store token in client-side cookie
      tokenManager.setToken(token, rememberMe);

      if (response.data.user) {
        tokenManager.setUser(response.data.user, rememberMe);
      }
    }
  }

  return response;
}
```

---

## Fix #10: Update .env.example (5 minutes)

**File**: Update `.env.example`

```
# API Configuration
PUBLIC_API_BASE=http://localhost:8000
PUBLIC_API_TIMEOUT=30000
PUBLIC_FORCE_API_BASE=false

# OIDC Configuration (optional)
VITE_OIDC_AUTHORITY=https://your-oidc-provider.com
VITE_OIDC_CLIENT_ID=your_client_id
VITE_OIDC_REDIRECT_URI=http://localhost:3000/callback
VITE_OIDC_RESPONSE_TYPE=code
VITE_OIDC_SCOPE=openid email profile
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# Authentication Options
VITE_ENABLE_OIDC=true
VITE_ENABLE_TRADITIONAL_AUTH=true
VITE_DEFAULT_AUTH_METHOD=traditional

# Development Proxy (for local dev)
API_PROXY_TARGET=http://localhost:8000
```

---

## Installation Summary

```bash
# 1. Add required dependencies
npm install zod

# 2. Create new files in order
touch src/config/validation.ts
touch src/utils/auth-guard.ts
touch src/utils/logger.ts
touch src/utils/api/rate-limiter.ts
touch src/types/api.ts

# 3. Update existing files (follow fixes above)

# 4. Test
npm run dev

# 5. Build and verify
npm run build
```

---

## Verification Checklist

After implementing all quick fixes:

- [ ] Middleware enabled - test by disabling JS
- [ ] Auth guard working - check redirects
- [ ] Environment validation - test with missing vars
- [ ] File upload MIME validation - test with wrong file type
- [ ] Rate limiting - test login with 6 attempts
- [ ] Logging sanitized - check console for redacted values
- [ ] API credentials - test CORS requests include cookies
- [ ] API validation - invalid response is caught
- [ ] No console errors in dev or prod build

---

## Deployment Requirements

Before deploying to production:

**Backend Team Must**:
- [ ] Set httpOnly cookies on login endpoint
- [ ] Return token expiry in user object
- [ ] Implement CORS headers (Access-Control-*)
- [ ] Validate tokens server-side

**Hosting Team Must**:
- [ ] Configure CSP headers in deployment
- [ ] Configure X-Frame-Options header
- [ ] Configure X-Content-Type-Options header
- [ ] Enable HTTPS only

**QA Must Verify**:
- [ ] Tokens not readable from console
- [ ] Unauthenticated users blocked from /dashboard
- [ ] Login rate limiting works
- [ ] Invalid files rejected
- [ ] All validations pass

---

**Estimated Time**: 2-3 hours for all fixes

**Blocking Issues**: All items in Fix #1-3 must be complete before deployment
