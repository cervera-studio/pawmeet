import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useWalks } from '@/hooks/useWalks';
import { useAuthStore } from '@/stores/auth';

type Walk = RouterOutput['walks']['listUpcoming']['walks'][number];

export type { Walk };

export function useWalksViewModel() {
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const { upcomingWalks, loading, fetchUpcoming, respondToWalk, cancelWalk } = useWalks();
  const [feedbackTarget, setFeedbackTarget] = useState<{
    walkId: string;
    toDogId: string;
  } | null>(null);

  const handleFeedback = useCallback((walk: Walk) => {
    // The walk's matchId is used to identify the other participant's dog.
    // The API's feedback.submit endpoint will resolve the toDogId from the walk/match.
    setFeedbackTarget({ walkId: walk.id, toDogId: walk.matchId });
  }, []);

  const handleFeedbackSubmit = useCallback(() => {
    setFeedbackTarget(null);
    fetchUpcoming();
  }, [fetchUpcoming]);

  const handleFeedbackClose = useCallback(() => {
    setFeedbackTarget(null);
  }, []);

  const handleAccept = useCallback(
    async (walkId: string) => {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await respondToWalk(walkId, true);
      } catch (e) {
        logger.warn('WalksScreen', 'Failed to accept walk', e);
        Alert.alert('Errore', 'Impossibile accettare la passeggiata');
      }
    },
    [respondToWalk],
  );

  const handleDecline = useCallback(
    async (walkId: string) => {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await respondToWalk(walkId, false);
      } catch (e) {
        logger.warn('WalksScreen', 'Failed to decline walk', e);
        Alert.alert('Errore', 'Impossibile rifiutare la passeggiata');
      }
    },
    [respondToWalk],
  );

  const handleCancel = useCallback(
    (walkId: string) => {
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
    },
    [cancelWalk],
  );

  const renderItem = useCallback(
    ({ item }: { item: Walk }) => ({
      walk: item,
      userId,
      onAccept: () => handleAccept(item.id),
      onDecline: () => handleDecline(item.id),
      onCancel: () => handleCancel(item.id),
      onFeedback: () => handleFeedback(item),
    }),
    [userId, handleAccept, handleDecline, handleCancel, handleFeedback],
  );

  // Show skeleton on initial load only (not pull-to-refresh)
  const isInitialLoad = loading && upcomingWalks.length === 0;

  return {
    userId,
    upcomingWalks,
    loading,
    isInitialLoad,
    feedbackTarget,
    handleFeedbackSubmit,
    handleFeedbackClose,
    handleAccept,
    handleDecline,
    handleCancel,
    handleFeedback,
    fetchUpcoming,
    renderItem,
  };
}
