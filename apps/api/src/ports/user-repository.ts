import type { User } from '@pawmeet/types';

export interface CreateUserInput {
  email: string;
  displayName: string;
  passwordHash?: string | null;
  authProvider?: string;
  dateOfBirth?: Date | null;
  locale?: string;
}

export interface NearbyUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  distanceKm: number;
  /** Approximate latitude rounded to ~100m precision (2 decimals) for map display. */
  approximateLatitude: number;
  /** Approximate longitude rounded to ~100m precision (2 decimals) for map display. */
  approximateLongitude: number;
  dogs: {
    id: string;
    name: string;
    breed: string;
    size: string;
    energyLevel: string;
    avatarUrl: string | null;
  }[];
}

export interface NearbyQuery {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Includes passwordHash — only for auth flows (login, delete, reactivate) */
  findByIdWithPassword(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(
    id: string,
    data: Partial<
      Pick<
        User,
        | 'passwordHash'
        | 'avatarUrl'
        | 'latitude'
        | 'longitude'
        | 'locationUpdatedAt'
        | 'searchRadiusKm'
        | 'emailVerified'
        | 'lastLoginAt'
        | 'isActive'
        | 'deletionScheduledAt'
        | 'notificationPrefs'
        | 'dateOfBirth'
        | 'termsAcceptedAt'
        | 'privacyPolicyVersion'
        | 'onboardingCompletedAt'
        | 'privacyPrefs'
      >
    >,
  ): Promise<User>;
  findNearby(query: NearbyQuery): Promise<NearbyUser[]>;
  updatePushToken(userId: string, token: string | null): Promise<void>;
  findPushToken(userId: string): Promise<string | null>;
  searchByName(
    query: string,
    excludeUserId: string,
    limit: number,
    offset: number,
  ): Promise<SearchResult[]>;
}
