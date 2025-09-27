// OIDC Configuration for AWS Cognito
// Configuration values are loaded from environment variables

// Helper function to get environment variables. Use several fallbacks so tests
// that mock env via globalThis.import.meta.env still work.
// Helper to read runtime env dynamically so test setup (which mutates
// globalThis.import.meta.env) is visible at call time.
function readRuntimeEnv(name: string): string | undefined {
  const importMeta = (globalThis as any).import?.meta?.env;
  if (importMeta && typeof importMeta[name] !== 'undefined') return String(importMeta[name]);
  if (typeof process !== 'undefined' && typeof (process.env as any)[name] !== 'undefined') return String((process.env as any)[name]);
  return undefined;
}

// Helper function to get environment variables
const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = readRuntimeEnv(name) ?? defaultValue;
  if (!value) {
    console.warn(`Environment variable ${name} is not set`);
    return defaultValue || '';
  }
  return String(value);
};

// Helper function to get boolean env vars
const getEnvBoolean = (name: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(name);
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const cognitoAuthConfig = {
  authority: getEnvVar('VITE_OIDC_AUTHORITY'),
  client_id: getEnvVar('VITE_OIDC_CLIENT_ID'),
  redirect_uri: getEnvVar('VITE_OIDC_REDIRECT_URI'),
  response_type: getEnvVar('VITE_OIDC_RESPONSE_TYPE', 'code'),
  scope: getEnvVar('VITE_OIDC_SCOPE', 'openid email profile'),
  // Additional configuration for better UX
  automaticSilentRenew: true,
  loadUserInfo: true,
  // Add post logout redirect to handle logout flow
  post_logout_redirect_uri: getEnvVar('VITE_OIDC_POST_LOGOUT_REDIRECT_URI')
};

// Logout configuration
export const logoutConfig = {
  clientId: getEnvVar('VITE_OIDC_CLIENT_ID'),
  logoutUri: getEnvVar('VITE_OIDC_LOGOUT_URI'),
  cognitoDomain: getEnvVar('VITE_OIDC_COGNITO_DOMAIN')
};

// Authentication feature flags
export const authConfig = {
  enableOIDC: getEnvBoolean('VITE_ENABLE_OIDC', true),
  enableTraditionalAuth: getEnvBoolean('VITE_ENABLE_TRADITIONAL_AUTH', true),
  defaultAuthMethod: getEnvVar('VITE_DEFAULT_AUTH_METHOD', 'oidc') as 'oidc' | 'traditional'
};

// API configuration
export const apiConfig = {
  baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000'),
  version: getEnvVar('VITE_API_VERSION', 'v1'),
  timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000'), 10)
};