import { dogProfiles, matches, messages, users } from '@dogwalk/db';
import type { ChatMessage } from '@dogwalk/types';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  ConversationSummary,
  MessageRepository,
  PaginatedMessages,
} from '../ports/message-repository.js';

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

    // For each match, get the last message and other participant info
    const conversations = await Promise.all(
      userMatches.map(async (match) => {
        // Get last message
        const [lastMessage] = await this.db
          .select()
          .from(messages)
          .where(and(eq(messages.matchId, match.id), eq(messages.isDeleted, false)))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count (messages sent by others, not yet read)
        const [unreadResult] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.matchId, match.id),
              eq(messages.status, 'sent'),
              eq(messages.isDeleted, false),
              sql`${messages.senderId} != ${userId}`,
            ),
          );

        // Get the other user's info
        const otherDogId = dogIds.includes(match.dogAId) ? match.dogBId : match.dogAId;
        const [otherDog] = await this.db
          .select({ ownerId: dogProfiles.ownerId, name: dogProfiles.name })
          .from(dogProfiles)
          .where(eq(dogProfiles.id, otherDogId));

        let otherUser = null;
        if (otherDog) {
          const [user] = await this.db
            .select({
              id: users.id,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, otherDog.ownerId));
          otherUser = user ?? null;
        }

        return {
          matchId: match.id,
          compatibilityScore: match.compatibilityScore,
          otherUser,
          otherDogName: otherDog?.name ?? null,
          lastMessage: (lastMessage as ChatMessage | undefined) ?? null,
          unreadCount: unreadResult?.count ?? 0,
        };
      }),
    );

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

    const rows = await this.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const messageList = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (messageList[messageList.length - 1]?.id ?? null) : null;

    return {
      messages: messageList as ChatMessage[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    matchId: string;
    senderId: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<ChatMessage> {
    const rows = await this.db
      .insert(messages)
      .values({
        matchId: input.matchId,
        senderId: input.senderId,
        content: input.content,
        mediaUrl: input.mediaUrl ?? null,
      })
      .returning();
    return rows[0] as ChatMessage;
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
    const [match] = await this.db.select().from(matches).where(eq(matches.id, matchId));
    if (!match || !match.isActive) return false;

    const [dogA] = await this.db
      .select({ ownerId: dogProfiles.ownerId })
      .from(dogProfiles)
      .where(eq(dogProfiles.id, match.dogAId));
    const [dogB] = await this.db
      .select({ ownerId: dogProfiles.ownerId })
      .from(dogProfiles)
      .where(eq(dogProfiles.id, match.dogBId));

    return dogA?.ownerId === userId || dogB?.ownerId === userId;
  }
}
