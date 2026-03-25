import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type MapView from 'react-native-maps';
import type { GroupEvent } from '@/hooks/useGroupEvents';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useLocation } from '@/hooks/useLocation';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';

type NearbyUser = RouterOutput['users']['findNearby']['users'][number];

export type { GroupEvent, NearbyUser };

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
  const { events, loading: eventsLoading, listNearby: listNearbyEvents } = useGroupEvents();
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (coordinates) {
      fetchNearby();
      listNearbyEvents(coordinates.latitude, coordinates.longitude);
    }
  }, [coordinates, fetchNearby, listNearbyEvents]);

  const handleMarkerPress = useCallback((user: NearbyUser) => {
    setSelectedEvent(null);
    setSelectedUser(user);
  }, []);

  const handleEventMarkerPress = useCallback((event: GroupEvent) => {
    setSelectedUser(null);
    setSelectedEvent(event);
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
    setSelectedEvent(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedUser(null);
    setSelectedEvent(null);
  }, []);

  const handleViewProfile = useCallback(() => {
    router.push('/(modals)/dog-detail');
    setSelectedUser(null);
  }, [router]);

  const handleViewEvent = useCallback(() => {
    if (selectedEvent) {
      router.push(`/(tabs)/map/events/${selectedEvent.id}`);
      setSelectedEvent(null);
    }
  }, [router, selectedEvent]);

  return {
    mapRef,
    coordinates,
    locationLoading,
    getCurrentLocation,
    searchRadiusKm,
    users,
    usersLoading,
    events,
    eventsLoading,
    selectedUser,
    selectedEvent,
    handleMarkerPress,
    handleEventMarkerPress,
    handleRecenter,
    handleMapPress,
    handleClosePreview,
    handleViewProfile,
    handleViewEvent,
    fetchNearby,
  };
}
