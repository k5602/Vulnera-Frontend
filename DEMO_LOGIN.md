# Demo Login System

## Overview
This project now includes a demo authentication system that protects features behind a login wall. Users must authenticate to access the Dashboard and Scan pages.

## Demo Credentials
- **Email:** `demo@vulnera.com`
- **Password:** `demo123`

## Features

### 1. Authentication Utility (`src/utils/auth/demoAuth.ts`)
- Manages client-side authentication using localStorage/sessionStorage
- Provides functions for login, logout, and auth status checking
- Supports "Remember Me" functionality

### 2. Login Page (`src/pages/login.astro`)
- Shows demo credentials prominently for easy access
- Validates credentials against demo account
- Redirects to dashboard or the originally requested page after successful login
- Redirects already authenticated users away from login page

### 3. Protected Pages
Both Dashboard and Scan pages are now protected:
- Automatically redirect unauthenticated users to login
- Pass the current page as `?next=` parameter for seamless return after login
- Show user email in console for debugging

### 4. Navigation Component (`src/components/Navigation.astro`)
- Shows/hides navigation items based on authentication state:
  - **Authenticated users see:** SCAN, DASHBOARD, ABOUT, LOGOUT
  - **Unauthenticated users see:** LOGIN
- Dynamically updates UI based on auth state
- Logout button clears session and redirects to login

## Usage

### For Users:
1. Visit any protected page (e.g., `/dashboard` or `/scan`)
2. You'll be redirected to `/login?next=/dashboard`
3. Use the demo credentials: `demo@vulnera.com` / `demo123`
4. After successful login, you'll be redirected back to the requested page
5. Click LOGOUT in the navigation to sign out

### For Developers:

#### Check if user is authenticated:
```typescript
import { isAuthenticated } from '../utils/auth/demoAuth';

if (isAuthenticated()) {
  // User is logged in
}
```

#### Get current user:
```typescript
import { getCurrentUser } from '../utils/auth/demoAuth';

const user = getCurrentUser();
console.log(user?.email); // demo@vulnera.com
```

#### Protect a page:
```typescript
import { requireAuth } from '../utils/auth/demoAuth';

// Redirect to login if not authenticated
requireAuth('/your-page-path');
```

#### Manual login:
```typescript
import { login } from '../utils/auth/demoAuth';

const success = login(email, password, rememberMe);
if (success) {
  // Redirect or update UI
}
```

#### Logout:
```typescript
import { logout } from '../utils/auth/demoAuth';

logout(); // Clears all auth data
window.location.href = '/login';
```

## Implementation Details

### Storage
- Uses localStorage for "Remember Me" sessions (persistent)
- Uses sessionStorage for temporary sessions (cleared on browser close)
- Stores `auth_token` and `user_email`

### Security Note
⚠️ This is a **DEMO** authentication system for frontend demonstration purposes only. In a production environment, you should:
- Implement proper backend authentication
- Use secure tokens (JWT, OAuth, etc.)
- Never store passwords in frontend code
- Implement HTTPS
- Add proper CSRF protection
- Use secure HTTP-only cookies

## Testing

1. **Test Login:**
   - Go to `/login`
   - Enter demo credentials
   - Verify redirect to dashboard

2. **Test Protected Pages:**
   - Clear browser storage
   - Try to access `/dashboard` or `/scan`
   - Verify redirect to login

3. **Test Logout:**
   - Login first
   - Click LOGOUT button
   - Verify redirect to login and cleared storage

4. **Test Remember Me:**
   - Login with "Remember me" checked
   - Close browser and reopen
   - Verify still logged in

5. **Test Navigation Visibility:**
   - Check navigation before login (should see LOGIN)
   - Login and check navigation (should see LOGOUT, SCAN, DASHBOARD)
   - Logout and check navigation (should revert to LOGIN)

## Files Modified
- `src/utils/auth/demoAuth.ts` (NEW)
- `src/pages/login.astro`
- `src/pages/dashboard.astro`
- `src/pages/scan.astro`
- `src/components/Navigation.astro`
