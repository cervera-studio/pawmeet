export interface NearbyUser {
  [key: string]: unknown;
  id: string;
}

export interface LocationUpdateResult {
  suspicious?: boolean;
  distanceKm?: number;
}

export interface PrivacyPrefs {
  profileVisible: boolean;
  approximateDistance: boolean;
  showLastSeen: boolean;
}

export interface PublicUserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  dogs: { id: string; name: string; breed: string; size: string; avatarUrl: string | null }[];
}

export interface UserRepository {
  findNearby(radiusKm: number): Promise<{ users: NearbyUser[] }>;
  updateLocation(
    latitude: number,
    longitude: number,
    force?: boolean,
  ): Promise<LocationUpdateResult>;
  registerPushToken(token: string): Promise<void>;
  submitDateOfBirth(dateOfBirth: string): Promise<{ message: string }>;
  updatePrivacyPrefs(prefs: Partial<PrivacyPrefs>): Promise<{ privacyPrefs: PrivacyPrefs }>;
  getPublicProfile(userId: string): Promise<PublicUserProfile>;
}
