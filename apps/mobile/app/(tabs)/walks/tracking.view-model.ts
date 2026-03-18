import { logger } from '@pawmeet/utils';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useWalkTracking } from '@/hooks/useWalkTracking';
import i18n from '@/lib/i18n';
import { container } from '@/repositories/container';
import { SAFETY_REPOSITORY } from '@/repositories/tokens';

export function useTrackingViewModel() {
  const router = useRouter();
  const tracking = useWalkTracking();
  const [sosLoading, setSosLoading] = useState(false);
  const [completedTrackId, setCompletedTrackId] = useState<string | null>(null);
  const safetyRepo = useMemo(() => container.resolve(SAFETY_REPOSITORY), []);

  const handleStart = useCallback(async () => {
    const success = await tracking.startTracking();
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(i18n.t('common.error'), i18n.t('walks.tracking.startError'));
    }
  }, [tracking]);

  const handleStop = useCallback(async () => {
    Alert.alert(i18n.t('walks.tracking.stopTitle'), i18n.t('walks.tracking.stopMessage'), [
      { text: i18n.t('walks.tracking.continueButton'), style: 'cancel' },
      {
        text: i18n.t('walks.tracking.stopButton'),
        style: 'destructive',
        onPress: async () => {
          const result = await tracking.stopTracking();
          if (result) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCompletedTrackId(result.id);
          } else {
            Alert.alert(i18n.t('common.error'), i18n.t('walks.tracking.stopError'));
          }
        },
      },
    ]);
  }, [tracking]);

  const handleSos = useCallback(() => {
    Alert.alert(i18n.t('walks.tracking.sosTitle'), i18n.t('walks.tracking.sosMessage'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('walks.tracking.sosSend'),
        style: 'destructive',
        onPress: async () => {
          setSosLoading(true);
          try {
            const walkId = (tracking.track as Record<string, unknown> | null)?.walkId as
              | string
              | undefined;
            if (!walkId) {
              Alert.alert(i18n.t('common.error'), i18n.t('walks.tracking.sosNoWalk'));
              return;
            }
            const location = await Location.getLastKnownPositionAsync();
            await safetyRepo.sos({
              walkId,
              latitude: location?.coords.latitude,
              longitude: location?.coords.longitude,
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(i18n.t('walks.tracking.sosSent'), i18n.t('walks.tracking.sosSentMessage'));
          } catch (e) {
            logger.warn('TrackingVM', 'SOS failed', e);
            Alert.alert(i18n.t('common.error'), i18n.t('walks.tracking.sosError'));
          } finally {
            setSosLoading(false);
          }
        },
      },
    ]);
  }, [tracking.track, safetyRepo]);

  const handleMoodLogDone = useCallback(() => {
    setCompletedTrackId(null);
    router.back();
  }, [router]);

  const formatElapsed = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    isTracking: tracking.isTracking,
    loading: tracking.loading,
    sosLoading,
    elapsedSeconds: tracking.elapsedSeconds,
    distanceKm: tracking.distanceKm,
    currentSpeed: tracking.currentSpeed,
    points: tracking.points,
    formattedElapsed: formatElapsed(tracking.elapsedSeconds),
    formattedDistance:
      tracking.distanceKm < 1
        ? `${Math.round(tracking.distanceKm * 1000)} m`
        : `${tracking.distanceKm.toFixed(2)} km`,
    formattedSpeed: `${tracking.currentSpeed.toFixed(1)} km/h`,
    completedTrackId,
    handleStart,
    handleStop,
    handleSos,
    handleMoodLogDone,
  };
}
