import { z } from 'zod';
import { logger } from '../utils/logger';

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

    logger.error('Invalid environment configuration', { errorMessage });

    if (import.meta.env.PROD) {
      throw new Error('Invalid environment configuration');
    }
  }

  if (import.meta.env.DEV) {
    logger.info('Environment validated successfully');
  }

  return result.data || {};
}

export const config = validateEnvironment();

