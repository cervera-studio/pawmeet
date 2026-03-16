import type { HealthService } from './health-service';

/** Fallback health service for Expo Go or unsupported devices. */
export function createNoOpHealthService(): HealthService {
  return {
    async isAvailable() {
      return false;
    },
    async requestPermissions() {
      return false;
    },
    async getSteps() {
      return 0;
    },
    async getWalkingDistance() {
      return 0;
    },
    async getActiveMinutes() {
      return 0;
    },
  };
}
