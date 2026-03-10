import type { User } from '@dogwalk/types';

export interface CreateUserInput {
  email: string;
  displayName: string;
  passwordHash: string;
  authProvider?: string;
}

export interface NearbyUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  distanceKm: number;
  latitude: number;
  longitude: number;
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

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
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
      >
    >,
  ): Promise<User>;
  findNearby(query: NearbyQuery): Promise<NearbyUser[]>;
  updatePushToken(userId: string, token: string | null): Promise<void>;
  findPushToken(userId: string): Promise<string | null>;
}
