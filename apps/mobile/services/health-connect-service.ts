import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { HealthService } from './health-service';

/**
 * Health service implementation backed by react-native-health-connect.
 * Works with Apple HealthKit (iOS) and Health Connect (Android).
 */
export function createHealthConnectService(): HealthService {
  let initialized = false;

  async function ensureInitialized(): Promise<void> {
    if (initialized) return;
    const isInitialized = await initialize();
    if (!isInitialized) {
      throw new Error('Failed to initialize Health Connect');
    }
    initialized = true;
  }

  return {
    async isAvailable() {
      try {
        const status = await getSdkStatus();
        return status === SdkAvailabilityStatus.SDK_AVAILABLE;
      } catch {
        return false;
      }
    },

    async requestPermissions() {
      try {
        await ensureInitialized();
        const granted = await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'Distance' },
          { accessType: 'read', recordType: 'ExerciseSession' },
        ]);
        return granted.length > 0;
      } catch {
        return false;
      }
    },

    async getSteps(startDate: Date, endDate: Date) {
      try {
        await ensureInitialized();
        const result = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });
        return result.records.reduce((sum, record) => sum + record.count, 0);
      } catch {
        return 0;
      }
    },

    async getWalkingDistance(startDate: Date, endDate: Date) {
      try {
        await ensureInitialized();
        const result = await readRecords('Distance', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });
        // Distance records return meters — convert to km
        const totalMeters = result.records.reduce(
          (sum, record) => sum + record.distance.inMeters,
          0,
        );
        return totalMeters / 1000;
      } catch {
        return 0;
      }
    },

    async getActiveMinutes(startDate: Date, endDate: Date) {
      try {
        await ensureInitialized();
        const result = await readRecords('ExerciseSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });
        return result.records.reduce((sum, record) => {
          const start = new Date(record.startTime).getTime();
          const end = new Date(record.endTime).getTime();
          return sum + (end - start) / 60_000;
        }, 0);
      } catch {
        return 0;
      }
    },
  };
}
