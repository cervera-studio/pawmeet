export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { GROUP_EVENT_STATUS } from '@pawmeet/types';
import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NearbyEvent } from './index.view-model';
import { useEventDiscoveryViewModel } from './index.view-model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string): string {
  switch (status) {
    case GROUP_EVENT_STATUS.SCHEDULED:
      return 'Programmato';
    case GROUP_EVENT_STATUS.IN_PROGRESS:
      return 'In corso';
    case GROUP_EVENT_STATUS.COMPLETED:
      return 'Completato';
    case GROUP_EVENT_STATUS.CANCELLED:
      return 'Annullato';
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case GROUP_EVENT_STATUS.SCHEDULED:
      return 'bg-blue-100 text-blue-800';
    case GROUP_EVENT_STATUS.IN_PROGRESS:
      return 'bg-green-100 text-green-800';
    case GROUP_EVENT_STATUS.COMPLETED:
      return 'bg-gray-100 text-gray-500';
    case GROUP_EVENT_STATUS.CANCELLED:
      return 'bg-red-100 text-red-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]">
      <View className="flex-row items-center justify-between mb-2">
        <View className="h-5 w-40 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-6 w-20 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-1" />
      <View className="h-4 w-24 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-1" />
      <View className="h-4 w-28 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-1" />
    </View>
  );
}

function EventsLoadingSkeleton() {
  return (
    <View className="px-4 py-3">
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </View>
  );
}

// ── Event card ───────────────────────────────────────────────────────────────

const EventCard = memo(function EventCard({
  event,
  onPress,
}: {
  event: NearbyEvent;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]"
    >
      {/* Title + status */}
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] flex-1 mr-2"
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <View className={`rounded-full px-3 py-1 ${statusColor(event.status)}`}>
          <Text className="text-xs font-medium">{statusLabel(event.status)}</Text>
        </View>
      </View>

      {/* Date and time */}
      <View className="flex-row items-center mb-1">
        <Text className="text-sm text-gray-500 dark:text-neutral-500">
          {formatDate(event.scheduledAt)} alle {formatTime(event.scheduledAt)}
        </Text>
      </View>

      {/* Location */}
      <View className="flex-row items-center mb-1">
        <Text className="text-sm text-gray-500 dark:text-neutral-500">{event.location}</Text>
      </View>

      {/* Info */}
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-sm text-gray-400 dark:text-neutral-500">
          Max {event.maxParticipants} partecipanti
        </Text>
        <Text className="text-sm text-gray-400 dark:text-neutral-500">{event.durationMin} min</Text>
      </View>
    </Pressable>
  );
});

EventCard.displayName = 'EventCard';

// ── Empty state ──────────────────────────────────────────────────────────────

function EventsEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F4C5}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        Nessun evento nelle vicinanze
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
        Crea un evento per organizzare una passeggiata di gruppo!
      </Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function EventDiscoveryScreen() {
  const vm = useEventDiscoveryViewModel();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      <View className="border-b border-gray-100 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">Eventi</Text>
      </View>

      {vm.isInitialLoad ? (
        <EventsLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.events}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          onRefresh={vm.refresh}
          refreshing={vm.loading}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => vm.navigateToEvent(item.id)} />
          )}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          ListEmptyComponent={<EventsEmptyState />}
        />
      )}

      {/* FAB - Create event */}
      <Pressable
        onPress={vm.navigateToCreate}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Text className="text-2xl text-white">+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
