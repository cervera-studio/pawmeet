import type { ApiClient } from '@pawmeet/api-client';
import { TRPCClientError } from '@trpc/client';
import type { LocationUpdateResult, UserRepository } from '../interfaces';

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
        if (
          error instanceof TRPCClientError &&
          (error.data as Record<string, unknown>)?.appCode === 'SUSPICIOUS_LOCATION'
        ) {
          const appData = (error.data as Record<string, unknown>)?.appData as
            | Record<string, unknown>
            | undefined;
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
  };
}
