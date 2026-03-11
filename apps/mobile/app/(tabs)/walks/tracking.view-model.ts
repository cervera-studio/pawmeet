import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useWalkTracking } from '@/hooks/useWalkTracking';

export function useTrackingViewModel() {
  const router = useRouter();
  const tracking = useWalkTracking();

  const handleStart = useCallback(async () => {
    const success = await tracking.startTracking();
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(
        'Errore',
        'Impossibile avviare il tracciamento. Verifica i permessi di posizione.',
      );
    }
  }, [tracking]);

  const handleStop = useCallback(async () => {
    Alert.alert('Termina passeggiata', 'Vuoi terminare il tracciamento della passeggiata?', [
      { text: 'Continua', style: 'cancel' },
      {
        text: 'Termina',
        style: 'destructive',
        onPress: async () => {
          const result = await tracking.stopTracking();
          if (result) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } else {
            Alert.alert('Errore', 'Impossibile terminare il tracciamento');
          }
        },
      },
    ]);
  }, [tracking, router]);

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
    handleStart,
    handleStop,
  };
}
