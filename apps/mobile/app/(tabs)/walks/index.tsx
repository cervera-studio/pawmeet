export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { WALK_STATUS } from '@dogwalk/types';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedbackModal } from '@/components/FeedbackModal';
import type { Walk } from './index.view-model';
import { useWalksViewModel } from './index.view-model';

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
    case WALK_STATUS.PENDING:
      return 'In attesa';
    case WALK_STATUS.ACCEPTED:
      return 'Confermata';
    case WALK_STATUS.DECLINED:
      return 'Rifiutata';
    case WALK_STATUS.CANCELLED:
      return 'Annullata';
    case WALK_STATUS.COMPLETED:
      return 'Completata';
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case WALK_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case WALK_STATUS.ACCEPTED:
      return 'bg-green-100 text-green-800';
    case WALK_STATUS.DECLINED:
      return 'bg-red-100 text-red-800';
    case WALK_STATUS.COMPLETED:
      return 'bg-blue-100 text-blue-800';
    case WALK_STATUS.CANCELLED:
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function WalkCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <View className="h-5 w-28 rounded bg-gray-200 animate-pulse" />
          <View className="mt-1 h-4 w-20 rounded bg-gray-200 animate-pulse" />
        </View>
        <View className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
      </View>
      <View className="h-4 w-40 rounded bg-gray-200 animate-pulse mt-1" />
      <View className="h-4 w-32 rounded bg-gray-200 animate-pulse mt-1" />
    </View>
  );
}

function WalksLoadingSkeleton() {
  return (
    <View className="px-4 py-3">
      <WalkCardSkeleton />
      <WalkCardSkeleton />
      <WalkCardSkeleton />
    </View>
  );
}

// ── WalkCard (memoized) ──────────────────────────────────────────────────────

const WalkCard = memo(function WalkCard({
  walk,
  userId,
  onAccept,
  onDecline,
  onCancel,
  onFeedback,
}: {
  walk: Walk;
  userId: string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onFeedback: () => void;
}) {
  const isMine = walk.createdBy === userId;
  const isPending = walk.status === WALK_STATUS.PENDING;
  const isAccepted = walk.status === WALK_STATUS.ACCEPTED;
  const isCompleted = walk.status === WALK_STATUS.COMPLETED;

  return (
    <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      {/* Header with date and status */}
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text className="text-lg font-semibold text-gray-900">
            {formatDate(walk.scheduledAt)}
          </Text>
          <Text className="text-sm text-gray-500">
            {formatTime(walk.scheduledAt)} - {walk.durationMin} min
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusColor(walk.status)}`}>
          <Text className="text-xs font-medium">
            {isPending && isMine ? 'In attesa' : statusLabel(walk.status)}
          </Text>
        </View>
      </View>

      {/* Title and location */}
      {walk.title && <Text className="text-base font-medium text-gray-800 mb-1">{walk.title}</Text>}
      {walk.location && (
        <View className="flex-row items-center mb-1">
          <Text className="text-sm text-gray-500">{walk.location}</Text>
        </View>
      )}
      {walk.notes && <Text className="text-sm text-gray-400 mb-2">{walk.notes}</Text>}

      {/* Action buttons */}
      {isPending && !isMine && (
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 items-center rounded-xl bg-green-500 py-3"
          >
            <Text className="font-semibold text-white">Accetta</Text>
          </Pressable>
          <Pressable onPress={onDecline} className="flex-1 items-center rounded-xl bg-red-100 py-3">
            <Text className="font-semibold text-red-600">Rifiuta</Text>
          </Pressable>
        </View>
      )}

      {((isPending && isMine) || isAccepted) && (
        <View className="mt-2">
          <Pressable onPress={onCancel} className="items-center rounded-xl bg-gray-100 py-3">
            <Text className="font-semibold text-gray-600">Annulla</Text>
          </Pressable>
        </View>
      )}

      {isCompleted && (
        <View className="mt-2">
          <Pressable onPress={onFeedback} className="items-center rounded-xl bg-primary py-3">
            <Text className="font-semibold text-white">Lascia feedback</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

WalkCard.displayName = 'WalkCard';

// ── Empty state ──────────────────────────────────────────────────────────────

function WalksEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F5D3}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900">
        Nessuna passeggiata in programma
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 px-8">
        Proponi una passeggiata dalla chat con uno dei tuoi match!
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WalksScreen() {
  const vm = useWalksViewModel();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">Passeggiate</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/walks/tracking')}
          className="rounded-full bg-emerald-700 px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">Traccia</Text>
        </Pressable>
      </View>

      {vm.isInitialLoad ? (
        <WalksLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.upcomingWalks}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          onRefresh={vm.fetchUpcoming}
          refreshing={vm.loading}
          renderItem={({ item }) => (
            <WalkCard
              walk={item}
              userId={vm.userId}
              onAccept={() => vm.handleAccept(item.id)}
              onDecline={() => vm.handleDecline(item.id)}
              onCancel={() => vm.handleCancel(item.id)}
              onFeedback={() => vm.handleFeedback(item)}
            />
          )}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          ListEmptyComponent={<WalksEmptyState />}
        />
      )}

      {vm.feedbackTarget && (
        <FeedbackModal
          visible
          walkId={vm.feedbackTarget.walkId}
          toDogId={vm.feedbackTarget.toDogId}
          onClose={vm.handleFeedbackClose}
          onSubmit={vm.handleFeedbackSubmit}
        />
      )}
    </SafeAreaView>
  );
}
