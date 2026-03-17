import { z } from 'zod';

export const searchUsersSchema = z.object({
  query: z.string().min(2).max(50),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(500).default(0),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
