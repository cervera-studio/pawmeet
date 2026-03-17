export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { formatDistance } from '@pawmeet/utils';
import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import type { GroupEvent, NearbyUser } from './map.view-model';
import { useMapViewModel } from './map.view-model';

function formatEventDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function categoryLabel(category: string): string {
  switch (category) {
    case 'walk':
      return 'Passeggiata';
    case 'meetup':
      return 'Incontro';
    case 'training':
      return 'Addestramento';
    default:
      return category;
  }
}

const UserPreviewCard = memo(function UserPreviewCard({
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
    <View className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-lg">
      <Pressable onPress={onClose} className="absolute right-3 top-3 z-10">
        <Text className="text-lg text-gray-400 dark:text-neutral-500">✕</Text>
      </Pressable>

      <Pressable onPress={onViewProfile} className="flex-row items-center">
        <Avatar name={user.displayName} size="md" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {user.displayName}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {formatDistance(user.distanceKm)}
          </Text>
          {primaryDog ? (
            <Text className="text-sm text-gray-400 dark:text-neutral-500">
              {primaryDog.name} - {primaryDog.breed}
            </Text>
          ) : null}
        </View>
        <Text className="text-gray-400 dark:text-neutral-500">›</Text>
      </Pressable>

      {user.dogs.length > 1 && (
        <Text className="mt-2 text-xs text-gray-400 dark:text-neutral-500">
          +{user.dogs.length - 1} {user.dogs.length === 2 ? 'altro cane' : 'altri cani'}
        </Text>
      )}
    </View>
  );
});

const EventPreviewCard = memo(function EventPreviewCard({
  event,
  onClose,
  onViewEvent,
}: {
  event: GroupEvent;
  onClose: () => void;
  onViewEvent: () => void;
}) {
  return (
    <View className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-lg">
      <Pressable onPress={onClose} className="absolute right-3 top-3 z-10">
        <Text className="text-lg text-gray-400 dark:text-neutral-500">✕</Text>
      </Pressable>

      <Pressable onPress={onViewEvent} className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Text className="text-xl">{'\u{1F4C5}'}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text
            className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]"
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {formatEventDate(event.scheduledAt)}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-gray-400 dark:text-neutral-500">
              {categoryLabel(event.category)}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">
              Max {event.maxParticipants} partecipanti
            </Text>
          </View>
        </View>
        <Text className="text-gray-400 dark:text-neutral-500">›</Text>
      </Pressable>
    </View>
  );
});

export default function MapScreen() {
  const vm = useMapViewModel();

  if (vm.locationLoading && !vm.coordinates) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <ActivityIndicator size="large" color="#065F46" />
        <Text className="mt-4 text-gray-500 dark:text-neutral-500">Recupero posizione...</Text>
      </View>
    );
  }

  if (!vm.coordinates) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E] px-8">
        <Text className="text-5xl">📍</Text>
        <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
          Posizione necessaria
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
          Abilita la posizione per vedere i cani nelle vicinanze sulla mappa.
        </Text>
        <Pressable
          onPress={vm.getCurrentLocation}
          className="mt-6 rounded-2xl bg-primary px-8 py-3"
        >
          <Text className="font-semibold text-white">Abilita posizione</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={vm.mapRef}
        className="flex-1"
        initialRegion={{
          latitude: vm.coordinates.latitude,
          longitude: vm.coordinates.longitude,
          latitudeDelta: vm.searchRadiusKm * 0.02,
          longitudeDelta: vm.searchRadiusKm * 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={vm.handleMapPress}
      >
        {/* Search radius circle */}
        <Circle
          center={vm.coordinates}
          radius={vm.searchRadiusKm * 1000}
          fillColor="rgba(6, 95, 70, 0.08)"
          strokeColor="rgba(6, 95, 70, 0.3)"
          strokeWidth={1}
        />

        {/* Nearby user markers */}
        {vm.users.map((user) => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.approximateLatitude,
              longitude: user.approximateLongitude,
            }}
            onPress={() => vm.handleMarkerPress(user)}
          >
            <View className="items-center">
              <View
                className={`rounded-full border-2 p-0.5 ${
                  vm.selectedUser?.id === user.id ? 'border-primary' : 'border-white'
                }`}
              >
                <Avatar name={user.dogs[0]?.name ?? user.displayName} size="sm" />
              </View>
              <View className="mt-0.5 rounded-full bg-white dark:bg-[#1C1C1E] px-1.5 py-0.5 shadow-sm">
                <Text className="text-[10px] font-medium text-gray-700 dark:text-[#D1D1D6]">
                  {'\u{1F415}'} {user.dogs[0]?.name ?? '?'}
                </Text>
              </View>
            </View>
          </Marker>
        ))}

        {/* Event markers */}
        {vm.events.map((event) => (
          <Marker
            key={`event-${event.id}`}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            onPress={() => vm.handleEventMarkerPress(event)}
          >
            <View className="items-center">
              <View
                className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                  vm.selectedEvent?.id === event.id
                    ? 'border-primary bg-green-100 dark:bg-green-900/30'
                    : 'border-white bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <Text className="text-lg">{'\u{1F4C5}'}</Text>
              </View>
              <View className="mt-0.5 rounded-full bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 shadow-sm">
                <Text
                  className="text-[10px] font-medium text-green-800 dark:text-green-300"
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Recenter button */}
      <Pressable
        onPress={vm.handleRecenter}
        className="absolute right-4 top-16 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] shadow-md"
      >
        <Text className="text-lg">📍</Text>
      </Pressable>

      {/* Refresh button */}
      <Pressable
        onPress={vm.fetchNearby}
        className="absolute left-4 top-16 flex-row items-center rounded-full bg-white dark:bg-[#1C1C1E] px-4 py-2.5 shadow-md"
      >
        {vm.usersLoading ? (
          <ActivityIndicator size="small" color="#065F46" />
        ) : (
          <Text className="text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">Aggiorna</Text>
        )}
      </Pressable>

      {/* User preview card */}
      {vm.selectedUser && (
        <UserPreviewCard
          user={vm.selectedUser}
          onClose={vm.handleClosePreview}
          onViewProfile={vm.handleViewProfile}
        />
      )}

      {/* Event preview card */}
      {vm.selectedEvent && (
        <EventPreviewCard
          event={vm.selectedEvent}
          onClose={vm.handleClosePreview}
          onViewEvent={vm.handleViewEvent}
        />
      )}
    </View>
  );
}
