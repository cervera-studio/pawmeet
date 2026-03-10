import { GROUP_EVENT_STATUS } from '@dogwalk/types';
import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useEventDetailViewModel } from './[eventId].view-model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

function EventDetailSkeleton() {
  return (
    <View className="p-4">
      <View className="h-8 w-64 rounded bg-gray-200 animate-pulse" />
      <View className="h-6 w-24 rounded-full bg-gray-200 animate-pulse mt-3" />
      <View className="h-4 w-48 rounded bg-gray-200 animate-pulse mt-4" />
      <View className="h-4 w-40 rounded bg-gray-200 animate-pulse mt-2" />
      <View className="h-4 w-32 rounded bg-gray-200 animate-pulse mt-2" />
      <View className="h-20 w-full rounded bg-gray-200 animate-pulse mt-4" />
      <View className="h-4 w-28 rounded bg-gray-200 animate-pulse mt-6" />
      <View className="flex-row gap-3 mt-3">
        <View className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
        <View className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
        <View className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const vm = useEventDetailViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: vm.event?.title ?? 'Evento',
          headerBackTitle: 'Eventi',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        {vm.loading ? (
          <EventDetailSkeleton />
        ) : vm.event ? (
          <ScrollView className="flex-1" contentContainerClassName="p-4">
            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900">{vm.event.title}</Text>

            {/* Status badge */}
            <View className="flex-row mt-3">
              <View className={`rounded-full px-3 py-1 ${statusColor(vm.event.status)}`}>
                <Text className="text-xs font-medium">{statusLabel(vm.event.status)}</Text>
              </View>
              {vm.isOrganizer && (
                <View className="ml-2 rounded-full bg-primary/10 px-3 py-1">
                  <Text className="text-xs font-medium text-primary">Organizzatore</Text>
                </View>
              )}
              {vm.isParticipant && !vm.isOrganizer && (
                <View className="ml-2 rounded-full bg-green-100 px-3 py-1">
                  <Text className="text-xs font-medium text-green-700">Partecipante</Text>
                </View>
              )}
            </View>

            {/* Date, time, duration */}
            <View className="mt-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-base text-gray-700">{formatDate(vm.event.scheduledAt)}</Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-base text-gray-700">
                  Ore {formatTime(vm.event.scheduledAt)} - Durata {vm.event.durationMin} min
                </Text>
              </View>
            </View>

            {/* Location */}
            <View className="mt-2 flex-row items-center">
              <Text className="text-base text-gray-700">{vm.event.location}</Text>
            </View>

            {/* Description */}
            {vm.event.description && (
              <View className="mt-4 rounded-xl bg-gray-50 p-4">
                <Text className="text-base text-gray-700">{vm.event.description}</Text>
              </View>
            )}

            {/* Participants */}
            <View className="mt-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Partecipanti ({vm.event.participantCount}/{vm.event.maxParticipants})
              </Text>
              {vm.event.participants && vm.event.participants.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {vm.event.participants.map((participant) => (
                    <View key={participant.id} className="items-center">
                      <Avatar name={participant.userId} size="md" />
                      <Text className="mt-1 text-xs text-gray-500">
                        {participant.isOrganizer ? 'Org.' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-gray-400">Nessun partecipante ancora</Text>
              )}
            </View>

            {/* Action buttons */}
            <View className="mt-6 gap-3">
              {/* Chat button - visible for organizer and participants */}
              {(vm.isOrganizer || vm.isParticipant) && (
                <Pressable
                  onPress={vm.navigateToGroupChat}
                  className="items-center rounded-xl bg-primary py-4"
                >
                  <Text className="font-semibold text-white">Chatta</Text>
                </Pressable>
              )}

              {/* Join button */}
              {vm.canJoin && (
                <Pressable
                  onPress={vm.handleJoin}
                  disabled={vm.actionLoading}
                  className="items-center rounded-xl bg-green-500 py-4"
                >
                  {vm.actionLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">Partecipa</Text>
                  )}
                </Pressable>
              )}

              {/* Leave button */}
              {vm.canLeave && (
                <Pressable
                  onPress={vm.handleLeave}
                  disabled={vm.actionLoading}
                  className="items-center rounded-xl bg-gray-100 py-4"
                >
                  <Text className="font-semibold text-gray-600">Lascia evento</Text>
                </Pressable>
              )}

              {/* Cancel button (organizer only) */}
              {vm.canCancel && (
                <Pressable
                  onPress={vm.handleCancel}
                  disabled={vm.actionLoading}
                  className="items-center rounded-xl bg-red-100 py-4"
                >
                  <Text className="font-semibold text-red-600">Annulla evento</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-400">Evento non trovato</Text>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
