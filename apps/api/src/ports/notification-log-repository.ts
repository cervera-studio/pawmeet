import type { NotificationLogEntry } from '@pawmeet/types';

export interface NotificationLogRepository {
  create(
    entry: Omit<NotificationLogEntry, 'id' | 'readAt' | 'createdAt'>,
  ): Promise<NotificationLogEntry>;
  list(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ items: NotificationLogEntry[]; nextCursor: string | null }>;
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}
