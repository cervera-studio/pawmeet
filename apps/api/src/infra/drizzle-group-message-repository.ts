import { groupEventParticipants, groupEvents, groupMessageReads, groupMessages } from '@dogwalk/db';
import type {
  GroupChatMessage,
  GroupConversationSummary,
  PaginatedGroupMessages,
} from '@dogwalk/types';
import { and, desc, eq, lt, ne, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleGroupMessageRepository implements GroupMessageRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(input: {
    eventId: string;
    senderId: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<GroupChatMessage> {
    const rows = await this.db
      .insert(groupMessages)
      .values({
        eventId: input.eventId,
        senderId: input.senderId,
        content: input.content,
        mediaUrl: input.mediaUrl ?? null,
      })
      .returning();
    return firstRow<GroupChatMessage>(rows);
  }

  async findByEvent(
    eventId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedGroupMessages> {
    const conditions = [eq(groupMessages.eventId, eventId), eq(groupMessages.isDeleted, false)];

    if (cursor) {
      const [cursorMsg] = await this.db
        .select({ createdAt: groupMessages.createdAt })
        .from(groupMessages)
        .where(eq(groupMessages.id, cursor));

      if (cursorMsg) {
        conditions.push(lt(groupMessages.createdAt, cursorMsg.createdAt));
      }
    }

    const rows = await this.db
      .select()
      .from(groupMessages)
      .where(and(...conditions))
      .orderBy(desc(groupMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const messageList = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (messageList[messageList.length - 1]?.id ?? null) : null;

    return {
      messages: rowsAs<GroupChatMessage>(messageList),
      nextCursor,
      hasMore,
    };
  }

  async getConversationsForUser(userId: string): Promise<GroupConversationSummary[]> {
    // Find events where user is an accepted participant
    const participations = await this.db
      .select({ eventId: groupEventParticipants.eventId })
      .from(groupEventParticipants)
      .where(
        and(
          eq(groupEventParticipants.userId, userId),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      );

    if (participations.length === 0) return [];

    const conversations = await Promise.all(
      participations.map(async ({ eventId }) => {
        const [event] = await this.db
          .select({ title: groupEvents.title })
          .from(groupEvents)
          .where(and(eq(groupEvents.id, eventId), ne(groupEvents.status, 'cancelled')));

        if (!event) return null;

        const [countResult] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(groupEventParticipants)
          .where(
            and(
              eq(groupEventParticipants.eventId, eventId),
              eq(groupEventParticipants.status, 'accepted'),
            ),
          );

        const [lastMessage] = await this.db
          .select()
          .from(groupMessages)
          .where(and(eq(groupMessages.eventId, eventId), eq(groupMessages.isDeleted, false)))
          .orderBy(desc(groupMessages.createdAt))
          .limit(1);

        // Unread count: messages after user's last read timestamp
        const [readRecord] = await this.db
          .select({ lastReadAt: groupMessageReads.lastReadAt })
          .from(groupMessageReads)
          .where(and(eq(groupMessageReads.eventId, eventId), eq(groupMessageReads.userId, userId)));

        const unreadConditions = [
          eq(groupMessages.eventId, eventId),
          eq(groupMessages.isDeleted, false),
          sql`${groupMessages.senderId} != ${userId}`,
        ];
        if (readRecord) {
          unreadConditions.push(sql`${groupMessages.createdAt} > ${readRecord.lastReadAt}`);
        }

        const [unreadResult] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(groupMessages)
          .where(and(...unreadConditions));

        return {
          eventId,
          eventTitle: event.title,
          participantCount: countResult?.count ?? 0,
          lastMessage: (lastMessage as GroupChatMessage | undefined) ?? null,
          unreadCount: unreadResult?.count ?? 0,
        };
      }),
    );

    const filtered = conversations.filter((c): c is GroupConversationSummary => c !== null);

    filtered.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return filtered;
  }

  async markAsRead(eventId: string, userId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(groupMessageReads)
      .where(and(eq(groupMessageReads.eventId, eventId), eq(groupMessageReads.userId, userId)));

    if (existing) {
      await this.db
        .update(groupMessageReads)
        .set({ lastReadAt: new Date() })
        .where(eq(groupMessageReads.id, existing.id));
    } else {
      await this.db.insert(groupMessageReads).values({ eventId, userId });
    }
  }

  async isEventParticipant(eventId: string, userId: string): Promise<boolean> {
    const [participant] = await this.db
      .select({ id: groupEventParticipants.id })
      .from(groupEventParticipants)
      .where(
        and(
          eq(groupEventParticipants.eventId, eventId),
          eq(groupEventParticipants.userId, userId),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      );
    return participant !== undefined;
  }

  async getParticipantUserIds(eventId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: groupEventParticipants.userId })
      .from(groupEventParticipants)
      .where(
        and(
          eq(groupEventParticipants.eventId, eventId),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      );
    return rows.map((r) => r.userId);
  }
}
