export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { RouterOutput } from '@dogwalk/api-client';
import { WALK_STATUS } from '@dogwalk/types';

type Walk = RouterOutput['walks']['listUpcoming']['walks'][number];
import { logger } from '@dogwalk/utils';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalks } from '@/hooks/useWalks';
import { useAuthStore } from '@/stores/auth';

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
    case WALK_STATUS.CANCELLED:
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

function WalkCard({
  walk,
  userId,
  onAccept,
  onDecline,
  onCancel,
}: {
  walk: Walk;
  userId: string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const isMine = walk.createdBy === userId;
  const isPending = walk.status === WALK_STATUS.PENDING;
  const isAccepted = walk.status === WALK_STATUS.ACCEPTED;

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
      {walk.title && (
        <Text className="text-base font-medium text-gray-800 mb-1">{walk.title}</Text>
      )}
      {walk.location && (
        <View className="flex-row items-center mb-1">
          <Text className="text-sm text-gray-500">
            {walk.location}
          </Text>
        </View>
      )}
      {walk.notes && (
        <Text className="text-sm text-gray-400 mb-2">{walk.notes}</Text>
      )}

      {/* Action buttons */}
      {isPending && !isMine && (
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 items-center rounded-xl bg-green-500 py-3"
          >
            <Text className="font-semibold text-white">Accetta</Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            className="flex-1 items-center rounded-xl bg-red-100 py-3"
          >
            <Text className="font-semibold text-red-600">Rifiuta</Text>
          </Pressable>
        </View>
      )}

      {(isPending && isMine || isAccepted) && (
        <View className="mt-2">
          <Pressable
            onPress={onCancel}
            className="items-center rounded-xl bg-gray-100 py-3"
          >
            <Text className="font-semibold text-gray-600">Annulla</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function WalksScreen() {
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const { upcomingWalks, loading, fetchUpcoming, respondToWalk, cancelWalk } = useWalks();

  const handleAccept = async (walkId: string) => {
    try {
      await respondToWalk(walkId, true);
    } catch (e) {
      logger.warn('WalksScreen', 'Failed to accept walk', e);
      Alert.alert('Errore', 'Impossibile accettare la passeggiata');
    }
  };

  const handleDecline = async (walkId: string) => {
    try {
      await respondToWalk(walkId, false);
    } catch (e) {
      logger.warn('WalksScreen', 'Failed to decline walk', e);
      Alert.alert('Errore', 'Impossibile rifiutare la passeggiata');
    }
  };

  const handleCancel = (walkId: string) => {
    Alert.alert('Annulla passeggiata', 'Sei sicuro di voler annullare questa passeggiata?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla passeggiata',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelWalk(walkId);
          } catch (e) {
            logger.warn('WalksScreen', 'Failed to cancel walk', e);
            Alert.alert('Errore', 'Impossibile annullare la passeggiata');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="border-b border-gray-100 bg-white px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">Passeggiate</Text>
      </View>

      <FlatList
        data={upcomingWalks}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-3"
        onRefresh={fetchUpcoming}
        refreshing={loading}
        renderItem={({ item }) => (
          <WalkCard
            walk={item}
            userId={userId}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
            onCancel={() => handleCancel(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">🗓️</Text>
            <Text className="mt-4 text-lg text-gray-400">
              Nessuna passeggiata in programma
            </Text>
            <Text className="mt-1 text-sm text-gray-300">
              Proponi una passeggiata dalla chat!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
