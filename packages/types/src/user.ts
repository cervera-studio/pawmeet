export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  authProvider: 'email' | 'google' | 'apple';
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  searchRadiusKm: number;
  emailVerified: boolean;
  pushToken: string | null;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/** User data without sensitive fields (passwordHash, pushToken). */
export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;
