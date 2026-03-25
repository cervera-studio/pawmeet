import { logger } from '@pawmeet/utils';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

export interface NotificationItem {
  id: string;
  type: 'match' | 'message' | 'event' | 'walk' | 'social' | 'unknown';
  title: string;
  body: string;
  date: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

function classifyNotification(data?: Record<string, unknown>): NotificationItem['type'] {
  if (!data?.type) return 'unknown';
  const t = String(data.type);
  if (t.includes('match')) return 'match';
  if (t.includes('message') || t.includes('chat')) return 'message';
  if (t.includes('event')) return 'event';
  if (t.includes('walk') || t.includes('sos')) return 'walk';
  if (t.includes('follow') || t.includes('like') || t.includes('comment')) return 'social';
  return 'unknown';
}

const TYPE_ICONS: Record<NotificationItem['type'], string> = {
  match: '\u{1F49B}',
  message: '\u{1F4AC}',
  event: '\u{1F4C5}',
  walk: '\u{1F6B6}',
  social: '\u{1F44B}',
  unknown: '\u{1F514}',
};

export { TYPE_ICONS };

export function useNotificationsViewModel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const delivered = await Notifications.getPresentedNotificationsAsync();
      const items: NotificationItem[] = delivered.map((n) => ({
        id: n.request.identifier,
        type: classifyNotification(n.request.content.data as Record<string, unknown> | undefined),
        title: n.request.content.title ?? '',
        body: n.request.content.body ?? '',
        date: new Date(n.date ?? Date.now()),
        read: readIds.has(n.request.identifier),
        data: n.request.content.data as Record<string, unknown> | undefined,
      }));
      items.sort((a, b) => b.date.getTime() - a.date.getTime());
      setNotifications(items);
    } catch (e) {
      logger.warn('Notifications', 'Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  }, [readIds]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const handleTap = useCallback(
    (item: NotificationItem) => {
      markAsRead(item.id);
      const data = item.data;
      if (data?.matchId) {
        router.push(`/(tabs)/chat/${data.matchId}`);
        return;
      }
      if (data?.eventId) {
        router.push(`/(tabs)/map/events/${data.eventId}`);
        return;
      }
      if (data?.walkId) {
        router.push('/(tabs)/map/walks');
        return;
      }
    },
    [router, markAsRead],
  );

  return {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    handleTap,
  };
}
