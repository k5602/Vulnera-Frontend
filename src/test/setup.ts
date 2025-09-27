import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock environment variables
beforeEach(() => {
  // Mock import.meta.env
  Object.defineProperty(globalThis, 'import', {
    value: {
      meta: {
        env: {
          VITE_APP_NAME: 'Vulnera',
          VITE_APP_VERSION: '1.0.0',
          VITE_ENABLE_DEBUG: 'true',
          VITE_ENVIRONMENT: 'test',
          VITE_API_BASE_URL: 'http://localhost:3000',
          VITE_API_VERSION: 'v1',
          VITE_API_TIMEOUT: '30000',
          VITE_OIDC_AUTHORITY: 'https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_uA0yo0xwS',
          VITE_OIDC_CLIENT_ID: 'test-client-id',
          VITE_OIDC_REDIRECT_URI: 'http://localhost:4321',
          VITE_OIDC_POST_LOGOUT_REDIRECT_URI: 'http://localhost:4321/login',
          VITE_OIDC_RESPONSE_TYPE: 'code',
          VITE_OIDC_SCOPE: 'openid email profile',
          VITE_OIDC_COGNITO_DOMAIN: 'https://cognito-idp.eu-west-3.amazonaws.com',
          VITE_OIDC_LOGOUT_URI: 'http://localhost:4321/login',
          VITE_ENABLE_OIDC: 'true',
          VITE_ENABLE_TRADITIONAL_AUTH: 'true',
          VITE_DEFAULT_AUTH_METHOD: 'traditional'
        }
      }
    },
    writable: true
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  });

  // Mock fetch
  global.fetch = vi.fn();

  // Mock window.location
  delete (window as any).location;
  window.location = {
    href: 'http://localhost:4321',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'http://localhost:4321',
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn()
  } as any;

  // Clear all mocks
  vi.clearAllMocks();
});