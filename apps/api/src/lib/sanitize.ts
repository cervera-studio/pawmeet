import type { User } from '@dogwalk/types';

export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;

/** Strip sensitive fields from a User object before returning to the client. */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, pushToken: __, ...safeUser } = user;
  return safeUser;
}
