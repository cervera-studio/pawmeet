export interface User {
  id: string;
  email: string;
  displayName: string;
  authProvider: 'email' | 'google' | 'apple';
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  searchRadiusKm: number;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}
