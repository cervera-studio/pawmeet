import { logger } from '@pawmeet/utils';
import * as Location from 'expo-location';
import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import i18n from '@/lib/i18n';
import { container } from '@/repositories/container';
import { USER_REPOSITORY } from '@/repositories/tokens';
import { useLocationStore } from '@/stores/location';

const userRepo = container.resolve(USER_REPOSITORY);

function showLocationConfirmAlert(distanceKm?: number): Promise<boolean> {
  const distance = distanceKm ?? 0;
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('location.suspiciousTitle'),
      distance > 0
        ? i18n.t('location.suspiciousMessage', { distance })
        : i18n.t('location.suspiciousMessageGeneric'),
      [
        { text: i18n.t('location.keepPrevious'), style: 'cancel', onPress: () => resolve(false) },
        { text: i18n.t('location.update'), onPress: () => resolve(true) },
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
        Alert.alert(i18n.t('location.permissionTitle'), i18n.t('location.permissionMessage'), [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('location.openSettings'),
            onPress: () => Linking.openSettings(),
          },
        ]);
      }

      return granted;
    } catch {
      setError(i18n.t('location.permissionError'));
      return false;
    }
  }, [setPermissionGranted, setError]);

  const coordinatesRef = useRef(coordinates);
  coordinatesRef.current = coordinates;

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError(i18n.t('location.notGranted'));
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
          return confirmed ? coords : coordinatesRef.current;
        }
      } catch (e) {
        logger.warn('useLocation', 'Failed to sync location to server', e);
        // Don't update coordinates when server rejects — avoids infinite re-trigger
        return coordinatesRef.current;
      }

      setCoordinates(coords);
      return coords;
    } catch {
      setError(i18n.t('location.fetchError'));
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
