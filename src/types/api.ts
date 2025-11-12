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

/**
 * TokenResponseSchema matches the TokenResponse schema from OpenAPI
 * Required fields: access_token, refresh_token, token_type, expires_in
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().int().min(0),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/**
 * @deprecated Use TokenResponseSchema instead. This is kept for backward compatibility.
 * LoginResponseSchema matches TokenResponse but allows optional user field for frontend convenience.
 */
export const LoginResponseSchema = TokenResponseSchema.extend({
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
    throw new Error('Invalid API response format');
  }
}

