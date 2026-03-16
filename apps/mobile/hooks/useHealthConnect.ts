import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { mmkv } from '@/lib/storage';
import { createHealthConnectService } from '@/services/health-connect-service';
import type { HealthService } from '@/services/health-service';
import { createHealthSyncService, type HealthSyncService } from '@/services/health-sync-service';
import { createNoOpHealthService } from '@/services/noop-health-service';

const CONNECTED_KEY = 'pawmeet_health_connected';
const LAST_SYNC_KEY = 'pawmeet_health_last_sync';

let healthService: HealthService | null = null;
let syncService: HealthSyncService | null = null;

function getHealthService(): HealthService {
  if (!healthService) {
    try {
      healthService = createHealthConnectService();
    } catch {
      healthService = createNoOpHealthService();
    }
  }
  return healthService;
}

function getSyncService(): HealthSyncService {
  if (!syncService) {
    syncService = createHealthSyncService(getHealthService());
  }
  return syncService;
}

export function useHealthConnect() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(() => mmkv.getBoolean(CONNECTED_KEY) ?? false);
  const [loading, setLoading] = useState(true);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(() => {
    const raw = mmkv.getString(LAST_SYNC_KEY);
    return raw ? new Date(raw) : null;
  });

  useEffect(() => {
    void getHealthService()
      .isAvailable()
      .then((available) => {
        setIsAvailable(available);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await getHealthService().requestPermissions();
      if (granted) {
        mmkv.set(CONNECTED_KEY, true);
        setIsConnected(true);

        // Sync immediately after connecting
        const synced = await getSyncService().sync();
        if (synced) {
          setLastSyncDate(getSyncService().getLastSyncDate());
        }
      }
      return granted;
    } catch (error) {
      logger.warn('useHealthConnect', 'Failed to connect', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    mmkv.set(CONNECTED_KEY, false);
    setIsConnected(false);
  }, []);

  const syncNow = useCallback(async () => {
    setLoading(true);
    try {
      const synced = await getSyncService().sync();
      if (synced) {
        setLastSyncDate(getSyncService().getLastSyncDate());
      }
      return synced;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isAvailable,
    isConnected,
    loading,
    connect,
    disconnect,
    syncNow,
    lastSyncDate,
  };
}
