import { dogProfiles, matches, messages, users } from '@pawmeet/db';
import type { ChatMessage, ChatMessageReplyPreview } from '@pawmeet/types';
import { aliasedTable, and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  ConversationSummary,
  MessageRepository,
  PaginatedMessages,
} from '../ports/message-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async getConversationsForUser(userId: string, dogIds: string[]): Promise<ConversationSummary[]> {
    if (dogIds.length === 0) return [];

    // Find active matches involving any of the user's dogs
    const userMatches = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(...dogIds.flatMap((id) => [eq(matches.dogAId, id), eq(matches.dogBId, id)])),
        ),
      );

    if (userMatches.length === 0) return [];

    const matchIds = userMatches.map((m) => m.id);

    // DISTINCT ON to get only the last message per match (instead of fetching ALL messages)
    const lastMessagesRows = await this.db
      .selectDistinctOn([messages.matchId], {
        id: messages.id,
        matchId: messages.matchId,
        senderId: messages.senderId,
        content: messages.content,
        mediaUrl: messages.mediaUrl,
        replyToId: sql<string | null>`${messages}.reply_to_id`.as('reply_to_id'),
        status: messages.status,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(inArray(messages.matchId, matchIds), eq(messages.isDeleted, false)))
      .orderBy(messages.matchId, desc(messages.createdAt));

    const lastMessageByMatch = new Map<string, ChatMessage>();
    for (const row of lastMessagesRows) {
      lastMessageByMatch.set(row.matchId, {
        id: row.id,
        matchId: row.matchId,
        senderId: row.senderId,
        content: row.content,
        mediaUrl: row.mediaUrl,
        replyToId: row.replyToId ?? null,
        replyTo: null, // Not needed for conversation list preview
        status: row.status as ChatMessage['status'],
        isDeleted: row.isDeleted,
        createdAt: row.createdAt,
      } satisfies ChatMessage);
    }

    // Batch-fetch unread counts for all matches
    const unreadRows = await this.db
      .select({
        matchId: messages.matchId,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.matchId, matchIds),
          eq(messages.status, 'sent'),
          eq(messages.isDeleted, false),
          sql`${messages.senderId} != ${userId}`,
        ),
      )
      .groupBy(messages.matchId);

    const unreadByMatch = new Map<string, number>();
    for (const row of unreadRows) {
      unreadByMatch.set(row.matchId, row.count);
    }

    // Single query: get other dogs + their owners via JOIN
    const otherDogIds = userMatches.map((m) => (dogIds.includes(m.dogAId) ? m.dogBId : m.dogAId));
    const uniqueOtherDogIds = [...new Set(otherDogIds)];

    const dogUserRows =
      uniqueOtherDogIds.length > 0
        ? await this.db
            .select({
              dogId: dogProfiles.id,
              dogName: dogProfiles.name,
              ownerId: dogProfiles.ownerId,
              ownerDisplayName: users.displayName,
              ownerAvatarUrl: users.avatarUrl,
            })
            .from(dogProfiles)
            .innerJoin(users, eq(dogProfiles.ownerId, users.id))
            .where(inArray(dogProfiles.id, uniqueOtherDogIds))
        : [];

    const dogById = new Map<string, { ownerId: string; name: string }>();
    const userById = new Map<
      string,
      { id: string; displayName: string; avatarUrl: string | null }
    >();
    for (const row of dogUserRows) {
      dogById.set(row.dogId, { ownerId: row.ownerId, name: row.dogName });
      if (!userById.has(row.ownerId)) {
        userById.set(row.ownerId, {
          id: row.ownerId,
          displayName: row.ownerDisplayName,
          avatarUrl: row.ownerAvatarUrl,
        });
      }
    }

    // Assemble results
    const conversations: ConversationSummary[] = userMatches.map((match) => {
      const otherDogId = dogIds.includes(match.dogAId) ? match.dogBId : match.dogAId;
      const dog = dogById.get(otherDogId);
      const otherUser = dog ? (userById.get(dog.ownerId) ?? null) : null;

      return {
        matchId: match.id,
        compatibilityScore: match.compatibilityScore,
        otherUser,
        otherDogName: dog?.name ?? null,
        lastMessage: lastMessageByMatch.get(match.id) ?? null,
        unreadCount: unreadByMatch.get(match.id) ?? 0,
      };
    });

    // Sort by last message date (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return conversations;
  }

  async findByMatch(
    matchId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedMessages> {
    const conditions = [eq(messages.matchId, matchId), eq(messages.isDeleted, false)];

    if (cursor) {
      const [cursorMsg] = await this.db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, cursor));

      if (cursorMsg) {
        conditions.push(lt(messages.createdAt, cursorMsg.createdAt));
      }
    }

    // Fetch messages without reply join (aliasedTable + select has Drizzle type issues)
    const rows = await this.db
      .select({
        id: messages.id,
        matchId: messages.matchId,
        senderId: messages.senderId,
        content: messages.content,
        mediaUrl: messages.mediaUrl,
        replyToId: sql<string | null>`${messages}.reply_to_id`.as('reply_to_id'),
        status: messages.status,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const rowList = hasMore ? rows.slice(0, limit) : rows;

    // Batch-fetch reply previews for messages that have replyToId
    const replyIds = rowList.map((r) => r.replyToId).filter((id): id is string => id != null);
    const replyMap = new Map<string, { content: string; senderName: string }>();
    if (replyIds.length > 0) {
      const replyRows = await this.db
        .select({
          id: messages.id,
          content: messages.content,
          senderName: users.displayName,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(inArray(messages.id, replyIds));
      for (const r of replyRows) {
        replyMap.set(r.id, { content: r.content, senderName: r.senderName ?? '' });
      }
    }
    const nextCursor = hasMore ? (rowList.at(-1)?.id ?? null) : null;

    const messageList: ChatMessage[] = rowList.map((row) => {
      const reply = row.replyToId ? replyMap.get(row.replyToId) : null;
      const replyTo: ChatMessageReplyPreview | null =
        row.replyToId && reply
          ? { id: row.replyToId, content: reply.content, senderName: reply.senderName }
          : null;

      return {
        id: row.id,
        matchId: row.matchId,
        senderId: row.senderId,
        content: row.content,
        mediaUrl: row.mediaUrl,
        replyToId: row.replyToId ?? null,
        replyTo,
        status: row.status as ChatMessage['status'],
        isDeleted: row.isDeleted,
        createdAt: row.createdAt,
      };
    });

    return {
      messages: messageList,
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    matchId: string;
    senderId: string;
    content: string;
    mediaUrl?: string | null;
    replyToId?: string | null;
  }): Promise<ChatMessage> {
    const rows = await this.db
      .insert(messages)
      .values({
        matchId: input.matchId,
        senderId: input.senderId,
        content: input.content,
        mediaUrl: input.mediaUrl ?? null,
      } as typeof messages.$inferInsert)
      .returning();

    // Set replyToId via raw update (AnyPgColumn self-ref loses type info in Drizzle)
    if (input.replyToId) {
      await this.db.execute(
        sql`UPDATE messages SET reply_to_id = ${input.replyToId} WHERE id = ${rows[0]!.id}`,
      );
    }

    const row = rows[0]!;
    const replyToId = input.replyToId ?? null;

    // If replying, fetch the replied-to message preview
    let replyTo: ChatMessageReplyPreview | null = null;
    if (replyToId) {
      const replyMessages = aliasedTable(messages, 'reply_msg');
      const replyUsers = aliasedTable(users, 'reply_user');
      const [replyRow] = await this.db
        .select({
          content: replyMessages.content,
          senderName: replyUsers.displayName,
        })
        .from(replyMessages)
        .leftJoin(replyUsers, eq(replyMessages.senderId, replyUsers.id))
        .where(eq(replyMessages.id, replyToId))
        .limit(1);

      if (replyRow) {
        replyTo = {
          id: replyToId,
          content: replyRow.content,
          senderName: replyRow.senderName ?? '',
        };
      }
    }

    return {
      id: row.id,
      matchId: row.matchId,
      senderId: row.senderId,
      content: row.content,
      mediaUrl: row.mediaUrl,
      replyToId,
      replyTo,
      status: row.status as ChatMessage['status'],
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
    };
  }

  async markAsRead(matchId: string, readerId: string): Promise<void> {
    await this.db
      .update(messages)
      .set({ status: 'read' })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'),
          sql`${messages.senderId} != ${readerId}`,
        ),
      );
  }

  async isMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    // Single JOIN query instead of 3 separate queries
    const rows = await this.db
      .select({ id: matches.id })
      .from(matches)
      .innerJoin(
        dogProfiles,
        or(eq(dogProfiles.id, matches.dogAId), eq(dogProfiles.id, matches.dogBId)),
      )
      .where(
        and(eq(matches.id, matchId), eq(matches.isActive, true), eq(dogProfiles.ownerId, userId)),
      )
      .limit(1);

    return rows.length > 0;
  }

  async getOtherParticipant(matchId: string, userId: string): Promise<string | null> {
    // Single query: join match with both dogs, find the owner that isn't the current user
    const [match] = await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.id, matchId), eq(matches.isActive, true)));
    if (!match) return null;

    // Batch-fetch both dogs in a single query
    const dogs = await this.db
      .select({ id: dogProfiles.id, ownerId: dogProfiles.ownerId })
      .from(dogProfiles)
      .where(inArray(dogProfiles.id, [match.dogAId, match.dogBId]));

    const dogA = dogs.find((d) => d.id === match.dogAId);
    const dogB = dogs.find((d) => d.id === match.dogBId);

    if (dogA?.ownerId === userId) return dogB?.ownerId ?? null;
    if (dogB?.ownerId === userId) return dogA?.ownerId ?? null;
    return null;
  }

  async countByMatch(matchId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.matchId, matchId), eq(messages.isDeleted, false)));
    return result?.count ?? 0;
  }
}
