import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Circle, type MapMarker, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useLocation } from '@/hooks/useLocation';
import type { NearbyUser } from '@/hooks/useNearbyUsers';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';

function UserPreviewCard({
  user,
  onClose,
  onViewProfile,
}: {
  user: NearbyUser;
  onClose: () => void;
  onViewProfile: () => void;
}) {
  const primaryDog = user.dogs[0];

  return (
    <View className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white p-4 shadow-lg">
      <Pressable onPress={onClose} className="absolute right-3 top-3 z-10">
        <Text className="text-lg text-gray-400">✕</Text>
      </Pressable>

      <Pressable onPress={onViewProfile} className="flex-row items-center">
        <Avatar name={user.displayName} size="md" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-gray-900">{user.displayName}</Text>
          <Text className="text-sm text-gray-500">
            {user.distanceKm < 1
              ? `${Math.round(user.distanceKm * 1000)} m`
              : `${user.distanceKm.toFixed(1)} km`}
          </Text>
          {primaryDog ? (
            <Text className="text-sm text-gray-400">
              {primaryDog.name} - {primaryDog.breed}
            </Text>
          ) : null}
        </View>
        <Text className="text-gray-400">›</Text>
      </Pressable>

      {user.dogs.length > 1 && (
        <Text className="mt-2 text-xs text-gray-400">
          +{user.dogs.length - 1} {user.dogs.length === 2 ? 'altro cane' : 'altri cani'}
        </Text>
      )}
    </View>
  );
}

export default function MapScreen() {
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

  if (locationLoading && !coordinates) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-4 text-gray-500">Recupero posizione...</Text>
      </View>
    );
  }

  if (!coordinates) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-5xl">📍</Text>
        <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
          Posizione necessaria
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Abilita la posizione per vedere i cani nelle vicinanze sulla mappa.
        </Text>
        <Pressable onPress={getCurrentLocation} className="mt-6 rounded-2xl bg-primary px-8 py-3">
          <Text className="font-semibold text-white">Abilita posizione</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        className="flex-1"
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: searchRadiusKm * 0.02,
          longitudeDelta: searchRadiusKm * 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedUser(null)}
      >
        {/* Search radius circle */}
        <Circle
          center={coordinates}
          radius={searchRadiusKm * 1000}
          fillColor="rgba(255, 107, 53, 0.08)"
          strokeColor="rgba(255, 107, 53, 0.3)"
          strokeWidth={1}
        />

        {/* Nearby user markers */}
        {users.map((user) => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.latitude,
              longitude: user.longitude,
            }}
            onPress={() => handleMarkerPress(user)}
          >
            <View className="items-center">
              <View
                className={`rounded-full border-2 p-0.5 ${
                  selectedUser?.id === user.id ? 'border-primary' : 'border-white'
                }`}
              >
                <Avatar name={user.dogs[0]?.name ?? user.displayName} size="sm" />
              </View>
              <View className="mt-0.5 rounded-full bg-white px-1.5 py-0.5 shadow-sm">
                <Text className="text-[10px] font-medium text-gray-700">
                  {user.dogs[0]?.name ?? '?'}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Recenter button */}
      <Pressable
        onPress={handleRecenter}
        className="absolute right-4 top-16 h-11 w-11 items-center justify-center rounded-full bg-white shadow-md"
      >
        <Text className="text-lg">📍</Text>
      </Pressable>

      {/* Refresh button */}
      <Pressable
        onPress={fetchNearby}
        className="absolute left-4 top-16 flex-row items-center rounded-full bg-white px-4 py-2.5 shadow-md"
      >
        {usersLoading ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <Text className="text-sm font-medium text-gray-700">Aggiorna</Text>
        )}
      </Pressable>

      {/* User preview card */}
      {selectedUser && (
        <UserPreviewCard
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onViewProfile={() => {
            router.push('/(modals)/dog-detail');
            setSelectedUser(null);
          }}
        />
      )}
    </View>
  );
}
