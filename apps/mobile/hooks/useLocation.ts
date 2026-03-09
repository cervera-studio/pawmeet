import { useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@/stores/location';

export function useLocation() {
  const {
    coordinates,
    isLoading,
    error,
    permissionGranted,
    setCoordinates,
    setLoading,
    setError,
    setPermissionGranted,
  } = useLocationStore();

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
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
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      setError('Errore nel recuperare la posizione');
    } finally {
      setLoading(false);
    }
  }, [requestPermission, setCoordinates, setLoading, setError]);

  return {
    coordinates,
    isLoading,
    error,
    permissionGranted,
    requestPermission,
    getCurrentLocation,
  };
}
