import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type MapView from 'react-native-maps';
import { useLocation } from '@/hooks/useLocation';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';

type NearbyUser = RouterOutput['users']['findNearby']['users'][number];

export type { NearbyUser };

export function useMapViewModel() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const {
    coordinates,
    isLoading: locationLoading,
    getCurrentLocation,
    searchRadiusKm,
  } = useLocation();
  const { users, loading: usersLoading, fetchNearby } = useNearbyUsers();
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (coordinates) {
      fetchNearby();
    }
  }, [coordinates, fetchNearby]);

  const handleMarkerPress = useCallback((user: NearbyUser) => {
    setSelectedUser(user);
  }, []);

  const handleRecenter = useCallback(() => {
    if (coordinates && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: searchRadiusKm * 0.02,
          longitudeDelta: searchRadiusKm * 0.02,
        },
        500,
      );
    }
  }, [coordinates, searchRadiusKm]);

  const handleMapPress = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleViewProfile = useCallback(() => {
    router.push('/(modals)/dog-detail');
    setSelectedUser(null);
  }, [router]);

  return {
    mapRef,
    coordinates,
    locationLoading,
    getCurrentLocation,
    searchRadiusKm,
    users,
    usersLoading,
    selectedUser,
    handleMarkerPress,
    handleRecenter,
    handleMapPress,
    handleClosePreview,
    handleViewProfile,
    fetchNearby,
  };
}
