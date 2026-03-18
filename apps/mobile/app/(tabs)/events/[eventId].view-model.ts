import type { RouterOutput } from '@pawmeet/api-client';
import { GROUP_EVENT_STATUS } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { api } from '@/lib/trpc';
import { useAuthStore } from '@/stores/auth';
import { useDogsStore } from '@/stores/dogs';

type EventDetail = RouterOutput['groupEvents']['get'];

export type { EventDetail };

export function useEventDetailViewModel() {
  const { t } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const { getEvent, joinEvent, leaveEvent, cancelEvent } = useGroupEvents();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const analytics = useAnalyticsService();

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
  const eventRecord = event as unknown as Record<string, unknown> | null;
  const isOfficial = eventRecord?.isOfficial === true;
  const coverImageUrl = (eventRecord?.coverImageUrl as string) ?? null;
  const organizationName = (eventRecord?.organizationName as string) ?? null;

  // Load sponsors for official events
  interface Sponsor {
    id: string;
    tier: 'title' | 'gold' | 'silver' | 'partner';
    organizationName: string;
    organizationLogoUrl: string | null;
  }
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const loadSponsors = useCallback(async () => {
    if (!eventId || !isOfficial) return;
    try {
      const result = await api.groupEvents.listSponsors.query({ eventId });
      setSponsors(result as Sponsor[]);
      // Track sponsor impressions
      for (const sponsor of result as Sponsor[]) {
        analytics.track('event_sponsor_viewed', {
          sponsorTier: sponsor.tier,
          placement:
            sponsor.tier === 'title' ? 'header' : sponsor.tier === 'partner' ? 'footer' : 'body',
        });
      }
    } catch (e) {
      logger.warn('EventDetail', 'Failed to load sponsors', e);
    }
  }, [eventId, isOfficial, analytics]);

  useEffect(() => {
    void loadSponsors();
  }, [loadSponsors]);

  const isParticipant =
    event?.participants?.some((p) => p.userId === userId && p.status === 'accepted') ?? false;

  const canJoin =
    event?.status === GROUP_EVENT_STATUS.SCHEDULED &&
    !isParticipant &&
    !isOrganizer &&
    (event.participantCount ?? 0) < event.maxParticipants;

  const canLeave = event?.status === GROUP_EVENT_STATUS.SCHEDULED && isParticipant && !isOrganizer;

  const canCancel = event?.status === GROUP_EVENT_STATUS.SCHEDULED && isOrganizer;

  const handleJoin = useCallback(async () => {
    if (!eventId || !selectedDogId) {
      Alert.alert(t('common.error'), t('events.detail.selectDogError'));
      return;
    }
    setActionLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await joinEvent(eventId, selectedDogId);
      await fetchEvent();
    } catch (e) {
      logger.warn('EventDetail', 'Failed to join event', e);
      Alert.alert(t('common.error'), t('events.detail.joinError'));
    } finally {
      setActionLoading(false);
    }
  }, [eventId, selectedDogId, joinEvent, fetchEvent, t]);

  const handleLeave = useCallback(async () => {
    if (!eventId) return;
    Alert.alert(t('events.detail.leaveTitle'), t('events.detail.leaveMessage'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('events.detail.leaveConfirm'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveEvent(eventId);
            await fetchEvent();
          } catch (e) {
            logger.warn('EventDetail', 'Failed to leave event', e);
            Alert.alert(t('common.error'), t('events.detail.leaveError'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [eventId, leaveEvent, fetchEvent, t]);

  const handleCancel = useCallback(() => {
    if (!eventId) return;
    Alert.alert(t('events.detail.cancelTitle'), t('events.detail.cancelMessage'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('events.detail.cancelButton'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await cancelEvent(eventId);
            await fetchEvent();
          } catch (e) {
            logger.warn('EventDetail', 'Failed to cancel event', e);
            Alert.alert(t('common.error'), t('events.detail.cancelError'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [eventId, cancelEvent, fetchEvent, t]);

  const navigateToGroupChat = useCallback(() => {
    if (!eventId) return;
    router.push(`/(tabs)/chat/group/${eventId}`);
  }, [eventId, router]);

  return {
    eventId,
    event,
    loading,
    actionLoading,
    isOrganizer,
    isParticipant,
    isOfficial,
    coverImageUrl,
    organizationName,
    sponsors,
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
