import { groupMessages, messages, notificationLog } from '@pawmeet/db';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GdprDmMessage, GdprNotification } from '../../ports/gdpr-export-repository.js';

export function createMessagingQueries(db: NodePgDatabase) {
  return {
    async getDmMessages(userId: string, matchIds: string[]): Promise<GdprDmMessage[]> {
      if (matchIds.length === 0) return [];
      const rows = await db
        .select({
          matchId: messages.matchId,
          content: messages.content,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(inArray(messages.matchId, matchIds), eq(messages.isDeleted, false)));

      return rows.map((r) => ({
        matchId: r.matchId,
        content: r.content,
        sentByMe: r.senderId === userId,
        createdAt: r.createdAt,
      }));
    },

    async getGroupMessages(userId: string) {
      return db
        .select({
          eventId: groupMessages.eventId,
          content: groupMessages.content,
          createdAt: groupMessages.createdAt,
        })
        .from(groupMessages)
        .where(and(eq(groupMessages.senderId, userId), eq(groupMessages.isDeleted, false)));
    },

    async getNotifications(userId: string): Promise<GdprNotification[]> {
      return db
        .select({
          type: notificationLog.type,
          title: notificationLog.title,
          body: notificationLog.body,
          readAt: notificationLog.readAt,
          createdAt: notificationLog.createdAt,
        })
        .from(notificationLog)
        .where(eq(notificationLog.userId, userId)) as unknown as GdprNotification[];
    },
  };
}
