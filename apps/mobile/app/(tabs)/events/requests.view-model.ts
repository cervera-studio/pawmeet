import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useGroupEvents } from '@/hooks/useGroupEvents';

type PendingRequest = Awaited<
  ReturnType<ReturnType<typeof useGroupEvents>['listPendingRequests']>
>[number];

export function useEventRequestsViewModel(eventId: string) {
  const { listPendingRequests, approveParticipant, declineParticipant } = useGroupEvents();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingRequests(eventId);
      setRequests(data);
    } catch (e) {
      logger.warn('EventRequests', 'Failed to fetch requests', e);
    } finally {
      setLoading(false);
    }
  }, [eventId, listPendingRequests]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleApprove = useCallback(
    async (userId: string) => {
      setProcessingId(userId);
      try {
        await approveParticipant(eventId, userId);
        // Optimistic: remove from list
        setRequests((prev) => prev.filter((r) => r.participant.userId !== userId));
      } catch (e) {
        logger.warn('EventRequests', 'Failed to approve', e);
        Alert.alert('Errore', 'Impossibile approvare la richiesta.');
      } finally {
        setProcessingId(null);
      }
    },
    [eventId, approveParticipant],
  );

  const handleDecline = useCallback(
    (userId: string) => {
      Alert.alert('Rifiuta richiesta', 'Sei sicuro di voler rifiutare questa richiesta?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(userId);
            try {
              await declineParticipant(eventId, userId);
              setRequests((prev) => prev.filter((r) => r.participant.userId !== userId));
            } catch (e) {
              logger.warn('EventRequests', 'Failed to decline', e);
              Alert.alert('Errore', 'Impossibile rifiutare la richiesta.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]);
    },
    [eventId, declineParticipant],
  );

  return {
    requests,
    loading,
    processingId,
    fetchRequests,
    handleApprove,
    handleDecline,
  };
}
