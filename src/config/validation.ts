import { z } from 'zod';

const EnvSchema = z.object({
  PUBLIC_API_BASE: z
    .string()
    .url('PUBLIC_API_BASE must be a valid URL')
    .default('http://localhost:8000'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnvironment(): EnvConfig {
  const env = {
    PUBLIC_API_BASE: import.meta.env.PUBLIC_API_BASE,
  };

  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessage = Object.entries(errors)
      .map(([key, msgs]) => `${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('Invalid environment configuration', { errorMessage });

    // Production must fail loudly
    if (import.meta.env.PROD) {
      throw new Error('Invalid environment configuration');
    }

    // Development fallback:
    return {
      PUBLIC_API_BASE: 'http://localhost:8000',
    };
  }

  if (import.meta.env.DEV) {
    console.info('Environment validated successfully');
  }

  // Always returns a fully typed object
  return result.data;
}

export const config = validateEnvironment();
