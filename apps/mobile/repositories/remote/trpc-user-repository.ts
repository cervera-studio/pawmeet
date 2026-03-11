import type { ApiClient } from '@dogwalk/api-client';
import type { UserRepository } from '../interfaces';

export function createTrpcUserRepository(api: ApiClient): UserRepository {
  return {
    async findNearby(radiusKm) {
      return api.users.findNearby.query({ radiusKm });
    },
    async updateLocation(latitude, longitude) {
      await api.users.updateLocation.mutate({ latitude, longitude });
    },
    async registerPushToken(token) {
      await api.users.registerPushToken.mutate({ token });
    },
    async submitDateOfBirth(dateOfBirth) {
      const result = await api.users.submitDateOfBirth.mutate({ dateOfBirth });
      return result as { message: string };
    },
  };
}
