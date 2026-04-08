import type { ApiClient } from '@pawmeet/api-client';
import type { LocationUpdateResult, PrivacyPrefs, UserRepository } from '../interfaces';

function isTRPCClientError(error: unknown): error is Error & { data: Record<string, unknown> } {
  return error instanceof Error && error.name === 'TRPCClientError';
}

export function createTrpcUserRepository(api: ApiClient): UserRepository {
  return {
    async findNearby(radiusKm) {
      return api.users.findNearby.query({ radiusKm });
    },
    async updateLocation(latitude, longitude, force?): Promise<LocationUpdateResult> {
      try {
        await api.users.updateLocation.mutate({ latitude, longitude, force });
        return {};
      } catch (error) {
        if (isTRPCClientError(error) && error.data?.appCode === 'SUSPICIOUS_LOCATION') {
          const appData = error.data?.appData as Record<string, unknown> | undefined;
          return {
            suspicious: true,
            distanceKm: typeof appData?.distanceKm === 'number' ? appData.distanceKm : undefined,
          };
        }
        throw error;
      }
    },
    async registerPushToken(token) {
      await api.users.registerPushToken.mutate({ token });
    },
    async submitDateOfBirth(dateOfBirth) {
      const result = await api.users.submitDateOfBirth.mutate({ dateOfBirth });
      return { message: result.message };
    },
    async updatePrivacyPrefs(prefs: Partial<PrivacyPrefs>) {
      return api.users.updatePrivacyPrefs.mutate(prefs);
    },
    async getPublicProfile(userId) {
      return api.users.getPublicProfile.query({ userId });
    },
  };
}
