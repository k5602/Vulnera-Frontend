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

