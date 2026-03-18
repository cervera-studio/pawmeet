import { logger } from '@pawmeet/utils';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { api } from '@/lib/trpc';
import { useLocationStore } from '@/stores/location';

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

      setCoordinates(coords);

      // Send location to API in background
      api.users.updateLocation
        .mutate({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .catch((e) => logger.warn('useLocation', 'Failed to sync location to server', e));

      return coords;
    } catch {
      setError('Errore nel recuperare la posizione');
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestPermission, setCoordinates, setLoading, setError]);

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
