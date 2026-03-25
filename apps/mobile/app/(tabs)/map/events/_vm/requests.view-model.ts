import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useGroupEvents } from '@/hooks/useGroupEvents';

type PendingRequest = Awaited<
  ReturnType<ReturnType<typeof useGroupEvents>['listPendingRequests']>
>[number];

export function useEventRequestsViewModel(eventId: string) {
  const { t } = useTranslation();
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
        Alert.alert(t('common.error'), t('events.requests.approveError'));
      } finally {
        setProcessingId(null);
      }
    },
    [eventId, approveParticipant, t],
  );

  const handleDecline = useCallback(
    (userId: string) => {
      Alert.alert(t('events.requests.declineTitle'), t('events.requests.declineMessage'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.decline'),
          style: 'destructive',
          onPress: async () => {
            setProcessingId(userId);
            try {
              await declineParticipant(eventId, userId);
              setRequests((prev) => prev.filter((r) => r.participant.userId !== userId));
            } catch (e) {
              logger.warn('EventRequests', 'Failed to decline', e);
              Alert.alert(t('common.error'), t('events.requests.declineError'));
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]);
    },
    [eventId, declineParticipant, t],
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
