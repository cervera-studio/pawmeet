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

// -- Query helpers for getConversationsForUser --

async function fetchUserParticipations(db: NeonHttpDatabase, userId: string) {
  return db
    .select({ eventId: groupEventParticipants.eventId })
    .from(groupEventParticipants)
    .where(
      and(eq(groupEventParticipants.userId, userId), eq(groupEventParticipants.status, 'accepted')),
    );
}

async function fetchActiveEvents(db: NeonHttpDatabase, eventIds: string[]) {
  const rows = await db
    .select({ id: groupEvents.id, title: groupEvents.title })
    .from(groupEvents)
    .where(and(inArray(groupEvents.id, eventIds), ne(groupEvents.status, 'cancelled')));

  const eventById = new Map<string, { title: string }>();
  const activeEventIds: string[] = [];
  for (const event of rows) {
    eventById.set(event.id, { title: event.title });
    activeEventIds.push(event.id);
  }
  return { eventById, activeEventIds };
}

async function fetchParticipantCounts(db: NeonHttpDatabase, activeEventIds: string[]) {
  const rows = await db
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

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.eventId, row.count);
  }
  return map;
}

async function fetchLastMessages(db: NeonHttpDatabase, activeEventIds: string[]) {
  const rows = await db
    .selectDistinctOn([groupMessages.eventId])
    .from(groupMessages)
    .where(and(inArray(groupMessages.eventId, activeEventIds), eq(groupMessages.isDeleted, false)))
    .orderBy(groupMessages.eventId, desc(groupMessages.createdAt));

  const map = new Map<string, GroupChatMessage>();
  for (const row of rows) {
    map.set(row.eventId, {
      id: row.id,
      eventId: row.eventId,
      senderId: row.senderId,
      content: row.content,
      mediaUrl: row.mediaUrl,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
    } satisfies GroupChatMessage);
  }
  return map;
}

async function fetchReadRecords(db: NeonHttpDatabase, activeEventIds: string[], userId: string) {
  const rows = await db
    .select({
      eventId: groupMessageReads.eventId,
      lastReadAt: groupMessageReads.lastReadAt,
    })
    .from(groupMessageReads)
    .where(
      and(inArray(groupMessageReads.eventId, activeEventIds), eq(groupMessageReads.userId, userId)),
    );

  const map = new Map<string, Date>();
  for (const row of rows) {
    map.set(row.eventId, row.lastReadAt);
  }
  return map;
}

async function fetchUnreadCounts(
  db: NeonHttpDatabase,
  activeEventIds: string[],
  userId: string,
  lastReadByEvent: Map<string, Date>,
) {
  const eventsWithRead = activeEventIds.filter((id) => lastReadByEvent.has(id));
  const eventsWithoutRead = activeEventIds.filter((id) => !lastReadByEvent.has(id));
  const unreadByEvent = new Map<string, number>();

  if (eventsWithoutRead.length > 0) {
    const rows = await db
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

    for (const row of rows) {
      unreadByEvent.set(row.eventId, row.count);
    }
  }

  if (eventsWithRead.length > 0) {
    const rows = await db
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
          sql`${groupMessages.createdAt} > (
              SELECT ${groupMessageReads.lastReadAt}
              FROM ${groupMessageReads}
              WHERE ${groupMessageReads.eventId} = ${groupMessages.eventId}
                AND ${groupMessageReads.userId} = ${userId}
            )`,
        ),
      )
      .groupBy(groupMessages.eventId);

    for (const row of rows) {
      unreadByEvent.set(row.eventId, row.count);
    }
  }

  return unreadByEvent;
}

function assembleConversations(
  activeEventIds: string[],
  eventById: Map<string, { title: string }>,
  participantCountByEvent: Map<string, number>,
  lastMessageByEvent: Map<string, GroupChatMessage>,
  unreadByEvent: Map<string, number>,
): GroupConversationSummary[] {
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

// -- Repository --

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
    const nextCursor = hasMore ? (messageList.at(-1)?.id ?? null) : null;

    return {
      messages: rowsAs<GroupChatMessage>(messageList),
      nextCursor,
      hasMore,
    };
  }

  async getConversationsForUser(userId: string): Promise<GroupConversationSummary[]> {
    const participations = await fetchUserParticipations(this.db, userId);
    if (participations.length === 0) return [];

    const eventIds = participations.map((p) => p.eventId);
    const { eventById, activeEventIds } = await fetchActiveEvents(this.db, eventIds);
    if (activeEventIds.length === 0) return [];

    const [participantCountByEvent, lastMessageByEvent, lastReadByEvent] = await Promise.all([
      fetchParticipantCounts(this.db, activeEventIds),
      fetchLastMessages(this.db, activeEventIds),
      fetchReadRecords(this.db, activeEventIds, userId),
    ]);

    const unreadByEvent = await fetchUnreadCounts(this.db, activeEventIds, userId, lastReadByEvent);

    return assembleConversations(
      activeEventIds,
      eventById,
      participantCountByEvent,
      lastMessageByEvent,
      unreadByEvent,
    );
  }

  async markAsRead(eventId: string, userId: string): Promise<void> {
    await this.db
      .insert(groupMessageReads)
      .values({ eventId, userId })
      .onConflictDoUpdate({
        target: [groupMessageReads.eventId, groupMessageReads.userId],
        set: { lastReadAt: new Date() },
      });
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
