import type { RouterOutput } from '@dogwalk/api-client';
import { GROUP_EVENT_STATUS } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useAuthStore } from '@/stores/auth';
import { useDogsStore } from '@/stores/dogs';

type EventDetail = RouterOutput['groupEvents']['get'];

export type { EventDetail };

export function useEventDetailViewModel() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const { getEvent, joinEvent, leaveEvent, cancelEvent } = useGroupEvents();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await getEvent(eventId);
      setEvent(data);
    } catch (e) {
      logger.warn('EventDetail', 'Failed to fetch event', e);
    } finally {
      setLoading(false);
    }
  }, [eventId, getEvent]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const isOrganizer = event?.createdBy === userId;

  const isParticipant =
    event?.participants?.some(
      (p) => p.userId === userId && p.status === 'accepted',
    ) ?? false;

  const canJoin =
    event?.status === GROUP_EVENT_STATUS.SCHEDULED &&
    !isParticipant &&
    !isOrganizer &&
    (event.participantCount ?? 0) < event.maxParticipants;

  const canLeave =
    event?.status === GROUP_EVENT_STATUS.SCHEDULED && isParticipant && !isOrganizer;

  const canCancel = event?.status === GROUP_EVENT_STATUS.SCHEDULED && isOrganizer;

  const handleJoin = useCallback(async () => {
    if (!eventId || !selectedDogId) {
      Alert.alert('Errore', 'Seleziona un cane dal profilo prima di partecipare.');
      return;
    }
    setActionLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await joinEvent(eventId, selectedDogId);
      await fetchEvent();
    } catch (e) {
      logger.warn('EventDetail', 'Failed to join event', e);
      Alert.alert('Errore', 'Impossibile partecipare all\'evento.');
    } finally {
      setActionLoading(false);
    }
  }, [eventId, selectedDogId, joinEvent, fetchEvent]);

  const handleLeave = useCallback(async () => {
    if (!eventId) return;
    Alert.alert('Lascia evento', 'Sei sicuro di voler abbandonare questo evento?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Lascia',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveEvent(eventId);
            await fetchEvent();
          } catch (e) {
            logger.warn('EventDetail', 'Failed to leave event', e);
            Alert.alert('Errore', 'Impossibile abbandonare l\'evento.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [eventId, leaveEvent, fetchEvent]);

  const handleCancel = useCallback(() => {
    if (!eventId) return;
    Alert.alert('Annulla evento', 'Sei sicuro di voler annullare questo evento?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla evento',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await cancelEvent(eventId);
            await fetchEvent();
          } catch (e) {
            logger.warn('EventDetail', 'Failed to cancel event', e);
            Alert.alert('Errore', 'Impossibile annullare l\'evento.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [eventId, cancelEvent, fetchEvent]);

  const navigateToGroupChat = useCallback(() => {
    if (!eventId) return;
    router.push(`/(tabs)/chat/group/${eventId}`);
  }, [eventId, router]);

  return {
    event,
    loading,
    actionLoading,
    isOrganizer,
    isParticipant,
    canJoin,
    canLeave,
    canCancel,
    fetchEvent,
    handleJoin,
    handleLeave,
    handleCancel,
    navigateToGroupChat,
  };
}
