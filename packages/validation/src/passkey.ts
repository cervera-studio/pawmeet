import { z } from 'zod';

export const passkeyRegisterOptionsSchema = z.object({
  friendlyName: z.string().min(1).max(100).optional(),
});

export const passkeyRegisterVerifySchema = z.object({
  friendlyName: z.string().min(1).max(100).optional(),
  response: z.any(),
});

export const passkeyLoginOptionsSchema = z.object({
  email: z.string().email().optional(),
});

export const passkeyLoginVerifySchema = z.object({
  response: z.any(),
});

export const passkeyDeleteSchema = z.object({
  id: z.string().uuid(),
});
