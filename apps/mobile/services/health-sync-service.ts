import { HEALTH_DATA_SOURCE } from '@pawmeet/config';
import { logger } from '@pawmeet/utils';
import { Platform } from 'react-native';
import { mmkv } from '@/lib/storage';
import { api } from '@/lib/trpc';
import type { HealthService } from './health-service';

const LAST_SYNC_KEY = 'pawmeet_health_last_sync';

export interface HealthSyncService {
  sync(): Promise<boolean>;
  getLastSyncDate(): Date | null;
}

export function createHealthSyncService(healthService: HealthService): HealthSyncService {
  function getLastSyncDate(): Date | null {
    const raw = mmkv.getString(LAST_SYNC_KEY);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function setLastSyncDate(date: Date): void {
    mmkv.set(LAST_SYNC_KEY, date.toISOString());
  }

  return {
    async sync() {
      try {
        const available = await healthService.isAvailable();
        if (!available) return false;

        const now = new Date();
        const lastSync = getLastSyncDate() ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [steps, distanceKm, activeMinutes] = await Promise.all([
          healthService.getSteps(lastSync, now),
          healthService.getWalkingDistance(lastSync, now),
          healthService.getActiveMinutes(lastSync, now),
        ]);

        const date = now.toISOString().slice(0, 10);
        const isIOS = Platform.OS === 'ios';
        await api.fitness.syncHealthData.mutate({
          entries: [
            {
              date,
              stepsCount: Math.round(steps),
              walkDistanceKm: distanceKm,
              walkDurationMin: activeMinutes,
              walkCount: 0,
              source: isIOS ? HEALTH_DATA_SOURCE.HEALTH_KIT : HEALTH_DATA_SOURCE.GOOGLE_FIT,
            },
          ],
        });

        setLastSyncDate(now);
        logger.info('HealthSync', 'Synced health data successfully');
        return true;
      } catch (error) {
        logger.warn('HealthSync', 'Failed to sync health data', error);
        return false;
      }
    },

    getLastSyncDate,
  };
}
