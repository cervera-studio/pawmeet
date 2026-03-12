import { groupEventParticipants, groupEvents, groupMessageReads, groupMessages } from '@pawmeet/db';
import type {
  GroupChatMessage,
  GroupConversationSummary,
  PaginatedGroupMessages,
} from '@pawmeet/types';
import { and, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
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

    const eventIds = participations.map((p) => p.eventId);

    // Batch-fetch event details for all eventIds (exclude cancelled)
    const eventsRows = await this.db
      .select({ id: groupEvents.id, title: groupEvents.title })
      .from(groupEvents)
      .where(and(inArray(groupEvents.id, eventIds), ne(groupEvents.status, 'cancelled')));

    if (eventsRows.length === 0) return [];

    const eventById = new Map<string, { title: string }>();
    const activeEventIds: string[] = [];
    for (const event of eventsRows) {
      eventById.set(event.id, { title: event.title });
      activeEventIds.push(event.id);
    }

    // Batch-fetch participant counts for all active events
    const participantCountRows = await this.db
      .select({
        eventId: groupEventParticipants.eventId,
        count: sql<number>`count(*)::int`,
      })
      .from(groupEventParticipants)
      .where(
        and(
          inArray(groupEventParticipants.eventId, activeEventIds),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      )
      .groupBy(groupEventParticipants.eventId);

    const participantCountByEvent = new Map<string, number>();
    for (const row of participantCountRows) {
      participantCountByEvent.set(row.eventId, row.count);
    }

    // Batch-fetch last messages for all active events
    const allMessagesRows = await this.db
      .select()
      .from(groupMessages)
      .where(
        and(inArray(groupMessages.eventId, activeEventIds), eq(groupMessages.isDeleted, false)),
      )
      .orderBy(groupMessages.eventId, desc(groupMessages.createdAt));

    // Pick the first (most recent) message per eventId
    const lastMessageByEvent = new Map<string, GroupChatMessage>();
    for (const row of allMessagesRows) {
      const msg = row as unknown as GroupChatMessage;
      if (!lastMessageByEvent.has(msg.eventId)) {
        lastMessageByEvent.set(msg.eventId, msg);
      }
    }

    // Batch-fetch read records for all active events for this user
    const readRows = await this.db
      .select({
        eventId: groupMessageReads.eventId,
        lastReadAt: groupMessageReads.lastReadAt,
      })
      .from(groupMessageReads)
      .where(
        and(
          inArray(groupMessageReads.eventId, activeEventIds),
          eq(groupMessageReads.userId, userId),
        ),
      );

    const lastReadByEvent = new Map<string, Date>();
    for (const row of readRows) {
      lastReadByEvent.set(row.eventId, row.lastReadAt);
    }

    // Batch-fetch unread counts for all active events
    // We need per-event counts of messages not sent by userId, not deleted,
    // and created after the user's last read timestamp (if any)
    // Split into two groups: events with a read record and events without
    const eventsWithRead = activeEventIds.filter((id) => lastReadByEvent.has(id));
    const eventsWithoutRead = activeEventIds.filter((id) => !lastReadByEvent.has(id));

    const unreadByEvent = new Map<string, number>();

    // For events without a read record, count all non-self messages
    if (eventsWithoutRead.length > 0) {
      const unreadNoReadRows = await this.db
        .select({
          eventId: groupMessages.eventId,
          count: sql<number>`count(*)::int`,
        })
        .from(groupMessages)
        .where(
          and(
            inArray(groupMessages.eventId, eventsWithoutRead),
            eq(groupMessages.isDeleted, false),
            sql`${groupMessages.senderId} != ${userId}`,
          ),
        )
        .groupBy(groupMessages.eventId);

      for (const row of unreadNoReadRows) {
        unreadByEvent.set(row.eventId, row.count);
      }
    }

    // For events with a read record, count messages after lastReadAt
    // We do individual conditions per event since each has a different timestamp
    // But we can still batch into a single query using CASE/UNION or raw SQL
    if (eventsWithRead.length > 0) {
      // Build a single query with OR conditions per event
      const unreadWithReadRows = await this.db
        .select({
          eventId: groupMessages.eventId,
          count: sql<number>`count(*)::int`,
        })
        .from(groupMessages)
        .where(
          and(
            inArray(groupMessages.eventId, eventsWithRead),
            eq(groupMessages.isDeleted, false),
            sql`${groupMessages.senderId} != ${userId}`,
            // Filter: only messages after the user's lastReadAt for that event
            // Use a subquery approach: createdAt > the user's lastReadAt for that event
            sql`${groupMessages.createdAt} > (
              SELECT ${groupMessageReads.lastReadAt}
              FROM ${groupMessageReads}
              WHERE ${groupMessageReads.eventId} = ${groupMessages.eventId}
                AND ${groupMessageReads.userId} = ${userId}
            )`,
          ),
        )
        .groupBy(groupMessages.eventId);

      for (const row of unreadWithReadRows) {
        unreadByEvent.set(row.eventId, row.count);
      }
    }

    // Assemble results
    const conversations: GroupConversationSummary[] = [];
    for (const eventId of activeEventIds) {
      const event = eventById.get(eventId);
      if (!event) continue;

      conversations.push({
        eventId,
        eventTitle: event.title,
        participantCount: participantCountByEvent.get(eventId) ?? 0,
        lastMessage: lastMessageByEvent.get(eventId) ?? null,
        unreadCount: unreadByEvent.get(eventId) ?? 0,
      });
    }

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return conversations;
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
