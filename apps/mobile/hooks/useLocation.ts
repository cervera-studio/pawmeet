import { logger } from '@pawmeet/utils';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { container } from '@/repositories/container';
import { USER_REPOSITORY } from '@/repositories/tokens';
import { useLocationStore } from '@/stores/location';

const userRepo = container.resolve(USER_REPOSITORY);

function showLocationConfirmAlert(distanceKm?: number): Promise<boolean> {
  const distance = distanceKm ?? 0;
  return new Promise((resolve) => {
    Alert.alert(
      'Spostamento rilevato',
      distance > 0
        ? `La tua posizione sembra cambiata di circa ${distance} km rispetto all'ultima volta. Vuoi aggiornare la tua posizione?`
        : "La tua posizione sembra cambiata molto rispetto all'ultima volta. Vuoi aggiornare la tua posizione?",
      [
        { text: 'Mantieni precedente', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Aggiorna', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

export function useLocation() {
  const {
    coordinates,
    isLoading,
    error,
    permissionGranted,
    searchRadiusKm,
    setCoordinates,
    setLoading,
    setError,
    setPermissionGranted,
    setSearchRadiusKm,
  } = useLocationStore();

  const requestPermission = useCallback(async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      if (existingStatus === 'granted') {
        setPermissionGranted(true);
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);

      if (!granted) {
        Alert.alert(
          'Posizione richiesta',
          'PawMeet ha bisogno della tua posizione per mostrare cani nelle vicinanze. Abilita la posizione nelle impostazioni.',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Apri Impostazioni',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }

      return granted;
    } catch {
      setError('Errore nel richiedere i permessi di posizione');
      return false;
    }
  }, [setPermissionGranted, setError]);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError('Permesso di posizione non concesso');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Sync location to server via repository
      try {
        const result = await userRepo.updateLocation(coords.latitude, coords.longitude);

        if (result.suspicious) {
          const confirmed = await showLocationConfirmAlert(result.distanceKm);
          if (confirmed) {
            await userRepo.updateLocation(coords.latitude, coords.longitude, true);
            setCoordinates(coords);
          }
          // If not confirmed, keep old coordinates
          return confirmed ? coords : coordinates;
        }
      } catch (e) {
        logger.warn('useLocation', 'Failed to sync location to server', e);
      }

      setCoordinates(coords);
      return coords;
    } catch {
      setError('Errore nel recuperare la posizione');
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestPermission, setCoordinates, setLoading, setError, coordinates]);

  return {
    coordinates,
    isLoading,
    error,
    permissionGranted,
    searchRadiusKm,
    setSearchRadiusKm,
    requestPermission,
    getCurrentLocation,
  };
}
